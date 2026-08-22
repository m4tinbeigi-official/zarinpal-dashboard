import type { MerchantData, Metadata } from "@/lib/types";

// Quotes a CSV field and escapes embedded quotes so Persian text with commas
// or line breaks doesn't corrupt the column layout when opened in Excel.
function csvField(value: string | number): string {
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(csvField).join(",") + "\r\n";
}

function toToman(rials: number): number {
  return Math.round(rials / 10);
}

// Builds a self-contained CSV report for the currently selected merchant and
// date range: a KPI summary block followed by the day-by-day breakdown. This
// lets a merchant keep an offline record or open it in Excel/Sheets without
// needing a backend export endpoint.
export function buildMerchantReportCSV(data: MerchantData, metadata: Metadata | null): string {
  let csv = "﻿"; // UTF-8 BOM so Excel renders Persian text correctly

  csv += csvRow([`گزارش تحلیلی پذیرنده ${data.id}`]);
  csv += csvRow(["دسته", data.categoryTitle]);
  if (data.daily.length) {
    csv += csvRow(["بازه گزارش", data.daily[0].date, "تا", data.daily[data.daily.length - 1].date]);
  }
  if (metadata) {
    csv += csvRow(["زمان تولید گزارش", new Date().toISOString()]);
  }
  csv += "\r\n";

  csv += csvRow(["شاخص", "مقدار"]);
  csv += csvRow(["فروش موفق (تومان)", toToman(data.kpi.totalGMV)]);
  csv += csvRow(["کارمزد تعدیل‌شده (تومان)", toToman(data.kpi.totalFee)]);
  csv += csvRow(["تعداد خرید موفق", data.kpi.successCount]);
  csv += csvRow(["تعداد خرید ناموفق", data.kpi.failedCount]);
  csv += csvRow(["کل جلسات", data.kpi.totalSessions]);
  csv += csvRow(["نرخ موفقیت (٪)", data.kpi.successRate]);
  csv += csvRow(["مبلغ متوسط خرید (تومان)", toToman(data.kpi.avgOrderValue)]);
  csv += csvRow(["روند رشد نیمه دوم نسبت به اول (٪)", data.kpi.growthRate]);
  csv += "\r\n";

  csv += csvRow(["تاریخ", "فروش موفق (تومان)", "کارمزد تعدیل‌شده (تومان)", "تعداد موفق", "تعداد ناموفق"]);
  for (const day of data.daily) {
    csv += csvRow([day.date, toToman(day.gmv), toToman(day.fee), day.success, day.failed]);
  }

  return csv;
}

export function downloadMerchantReportCSV(data: MerchantData, metadata: Metadata | null): void {
  if (typeof window === "undefined") return;
  const csv = buildMerchantReportCSV(data, metadata);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const range = data.daily.length
    ? `${data.daily[0].date}_${data.daily[data.daily.length - 1].date}`
    : "full";
  link.href = url;
  link.download = `zarinpal-report-${data.id}-${range}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
