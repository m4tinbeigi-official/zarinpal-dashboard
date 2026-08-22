"use client";

interface Tab { id: string; label: string; }

const icons: Record<string, string> = {
  overview: "📊", temporal: "📅", customers: "👥",
  benchmark: "🏆", gateway: "🔌", alerts: "🚨", copilot: "💡",
};

export default function MobileNav({
  tabs, activeTab, onTabChange,
}: {
  tabs: readonly Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-border shadow-[0_-2px_8px_rgba(15,23,42,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center py-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            aria-current={activeTab === t.id ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 min-w-[56px] px-1.5 py-1.5 rounded-xl transition text-[10px] ${
              activeTab === t.id
                ? "text-zp-navy font-bold bg-zp-yellow/15"
                : "text-muted hover:text-zp-navy hover:bg-gray-50"
            }`}
          >
            <span className="text-lg leading-none">{icons[t.id]}</span>
            <span>{t.label}</span>
            {activeTab === t.id && (
              <div className="w-4 h-0.5 bg-zp-yellow rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
