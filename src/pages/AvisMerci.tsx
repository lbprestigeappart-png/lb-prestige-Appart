import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Sparkles, Sofa, MapPin, Users, Wallet } from "lucide-react";
import { toast } from "sonner";

type ReviewState = {
  guest_name?: string;
  global_score?: number;
  cleanliness?: number;
  comfort?: number;
  location?: number;
  staff?: number;
  value?: number;
  comment?: string;
  booking_property_id?: string;
};

const STORAGE_KEY = "lb_last_review";

export default function AvisMerci() {
  const location = useLocation();
  const stateData = (location.state as ReviewState) || null;

  const data: ReviewState = useMemo(() => {
    if (stateData && stateData.comment) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateData)); } catch {}
      return stateData;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }, [stateData]);

  const firstName = (data.guest_name || "").trim().split(/\s+/)[0] || "";
  const comment = data.comment || "";
  const global = data.global_score ?? 0;

  useEffect(() => {
    if (!comment) return;
    navigator.clipboard?.writeText(comment).catch(() => {});
  }, [comment]);

  const bookingUrl = data.booking_property_id
    ? `https://www.booking.com/hotel/${data.booking_property_id}`
    : "https://www.booking.com/";

  const subscores: { key: keyof ReviewState; label: string; Icon: any }[] = [
    { key: "cleanliness", label: "Propreté", Icon: Sparkles },
    { key: "comfort", label: "Confort", Icon: Sofa },
    { key: "location", label: "Emplacement", Icon: MapPin },
    { key: "staff", label: "Personnel", Icon: Users },
    { key: "value", label: "Rapport Q/P", Icon: Wallet },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 animate-fade-in"
      style={{ backgroundColor: "#1A1A28" }}
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Check icon */}
        <div className="flex justify-center">
          <svg width="96" height="96" viewBox="0 0 96 96" className="drop-shadow-lg">
            <circle
              cx="48" cy="48" r="44"
              fill="none" stroke="#22c55e" strokeWidth="4"
              strokeDasharray="276.46" strokeDashoffset="276.46"
              style={{ animation: "lb-draw 0.7s ease-out forwards" }}
            />
            <path
              d="M28 50 L43 65 L70 35"
              fill="none" stroke="#22c55e" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="80" strokeDashoffset="80"
              style={{ animation: "lb-draw 0.5s 0.6s ease-out forwards" }}
            />
            <style>{`@keyframes lb-draw { to { stroke-dashoffset: 0; } }`}</style>
          </svg>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1
            className="text-4xl md:text-5xl font-semibold"
            style={{ fontFamily: "'Playfair Display','Cormorant Garamond',serif", color: "#F5F0E8" }}
          >
            Merci{firstName ? ` ${firstName}` : ""} !
          </h1>
          <p className="text-base md:text-lg" style={{ color: "#C4C4D4" }}>
            Votre avis a bien été enregistré. Il nous aide à améliorer chaque séjour.
          </p>
        </div>

        {/* Review summary */}
        <Card
          className="p-6 border"
          style={{ backgroundColor: "#252538", borderColor: "#D4A017" }}
        >
          <div className="flex flex-col items-center gap-2 mb-5">
            <div className="text-5xl font-bold" style={{ color: "#F5F0E8" }}>
              {global ? global.toFixed(1) : "—"}<span className="text-2xl text-[#C4C4D4]">/5</span>
            </div>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className="w-6 h-6"
                  style={{
                    color: "#D4A017",
                    fill: n <= Math.round(global) ? "#D4A017" : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            {subscores.map(({ key, label, Icon }) => (
              <div key={String(key)} className="flex flex-col items-center text-center gap-1">
                <Icon className="w-5 h-5" style={{ color: "#D4A017" }} />
                <span className="text-xs" style={{ color: "#C4C4D4" }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color: "#F5F0E8" }}>
                  {(data[key] as number | undefined) ?? "—"}/5
                </span>
              </div>
            ))}
          </div>

          {comment && (
            <p className="italic text-sm md:text-base border-t pt-4" style={{ color: "#A8A8B8", borderColor: "#D4A017" }}>
              « {comment} »
            </p>
          )}
        </Card>

        {/* Booking.com card */}
        <Card className="p-6 border-0" style={{ backgroundColor: "#003580" }}>
          <h2 className="text-xl font-semibold text-white mb-2">
            Un dernier geste qui nous aide beaucoup 🙏
          </h2>
          <p className="text-white/90 text-sm md:text-base mb-4 leading-relaxed">
            Votre avis est maintenant sur LB Prestige. Pourriez-vous le partager aussi sur Booking.com ?
            <br />(Cela prend 30 secondes et booste notre visibilité)
          </p>
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
            <Button
              className="bg-white hover:bg-white/90 font-semibold"
              style={{ color: "#003580" }}
              onClick={() => {
                if (comment) {
                  navigator.clipboard?.writeText(comment)
                    .then(() => toast.success("Commentaire copié dans le presse-papiers"))
                    .catch(() => {});
                }
              }}
            >
              📝 Partager aussi sur Booking.com
            </Button>
          </a>
          <p className="text-xs mt-3 text-white/70">
            Votre commentaire est copié dans votre presse-papiers pour faciliter la saisie ✓
          </p>
        </Card>

        {/* Back link */}
        <div className="text-center pt-2">
          <Link to="/" className="text-sm hover:underline" style={{ color: "#A8A8B8" }}>
            ← Retour à l'accueil LB Prestige
          </Link>
        </div>
      </div>
    </div>
  );
}
