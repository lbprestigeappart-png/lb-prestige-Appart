import { useState } from "react";
import { Star, Send, CheckCircle2, Sparkles, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewFormProps {
  clientFirstName?: string;
  clientLastName?: string;
  bookingReviewUrl?: string;
  onSubmit: (data: ReviewData) => Promise<void>;
}

export interface ReviewData {
  guest_name: string;
  country: string;
  booking_ref: string;
  global_score: number;
  cleanliness: number;
  comfort: number;
  location: number;
  staff: number;
  value: number;
  comment: string;
}

const subcategories = [
  { key: "cleanliness" as const, label: "Propreté", emoji: "✨" },
  { key: "comfort" as const, label: "Confort", emoji: "🛏️" },
  { key: "location" as const, label: "Emplacement", emoji: "📍" },
  { key: "staff" as const, label: "Personnel", emoji: "👤" },
  { key: "value" as const, label: "Rapport Q/P", emoji: "💰" },
];

function StarRating({
  value,
  onChange,
  size = "normal",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: "normal" | "large";
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "large" ? "w-10 h-10" : "w-6 h-6";

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= (hover || value);
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110 active:scale-125"
          >
            <Star
              className={`${sizeClass} transition-colors duration-150 ${
                active ? "fill-gold text-gold" : "text-muted-foreground/40"
              } ${n === value ? "animate-star-pop" : ""}`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewForm({
  clientFirstName,
  clientLastName,
  bookingReviewUrl,
  onSubmit,
}: ReviewFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ReviewData>({
    guest_name: `${clientFirstName ?? ""} ${clientLastName ?? ""}`.trim(),
    country: "",
    booking_ref: "",
    global_score: 5,
    cleanliness: 5,
    comfort: 5,
    location: 5,
    staff: 5,
    value: 5,
    comment: "",
  });

  const updateField = <K extends keyof ReviewData>(key: K, val: ReviewData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const commentLen = form.comment.length;
  const isValid = form.guest_name.trim().length > 0 && commentLen >= 50;

  // Calculate completion percentage
  const steps = [
    form.guest_name.trim().length > 0,
    form.global_score > 0,
    commentLen >= 50,
  ];
  const completion = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-8 bg-card border-border animate-scale-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-gold mb-5 shadow-gold animate-scale-in">
            <CheckCircle2 className="w-8 h-8 text-noir" />
          </div>
          <h3 className="font-display text-2xl text-gold-gradient mb-2">Merci pour votre avis !</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Votre retour a bien été enregistré et nous aidera à améliorer chaque séjour.
          </p>

          {bookingReviewUrl ? (
            <a href={bookingReviewUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gradient-gold text-noir gap-2 hover:scale-105 transition-transform">
                <ExternalLink className="w-4 h-4" />
                Partager aussi sur Booking.com
              </Button>
            </a>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Lien Booking.com non encore configuré.
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-wider mb-2">
        <Sparkles className="w-3 h-3" />
        <span>Votre expérience</span>
      </div>
      <h2 className="font-display text-2xl text-gold-gradient mb-1">Votre avis nous est précieux</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Un seul formulaire — il sera aussi utilisé pour Booking.com.
      </p>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Progression</span>
          <span className="text-[11px] font-mono text-gold">{completion}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
          <div
            className="h-full gradient-gold transition-all duration-500 rounded-full"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {/* Global rating */}
        <div className="text-center p-5 bg-secondary/30 rounded-xl border border-border/50">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Note globale</Label>
          <div className="flex justify-center mt-3 mb-2">
            <StarRating
              value={form.global_score}
              onChange={(n) => updateField("global_score", n)}
              size="large"
            />
          </div>
          <span className="text-2xl font-display text-gold">{form.global_score}/5</span>
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subcategories.map(({ key, label, emoji }) => (
            <div key={key} className="p-3.5 bg-secondary/30 rounded-lg border border-border/50 hover:border-gold/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>{emoji}</span> {label}
                </span>
                <span className="text-xs font-mono text-gold">{form[key]}/5</span>
              </div>
              <StarRating
                value={form[key]}
                onChange={(n) => updateField(key, n)}
              />
            </div>
          ))}
        </div>

        {/* Identity fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nom affiché *</Label>
            <Input
              value={form.guest_name}
              onChange={(e) => updateField("guest_name", e.target.value)}
              placeholder={`${clientFirstName ?? ""} ${clientLastName ?? ""}`.trim() || "Votre nom"}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Pays</Label>
            <Input
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              placeholder="France, Cameroun…"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Référence Booking (optionnel)</Label>
            <Input
              value={form.booking_ref}
              onChange={(e) => updateField("booking_ref", e.target.value)}
              placeholder="ex. 1234567890"
              className="mt-1"
            />
          </div>
        </div>

        {/* Comment */}
        <div>
          <Label className="text-xs">
            Commentaire * <span className="text-muted-foreground/60">(50 caractères minimum)</span>
          </Label>
          <Textarea
            rows={5}
            value={form.comment}
            onChange={(e) => updateField("comment", e.target.value)}
            placeholder="Partagez votre expérience en quelques phrases…"
            className="mt-1"
          />
          <div className="flex items-center justify-between mt-1.5">
            <div className="h-1 flex-1 rounded-full bg-secondary/60 overflow-hidden mr-3">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  commentLen >= 50 ? "gradient-gold" : "bg-muted-foreground/30"
                }`}
                style={{ width: `${Math.min(100, (commentLen / 50) * 100)}%` }}
              />
            </div>
            <span className={`text-[11px] font-mono ${commentLen >= 50 ? "text-gold" : "text-muted-foreground"}`}>
              {commentLen}/50
            </span>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || submitting}
          className="w-full gradient-gold text-noir py-6 text-base font-semibold hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:hover:scale-100"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-noir/30 border-t-noir rounded-full animate-spin" />
              Envoi en cours…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Envoyer mon avis
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}
