import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, X, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

const SUB_LABELS: Record<string, string> = {
  cleanliness: "Propreté",
  comfort: "Confort",
  location_score: "Emplacement",
  staff: "Personnel",
  value: "Qualité/prix",
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [bookingUrl, setBookingUrl] = useState<string>("");

  async function load() {
    const { data } = await supabase
      .from("reviews")
      .select("*, clients(first_name,last_name)")
      .order("created_at", { ascending: false });
    setReviews(data ?? []);
    const { data: s } = await supabase
      .from("settings").select("value").eq("key", "booking_review_url").maybeSingle();
    const v: any = s?.value;
    setBookingUrl(typeof v === "string" ? v : v?.url ?? "");
  }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, val: boolean) {
    await supabase.from("reviews").update({ is_published: val }).eq("id", id);
    toast.success(val ? "Avis publié" : "Avis dépublié");
    load();
  }

  async function setStatus(id: string, status: "pending" | "sent" | "error") {
    await supabase.from("reviews").update({ status }).eq("id", id);
    toast.success("Statut mis à jour");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet avis ?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Avis clients" subtitle={`${reviews.length} avis reçu${reviews.length > 1 ? "s" : ""}`} />

      {!bookingUrl && (
        <Card className="p-4 mb-4 bg-card border-yellow-500/30">
          <p className="text-xs text-yellow-400">
            ⚠ Lien Booking.com non configuré. Renseignez la clé <code className="bg-muted px-1 rounded">booking_review_url</code> dans les Réglages
            pour permettre la republication 1-clic vers Booking.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {reviews.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">Aucun avis pour le moment.</Card>
        )}

        {reviews.map((r) => {
          const subs = Object.keys(SUB_LABELS).filter((k) => r[k] != null);
          return (
            <Card key={r.id} className="p-5 bg-card border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-medium">
                      {r.guest_name || `${r.clients?.first_name ?? ""} ${r.clients?.last_name ?? ""}`.trim() || "Anonyme"}
                    </span>
                    {r.country && <span className="text-xs text-muted-foreground">• {r.country}</span>}
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    {r.is_published && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                        Publié sur le site
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      r.status === "sent" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                      r.status === "error" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                      "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                    }`}>
                      Booking : {r.status === "sent" ? "envoyé" : r.status === "error" ? "erreur" : "en attente"}
                    </span>
                  </div>

                  {subs.length > 0 && (
                    <div className="flex gap-3 flex-wrap text-[11px] text-muted-foreground mb-2">
                      {subs.map((k) => (
                        <span key={k}>{SUB_LABELS[k]} : <span className="text-gold">{r[k]}/5</span></span>
                      ))}
                    </div>
                  )}

                  {r.comment && <p className="text-sm text-muted-foreground italic">"{r.comment}"</p>}

                  <div className="text-xs text-muted-foreground mt-2 flex gap-3 flex-wrap">
                    <span>{formatDateTime(r.created_at)}</span>
                    {r.booking_ref && <span>Réf : {r.booking_ref}</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[160px]">
                  <Button size="sm" variant={r.is_published ? "outline" : "default"}
                    className={r.is_published ? "" : "gradient-gold text-noir"}
                    onClick={() => toggle(r.id, !r.is_published)}>
                    {r.is_published ? "Dépublier" : "Publier"}
                  </Button>

                  {bookingUrl && (
                    <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="w-full">
                        <ExternalLink className="w-3 h-3" /> Booking.com
                      </Button>
                    </a>
                  )}

                  {r.status !== "sent" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "sent")}>
                      <Check className="w-3 h-3" /> Marquer envoyé
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>
                      Annuler envoi
                    </Button>
                  )}

                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
