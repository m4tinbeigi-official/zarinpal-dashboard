"use client";
import type { MerchantData, BenchmarkData } from "@/lib/types";
import { formatTomanShort, formatPercent, toPersianNum } from "@/lib/format";

function Gauge({ label, value, avg, p50, unit }: {
  label: string; value: number; avg: number; p50: number; unit: "toman" | "percent";
}) {
  const fmt = unit === "toman"
    ? (v: number) => formatTomanShort(v)
    : (v: number) => formatPercent(v);
  const ratio = avg > 0 ? ((value - avg) / avg) * 100 : 0;
  const above = ratio >= 0;

  return (
    <div className="bg-white rounded-2xl border border-border p-4">
      <p className="text-xs text-muted mb-2">{label}</p>
      <p className="text-xl font-black text-zp-navy fa-num">{fmt(value)}</p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted">میانگین صنف</span>
          <span className="fa-num">{fmt(avg)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">میانه صنف</span>
          <span className="fa-num">{fmt(p50)}</span>
        </div>
        <div className={`flex justify-between font-bold ${above ? "text-zp-success" : "text-zp-danger"}`}>
          <span>اختلاف با میانگین</span>
          <span className="fa-num">{above ? "+" : ""}{toPersianNum(ratio.toFixed(1))}٪</span>
        </div>
      </div>
    </div>
  );
}

export default function Benchmark({
  data, benchmarks, dateFiltered,
}: { data: MerchantData; benchmarks: Record<string, BenchmarkData>; dateFiltered: boolean }) {
  const catBench = benchmarks[data.categoryId];

  if (!catBench) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-muted">دسته‌بندی صنفی برای این پذیرنده یافت نشد.</p>
      </div>
    );
  }

  if (catBench.suppressed) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zp-navy">مقایسه صنفی</h2>
        <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-2xl p-6 text-center">
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-bold text-zp-navy mb-2">حفظ محرمانگی</p>
          <p className="text-sm text-muted">{catBench.reason}</p>
          <p className="text-xs text-muted mt-2">
            برای حفظ حریم خصوصی، بنچ‌مارک دسته‌هایی با تعداد پذیرنده کمتر از آستانه تعریف‌شده پنهان می‌شود.
          </p>
        </div>
      </div>
    );
  }

  const k = data.kpi;

  // Calculate percentile position for GMV
  const gmvBench = catBench.gmv!;
  let percentileRank = 50;
  if (k.totalGMV >= gmvBench.p90) percentileRank = 95;
  else if (k.totalGMV >= gmvBench.p75) percentileRank = 75 + 15 * (k.totalGMV - gmvBench.p75) / (gmvBench.p90 - gmvBench.p75);
  else if (k.totalGMV >= gmvBench.p50) percentileRank = 50 + 25 * (k.totalGMV - gmvBench.p50) / (gmvBench.p75 - gmvBench.p50);
  else if (k.totalGMV >= gmvBench.p25) percentileRank = 25 + 25 * (k.totalGMV - gmvBench.p25) / (gmvBench.p50 - gmvBench.p25);
  else percentileRank = 25 * k.totalGMV / (gmvBench.p25 || 1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zp-navy">مقایسه صنفی – {catBench.title}</h2>
      {dateFiltered && <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-3 text-xs">مقادیر پذیرنده با بازه انتخابی بازحساب شده‌اند، اما benchmark صنفی به دلیل نبود artifact ماهانه صنف بر کل بازه دیتاست است.</div>}

      {/* Percentile Card */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-32 h-32 rounded-full border-8 border-zp-yellow flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-black text-zp-navy fa-num">{toPersianNum(Math.round(percentileRank))}</p>
              <p className="text-xs text-muted">صدک</p>
            </div>
          </div>
          <div className="flex-1 text-center lg:text-right">
            <p className="text-lg font-bold text-zp-navy">
              شما در صدک <span className="fa-num">{toPersianNum(Math.round(percentileRank))}</span> صنف
              «{catBench.title}» قرار دارید.
            </p>
            <p className="text-sm text-muted mt-2">
              از بین <span className="fa-num">{toPersianNum(catBench.merchantCount)}</span> پذیرنده فعال در این صنف
              {percentileRank >= 75 && " · شما جزو چارک برتر هستید 🎯"}
            </p>
            <p className="text-[10px] text-muted mt-3">
              تخمین صدک بر اساس GMV و چارک‌های تجمیعی صنف · هیچ داده خام رقیب نمایش داده نمی‌شود
            </p>
          </div>
        </div>
      </div>

      {/* KPI Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Gauge
          label="فروش کل"
          value={k.totalGMV}
          avg={gmvBench.avg}
          p50={gmvBench.p50}
          unit="toman"
        />
        <Gauge
          label="مبلغ متوسط خرید"
          value={k.avgOrderValue}
          avg={catBench.aov!.avg}
          p50={catBench.aov!.p50}
          unit="toman"
        />
        <Gauge
          label="نرخ موفقیت"
          value={k.successRate}
          avg={catBench.successRate!.avg}
          p50={catBench.successRate!.p50}
          unit="percent"
        />
      </div>

      {/* Privacy Note */}
      <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted">
        <b>حریم خصوصی:</b> مقادیر صنفی تجمیعی (صدک و میانگین) از کل پذیرندگان محاسبه شده‌اند.
        هیچ شناسه، نام تجاری یا رکورد خام رقیب قابل مشاهده نیست.
        دسته‌هایی با کمتر از ۳ پذیرنده از مقایسه حذف می‌شوند.
      </div>
    </div>
  );
}
