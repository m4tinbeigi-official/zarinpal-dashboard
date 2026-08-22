import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const DATA_DIR = path.resolve(process.cwd(), "public/data");
const MERCHANT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// Simple in-memory sliding-window rate limit, per process.
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    buckets.set(key, hits);
    return true;
  }
  hits.push(now);
  buckets.set(key, hits);
  return false;
}

function readJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `تو دستیار تحلیلی فارسی داشبورد زرین‌پال هستی. فقط بر اساس داده JSON پیوست‌شده (تجمیع‌های واقعی یک پذیرنده) پاسخ بده.
قوانین:
1. فقط فارسی جواب بده.
2. هرگز عددی که در داده نیست حدس نزن یا نساز؛ اگر داده کافی نیست بگو «داده کافی برای این سوال موجود نیست».
3. پاسخ کوتاه (حداکثر ۴-۵ جمله)، مستقیم و مبتنی بر شواهد باشد؛ در پایان یک خط «شواهد:» با اشاره به فیلد(های) دقیق JSON استفاده‌شده بیاور.
4. هرگز payer_card_key یا شناسه خام کارت را در خروجی ننویس (در داده هم وجود ندارد).
5. اگر سوال نامرتبط با تحلیل پرداخت/فروش این پذیرنده بود، مؤدبانه بگو خارج از حوزه تخصص توست.`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها بیش از حد مجاز است. کمی صبر کنید." },
      { status: 429 }
    );
  }

  let body: { merchantId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است." }, { status: 400 });
  }

  const { merchantId, question } = body;
  if (!question || question.trim().length === 0 || question.length > 500) {
    return NextResponse.json({ error: "سوال نامعتبر است." }, { status: 400 });
  }
  if (!merchantId || !MERCHANT_ID_RE.test(merchantId)) {
    return NextResponse.json({ error: "شناسه پذیرنده نامعتبر است." }, { status: 400 });
  }

  const merchantData = readJson(path.join(DATA_DIR, "merchants", `${merchantId}.json`));
  if (!merchantData) {
    return NextResponse.json({ error: "داده این پذیرنده یافت نشد." }, { status: 404 });
  }
  const benchmarks = readJson(path.join(DATA_DIR, "benchmarks.json"));

  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL || "openai/gpt-5.6-luna-pro";

  if (!apiKey || !baseUrl) {
    return NextResponse.json(
      { error: "سرویس هوش مصنوعی روی سرور پیکربندی نشده است." },
      { status: 503 }
    );
  }

  const contextJson = JSON.stringify({ merchant: merchantData, benchmarks }).slice(0, 40_000);

  try {
    const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `داده پذیرنده (JSON):\n${contextJson}` },
          { role: "user", content: question.trim() },
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: `خطا در ارتباط با سرویس هوش مصنوعی (${upstream.status})`, detail: text.slice(0, 300) },
        { status: 502 }
      );
    }

    const json = await upstream.json();
    const answer: string = json?.choices?.[0]?.message?.content || "پاسخی دریافت نشد.";
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json(
      { error: "خطا در ارتباط با سرویس هوش مصنوعی.", detail: String(e) },
      { status: 502 }
    );
  }
}
