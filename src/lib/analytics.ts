import type { DailyData, MerchantData, MerchantKPI } from "@/lib/types";

export function clampDate(value: string, min: string, max: string) {
  if (!value || value < min) return min;
  if (value > max) return max;
  return value;
}

export function calculateKpi(daily: DailyData[]): MerchantKPI {
  const totalGMV = daily.reduce((sum, day) => sum + day.gmv, 0);
  const totalFee = daily.reduce((sum, day) => sum + day.fee, 0);
  const successCount = daily.reduce((sum, day) => sum + day.success, 0);
  const failedCount = daily.reduce((sum, day) => sum + day.failed, 0);
  const totalSessions = successCount + failedCount;
  const midpoint = Math.floor(daily.length / 2);
  const firstHalfGMV = daily.slice(0, midpoint).reduce((sum, day) => sum + day.gmv, 0);
  const secondHalfGMV = daily.slice(midpoint).reduce((sum, day) => sum + day.gmv, 0);

  return {
    totalGMV,
    totalFee,
    successCount,
    failedCount,
    totalSessions,
    successRate: totalSessions ? Math.round((successCount / totalSessions) * 10000) / 100 : 0,
    avgOrderValue: successCount ? Math.round(totalGMV / successCount) : 0,
    growthRate: firstHalfGMV ? Math.round(((secondHalfGMV - firstHalfGMV) / firstHalfGMV) * 10000) / 100 : 0,
    periodComparison: { firstHalfGMV, secondHalfGMV },
  };
}

export function filterMerchantData(data: MerchantData, startDate: string, endDate: string): MerchantData {
  const daily = data.daily.filter((day) => day.date >= startDate && day.date <= endDate);
  const monthly = Object.values(daily.reduce<Record<string, { month: string; gmv: number; fee: number; success: number; failed: number }>>((result, day) => {
    const month = day.date.slice(0, 7);
    const entry = result[month] ?? { month, gmv: 0, fee: 0, success: 0, failed: 0 };
    entry.gmv += day.gmv;
    entry.fee += day.fee;
    entry.success += day.success;
    entry.failed += day.failed;
    result[month] = entry;
    return result;
  }, {})).sort((a, b) => a.month.localeCompare(b.month));

  return { ...data, daily, monthly, kpi: calculateKpi(daily) };
}
