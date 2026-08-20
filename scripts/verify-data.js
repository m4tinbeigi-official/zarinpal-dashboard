#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const dataDir = path.resolve(__dirname, "../public/data");
const merchants = JSON.parse(fs.readFileSync(path.join(dataDir, "merchants.json"), "utf8"));
const metadata = JSON.parse(fs.readFileSync(path.join(dataDir, "metadata.json"), "utf8"));
const benchmarks = JSON.parse(fs.readFileSync(path.join(dataDir, "benchmarks.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(metadata.totalRows === 2213289, "Unexpected source row count");
assert(merchants.length === metadata.merchantCount, "Merchant list count differs from metadata");
assert(metadata.methodology.currency.includes("toman"), "Currency methodology is missing");
assert(metadata.methodology.adjustedFee.includes("NOT real"), "Adjusted fee warning is missing");

let gmv = 0;
let successfulSessions = 0;
let totalSessions = 0;

for (const merchant of merchants) {
  const file = path.join(dataDir, "merchants", `${merchant.id}.json`);
  assert(fs.existsSync(file), `Missing merchant artifact: ${merchant.id}`);
  const payload = fs.readFileSync(file, "utf8");
  assert(!payload.includes("CARD-"), `Sensitive card key leaked in ${merchant.id}`);
  assert(!payload.includes("payer_card_key"), `Raw customer field leaked in ${merchant.id}`);

  const data = JSON.parse(payload);
  const dailyGMV = data.daily.reduce((sum, day) => sum + day.gmv, 0);
  const dailySuccess = data.daily.reduce((sum, day) => sum + day.success, 0);
  const dailyFailed = data.daily.reduce((sum, day) => sum + day.failed, 0);

  assert(dailyGMV === data.kpi.totalGMV, `GMV aggregate mismatch for ${merchant.id}`);
  assert(dailySuccess === data.kpi.successCount, `Success aggregate mismatch for ${merchant.id}`);
  assert(dailyFailed === data.kpi.failedCount, `Failed aggregate mismatch for ${merchant.id}`);
  assert(data.kpi.totalSessions === dailySuccess + dailyFailed, `Session total mismatch for ${merchant.id}`);
  assert(Math.abs(data.kpi.avgOrderValue - Math.round(data.kpi.totalGMV / Math.max(data.kpi.successCount, 1))) <= 1, `AOV mismatch for ${merchant.id}`);

  gmv += data.kpi.totalGMV;
  successfulSessions += data.kpi.successCount;
  totalSessions += data.kpi.totalSessions;
}

assert(Object.keys(benchmarks).length === metadata.categoryCount, "Benchmark category count differs from metadata");
console.log(JSON.stringify({
  result: "pass",
  merchants: merchants.length,
  sourceRows: metadata.totalRows,
  totalGMV: gmv,
  successfulSessions,
  totalSessions,
  successRate: Number(((successfulSessions / totalSessions) * 100).toFixed(2)),
  sensitiveDataLeak: false
}, null, 2));
