"use client";
import { useState } from "react";
import type { MerchantData, BenchmarkData } from "@/lib/types";
import { formatTomanShort, formatPercent, formatNumber, toPersianNum } from "@/lib/format";

interface QA {
  q: string;
  answer: string;
  evidence: string;
  action: string;
}

function generateAnswers(data: MerchantData, benchmarks: Record<string, BenchmarkData>): QA[] {
  const k = data.kpi;
  const c = data.customers;
  const peak = data.peakWindow;
  const bench = benchmarks[data.categoryId];
  const results: QA[] = [];

  // Q1: Best selling time
  results.push({
    q: "پرفروش‌ترین زمان فروش من کی است؟",
    answer: `بیشترین فروش موفق شما در روز ${peak.dayName} و ساعت ${peak.hourLabel} ثبت شده است.`,
    evidence: `بر اساس مجموع amount خریدهای موفق (Verified/Paid) تجمیع‌شده بر ساعت و روز هفته از ${toPersianNum(k.successCount)} خرید موفق.`,
    action: `پیشنهاد: کمپین‌های تبلیغاتی و تخفیف‌های لحظه‌ای را برای ${peak.dayName} ساعت ${peak.hourLabel} زمان‌بندی کنید تا بازدهی بیشتری داشته باشد.`,
  });

  // Q2: Success rate
  results.push({
    q: "نرخ موفقیت پرداخت من چقدر است و خوب است؟",
    answer: `نرخ موفقیت پرداخت شما ${formatPercent(k.successRate)} است (${toPersianNum(k.successCount)} موفق از ${toPersianNum(k.totalSessions)} جلسه).`,
    evidence: `محاسبه: session_status=Verified|Paid ÷ کل جلسات یکتا × ۱۰۰${bench && !bench.suppressed ? `. میانگین صنف: ${formatPercent(bench.successRate!.avg)}` : ""}`,
    action: k.successRate < 50
      ? "اقدام: نرخ موفقیت شما زیر ۵۰٪ است. علل اصلی شکست پرداخت را در بخش «سلامت درگاه» بررسی کنید و با PSP خود تماس بگیرید."
      : "وضعیت قابل قبول است. برای بهبود بیشتر، کدهای خطای پرتکرار را در بخش درگاه بررسی کنید.",
  });

  // Q3: Customer loyalty
  results.push({
    q: "چند درصد مشتریان من دوباره خرید کرده‌اند؟",
    answer: c.totalIdentifiable
      ? `از ${formatNumber(c.totalIdentifiable)} مشتری شناسایی‌شده، ${formatPercent(c.repeatRate)} (${toPersianNum(c.repeatCustomers)} نفر) خرید مجدد داشته‌اند.`
      : "داده مشتری شناسایی‌شده (payer_card_key) برای این پذیرنده کافی نیست.",
    evidence: `شناسایی مشتری از payer_card_key یکتا در خریدهای موفق. مشتری تکراری: بیش از ۱ خرید موفق.`,
    action: c.repeatRate < 15
      ? "نرخ بازگشت پایین است. پیشنهاد: ارسال پیامک یادآوری به مشتریان «در معرض ریزش» و ایجاد برنامه وفاداری."
      : "نرخ بازگشت مناسب است. برای حفظ، مشتریان «قهرمان» را با تخفیف اختصاصی تشویق کنید.",
  });

  // Q4: Benchmark position
  if (bench && !bench.suppressed) {
    const gmvPct = bench.gmv!.avg > 0
      ? ((k.totalGMV - bench.gmv!.avg) / bench.gmv!.avg * 100)
      : 0;
    results.push({
      q: "جایگاه من نسبت به هم‌صنفی‌ها چگونه است؟",
      answer: `فروش شما ${gmvPct >= 0 ? toPersianNum(gmvPct.toFixed(0)) + "٪ بالاتر" : toPersianNum(Math.abs(gmvPct).toFixed(0)) + "٪ پایین‌تر"} از میانگین صنف «${bench.title}» است (${toPersianNum(bench.merchantCount)} پذیرنده).`,
      evidence: `GMV پذیرنده: ${formatTomanShort(k.totalGMV)} · میانگین صنف: ${formatTomanShort(bench.gmv!.avg)} · میانه صنف: ${formatTomanShort(bench.gmv!.p50)}`,
      action: gmvPct < 0
        ? "پیشنهاد: مبلغ متوسط خرید و نرخ موفقیت را نسبت به صنف بررسی کنید و روی بهبود آن‌ها تمرکز کنید."
        : "عملکرد خوب است. برای حفظ جایگاه، روند ماهانه را پایش کنید.",
    });
  } else {
    results.push({
      q: "جایگاه من نسبت به هم‌صنفی‌ها چگونه است؟",
      answer: "مقایسه صنفی برای این دسته در دسترس نیست.",
      evidence: bench?.reason || "تعداد پذیرندگان دسته کمتر از آستانه حریم خصوصی است.",
      action: "در حال حاضر امکان مقایسه وجود ندارد.",
    });
  }

  // Q5: Growth trend
  results.push({
    q: "روند فروش من رو به رشد است یا کاهش؟",
    answer: `فروش نیمه دوم بازه نسبت به نیمه اول ${k.growthRate >= 0 ? toPersianNum(k.growthRate.toFixed(1)) + "٪ رشد" : toPersianNum(Math.abs(k.growthRate).toFixed(1)) + "٪ کاهش"} داشته است.`,
    evidence: `نیمه اول: ${formatTomanShort(k.periodComparison.firstHalfGMV)} · نیمه دوم: ${formatTomanShort(k.periodComparison.secondHalfGMV)}`,
    action: k.growthRate < 0
      ? "روند نزولی است. علل: افت تعداد خرید یا مبلغ متوسط. روند روزانه و ساعتی را بررسی کنید."
      : "روند صعودی مثبت است. برای تداوم، کانال‌های ورودی موفق را شناسایی و تقویت کنید.",
  });

  // Q6: Gateway issues
  const topCode = data.gatewayHealth.topResponseCodes[0];
  if (topCode) {
    results.push({
      q: "دلیل اصلی شکست پرداخت‌های من چیست؟",
      answer: `پرتکرارترین کد خطا: ${topCode.code} با ${toPersianNum(topCode.count)} بار تکرار.`,
      evidence: `از switch_response_code در تلاش‌های ناموفق · PSP: ${data.gatewayHealth.pspDistribution[0]?.psp || "نامشخص"}`,
      action: "بررسی: اگر خطا مربوط به موجودی ناکافی مشتریان است، امکان تقسیط یا پرداخت مرحله‌ای را بررسی کنید.",
    });
  }

  return results;
}

export default function Copilot({
  data, benchmarks, dateFiltered,
}: { data: MerchantData; benchmarks: Record<string, BenchmarkData>; dateFiltered: boolean }) {
  const answers = generateAnswers(data, benchmarks);
  const [selected, setSelected] = useState<number | null>(null);

  const [freeQuestion, setFreeQuestion] = useState("");
  const [freeAnswer, setFreeAnswer] = useState<string | null>(null);
  const [freeError, setFreeError] = useState<string | null>(null);
  const [freeLoading, setFreeLoading] = useState(false);

  async function askFreeQuestion() {
    const q = freeQuestion.trim();
    if (!q) return;
    setFreeLoading(true);
    setFreeError(null);
    setFreeAnswer(null);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId: data.id, question: q }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFreeError(json.error || "خطای نامشخص");
      } else {
        setFreeAnswer(json.answer);
      }
    } catch {
      setFreeError("خطا در ارتباط با سرور.");
    } finally {
      setFreeLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zp-navy">دستیار تحلیلی هوشمند</h2>

      {/* Free-text LLM-powered question box */}
      <div className="bg-white rounded-2xl border-2 border-zp-yellow shadow-sm p-4 space-y-3">
        <p className="text-sm font-bold text-zp-navy">هر سوالی درباره کسب‌وکارت بپرس؛ پاسخ را مدل زبانی بر اساس داده واقعی همین پذیرنده تولید می‌کند.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={freeQuestion}
            onChange={(e) => setFreeQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !freeLoading && askFreeQuestion()}
            placeholder="مثلاً: چرا فروش هفته گذشته کم شد؟"
            maxLength={500}
            aria-label="پرسش خود را بنویسید"
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm focus:border-zp-yellow transition"
          />
          <button
            onClick={askFreeQuestion}
            disabled={freeLoading || !freeQuestion.trim()}
            className="bg-zp-yellow text-zp-navy font-bold rounded-xl px-4 py-2 text-sm hover:brightness-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {freeLoading ? "در حال پردازش…" : "پرسیدن"}
          </button>
        </div>
        {freeError && (
          <div className="bg-zp-danger/10 border border-zp-danger/30 rounded-xl p-3 text-xs text-zp-danger">{freeError}</div>
        )}
        {freeAnswer && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm whitespace-pre-wrap leading-relaxed">{freeAnswer}</div>
        )}
      </div>

      <div className="bg-zp-info/5 border border-zp-info/20 rounded-xl p-3 text-sm">
        <b>توجه:</b> کارت‌های زیر بر پایه محاسبات قطعی و از‌پیش‌تعیین‌شده هستند و همیشه سریع و بدون نیاز به مدل زبانی در دسترس‌اند.
        هر پاسخ همراه با شواهد و اقدام پیشنهادی ارائه می‌شود. برای پرسش آزاد از کادر بالا استفاده کنید.
      </div>
      {dateFiltered && <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-3 text-xs">پرسش‌های مربوط به فروش، نرخ موفقیت و روند از بازه زمانی فعال استفاده می‌کنند. پرسش‌های مشتری، مقایسه صنفی و خطاهای درگاه از کل بازه دیتاست محاسبه می‌شوند؛ این موضوع در بخش «شواهد» هر پاسخ مشخص شده است.</div>}

      {/* Preset Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {answers.map((qa, i) => (
          <button
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`text-right bg-white rounded-2xl border p-4 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${
              selected === i ? "border-zp-yellow shadow-md" : "border-border"
            }`}
          >
            <p className="font-medium text-sm text-zp-navy">{qa.q}</p>
            {selected !== i && (
              <p className="text-xs text-muted mt-1">برای مشاهده پاسخ کلیک کنید ←</p>
            )}
          </button>
        ))}
      </div>

      {/* Answer Panel */}
      {selected !== null && (
        <div className="bg-white rounded-2xl border-2 border-zp-yellow shadow-md p-5 space-y-4 animate-in">
          <div>
            <p className="text-xs text-muted mb-1">پرسش</p>
            <p className="font-bold text-zp-navy">{answers[selected].q}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">پاسخ</p>
            <p className="text-sm">{answers[selected].answer}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-muted mb-1">🔍 شواهد و منبع داده</p>
            <p className="text-xs">{answers[selected].evidence}</p>
          </div>
          <div className="bg-zp-success/5 border border-zp-success/20 rounded-xl p-3">
            <p className="text-xs text-muted mb-1">💡 اقدام پیشنهادی</p>
            <p className="text-sm">{answers[selected].action}</p>
          </div>
        </div>
      )}
    </div>
  );
}
