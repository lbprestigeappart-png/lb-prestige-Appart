import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  IdCard, Search, CheckCircle2, Clock, ExternalLink,
  Eye, Download, ChevronDown, ChevronUp, User, CalendarDays,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface IdDoc {
  id: string;
  reservation_id: string;
  id_number: string | null;
  front_path: string | null;
  back_path: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  reservation?: {
    reservation_code: string;
    check_in: string;
    check_out: string;
    status: string;
    client_token: string;
    clients?: { first_name: string; last_name: string | null; phone: string | null };
  };
}

export default function IdentitesPage() {
  const [docs, setDocs] = useState<IdDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  // Signed URLs for private id-documents bucket, keyed by document id
  const [signedUrls, setSignedUrls] = useState<Record<string, { front: string | null; back: string | null }>>({});

  async function load() {
    const { data, error } = await supabase
      .from("client_id_documents")
      .select(`
        *,
        reservation:reservations!inner(
          reservation_code,
          check_in,
          check_out,
          status,
          client_token,
          clients!inner(first_name, last_name, phone)
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des pièces d'identité");
      console.error(error);
    }
    // Normalize Supabase's nested object/array response
    const normalized = (data ?? []).map((row: any) => ({
      ...row,
      reservation: Array.isArray(row.reservation) ? row.reservation[0] : row.reservation,
    }));
    setDocs(normalized);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Realtime updates
    const ch = supabase
      .channel("admin-id-docs")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_id_documents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function getImageUrl(docId: string, side: "front" | "back"): string | null {
    return signedUrls[docId]?.[side] ?? null;
  }

  // Generate signed URLs (private bucket) when a document card is expanded
  useEffect(() => {
    if (!expanded) return;
    if (signedUrls[expanded]) return; // already loaded
    const doc = docs.find((d) => d.id === expanded);
    if (!doc) return;

    let cancelled = false;
    (async () => {
      try {
        const sign = async (path: string | null) => {
          if (!path) return null;
          const { data, error } = await supabase.storage
            .from("id-documents")
            .createSignedUrl(path, 60 * 60); // valid 1h
          if (error) {
            console.error("Signed URL error:", error);
            return null;
          }
          return data?.signedUrl ?? null;
        };
        const [front, back] = await Promise.all([sign(doc.front_path), sign(doc.back_path)]);
        if (!cancelled) {
          setSignedUrls((prev) => ({ ...prev, [doc.id]: { front, back } }));
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => { cancelled = true; };
  }, [expanded, docs, signedUrls]);

  // Filter
  const filtered = docs.filter((d) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const client = d.reservation?.clients;
    const name = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.toLowerCase();
    return (
      name.includes(s) ||
      (d.id_number ?? "").toLowerCase().includes(s) ||
      (d.reservation?.reservation_code ?? "").toLowerCase().includes(s) ||
      (client?.phone ?? "").includes(s)
    );
  });

  const completeDocs = docs.filter((d) => d.id_number && d.front_path && d.back_path);
  const pendingDocs = docs.filter((d) => !d.id_number || !d.front_path || !d.back_path);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl">
        <PageHeader title="Pièces d'identité" subtitle="CNI envoyées par les clients" />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader
        title="Pièces d'identité"
        subtitle="CNI envoyées par les clients depuis leur espace"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
              <div className="font-display text-2xl text-foreground">{docs.length}</div>
            </div>
            <IdCard className="w-5 h-5 text-gold" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Complets</div>
              <div className="font-display text-2xl text-green-400">{completeDocs.length}</div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">En attente</div>
              <div className="font-display text-2xl text-orange-400">{pendingDocs.length}</div>
            </div>
            <Clock className="w-5 h-5 text-orange-400" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, numéro CNI, code réservation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {search ? "Aucun résultat pour cette recherche." : "Aucune pièce d'identité n'a été soumise."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const client = doc.reservation?.clients;
            const fullName = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim();
            const isComplete = !!doc.id_number && !!doc.front_path && !!doc.back_path;
            const isExpanded = expanded === doc.id;
            const frontUrl = getImageUrl(doc.id, "front");
            const backUrl = getImageUrl(doc.id, "back");

            return (
              <Card key={doc.id} className="bg-card border-border overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : doc.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isComplete ? "bg-green-400/15" : "bg-orange-400/15"}`}>
                      {isComplete
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <Clock className="w-5 h-5 text-orange-400" />
                      }
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{fullName || "Client inconnu"}</span>
                        <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-green-400/15 text-green-400 border-green-400/30" : ""}>
                          {isComplete ? "Complet" : "Incomplet"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(doc.reservation?.check_in)} → {formatDate(doc.reservation?.check_out)}
                        </span>
                        <span className="font-mono text-gold/80">#{doc.reservation?.reservation_code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.id_number && (
                      <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
                        CNI: {doc.id_number}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 animate-in slide-in-from-top-1 duration-200">
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* ID Number */}
                      <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Numéro CNI</div>
                        <div className="font-mono text-foreground text-lg">{doc.id_number ?? "—"}</div>
                      </div>

                      {/* Front photo */}
                      <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Photo Recto</div>
                        {doc.front_path ? (
                          frontUrl ? (
                            <div className="relative group">
                              <img
                                src={frontUrl}
                                alt="CNI Recto"
                                className="w-full h-32 object-cover rounded-md border border-border"
                              />
                              <div className="absolute inset-0 bg-noir/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                                <a href={frontUrl} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="ghost" className="text-foreground hover:text-gold">
                                    <Eye className="w-4 h-4 mr-1" /> Voir
                                  </Button>
                                </a>
                                <a href={frontUrl} download>
                                  <Button size="sm" variant="ghost" className="text-foreground hover:text-gold">
                                    <Download className="w-4 h-4 mr-1" /> Télécharger
                                  </Button>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center border border-dashed border-border rounded-md">
                              <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                            </div>
                          )
                        ) : (
                          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                            Non envoyé
                          </div>
                        )}
                      </div>

                      {/* Back photo */}
                      <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Photo Verso</div>
                        {doc.back_path ? (
                          backUrl ? (
                            <div className="relative group">
                              <img
                                src={backUrl}
                                alt="CNI Verso"
                                className="w-full h-32 object-cover rounded-md border border-border"
                              />
                              <div className="absolute inset-0 bg-noir/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                                <a href={backUrl} target="_blank" rel="noreferrer">
                                  <Button size="sm" variant="ghost" className="text-foreground hover:text-gold">
                                    <Eye className="w-4 h-4 mr-1" /> Voir
                                  </Button>
                                </a>
                                <a href={backUrl} download>
                                  <Button size="sm" variant="ghost" className="text-foreground hover:text-gold">
                                    <Download className="w-4 h-4 mr-1" /> Télécharger
                                  </Button>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center border border-dashed border-border rounded-md">
                              <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                            </div>
                          )
                        ) : (
                          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                            Non envoyé
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client info */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {client?.phone ?? "—"}</span>
                      <span>Mis à jour : {formatDateTime(doc.updated_at)}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
