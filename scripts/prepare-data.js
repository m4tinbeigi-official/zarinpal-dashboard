#!/usr/bin/env node
/**
 * Zarinpal Analytics – Data Preparation Script
 * Reads the full challenge CSV via streaming and produces compact JSON aggregates
 * for the dashboard UI. No raw rows, card keys, or competitor details leak into output.
 *
 * Usage: node scripts/prepare-data.js [path-to-csv]
 * Default CSV: ../other_challenge_data.csv/challenge_data.csv
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CSV_PATH =
  process.argv[2] ||
  path.resolve(__dirname, "../../other_challenge_data.csv/challenge_data.csv");
const OUT_DIR = path.resolve(__dirname, "../public/data");

// ── helpers ──────────────────────────────────────────────────────────────────
const isSuccess = (sessionStatus) =>
  sessionStatus === "Verified" || sessionStatus === "Paid";

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── accumulators ─────────────────────────────────────────────────────────────
const merchants = {}; // merchant_key -> { category_id, category_title, ... }
const dailyByMerchant = {}; // merchant -> date -> agg
const hourByMerchant = {}; // merchant -> hour -> agg
const dowByMerchant = {}; // merchant -> dow(0-6) -> agg
const categoryMerchants = {}; // category_id -> Set<merchant>
const categoryAgg = {}; // category_id -> { title, totalGMV, successCount, ... }
const funnelByMerchant = {}; // merchant -> { sessions, attempts, statuses }
const responseCodesByMerchant = {}; // merchant -> code -> count
const pspByMerchant = {}; // merchant -> psp -> count
const cardPurchases = {}; // merchant -> card -> [{date, amount}]
const sessionSeen = {}; // merchant -> session_key -> best status

let totalRows = 0;
let skippedRows = 0;
let minDate = "9999";
let maxDate = "0000";

// ── main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.time("prepare-data");
  const rl = readline.createInterface({
    input: fs.createReadStream(CSV_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let header = null;

  for await (const line of rl) {
    if (!header) {
      header = line.split(",");
      continue;
    }
    totalRows++;

    // Simple CSV split – challenge data has no quoted commas in values
    const cols = line.split(",");
    const sessionKey = cols[0];
    const trySeq = parseInt(cols[1], 10) || 1;
    const terminalKey = cols[2];
    const merchantKey = cols[3];
    const categoryId = cols[4];
    const categoryTitle = cols[5];
    const amount = parseInt(cols[6], 10) || 0;
    const adjustedFee = parseInt(cols[7], 10) || 0;
    const sessionStatus = cols[8];
    const tryStatus = cols[9];
    const switchResponseCode = cols[10] || "";
    const pspCode = cols[11] || "";
    const issuerBankCode = cols[12] || "";
    const payerCardKey = cols[13] || "";
    const verifyType = cols[14] || "";
    const createdAt = cols[17] || "";
    const tryCreatedAt = cols[18] || "";

    if (!merchantKey) {
      skippedRows++;
      continue;
    }

    // ── merchant registry ──
    if (!merchants[merchantKey]) {
      merchants[merchantKey] = {
        id: merchantKey,
        categoryId,
        categoryTitle,
        terminals: new Set(),
      };
    }
    merchants[merchantKey].terminals.add(terminalKey);

    // ── category registry ──
    if (!categoryMerchants[categoryId]) {
      categoryMerchants[categoryId] = new Set();
      categoryAgg[categoryId] = {
        title: categoryTitle,
        totalGMV: 0,
        successCount: 0,
        totalSessions: 0,
        totalFee: 0,
      };
    }
    categoryMerchants[categoryId].add(merchantKey);

    // ── date tracking ──
    const dateStr = createdAt.slice(0, 10); // YYYY-MM-DD
    if (dateStr && dateStr < minDate) minDate = dateStr;
    if (dateStr && dateStr > maxDate) maxDate = dateStr;

    // ── session dedup: keep best status per session per merchant ──
    if (!sessionSeen[merchantKey]) sessionSeen[merchantKey] = {};
    const prevStatus = sessionSeen[merchantKey][sessionKey];
    const curSuccess = isSuccess(sessionStatus);
    const isFirstSeen = !prevStatus;
    const upgradedToSuccess = !isFirstSeen && !isSuccess(prevStatus) && curSuccess;

    if (isFirstSeen) {
      sessionSeen[merchantKey][sessionKey] = sessionStatus;
    } else if (upgradedToSuccess) {
      sessionSeen[merchantKey][sessionKey] = sessionStatus;
    }
    // For KPIs we only count session once (on first see or upgrade)

    // ── funnel: every attempt row counts ──
    if (!funnelByMerchant[merchantKey]) {
      funnelByMerchant[merchantKey] = {
        totalAttempts: 0,
        sessionStatuses: {},
        tryStatuses: {},
      };
    }
    const f = funnelByMerchant[merchantKey];
    f.totalAttempts++;
    f.tryStatuses[tryStatus] = (f.tryStatuses[tryStatus] || 0) + 1;
    if (isFirstSeen) {
      f.sessionStatuses[sessionStatus] =
        (f.sessionStatuses[sessionStatus] || 0) + 1;
    } else if (upgradedToSuccess) {
      // fix session status: remove old, add new
      const old = prevStatus;
      f.sessionStatuses[old] = (f.sessionStatuses[old] || 1) - 1;
      f.sessionStatuses[sessionStatus] =
        (f.sessionStatuses[sessionStatus] || 0) + 1;
    }

    // ── response codes ──
    // Only count codes on failed attempts (try_status not Verified/Paid) — a code
    // that also fires on successful attempts is not an "error" driver and must not
    // be surfaced as one.
    if (switchResponseCode && !isSuccess(tryStatus)) {
      if (!responseCodesByMerchant[merchantKey])
        responseCodesByMerchant[merchantKey] = {};
      responseCodesByMerchant[merchantKey][switchResponseCode] =
        (responseCodesByMerchant[merchantKey][switchResponseCode] || 0) + 1;
    }

    // ── PSP ──
    if (pspCode) {
      if (!pspByMerchant[merchantKey]) pspByMerchant[merchantKey] = {};
      pspByMerchant[merchantKey][pspCode] =
        (pspByMerchant[merchantKey][pspCode] || 0) + 1;
    }

    // ── daily/hourly/dow aggregation (session-level, count once) ──
    if (isFirstSeen || upgradedToSuccess) {
      const succ = curSuccess ? 1 : 0;
      const succAmount = curSuccess ? amount : 0;
      const succFee = curSuccess ? adjustedFee : 0;

      // daily
      if (!dailyByMerchant[merchantKey]) dailyByMerchant[merchantKey] = {};
      if (!dailyByMerchant[merchantKey][dateStr]) {
        dailyByMerchant[merchantKey][dateStr] = {
          gmv: 0,
          fee: 0,
          success: 0,
          failed: 0,
        };
      }
      const d = dailyByMerchant[merchantKey][dateStr];
      if (curSuccess) {
        d.gmv += amount;
        d.fee += adjustedFee;
        d.success++;
      } else {
        d.failed++;
      }

      // If upgrading, undo the failed count from first time
      if (upgradedToSuccess) {
        d.failed = Math.max(0, d.failed - 1);
      }

      // hour
      const hour = parseInt(createdAt.slice(11, 13), 10);
      if (!hourByMerchant[merchantKey]) hourByMerchant[merchantKey] = {};
      if (!hourByMerchant[merchantKey][hour]) {
        hourByMerchant[merchantKey][hour] = { gmv: 0, count: 0 };
      }
      if (curSuccess) {
        hourByMerchant[merchantKey][hour].gmv += amount;
        hourByMerchant[merchantKey][hour].count++;
      }

      // day of week — parsed from the same raw date string used for `hour`
      // (no local-timezone conversion), so results are reproducible across machines.
      const y = parseInt(createdAt.slice(0, 4), 10);
      const mo = parseInt(createdAt.slice(5, 7), 10) - 1;
      const da = parseInt(createdAt.slice(8, 10), 10);
      const dow = new Date(Date.UTC(y, mo, da)).getUTCDay(); // 0=Sun
      if (!dowByMerchant[merchantKey]) dowByMerchant[merchantKey] = {};
      if (!dowByMerchant[merchantKey][dow]) {
        dowByMerchant[merchantKey][dow] = { gmv: 0, count: 0 };
      }
      if (curSuccess) {
        dowByMerchant[merchantKey][dow].gmv += amount;
        dowByMerchant[merchantKey][dow].count++;
      }

      // category aggregation
      if (curSuccess) {
        categoryAgg[categoryId].totalGMV += amount;
        categoryAgg[categoryId].successCount++;
        categoryAgg[categoryId].totalFee += adjustedFee;
      }
      if (isFirstSeen) {
        categoryAgg[categoryId].totalSessions++;
      }
    }

    // ── customer tracking (only successful with card) ──
    if (curSuccess && payerCardKey && (isFirstSeen || upgradedToSuccess)) {
      if (!cardPurchases[merchantKey]) cardPurchases[merchantKey] = {};
      if (!cardPurchases[merchantKey][payerCardKey]) {
        cardPurchases[merchantKey][payerCardKey] = [];
      }
      cardPurchases[merchantKey][payerCardKey].push({
        date: dateStr,
        amount,
      });
    }
  }

  console.log(
    `Processed ${totalRows} rows, skipped ${skippedRows}, date range: ${minDate} to ${maxDate}`
  );

  // ── build outputs ──────────────────────────────────────────────────────────

  // 1. Metadata
  const metadata = {
    totalRows,
    skippedRows,
    dateRange: { min: minDate, max: maxDate },
    merchantCount: Object.keys(merchants).length,
    categoryCount: Object.keys(categoryAgg).length,
    generatedAt: new Date().toISOString(),
    methodology: {
      successDefinition:
        "session_status IN ('Verified', 'Paid') – counted once per session_key per merchant",
      currency: "Source amounts in rials. UI displays toman (÷10) with label.",
      adjustedFee:
        "adjusted_fee is NOT real Zarinpal fee. A constant multiplier is applied. Valid for relative comparison only.",
      customerIdentifier:
        "payer_card_key used as anonymous buyer ID where present. Raw keys never exposed.",
    },
  };

  // 2. Merchant list (no sensitive data)
  const merchantList = Object.values(merchants).map((m) => ({
    id: m.id,
    categoryId: m.categoryId,
    categoryTitle: m.categoryTitle,
    terminalCount: m.terminals.size,
  }));

  // 3. Per-merchant aggregates
  if (!fs.existsSync(path.join(OUT_DIR, "merchants"))) {
    fs.mkdirSync(path.join(OUT_DIR, "merchants"), { recursive: true });
  }

  for (const mKey of Object.keys(merchants)) {
    const daily = dailyByMerchant[mKey] || {};
    const hourly = hourByMerchant[mKey] || {};
    const dow = dowByMerchant[mKey] || {};
    const funnel = funnelByMerchant[mKey] || {};
    const codes = responseCodesByMerchant[mKey] || {};
    const psps = pspByMerchant[mKey] || {};

    // KPIs
    let totalGMV = 0,
      totalFee = 0,
      successCount = 0,
      failedCount = 0;
    const dates = Object.keys(daily).sort();
    for (const dt of dates) {
      totalGMV += daily[dt].gmv;
      totalFee += daily[dt].fee;
      successCount += daily[dt].success;
      failedCount += daily[dt].failed;
    }
    const totalSessions = successCount + failedCount;
    const successRate = totalSessions ? successCount / totalSessions : 0;
    const avgOrderValue = successCount ? totalGMV / successCount : 0;

    // Period comparison (first half vs second half)
    const midIdx = Math.floor(dates.length / 2);
    const firstHalf = dates.slice(0, midIdx);
    const secondHalf = dates.slice(midIdx);
    const gmvFirst = firstHalf.reduce((s, d) => s + daily[d].gmv, 0);
    const gmvSecond = secondHalf.reduce((s, d) => s + daily[d].gmv, 0);
    const growthRate = gmvFirst ? (gmvSecond - gmvFirst) / gmvFirst : 0;

    // RFM / customer analysis
    const cards = cardPurchases[mKey] || {};
    const cardKeys = Object.keys(cards);
    const totalCustomers = cardKeys.length;
    let repeatCustomers = 0;
    const rfmSegments = {
      champions: 0,
      loyal: 0,
      promising: 0,
      needAttention: 0,
      atRisk: 0,
      lost: 0,
    };

    const maxDateMs = new Date(maxDate).getTime();
    const rfmScores = [];

    for (const ck of cardKeys) {
      const purchases = cards[ck];
      if (purchases.length > 1) repeatCustomers++;

      const lastDate = purchases
        .map((p) => p.date)
        .sort()
        .reverse()[0];
      const recencyDays = Math.floor(
        (maxDateMs - new Date(lastDate).getTime()) / 86400000
      );
      const frequency = purchases.length;
      const monetary = purchases.reduce((s, p) => s + p.amount, 0);

      rfmScores.push({ recencyDays, frequency, monetary });
    }

    // Score RFM 1-5 using quintiles
    if (rfmScores.length >= 5) {
      const rSorted = rfmScores.map((r) => r.recencyDays).sort((a, b) => a - b);
      const fSorted = rfmScores.map((r) => r.frequency).sort((a, b) => a - b);
      const mSorted = rfmScores.map((r) => r.monetary).sort((a, b) => a - b);

      for (const r of rfmScores) {
        // Recency: lower is better (score 5)
        const rPct = rSorted.indexOf(r.recencyDays) / rSorted.length;
        const rScore = 5 - Math.floor(rPct * 5);
        const fPct = fSorted.indexOf(r.frequency) / fSorted.length;
        const fScore = Math.ceil(fPct * 5) || 1;
        const mPct = mSorted.indexOf(r.monetary) / mSorted.length;
        const mScore = Math.ceil(mPct * 5) || 1;

        if (rScore >= 4 && fScore >= 4 && mScore >= 4) rfmSegments.champions++;
        else if (fScore >= 3 && mScore >= 3) rfmSegments.loyal++;
        else if (rScore >= 4 && fScore <= 2) rfmSegments.promising++;
        else if (rScore >= 2 && rScore <= 3 && fScore >= 2 && fScore <= 3)
          rfmSegments.needAttention++;
        else if (rScore <= 2 && fScore >= 3) rfmSegments.atRisk++;
        else if (rScore <= 1 && fScore <= 2) rfmSegments.lost++;
        else rfmSegments.needAttention++;
      }
    }

    const repeatRate = totalCustomers
      ? repeatCustomers / totalCustomers
      : 0;

    // Monthly aggregation
    const monthly = {};
    for (const dt of dates) {
      const m = dt.slice(0, 7);
      if (!monthly[m])
        monthly[m] = { gmv: 0, fee: 0, success: 0, failed: 0 };
      monthly[m].gmv += daily[dt].gmv;
      monthly[m].fee += daily[dt].fee;
      monthly[m].success += daily[dt].success;
      monthly[m].failed += daily[dt].failed;
    }

    // Peak hour/dow
    let peakHour = 0,
      peakHourGmv = 0;
    for (const h of Object.keys(hourly)) {
      if (hourly[h].gmv > peakHourGmv) {
        peakHour = parseInt(h);
        peakHourGmv = hourly[h].gmv;
      }
    }
    let peakDow = 0,
      peakDowGmv = 0;
    const dowNames = [
      "یکشنبه",
      "دوشنبه",
      "سه‌شنبه",
      "چهارشنبه",
      "پنجشنبه",
      "جمعه",
      "شنبه",
    ];
    for (const d of Object.keys(dow)) {
      if (dow[d].gmv > peakDowGmv) {
        peakDow = parseInt(d);
        peakDowGmv = dow[d].gmv;
      }
    }

    // Top error codes
    const topCodes = Object.entries(codes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, count]) => ({ code, count }));

    // PSP distribution
    const pspDist = Object.entries(psps)
      .sort((a, b) => b[1] - a[1])
      .map(([psp, count]) => ({ psp, count }));

    const merchantData = {
      id: mKey,
      categoryId: merchants[mKey].categoryId,
      categoryTitle: merchants[mKey].categoryTitle,
      kpi: {
        totalGMV,
        totalFee,
        successCount,
        failedCount,
        totalSessions,
        successRate: Math.round(successRate * 10000) / 100,
        avgOrderValue: Math.round(avgOrderValue),
        growthRate: Math.round(growthRate * 10000) / 100,
        periodComparison: {
          firstHalfGMV: gmvFirst,
          secondHalfGMV: gmvSecond,
        },
      },
      daily: Object.entries(daily)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v })),
      monthly: Object.entries(monthly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, ...v })),
      hourly: Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        gmv: (hourly[h] || {}).gmv || 0,
        count: (hourly[h] || {}).count || 0,
      })),
      dayOfWeek: Array.from({ length: 7 }, (_, d) => ({
        day: d,
        name: dowNames[d],
        gmv: (dow[d] || {}).gmv || 0,
        count: (dow[d] || {}).count || 0,
      })),
      peakWindow: {
        hour: peakHour,
        hourLabel: `${peakHour}:00-${peakHour + 1}:00`,
        dayOfWeek: peakDow,
        dayName: dowNames[peakDow],
      },
      customers: {
        totalIdentifiable: totalCustomers,
        repeatCustomers,
        repeatRate: Math.round(repeatRate * 10000) / 100,
        rfmSegments,
        hasEnoughForRFM: rfmScores.length >= 5,
      },
      gatewayHealth: {
        funnel: funnel,
        topResponseCodes: topCodes,
        pspDistribution: pspDist,
      },
    };

    fs.writeFileSync(
      path.join(OUT_DIR, "merchants", `${mKey}.json`),
      JSON.stringify(merchantData)
    );
  }

  // 4. Category benchmarks
  const PRIVACY_THRESHOLD = 3; // minimum merchants for benchmark
  const benchmarks = {};

  for (const [catId, cat] of Object.entries(categoryAgg)) {
    const merchantsInCat = Array.from(categoryMerchants[catId]);
    const merchantCount = merchantsInCat.length;

    if (merchantCount < PRIVACY_THRESHOLD) {
      benchmarks[catId] = {
        title: cat.title,
        merchantCount,
        suppressed: true,
        reason: `تعداد پذیرندگان (${merchantCount}) کمتر از آستانه حریم خصوصی (${PRIVACY_THRESHOLD}) است.`,
      };
      continue;
    }

    // Collect per-merchant GMV for percentile
    const gmvs = [];
    const aovs = [];
    const successRates = [];

    for (const mk of merchantsInCat) {
      const daily = dailyByMerchant[mk] || {};
      let mGmv = 0,
        mSuccess = 0,
        mTotal = 0;
      for (const dt of Object.values(daily)) {
        mGmv += dt.gmv;
        mSuccess += dt.success;
        mTotal += dt.success + dt.failed;
      }
      gmvs.push(mGmv);
      aovs.push(mSuccess ? mGmv / mSuccess : 0);
      successRates.push(mTotal ? mSuccess / mTotal : 0);
    }

    gmvs.sort((a, b) => a - b);
    aovs.sort((a, b) => a - b);
    successRates.sort((a, b) => a - b);

    benchmarks[catId] = {
      title: cat.title,
      merchantCount,
      suppressed: false,
      gmv: {
        p25: percentile(gmvs, 25),
        p50: percentile(gmvs, 50),
        p75: percentile(gmvs, 75),
        p90: percentile(gmvs, 90),
        avg: gmvs.reduce((s, v) => s + v, 0) / gmvs.length,
      },
      aov: {
        p50: percentile(aovs, 50),
        avg: aovs.reduce((s, v) => s + v, 0) / aovs.length,
      },
      successRate: {
        p50: Math.round(percentile(successRates, 50) * 10000) / 100,
        avg:
          Math.round(
            (successRates.reduce((s, v) => s + v, 0) / successRates.length) *
              10000
          ) / 100,
      },
    };
  }

  // Write outputs
  fs.writeFileSync(
    path.join(OUT_DIR, "metadata.json"),
    JSON.stringify(metadata, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "merchants.json"),
    JSON.stringify(merchantList)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "benchmarks.json"),
    JSON.stringify(benchmarks, null, 2)
  );

  console.log(
    `Output: ${merchantList.length} merchants, ${Object.keys(benchmarks).length} categories`
  );
  console.timeEnd("prepare-data");
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
