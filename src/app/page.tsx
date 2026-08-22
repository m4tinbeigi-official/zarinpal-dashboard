"use client";
import { useState, useEffect } from "react";
import type { MerchantListItem, MerchantData, BenchmarkData, Metadata } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Overview from "@/components/Overview";
import Temporal from "@/components/Temporal";
import Customers from "@/components/Customers";
import Benchmark from "@/components/Benchmark";
import Gateway from "@/components/Gateway";
import Copilot from "@/components/Copilot";
import Alerts from "@/components/Alerts";
import MethodologyPanel from "@/components/MethodologyPanel";
import { filterMerchantData } from "@/lib/analytics";
import { downloadMerchantReportCSV } from "@/lib/export";

const TABS = [
  { id: "overview", label: "پیشخوان" },
  { id: "temporal", label: "تحلیل زمانی" },
  { id: "customers", label: "مشتریان" },
  { id: "benchmark", label: "مقایسه صنفی" },
  { id: "gateway", label: "سلامت درگاه" },
  { id: "alerts", label: "هشدارها" },
  { id: "copilot", label: "دستیار هوشمند" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [merchants, setMerchants] = useState<MerchantListItem[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>("");
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null);
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkData>>({});
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Load merchant list + benchmarks + metadata
  useEffect(() => {
    Promise.all([
      fetch("/data/merchants.json").then((r) => r.json()),
      fetch("/data/benchmarks.json").then((r) => r.json()),
      fetch("/data/metadata.json").then((r) => r.json()),
    ])
      .then(([m, b, meta]) => {
        setMerchants(m);
        setBenchmarks(b);
        setMetadata(meta);
        setStartDate(meta.dateRange.min);
        setEndDate(meta.dateRange.max);
        if (m.length > 0) setSelectedMerchant(m[0].id);
        setLoading(false);
      })
      .catch(() => {
        setError("بارگذاری داده‌ها با خطا مواجه شد. لطفاً ابتدا اسکریپت آماده‌سازی داده را اجرا کنید.");
        setLoading(false);
      });
  }, []);

  // Load selected merchant data
  useEffect(() => {
    if (!selectedMerchant) return;
    setLoading(true);
    fetch(`/data/merchants/${selectedMerchant}.json`)
      .then((r) => r.json())
      .then((d) => {
        setMerchantData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("بارگذاری اطلاعات این پذیرنده با خطا مواجه شد.");
        setLoading(false);
      });
  }, [selectedMerchant]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="bg-white rounded-2xl border border-border shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-lg font-bold text-zp-navy mb-2">مشکلی پیش آمد</p>
          <p className="text-sm text-muted leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  const filteredData = merchantData && startDate && endDate
    ? filterMerchantData(merchantData, startDate, endDate)
    : merchantData;
  const hasDateData = filteredData && filteredData.daily.length > 0;
  const dateFiltered = Boolean(metadata && (startDate !== metadata.dateRange.min || endDate !== metadata.dateRange.max));

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar
        tabs={TABS}
        activeTab={tab}
        onTabChange={(id: string) => setTab(id as TabId)}
        merchants={merchants}
        selectedMerchant={selectedMerchant}
        onMerchantChange={setSelectedMerchant}
        onMethodology={() => setShowMethodology(true)}
      />

      {/* Main Content */}
      <main className="flex-1 lg:mr-64 pb-20 lg:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-border px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-zp-navy tracking-tight">
              داشبورد تحلیلی زرین‌پال
            </h1>
            {filteredData && (
              <p className="text-sm text-muted">
                {filteredData.categoryTitle} · <span className="fa-num">{filteredData.id}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Mobile merchant selector */}
            <select
              className="lg:hidden bg-white border border-border rounded-lg px-2 py-1.5 text-sm hover:border-zp-navy/30 transition"
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              aria-label="انتخاب پذیرنده"
            >
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} – {m.categoryTitle}
                </option>
              ))}
            </select>
            {metadata && (
              <div className="flex items-center gap-1.5 text-xs text-muted" aria-label="بازه زمانی تحلیل">
                <input
                  type="date"
                  min={metadata.dateRange.min}
                  max={endDate || metadata.dateRange.max}
                  value={startDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStartDate(value);
                    if (endDate && value > endDate) setEndDate(value);
                  }}
                  className="rounded-lg border border-border bg-white px-2 py-1.5 hover:border-zp-navy/30 transition"
                  aria-label="شروع بازه"
                />
                <span>تا</span>
                <input
                  type="date"
                  min={startDate || metadata.dateRange.min}
                  max={metadata.dateRange.max}
                  value={endDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEndDate(value);
                    if (startDate && value < startDate) setStartDate(value);
                  }}
                  className="rounded-lg border border-border bg-white px-2 py-1.5 hover:border-zp-navy/30 transition"
                  aria-label="پایان بازه"
                />
              </div>
            )}
            {filteredData && (
              <button
                onClick={() => downloadMerchantReportCSV(filteredData, metadata)}
                className="text-xs font-medium bg-white border border-border text-zp-navy px-3 py-1.5 rounded-lg hover:border-zp-yellow hover:shadow-sm transition"
              >
                دانلود گزارش CSV
              </button>
            )}
            <button
              onClick={() => setShowMethodology(true)}
              className="text-xs font-medium bg-zp-yellow/20 text-zp-navy px-3 py-1.5 rounded-lg hover:bg-zp-yellow/40 transition"
            >
              روش محاسبه
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="animate-spin w-10 h-10 border-4 border-zp-yellow border-t-transparent rounded-full" />
              <span className="mr-3 text-muted">در حال بارگذاری اطلاعات…</span>
            </div>
          ) : filteredData && hasDateData ? (
            <>
              {tab === "overview" && <Overview data={filteredData} metadata={metadata} dateFiltered={dateFiltered} />}
              {tab === "temporal" && <Temporal data={filteredData} dateFiltered={dateFiltered} />}
              {tab === "customers" && <Customers data={filteredData} dateFiltered={dateFiltered} />}
              {tab === "benchmark" && (
                <Benchmark
                  data={filteredData}
                  benchmarks={benchmarks}
                  dateFiltered={dateFiltered}
                />
              )}
              {tab === "gateway" && <Gateway data={filteredData} dateFiltered={dateFiltered} />}
              {tab === "alerts" && <Alerts data={filteredData} dateFiltered={dateFiltered} />}
              {tab === "copilot" && (
                <Copilot data={filteredData} benchmarks={benchmarks} dateFiltered={dateFiltered} />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-32 gap-2">
              <span className="text-4xl mb-1">🗓️</span>
              <p className="text-zp-navy font-medium">در بازه زمانی انتخابی، تراکنشی برای این پذیرنده ثبت نشده است.</p>
              <p className="text-muted text-sm">بازه زمانی را در نوار بالا تغییر دهید تا داده‌ها نمایش داده شود.</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav tabs={TABS} activeTab={tab} onTabChange={(id: string) => setTab(id as TabId)} />

      {/* Methodology Panel */}
      {showMethodology && metadata && (
        <MethodologyPanel
          metadata={metadata}
          onClose={() => setShowMethodology(false)}
        />
      )}
    </div>
  );
}
