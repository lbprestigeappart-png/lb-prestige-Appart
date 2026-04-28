import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingPage } from "@/components/admin/SettingPage";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, CheckCircle2, IdCard, Download, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type Row = {
  id: string;
  reservation_code: string;
  client_token: string;
  rules_signed_at: string | null;
  rules_signed_name: string | null;
  clients: { first_name: string; last_name: string | null; phone: string | null } | null;
  id_doc?: {
    id_number: string | null;
    front_path: string | null;
    back_path: string | null;
    submitted_at: string;
  } | null;
};

export default function RulesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: resv } = await supabase
      .from("reservations")
      .select("id, reservation_code, client_token, rules_signed_at, rules_signed_name, clients(first_name,last_name,phone)")
      .order("rules_signed_at", { ascending: false, nullsFirst: false });

    const { data: docs } = await supabase
      .from("client_id_documents" as any)
      .select("reservation_id, id_number, front_path, back_path, created_at");

    const byRes: Record<string, any> = {};
    (docs ?? []).forEach((d: any) => {
      byRes[d.reservation_id] = {
        id_number: d.id_number,
        front_path: d.front_path,
        back_path: d.back_path,
        submitted_at: d.created_at,
      };
    });

    const merged = (resv ?? []).map((r: any) => ({ ...r, id_doc: byRes[r.id] ?? null }));
    // Only show reservations that have either signed rules or uploaded ID
    setRows(merged.filter((r: Row) => r.rules_signed_at || r.id_doc));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function openSignedFile(path: string) {
    const { data, error } = await supabase.storage.from("id-documents").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Impossible d'ouvrir ce fichier");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-10">
      <SettingPage
        title="Règlement intérieur"
        settingKey="house_rules"
        fields={[{ key: "text", label: "Contenu complet", type: "textarea", rows: 20 }]}
      />

      <div className="p-8 pt-0 max-w-5xl">
        <div className="flex items-center gap-2 mb-4">
          <FileSignature className="w-5 h-5 text-gold" />
          <h2 className="font-display text-3xl text-gold-gradient">Signatures & pièces d'identité</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Suivi des clients ayant signé le règlement intérieur et/ou envoyé leur pièce d'identité.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Aucune signature ni pièce d'identité reçue pour le moment.
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => (
              <Card key={r.id} className="p-5 bg-card border-border">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display text-lg">
                        {r.clients?.first_name} {r.clients?.last_name}
                      </span>
                      <span className="text-xs text-gold font-mono">{r.reservation_code}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{r.clients?.phone ?? "—"}</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  {/* Signature */}
                  <div className="p-3 rounded-md border border-border bg-secondary/30">
                    <div className="flex items-center gap-2 text-xs font-medium mb-2">
                      <FileSignature className="w-3.5 h-3.5 text-gold" /> Règlement intérieur
                    </div>
                    {r.rules_signed_at ? (
                      <div className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-foreground">Signé par <strong>{r.rules_signed_name}</strong></div>
                          <div className="text-muted-foreground">{formatDateTime(r.rules_signed_at)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Pas encore signé</div>
                    )}
                  </div>

                  {/* CNI */}
                  <div className="p-3 rounded-md border border-border bg-secondary/30">
                    <div className="flex items-center gap-2 text-xs font-medium mb-2">
                      <IdCard className="w-3.5 h-3.5 text-gold" /> Pièce d'identité
                    </div>
                    {r.id_doc ? (
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-muted-foreground">N° CNI : </span>
                          <span className="font-mono text-foreground">{r.id_doc.id_number}</span>
                        </div>
                        <div className="text-muted-foreground">Reçue le {formatDateTime(r.id_doc.submitted_at)}</div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {r.id_doc.front_path && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px]"
                              onClick={() => openSignedFile(r.id_doc!.front_path!)}>
                              <ExternalLink className="w-3 h-3 mr-1" /> Recto
                            </Button>
                          )}
                          {r.id_doc.back_path && (
                            <Button size="sm" variant="outline" className="h-7 text-[11px]"
                              onClick={() => openSignedFile(r.id_doc!.back_path!)}>
                              <ExternalLink className="w-3 h-3 mr-1" /> Verso
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Non envoyée</div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
