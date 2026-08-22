export interface MerchantListItem {
  id: string;
  categoryId: string;
  categoryTitle: string;
  terminalCount: number;
}

export interface MerchantKPI {
  totalGMV: number;
  totalFee: number;
  successCount: number;
  failedCount: number;
  totalSessions: number;
  successRate: number;
  avgOrderValue: number;
  growthRate: number;
  periodComparison: { firstHalfGMV: number; secondHalfGMV: number };
}

export interface DailyData {
  date: string;
  gmv: number;
  fee: number;
  success: number;
  failed: number;
}

export interface MonthlyData {
  month: string;
  gmv: number;
  fee: number;
  success: number;
  failed: number;
}

export interface HourlyData {
  hour: number;
  gmv: number;
  count: number;
}

export interface DowData {
  day: number;
  name: string;
  gmv: number;
  count: number;
}

export interface RFMSegments {
  champions: number;
  loyal: number;
  promising: number;
  needAttention: number;
  atRisk: number;
  lost: number;
}

export interface CustomerData {
  totalIdentifiable: number;
  repeatCustomers: number;
  repeatRate: number;
  rfmSegments: RFMSegments;
  hasEnoughForRFM: boolean;
}

export interface ResponseCode {
  code: string;
  count: number;
}

export interface PSPItem {
  psp: string;
  count: number;
}

export interface GatewayHealth {
  funnel: {
    totalAttempts: number;
    sessionStatuses: Record<string, number>;
    tryStatuses: Record<string, number>;
  };
  topResponseCodes: ResponseCode[];
  pspDistribution: PSPItem[];
}

export interface MerchantData {
  id: string;
  categoryId: string;
  categoryTitle: string;
  kpi: MerchantKPI;
  daily: DailyData[];
  monthly: MonthlyData[];
  hourly: HourlyData[];
  dayOfWeek: DowData[];
  peakWindow: {
    hour: number;
    hourLabel: string;
    dayOfWeek: number;
    dayName: string;
  };
  customers: CustomerData;
  gatewayHealth: GatewayHealth;
}

export interface BenchmarkData {
  title: string;
  merchantCount: number;
  suppressed: boolean;
  reason?: string;
  gmv?: { p25: number; p50: number; p75: number; p90: number; avg: number };
  aov?: { p50: number; avg: number };
  successRate?: { p50: number; avg: number };
}

export type AlertSeverity = "critical" | "warning" | "opportunity" | "info";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  text: string;
  evidence: string;
  action: string;
}

export interface Metadata {
  totalRows: number;
  skippedRows: number;
  dateRange: { min: string; max: string };
  merchantCount: number;
  categoryCount: number;
  generatedAt: string;
  methodology: {
    successDefinition: string;
    currency: string;
    adjustedFee: string;
    customerIdentifier: string;
  };
}
