"use client";
import type { MerchantData } from "@/lib/types";
import { formatNumber, toPersianNum } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Verified: "#10B981",
  Paid: "#6366F1",
  Failed: "#F43F5E",
  InBank: "#F59E0B",
  NoAttempt: "#94A3B8",
  Reversed: "#EF4444",
};

const ERROR_ADVICE: Record<string, string> = {
  "PSP-05:55": "موجودی ناکافی – پیشنهاد: تقسیم مبلغ پرداخت",
  "PSP-05:51": "موجودی ناکافی – پیشنهاد: نمایش مبلغ قبل از پرداخت",
  "PSP-05:12": "تراکنش نامعتبر – بررسی وضعیت ترمینال",
  "default": "بررسی لاگ‌های فنی درگاه و تماس با PSP",
};

export default function Gateway({ data, dateFiltered }: { data: MerchantData; dateFiltered: boolean }) {
  const g = data.gatewayHealth;

  // Session status pie
  const sessionPie = Object.entries(g.funnel.sessionStatuses)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status] || "#CBD5E1",
    }));

  // Try status pie
  const tryPie = Object.entries(g.funnel.tryStatuses)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: status,
      value: count,
      color: STATUS_COLORS[status] || "#CBD5E1",
    }));

  // Response codes bar
  const codeChart = g.topResponseCodes.slice(0, 8).map((c) => ({
    code: c.code,
    count: c.count,
  }));

  // PSP pie
  const pspPie = g.pspDistribution.map((p) => ({
    name: p.psp,
    value: p.count,
  }));
  const PSP_COLORS = ["#FFD100", "#1E293B", "#6366F1", "#10B981", "#F43F5E", "#F59E0B"];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-zp-navy">سلامت درگاه و عارضه‌یابی</h2>
      {dateFiltered && <div className="bg-zp-warning/10 border border-zp-warning/30 rounded-xl p-3 text-xs">جزئیات status، PSP و کدهای خطا در artifact فعلی فقط برای کل بازه دیتاست موجود هستند و با فیلتر تاریخ بازحساب نمی‌شوند.</div>}

      {/* Funnel summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-border p-4 text-center">
          <p className="text-xs text-muted">کل تلاش‌های پرداخت</p>
          <p className="text-2xl font-black text-zp-navy fa-num">{formatNumber(g.funnel.totalAttempts)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4 text-center">
          <p className="text-xs text-muted">جلسات موفق</p>
          <p className="text-2xl font-black text-zp-success fa-num">
            {formatNumber((g.funnel.sessionStatuses["Verified"] || 0) + (g.funnel.sessionStatuses["Paid"] || 0))}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4 text-center">
          <p className="text-xs text-muted">جلسات ناموفق</p>
          <p className="text-2xl font-black text-zp-danger fa-num">
            {formatNumber(g.funnel.sessionStatuses["Failed"] || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Session Status */}
        <div className="bg-white rounded-2xl border border-border p-4">
          <h3 className="font-bold text-zp-navy mb-3">وضعیت جلسات</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sessionPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${toPersianNum(Math.round((percent??0) * 100))}٪`}
                >
                  {sessionPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [toPersianNum(v.toLocaleString()), ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Try Status */}
        <div className="bg-white rounded-2xl border border-border p-4">
          <h3 className="font-bold text-zp-navy mb-3">وضعیت تلاش‌ها</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${toPersianNum(Math.round((percent??0) * 100))}٪`}
                >
                  {tryPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [toPersianNum(v.toLocaleString()), ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Response Codes */}
      {codeChart.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-4 lg:p-6">
          <h3 className="font-bold text-zp-navy mb-3">پرتکرارترین کدهای خطا</h3>
          <div className="h-56 overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={codeChart} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: any) => [toPersianNum(v.toLocaleString()), "تکرار"]} />
                <Bar dataKey="count" fill="#F43F5E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Advice */}
          <div className="mt-4 space-y-2">
            {g.topResponseCodes.slice(0, 3).map((c) => (
              <div key={c.code} className="bg-zp-danger/5 rounded-lg p-2 text-sm">
                <b>{c.code}</b> ({toPersianNum(c.count)} بار) –{" "}
                {ERROR_ADVICE[c.code] || ERROR_ADVICE["default"]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PSP Distribution */}
      {pspPie.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-4">
          <h3 className="font-bold text-zp-navy mb-3">توزیع PSP</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pspPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${toPersianNum(Math.round((percent??0) * 100))}٪`}
                >
                  {pspPie.map((_, i) => <Cell key={i} fill={PSP_COLORS[i % PSP_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [toPersianNum(v.toLocaleString()), ""]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted">
        <b>روش محاسبه:</b> وضعیت جلسه از session_status (یکتا بر session_key)، وضعیت تلاش‌ها از try_status (هر ردیف).
        کدهای خطا از switch_response_code · PSP از psp_code.
      </div>
    </div>
  );
}
