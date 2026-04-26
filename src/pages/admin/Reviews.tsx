import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("reviews").select("*, clients(first_name,last_name)").order("created_at", { ascending: false });
    setReviews(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(id: string, val: boolean) {
    await supabase.from("reviews").update({ is_published: val }).eq("id", id);
    toast.success(val ? "Avis publié" : "Avis dépublié");
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
      <div className="space-y-3">
        {reviews.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aucun avis pour le moment.</Card>}
        {reviews.map((r) => (
          <Card key={r.id} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium">{r.clients?.first_name} {r.clients?.last_name}</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  {r.is_published && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">Publié</span>}
                </div>
                {r.comment && <p className="text-sm text-muted-foreground italic">"{r.comment}"</p>}
                <div className="text-xs text-muted-foreground mt-2">{formatDateTime(r.created_at)}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant={r.is_published ? "outline" : "default"} className={r.is_published ? "" : "gradient-gold text-noir"} onClick={() => toggle(r.id, !r.is_published)}>
                  {r.is_published ? "Dépublier" : "Publier"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><X className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
