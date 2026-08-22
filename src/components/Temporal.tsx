"use client";
import type { MerchantData } from "@/lib/types";
import { toPersianNum } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function Temporal({ data, dateFiltered }: { data: MerchantData; dateFiltered: boolean }) {
  // Daily trend (last 60 days for readability)
  const dailyChart = data.daily.slice(-60).map((d) => ({
    date: d.date.slice(5),
    gmv: Math.round(d.gmv / 10_000_000),
    count: d.success,
  }));

  // Hourly
  const hourlyChart = data.hourly.map((h) => ({
    hour: `${h.hour}`,
    count: h.count,
    gmv: Math.round(h.gmv / 10_000_000),
  }));

  // Day of week
  const dowChart = data.dayOfWeek.map((d) => ({
    name: d.name,
    count: d.count,
    gmv: Math.round(d.gmv / 10_000_000),
  }));

  // Monthly
  const monthlyChart = data.monthly.map((m) => ({
    month: m.month,
    gmv: Math.round(m.gmv / 10_000_000),
    success: m.success,
    failed: m.failed,
    rate: m.success + m.failed > 0 ? Math.round((m.success / (m.success + m.failed)) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zp-navy">تحلیل زمانی و الگوهای فروش</h2>
      {dateFiltered && <div className="bg-zp-info/5 border border-zp-info/20 rounded-xl p-3 text-xs">روند روزانه و ماهانه بر اساس بازه زمانی انتخابی محاسبه شده‌اند. توزیع ساعتی و روزهای هفته فعلاً فقط برای کل بازه دیتاست در دسترس است.</div>}

      {/* Peak Window */}
      <div className="bg-zp-yellow/10 border border-zp-yellow/30 rounded-2xl p-4">
        <p className="text-sm">
          🔥 <b>پنجره اوج فروش:</b>{" "}
          <span className="font-bold">{data.peakWindow.dayName}</span> ساعت{" "}
          <span className="font-bold fa-num">{data.peakWindow.hourLabel}</span>
        </p>
        <p className="text-xs text-muted mt-1">
          بر اساس مجموع فروش موفق در هر ساعت و روز هفته · مناسب برای زمان‌بندی کمپین تبلیغاتی
        </p>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 lg:p-6">
        <h3 className="font-bold text-zp-navy mb-3">روند ماهانه</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any, name: any) => [
                toPersianNum(v.toLocaleString()),
                name === "gmv" ? "فروش (×۱۰م تومان)" : name === "success" ? "موفق" : "ناموفق"
              ]} />
              <Bar dataKey="gmv" fill="#FFD100" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted mt-2">واحد: ده‌میلیون تومان</p>
      </div>

      {/* Daily Trend (recent) */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-4 lg:p-6">
        <h3 className="font-bold text-zp-navy mb-3">روند روزانه (۶۰ روز اخیر)</h3>
        <div className="h-56 overflow-x-auto">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyChart}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => [toPersianNum(v.toLocaleString()) + " (×۱۰م)", "فروش"]} />
              <Line type="monotone" dataKey="gmv" stroke="#1E293B" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Distribution */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <h3 className="font-bold text-zp-navy mb-3">توزیع ساعتی خرید موفق</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyChart}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [toPersianNum(v), "تعداد"]} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <h3 className="font-bold text-zp-navy mb-3">توزیع روزهای هفته</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowChart}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [toPersianNum(v), "تعداد"]} />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Seasonality Note */}
      <div className="bg-zp-info/5 border border-zp-info/20 rounded-xl p-3 text-sm">
        <b>توجه:</b> بازه داده ژانویه تا ژوئن ۲۰۲۶ (میلادی) است. تحلیل نوروز/جلالی به دلیل
        عدم پوشش کامل سال شمسی قابل ارائه نیست. الگوهای فصلی بر اساس ماه‌های میلادی موجود نمایش داده شده‌اند.
      </div>
    </div>
  );
}
