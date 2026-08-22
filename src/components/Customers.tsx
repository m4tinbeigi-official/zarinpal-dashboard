"use client";
import type { MerchantData } from "@/lib/types";
import { formatNumber, formatPercent, toPersianNum } from "@/lib/format";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const SEGMENT_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  champions: { label: "قهرمانان", color: "#10B981", desc: "تازه‌ترین خرید، بالاترین تکرار و مبلغ" },
  loyal: { label: "وفادار", color: "#6366F1", desc: "تکرار و مبلغ بالا" },
  promising: { label: "نویدبخش", color: "#FFD100", desc: "خرید اخیر ولی تکرار کم" },
  needAttention: { label: "نیازمند توجه", color: "#F59E0B", desc: "ریسک متوسط" },
  atRisk: { label: "در معرض ریزش", color: "#F43F5E", desc: "قبلاً فعال بوده‌اند ولی مدتی نیامده‌اند" },
  lost: { label: "از دست رفته", color: "#94A3B8", desc: "خرید قدیمی و تکرار کم" },
};

export default function Customers({ data, dateFiltered }: { data: MerchantData; dateFiltered: boolean }) {
  const c = data.customers;

  if (!c.totalIdentifiable) {
    return (
      <div className="flex flex-col items-center text-center py-20 gap-2">
        <p className="text-4xl mb-1">👥</p>
        <p className="text-zp-navy font-medium">داده مشتری شناسایی‌شده برای این پذیرنده موجود نیست.</p>
        <p className="text-muted text-sm max-w-sm">شناسه یکتای کارت خریدار (payer_card_key) در تراکنش‌های این پذیرنده ثبت نشده، بنابراین تحلیل رفتار مشتری قابل محاسبه نیست.</p>
      </div>
    );
  }

  const rfmData = Object.entries(c.rfmSegments)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: SEGMENT_LABELS[key]?.label || key,
      value,
      color: SEGMENT_LABELS[key]?.color || "#ccc",
    }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zp-navy">تحلیل رفتار مشتریان</h2>

      {dateFiltered && <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-3 text-xs">شاخص‌های مشتری، بخش‌بندی RFM و نرخ خرید مجدد بر اساس کل بازه دیتاست محاسبه شده‌اند؛ فیلتر تاریخ فعلی فقط روی KPIها و تحلیل زمانی اثر می‌گذارد.</div>}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs text-muted">مشتریان شناسایی‌شده</p>
          <p className="text-2xl font-black text-zp-navy fa-num">{formatNumber(c.totalIdentifiable)}</p>
          <p className="text-[10px] text-muted">بر اساس payer_card_key یکتا</p>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs text-muted">مشتریان تکراری</p>
          <p className="text-2xl font-black text-zp-info fa-num">{formatNumber(c.repeatCustomers)}</p>
          <p className="text-[10px] text-muted">بیش از یک خرید موفق</p>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs text-muted">نرخ خرید مجدد</p>
          <p className={`text-2xl font-black fa-num ${c.repeatRate > 20 ? "text-zp-success" : "text-zp-warning"}`}>
            {formatPercent(c.repeatRate)}
          </p>
          <p className="text-[10px] text-muted">تکراری ÷ کل شناسایی‌شده</p>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
          <p className="text-xs text-muted">مشتریان در معرض ریزش</p>
          <p className="text-2xl font-black text-zp-danger fa-num">
            {formatNumber(c.rfmSegments.atRisk + c.rfmSegments.lost)}
          </p>
          <p className="text-[10px] text-muted">atRisk + lost در مدل RFM</p>
        </div>
      </div>

      {/* RFM Chart + Table */}
      {c.hasEnoughForRFM ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
            <h3 className="font-bold text-zp-navy mb-3">بخش‌بندی RFM مشتریان</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rfmData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${toPersianNum(Math.round((percent??0) * 100))}٪`}
                    labelLine={false}
                  >
                    {rfmData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [toPersianNum(v), "نفر"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
            <h3 className="font-bold text-zp-navy mb-3">جزئیات بخش‌ها</h3>
            <div className="space-y-2">
              {Object.entries(SEGMENT_LABELS).map(([key, seg]) => {
                const val = c.rfmSegments[key as keyof typeof c.rfmSegments] || 0;
                const pct = c.totalIdentifiable ? (val / c.totalIdentifiable) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{seg.label}</span>
                        <span className="text-sm fa-num text-muted">{formatNumber(val)} ({toPersianNum(pct.toFixed(1))}٪)</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: seg.color }} />
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">{seg.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-4 text-sm">
          ⚠️ تعداد مشتریان شناسایی‌شده ({toPersianNum(c.totalIdentifiable)}) برای بخش‌بندی RFM معتبر کافی نیست. حداقل ۵ مشتری لازم است.
        </div>
      )}

      {/* Methodology */}
      <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted space-y-1">
        <p><b>روش محاسبه:</b></p>
        <p>• شناسایی مشتری: payer_card_key یکتا از خریدهای موفق (Verified/Paid)</p>
        <p>• نرخ خرید مجدد: مشتریانی با بیش از ۱ خرید موفق ÷ کل مشتریان</p>
        <p>• RFM: امتیاز ۱-۵ بر اساس تازگی، تکرار و مبلغ خرید · ۶ بخش</p>
        <p>• شناسه کارت خام هرگز نمایش داده نمی‌شود</p>
      </div>
    </div>
  );
}
