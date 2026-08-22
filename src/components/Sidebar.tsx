"use client";
import type { MerchantListItem } from "@/lib/types";

interface Tab { id: string; label: string; }

interface Props {
  tabs: readonly Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  merchants: MerchantListItem[];
  selectedMerchant: string;
  onMerchantChange: (id: string) => void;
  onMethodology: () => void;
}

const icons: Record<string, string> = {
  overview: "📊",
  temporal: "📅",
  customers: "👥",
  benchmark: "🏆",
  gateway: "🔌",
  alerts: "🚨",
  copilot: "💡",
};

export default function Sidebar({
  tabs, activeTab, onTabChange, merchants, selectedMerchant, onMerchantChange, onMethodology,
}: Props) {
  return (
    <aside className="hidden lg:flex flex-col fixed right-0 top-0 h-full w-64 bg-zp-dark text-white z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-zp-yellow rounded-lg flex items-center justify-center text-zp-dark font-black text-base shadow-sm shadow-zp-yellow/20">Z</div>
          <div>
            <p className="font-bold text-sm">زرین‌پال</p>
            <p className="text-[11px] text-white/50">داشبورد تحلیلی پذیرندگان</p>
          </div>
        </div>
      </div>

      {/* Merchant Selector */}
      <div className="px-4 py-3 border-b border-white/10">
        <label className="text-[11px] text-white/50 mb-1.5 block">پذیرنده فعال</label>
        <select
          value={selectedMerchant}
          onChange={(e) => onMerchantChange(e.target.value)}
          aria-label="انتخاب پذیرنده"
          className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 border border-white/10 hover:border-white/25 focus:outline-none focus:border-zp-yellow transition"
        >
          {merchants.map((m) => (
            <option key={m.id} value={m.id} className="text-black">
              {m.id} – {m.categoryTitle}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            aria-current={activeTab === t.id ? "page" : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition ${
              activeTab === t.id
                ? "bg-zp-yellow text-zp-dark font-bold shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>{icons[t.id] || "•"}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-3 border-t border-white/10">
        <button
          onClick={onMethodology}
          className="w-full text-right text-xs text-white/50 hover:text-zp-yellow transition py-2"
        >
          روش محاسبه و منبع داده ↗
        </button>
      </div>
    </aside>
  );
}
