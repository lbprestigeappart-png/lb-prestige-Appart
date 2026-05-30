import { CalendarDays, Moon, Users, Hash, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDate, nightsBetween } from "@/lib/format";

interface WelcomeCardProps {
  firstName?: string;
  bannerMessage?: string;
  checkIn: string;
  checkOut: string;
  suiteType?: string | null;
  guests: number;
  code: string;
  status?: string;
}

export default function WelcomeCard({
  firstName,
  bannerMessage,
  checkIn,
  checkOut,
  suiteType,
  guests,
  code,
  status,
}: WelcomeCardProps) {
  const nights = nightsBetween(checkIn, checkOut);
  const now = new Date();
  const ciDate = new Date(checkIn);
  const coDate = new Date(checkOut);

  // Determine stay phase
  let phase: "before" | "during" | "after" = "before";
  if (now >= ciDate && now <= coDate) phase = "during";
  else if (now > coDate) phase = "after";

  const phaseConfig = {
    before: { label: "Arrivée prochaine", color: "text-gold", dot: "bg-gold" },
    during: { label: "Séjour en cours", color: "text-green-400", dot: "bg-green-400" },
    after: { label: "Séjour terminé", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  }[phase];

  return (
    <Card className="p-6 bg-card/80 glass shadow-elegant border-gold/20 animate-slide-up stagger-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-wider">
          <Sparkles className="w-3 h-3" />
          <span>Bienvenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${phaseConfig.dot} animate-pulse`} />
          <span className={`text-[10px] uppercase tracking-wider ${phaseConfig.color}`}>
            {phaseConfig.label}
          </span>
        </div>
      </div>

      {/* Greeting */}
      <h2 className="font-display text-3xl text-foreground mb-1">
        {firstName ? `Cher(e) ${firstName},` : "Bienvenue,"}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {bannerMessage ?? "Votre séjour d'exception commence ici."}
      </p>

      {/* Stay info grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Check-in */}
        <div className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-lg border border-border/50 hover:border-gold/30 transition-colors">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shrink-0 shadow-gold">
            <CalendarDays className="w-4 h-4 text-noir" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Arrivée</div>
            <div className="text-sm font-medium text-foreground">{formatDate(checkIn)}</div>
          </div>
        </div>

        {/* Check-out */}
        <div className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-lg border border-border/50 hover:border-gold/30 transition-colors">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shrink-0 shadow-gold">
            <CalendarDays className="w-4 h-4 text-noir" />
          </div>
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Départ</div>
            <div className="text-sm font-medium text-foreground">{formatDate(checkOut)}</div>
          </div>
        </div>

        {/* Stay details */}
        <div className="col-span-2 p-3.5 bg-secondary/50 rounded-lg border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {suiteType && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Moon className="w-3.5 h-3.5 text-gold" />
                  <span>{suiteType}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Moon className="w-3.5 h-3.5 text-gold" />
                <span>{nights} nuit{nights > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-gold" />
                <span>{guests} voyageur{guests > 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-gold" />
              <span className="font-mono text-xs text-gold">{code}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
