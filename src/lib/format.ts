// Persian number formatter and currency utils

const persianDigits = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];

export function toPersianNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => persianDigits[parseInt(d)]);
}

export function formatToman(rials: number): string {
  const toman = Math.round(rials / 10);
  return toPersianNum(toman.toLocaleString("en-US")) + " تومان";
}

export function formatTomanShort(rials: number): string {
  const toman = rials / 10;
  if (toman >= 1_000_000_000) return toPersianNum((toman / 1_000_000_000).toFixed(1)) + " میلیارد";
  if (toman >= 1_000_000) return toPersianNum((toman / 1_000_000).toFixed(1)) + " میلیون";
  if (toman >= 1_000) return toPersianNum((toman / 1_000).toFixed(1)) + " هزار";
  return toPersianNum(Math.round(toman).toLocaleString("en-US"));
}

export function formatPercent(v: number): string {
  return toPersianNum(v.toFixed(1)) + "٪";
}

export function formatNumber(n: number): string {
  return toPersianNum(Math.round(n).toLocaleString("en-US"));
}

export function growthLabel(rate: number): { text: string; positive: boolean } {
  const positive = rate >= 0;
  const sign = positive ? "+" : "";
  return {
    text: sign + toPersianNum(rate.toFixed(1)) + "٪",
    positive,
  };
}

export const DOW_NAMES = ["یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه","شنبه"];

export const MONTH_NAMES: Record<string, string> = {
  "01": "ژانویه", "02": "فوریه", "03": "مارس",
  "04": "آوریل", "05": "مه", "06": "ژوئن",
  "07": "ژوئیه", "08": "اوت", "09": "سپتامبر",
  "10": "اکتبر", "11": "نوامبر", "12": "دسامبر",
};
