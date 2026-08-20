"use client";

interface Tab { id: string; label: string; }

const icons: Record<string, string> = {
  overview: "📊", temporal: "📅", customers: "👥",
  benchmark: "🏆", gateway: "🔌", copilot: "💡",
};

export default function MobileNav({
  tabs, activeTab, onTabChange,
}: {
  tabs: readonly Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border">
      <div className="flex justify-around items-center py-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex flex-col items-center min-w-[56px] px-1 py-1 rounded-lg transition text-[10px] ${
              activeTab === t.id
                ? "text-zp-navy font-bold"
                : "text-muted"
            }`}
          >
            <span className="text-lg">{icons[t.id]}</span>
            <span className={activeTab === t.id ? "text-zp-navy" : ""}>{t.label}</span>
            {activeTab === t.id && (
              <div className="w-4 h-0.5 bg-zp-yellow rounded-full mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
