import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Copy, CheckCircle2, FileSignature, Pencil, IdCard, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, nightsBetween, statusLabel, buildClientLink, formatFCFA } from "@/lib/format";
import SendWhatsappButton from "@/components/admin/SendWhatsappButton";

type ReservationForm = {
  client_id: string;
  check_in: string;
  check_out: string;
  guests: number;
  suite_type: string;
  status: string;
  internal_notes: string;
  total_price: number;
};

const EMPTY_FORM: ReservationForm = {
  client_id: "", check_in: "", check_out: "", guests: 2,
  suite_type: "Suite Premium", status: "confirmed", internal_notes: "", total_price: 0,
};

export default function ReservationsPage() {
  const [list, setList] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReservationForm>(EMPTY_FORM);

  async function load() {
    const [resv, cls] = await Promise.all([
      supabase.from("reservations").select("*, clients(first_name,last_name,phone,email)").order("check_in", { ascending: false }),
      supabase.from("clients").select("*").order("first_name"),
    ]);
    setList(resv.data ?? []);
    setClients(cls.data ?? []);

    // Load payment summaries
    const { data: sums } = await supabase.from("reservation_payment_summary" as any).select("*");
    const map: Record<string, any> = {};
    (sums ?? []).forEach((s: any) => { map[s.reservation_id] = s; });
    setSummaries(map);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(r: any) {
    setEditingId(r.id);
    setForm({
      client_id: r.client_id,
      check_in: r.check_in,
      check_out: r.check_out,
      guests: r.guests,
      suite_type: r.suite_type ?? "Suite Premium",
      status: r.status,
      internal_notes: r.internal_notes ?? "",
      total_price: Number(r.total_price ?? 0),
    });
    setOpen(true);
  }

  async function save() {
    if (!form.client_id || !form.check_in || !form.check_out) return toast.error("Champs manquants");

    if (editingId) {
      const { error } = await supabase.from("reservations").update(form as any).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Réservation mise à jour");
    } else {
      const { data, error } = await supabase.from("reservations").insert(form as any).select("*, clients(first_name,phone)").single();
      if (error) return toast.error(error.message);
      toast.success("Réservation créée");
      if (data) {
        await supabase.functions.invoke("run-automations", { body: { reservation_id: data.id, trigger: "on_create" } });
      }
    }
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    load();
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(buildClientLink(token));
    toast.success("Lien copié");
  }

  const filtered = list.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const c = r.clients;
    return r.reservation_code.toLowerCase().includes(q) ||
      `${c?.first_name} ${c?.last_name}`.toLowerCase().includes(q) ||
      (c?.phone ?? "").includes(q);
  });

  const statusColors: Record<string, string> = {
    confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    in_progress: "bg-gold/15 text-gold border-gold/30",
    completed: "bg-green-500/15 text-green-400 border-green-500/30",
    pending: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  const paymentBadgeColor: Record<string, string> = {
    unpaid: "bg-red-500/15 text-red-400 border-red-500/30",
    advance: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    settled: "bg-green-500/15 text-green-400 border-green-500/30",
    unset: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Réservations" subtitle={`${list.length} réservation${list.length > 1 ? "s" : ""}`}
        actions={
          <Button className="gradient-gold text-noir" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Nouvelle réservation
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl text-gold-gradient">{editingId ? "Modifier la réservation" : "Nouvelle réservation"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.phone && `— ${c.phone}`}</SelectItem>)}
                </SelectContent>
              </Select>
              <Link to="/admin/clients" className="text-xs text-gold hover:underline mt-1 inline-block">+ Créer un nouveau client</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Arrivée</Label><Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
              <div><Label>Départ</Label><Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Voyageurs</Label><Input type="number" min={1} value={form.guests} onChange={(e) => setForm({ ...form, guests: +e.target.value })} /></div>
              <div><Label>Type de suite</Label><Input value={form.suite_type} onChange={(e) => setForm({ ...form, suite_type: e.target.value })} /></div>
            </div>
            <div>
              <Label>Prix total du séjour (FCFA)</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={form.total_price}
                onChange={(e) => setForm({ ...form, total_price: +e.target.value })}
                placeholder="Ex : 150000"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Le montant payé et le reste à payer sont calculés automatiquement depuis les paiements liés.
              </p>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="confirmed">Confirmée</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminée</SelectItem>
                  <SelectItem value="cancelled">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full gradient-gold text-noir">
              {editingId ? "Enregistrer les modifications" : "Créer & envoyer message de bienvenue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code, nom, téléphone…" className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmées</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filtered.map((r) => {
          const sum = summaries[r.id];
          const paid = Number(sum?.paid_amount ?? 0);
          const remaining = Number(sum?.remaining_amount ?? r.total_price ?? 0);
          const payStatus = sum?.payment_status_label ?? (r.total_price > 0 ? "unpaid" : "unset");
          return (
            <Card key={r.id} className="p-5 bg-card border-border hover:border-gold/40 transition">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-display text-xl text-foreground">{r.clients?.first_name} {r.clients?.last_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[r.status]}`}>{statusLabel(r.status)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${paymentBadgeColor[payStatus]}`}>{statusLabel(payStatus)}</span>
                    <span className="text-xs text-gold font-mono">{r.reservation_code}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(r.check_in)} → {formatDate(r.check_out)} • {nightsBetween(r.check_in, r.check_out)} nuits • {r.guests} voyageur{r.guests > 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{r.clients?.phone ?? "Pas de téléphone"}</div>
                  {r.total_price > 0 && (
                    <div className="text-xs mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Total : <strong className="text-foreground">{formatFCFA(r.total_price)}</strong></span>
                      <span>Payé : <strong className="text-green-400">{formatFCFA(paid)}</strong></span>
                      <span>Reste : <strong className={remaining > 0 ? "text-orange-400" : "text-green-400"}>{formatFCFA(remaining)}</strong></span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-[11px]">
                    {r.client_link_opened_at ? (
                      <span className="inline-flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-3 h-3" /> Lien ouvert {formatDateTime(r.client_link_opened_at)}
                        {r.client_link_open_count > 1 && ` (×${r.client_link_open_count})`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Lien non ouvert</span>
                    )}
                    {r.rules_signed_at && (
                      <span className="inline-flex items-center gap-1 text-gold">
                        <FileSignature className="w-3 h-3" /> Règlement signé
                      </span>
                    )}
                    {r.whatsapp_welcome_sent && (
                      <span className="text-blue-400">✓ Bienvenue envoyée</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-start">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyLink(r.client_token)}><Copy className="w-3.5 h-3.5 mr-1" /> Lien</Button>
                  <SendWhatsappButton reservationId={r.id} phone={r.clients?.phone} onSent={load} />
                  <Link to={`/client/${r.client_token}`} target="_blank">
                    <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" /></Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Aucune réservation.</p>}
      </div>
    </div>
  );
}
