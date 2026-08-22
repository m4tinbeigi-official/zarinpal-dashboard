"use client";
import type { MerchantData, Metadata } from "@/lib/types";
import { formatTomanShort, formatPercent, formatNumber, growthLabel, toPersianNum } from "@/lib/format";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function KPICard({ title, value, sub, color, evidence }: {
  title: string; value: string; sub?: string; color: string; evidence: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 lg:p-5 hover:shadow-md transition group relative">
      <p className="text-xs text-muted mb-1">{title}</p>
      <p className={`text-xl lg:text-2xl font-black fa-num ${color}`}>{value}</p>
      {sub && <p className="text-xs mt-1 fa-num text-muted">{sub}</p>}
      <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition">
        <div className="bg-zp-dark text-white text-[10px] px-2 py-1 rounded-lg max-w-[200px] whitespace-pre-wrap">
          {evidence}
        </div>
      </div>
    </div>
  );
}

export default function Overview({ data, dateFiltered }: { data: MerchantData; metadata: Metadata | null; dateFiltered: boolean }) {
  const k = data.kpi;
  const growth = growthLabel(k.growthRate);

  const chartData = data.monthly.map((m) => ({
    name: m.month,
    gmv: Math.round(m.gmv / 10_000_000),
    success: m.success,
  }));

  return (
    <div className="space-y-6">
      {dateFiltered && <div className="bg-zp-info/5 border border-zp-info/20 rounded-xl p-3 text-xs">شاخص‌های فروش و نمودارهای این صفحه بر اساس بازه زمانی انتخابی محاسبه شده‌اند. شاخص‌های مشتری در خلاصه مدیریتی، همچنان بر پایه کل بازه دیتاست هستند.</div>}
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <KPICard
          title="فروش موفق (تومان)"
          value={formatTomanShort(k.totalGMV)}
          color="text-zp-navy"
          evidence={`مجموع amount جلسات Verified/Paid ÷ 10\nستون: amount, session_status\nفیلتر: merchant=${data.id}`}
        />
        <KPICard
          title="تعداد خرید موفق"
          value={formatNumber(k.successCount)}
          color="text-zp-navy"
          evidence={`شمارش session_key یکتا با session_status=Verified|Paid\nبدون double-count retry`}
        />
        <KPICard
          title="نرخ موفقیت"
          value={formatPercent(k.successRate)}
          color={k.successRate >= 50 ? "text-zp-success" : "text-zp-danger"}
          evidence={`موفق ÷ (موفق + ناموفق) × 100\n${toPersianNum(k.successCount)} ÷ ${toPersianNum(k.totalSessions)}`}
        />
        <KPICard
          title="مبلغ متوسط خرید"
          value={formatTomanShort(k.avgOrderValue)}
          color="text-zp-navy"
          evidence={`GMV ÷ تعداد خرید موفق\nبه ریال و نمایش تومانی`}
        />
        <KPICard
          title="روند رشد"
          value={growth.text}
          sub="نیمه دوم نسبت به اول"
          color={growth.positive ? "text-zp-success" : "text-zp-danger"}
          evidence={`نیمه اول: ${formatTomanShort(k.periodComparison.firstHalfGMV)}\nنیمه دوم: ${formatTomanShort(k.periodComparison.secondHalfGMV)}\n(دوم - اول) ÷ اول × 100`}
        />
      </div>

      {/* Adjusted Fee Warning */}
      <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-3 text-sm">
        <span className="font-bold text-zp-warning">⚠ کارمزد تعدیل‌شده: </span>
        مقدار adjusted_fee کارمزد واقعی زرین‌پال نیست. ضریب ثابتی اعمال شده و فقط برای مقایسه نسبی معتبر است.
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 lg:p-6">
        <h3 className="font-bold text-zp-navy mb-4">روند ماهانه فروش موفق</h3>
        <div className="h-64 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD100" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FFD100" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: any) => [toPersianNum(v.toLocaleString()) + " (×۱۰ میلیون تومان)", "فروش"]}
                labelFormatter={(l) => `ماه ${l}`}
              />
              <Area type="monotone" dataKey="gmv" stroke="#FFD100" fill="url(#gmvGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted mt-2">
          واحد: ده‌میلیون تومان · منبع: مجموع amount جلسات موفق هر ماه ÷ 10
        </p>
      </div>

      {/* Executive Digest */}
      <div className="bg-zp-info/5 border border-zp-info/20 rounded-2xl p-4 lg:p-6">
        <h3 className="font-bold text-zp-info mb-3">خلاصه مدیریتی</h3>
        <ul className="space-y-2 text-sm">
          <li>
            ✅ فروش کل موفق این پذیرنده <b className="fa-num">{formatTomanShort(k.totalGMV)}</b> با{" "}
            <b className="fa-num">{formatNumber(k.successCount)}</b> خرید موفق بوده است.
          </li>
          <li>
            {k.successRate >= 50 ? "✅" : "⚠️"} نرخ موفقیت پرداخت{" "}
            <b className="fa-num">{formatPercent(k.successRate)}</b>{" "}
            {k.successRate < 50 ? "که پایین‌تر از حد مطلوب است." : "است."}
          </li>
          <li>
            {growth.positive ? "📈" : "📉"} روند فروش نیمه دوم نسبت به اول{" "}
            <b className="fa-num">{growth.text}</b> تغییر داشته.
          </li>
          <li>
            👥 از <b className="fa-num">{formatNumber(data.customers.totalIdentifiable)}</b> مشتری شناسایی‌شده،{" "}
            <b className="fa-num">{formatPercent(data.customers.repeatRate)}</b> خرید مجدد داشته‌اند.
          </li>
          <li>
            ⏰ پرفروش‌ترین زمان: <b>{data.peakWindow.dayName}</b> ساعت{" "}
            <b className="fa-num">{data.peakWindow.hourLabel}</b>
          </li>
        </ul>
      </div>
    </div>
  );
}
