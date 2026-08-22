import type { AlertItem, MerchantData } from "@/lib/types";

const MIN_DAYS_FOR_TREND = 14;
const MIN_SESSIONS_FOR_DAY = 5;

function successRate(success: number, failed: number): number {
  const total = success + failed;
  return total ? (success / total) * 100 : 0;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

function average(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

// Compares the most recent 7-day window against the 7 days before it to catch
// a recent, sustained shift in success rate rather than single-day noise.
function detectRecentSuccessRateShift(data: MerchantData): AlertItem | null {
  const daily = data.daily;
  if (daily.length < MIN_DAYS_FOR_TREND) return null;

  const recent = daily.slice(-7);
  const prior = daily.slice(-14, -7);
  const recentRate = successRate(sum(recent.map((d) => d.success)), sum(recent.map((d) => d.failed)));
  const priorRate = successRate(sum(prior.map((d) => d.success)), sum(prior.map((d) => d.failed)));
  const recentSessions = sum(recent.map((d) => d.success + d.failed));
  const priorSessions = sum(prior.map((d) => d.success + d.failed));
  if (recentSessions < MIN_SESSIONS_FOR_DAY || priorSessions < MIN_SESSIONS_FOR_DAY) return null;

  const delta = recentRate - priorRate;
  if (delta <= -10) {
    return {
      id: "success-rate-drop",
      severity: "critical",
      title: "افت نرخ موفقیت در هفته اخیر",
      text: `نرخ موفقیت ۷ روز اخیر (${recentRate.toFixed(1)}٪) نسبت به ۷ روز قبل از آن (${priorRate.toFixed(1)}٪) حدود ${Math.abs(delta).toFixed(1)} واحد درصد افت کرده است.`,
      evidence: `مقایسه success ÷ (success+failed) بین دو پنجره ۷ روزه از تجمیع روزانه (${recent[0]?.date} تا ${recent[recent.length - 1]?.date} در برابر ${prior[0]?.date} تا ${prior[prior.length - 1]?.date}).`,
      action: "بررسی کنید آیا این افت با یک PSP، بانک یا تغییر خاصی همزمان بوده است. کدهای خطای پرتکرار را در «سلامت درگاه» مرور کنید.",
    };
  }
  if (delta >= 10) {
    return {
      id: "success-rate-improvement",
      severity: "opportunity",
      title: "بهبود نرخ موفقیت در هفته اخیر",
      text: `نرخ موفقیت ۷ روز اخیر (${recentRate.toFixed(1)}٪) نسبت به ۷ روز قبل از آن (${priorRate.toFixed(1)}٪) حدود ${delta.toFixed(1)} واحد درصد بهبود یافته است.`,
      evidence: `مقایسه success ÷ (success+failed) بین دو پنجره ۷ روزه از تجمیع روزانه.`,
      action: "هر تغییری که اخیراً روی درگاه یا فرآیند پرداخت اعمال کرده‌اید را مستند کنید تا در آینده تکرارپذیر باشد.",
    };
  }
  return null;
}

// Flags the single worst day in the active window when it is far below the
// period average, since that kind of one-day collapse is easy to miss in an
// aggregate KPI or a smoothed chart.
function detectWorstDay(data: MerchantData): AlertItem | null {
  const daily = data.daily.filter((d) => d.success + d.failed >= MIN_SESSIONS_FOR_DAY);
  if (daily.length < 5) return null;

  const rates = daily.map((d) => successRate(d.success, d.failed));
  const avgRate = average(rates);
  let worstIdx = 0;
  for (let i = 1; i < rates.length; i++) {
    if (rates[i] < rates[worstIdx]) worstIdx = i;
  }
  const worstDay = daily[worstIdx];
  const worstRate = rates[worstIdx];
  const gap = avgRate - worstRate;
  if (gap < 25) return null;

  return {
    id: "worst-day",
    severity: "warning",
    title: "روز با کمترین نرخ موفقیت در بازه",
    text: `در تاریخ ${worstDay.date} نرخ موفقیت ${worstRate.toFixed(1)}٪ بوده که ${gap.toFixed(1)} واحد درصد پایین‌تر از میانگین بازه (${avgRate.toFixed(1)}٪) است.`,
    evidence: `از میان ${daily.length} روز با حداقل ${MIN_SESSIONS_FOR_DAY} جلسه، کمترین success÷(success+failed) در همین روز ثبت شده است.`,
    action: "لاگ درگاه و کدهای خطای همان روز را بررسی کنید تا مشخص شود مشکل از سمت PSP، بانک یا زیرساخت شما بوده است.",
  };
}

// "Paid" sessions captured the money but never reached "Verified" — this is
// the recovery gap: the merchant may need to verify manually before ZarinPal
// auto-reverses the amount back to the customer.
function detectUnverifiedPaidSessions(data: MerchantData): AlertItem | null {
  const statuses = data.gatewayHealth.funnel.sessionStatuses;
  const paid = statuses["Paid"] || 0;
  const verified = statuses["Verified"] || 0;
  const settled = paid + verified;
  if (!paid || !settled) return null;

  const paidShare = (paid / settled) * 100;
  if (paidShare < 3) return null;

  return {
    id: "unverified-paid-sessions",
    severity: paidShare >= 10 ? "critical" : "warning",
    title: "جلسات پرداخت‌شده بدون تأیید نهایی (Paid)",
    text: `${paid.toLocaleString("fa-IR")} جلسه با وضعیت Paid ثبت شده است (${paidShare.toFixed(1)}٪ از کل جلسات موفق) که مبلغ از مشتری کسر شده اما هنوز به‌عنوان Verified تأیید نشده است.`,
    evidence: `شمارش session_status=Paid در برابر مجموع Paid+Verified از داده «سلامت درگاه» همین پذیرنده.`,
    action: "این جلسات را در سامانه زرین‌پال به‌صورت دستی verify کنید؛ در غیر این صورت مبلغ ممکن است به‌صورت خودکار به کارت مشتری بازگردد و سفارش نافرجام بماند.",
  };
}

// A single dominant failure code is usually a fixable, single-cause problem
// (a specific bank/PSP issue) rather than generic payment friction.
function detectDominantErrorCode(data: MerchantData): AlertItem | null {
  const codes = data.gatewayHealth.topResponseCodes;
  if (!codes.length) return null;
  const totalFailed = sum(codes.map((c) => c.count));
  if (totalFailed < 10) return null;
  const top = codes[0];
  const share = (top.count / totalFailed) * 100;
  if (share < 35) return null;

  return {
    id: "dominant-error-code",
    severity: "warning",
    title: "تمرکز شکست‌ها روی یک کد خطا",
    text: `کد خطای ${top.code} به‌تنهایی ${share.toFixed(1)}٪ از تلاش‌های ناموفق (${top.count.toLocaleString("fa-IR")} مورد) را تشکیل می‌دهد.`,
    evidence: `از switch_response_code در تلاش‌های ناموفق؛ سهم پرتکرارترین کد از مجموع کدهای ثبت‌شده در «سلامت درگاه».`,
    action: "این کد خطا را در مستندات PSP بررسی کنید؛ رفع همین یک علت می‌تواند بخش بزرگی از شکست‌های پرداخت را حل کند.",
  };
}

// Concentration of at-risk/lost customers signals revenue that is quietly
// eroding even while headline KPIs (like total GMV) still look fine.
function detectChurnRisk(data: MerchantData): AlertItem | null {
  const c = data.customers;
  if (!c.hasEnoughForRFM || !c.totalIdentifiable) return null;
  const atRisk = c.rfmSegments.atRisk + c.rfmSegments.lost;
  const share = (atRisk / c.totalIdentifiable) * 100;
  if (share < 30) return null;

  return {
    id: "churn-risk",
    severity: share >= 50 ? "critical" : "warning",
    title: "سهم بالای مشتریان در معرض ریزش",
    text: `${atRisk.toLocaleString("fa-IR")} مشتری (${share.toFixed(1)}٪ از مشتریان شناسایی‌شده) در بخش «در معرض ریزش» یا «از دست رفته» مدل RFM قرار دارند.`,
    evidence: `مجموع بخش‌های atRisk و lost از بخش‌بندی RFM ÷ کل مشتریان شناسایی‌شده (payer_card_key).`,
    action: "برای این گروه کمپین بازگشت (تخفیف یا پیامک یادآوری) طراحی کنید؛ حفظ مشتری فعلی معمولاً ارزان‌تر از جذب مشتری جدید است.",
  };
}

const severityRank: Record<AlertItem["severity"], number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
  info: 3,
};

export function generateAlerts(data: MerchantData): AlertItem[] {
  const detectors = [
    detectRecentSuccessRateShift,
    detectUnverifiedPaidSessions,
    detectWorstDay,
    detectDominantErrorCode,
    detectChurnRisk,
  ];

  const alerts = detectors
    .map((detect) => detect(data))
    .filter((a): a is AlertItem => a !== null);

  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}
