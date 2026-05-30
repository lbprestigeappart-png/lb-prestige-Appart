import {
  Home, Info, MessageSquare, FileText, Star, UtensilsCrossed,
} from "lucide-react";

export type ClientTab = "home" | "info" | "messages" | "docs" | "review" | "restaurants";

const tabs: { key: ClientTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "home", label: "Accueil", shortLabel: "Accueil", icon: Home },
  { key: "info", label: "Infos pratiques", shortLabel: "Infos", icon: Info },
  { key: "messages", label: "Messages", shortLabel: "Messages", icon: MessageSquare },
  { key: "docs", label: "Documents", shortLabel: "Docs", icon: FileText },
  { key: "review", label: "Laisser un avis", shortLabel: "Avis", icon: Star },
  { key: "restaurants", label: "Restaurants", shortLabel: "Resto", icon: UtensilsCrossed },
];

interface ClientNavigationProps {
  activeTab: ClientTab;
  onTabChange: (tab: ClientTab) => void;
  unreadMessages?: number;
}

export default function ClientNavigation({
  activeTab,
  onTabChange,
  unreadMessages = 0,
}: ClientNavigationProps) {
  return (
    <>
      {/* Desktop: horizontal tabs */}
      <div className="hidden md:flex gap-1.5 mb-6 overflow-x-auto pb-1 animate-slide-up stagger-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`
                relative whitespace-nowrap px-5 py-2.5 rounded-lg text-sm transition-all duration-300
                flex items-center gap-2
                ${isActive
                  ? "bg-gold text-noir font-semibold shadow-gold scale-[1.02]"
                  : "bg-card/60 border border-border/50 hover:border-gold/40 hover:bg-card text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.key === "messages" && unreadMessages > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: bottom tab bar */}
      <div className="md:hidden bottom-tab-bar">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`
                  relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-0
                  ${isActive
                    ? "text-gold"
                    : "text-muted-foreground"
                  }
                `}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {t.key === "messages" && unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center animate-scale-in">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : "font-normal"}`}>
                  {t.shortLabel}
                </span>
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer for mobile bottom bar */}
      <div className="md:hidden h-20" />
    </>
  );
}
