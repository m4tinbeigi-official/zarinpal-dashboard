"use client";
import type { AlertItem, AlertSeverity, MerchantData } from "@/lib/types";
import { generateAlerts } from "@/lib/alerts";

const SEVERITY_STYLE: Record<AlertSeverity, { icon: string; badge: string; card: string }> = {
  critical: { icon: "🔴", badge: "bg-zp-danger/10 text-zp-danger", card: "border-zp-danger/30" },
  warning: { icon: "🟠", badge: "bg-zp-warning/10 text-zp-warning", card: "border-zp-warning/30" },
  opportunity: { icon: "🟢", badge: "bg-zp-success/10 text-zp-success", card: "border-zp-success/30" },
  info: { icon: "🔵", badge: "bg-zp-info/10 text-zp-info", card: "border-zp-info/20" },
};

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: "بحرانی",
  warning: "هشدار",
  opportunity: "فرصت",
  info: "اطلاعات",
};

function AlertCard({ item }: { item: AlertItem }) {
  const style = SEVERITY_STYLE[item.severity];
  return (
    <div className={`bg-white rounded-2xl border p-4 space-y-2 shadow-sm transition hover:shadow-md ${style.card}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-sm text-zp-navy flex items-center gap-2">
          <span>{style.icon}</span>
          {item.title}
        </p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${style.badge}`}>
          {SEVERITY_LABEL[item.severity]}
        </span>
      </div>
      <p className="text-sm">{item.text}</p>
      <div className="bg-gray-50 rounded-xl p-3">
        <p className="text-xs text-muted mb-1">🔍 شواهد و منبع داده</p>
        <p className="text-xs">{item.evidence}</p>
      </div>
      <div className="bg-zp-info/5 border border-zp-info/20 rounded-xl p-3">
        <p className="text-xs text-muted mb-1">💡 اقدام پیشنهادی</p>
        <p className="text-sm">{item.action}</p>
      </div>
    </div>
  );
}

export default function Alerts({ data, dateFiltered }: { data: MerchantData; dateFiltered: boolean }) {
  const alerts = generateAlerts(data);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zp-navy">هشدارها و فرصت‌ها</h2>
      <div className="bg-zp-info/5 border border-zp-info/20 rounded-xl p-3 text-sm">
        <b>توجه:</b> این کارت‌ها از قواعد آماری قطعی روی داده همین پذیرنده ساخته می‌شوند (بدون مدل زبانی)؛
        فقط مواردی که از یک آستانه معنادار عبور کرده باشند نمایش داده می‌شوند.
      </div>
      {dateFiltered && (
        <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-3 text-xs">
          هشدارهای روند و روزانه از بازه انتخابی محاسبه می‌شوند. هشدارهای مربوط به تأیید پرداخت، کد خطا و ریزش مشتری از تجمیع کل بازه دیتاست استفاده می‌کنند، مطابق با سایر بخش‌های داشبورد.
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center text-center py-20 gap-2">
          <p className="text-4xl mb-1">✅</p>
          <p className="text-zp-navy font-medium">در حال حاضر هیچ هشدار یا فرصت قابل‌توجهی شناسایی نشده است.</p>
          <p className="text-muted text-sm">همه شاخص‌های کلیدی در محدوده طبیعی قرار دارند.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alerts.map((item) => (
            <AlertCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
