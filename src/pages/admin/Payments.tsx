import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { formatDate, statusLabel, formatFCFA } from "@/lib/format";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    reservation_id: "",
    amount: 0,
    currency: "FCFA",
    status: "paid",
    payment_type: "deposit",
    reference: "",
  });

  async function load() {
    const [p, r, s] = await Promise.all([
      supabase.from("payments").select("*, reservations(reservation_code, total_price, suite_type, clients(first_name,last_name))").order("created_at", { ascending: false }),
      supabase.from("reservations").select("id, reservation_code, total_price, suite_type, clients(first_name,last_name)").order("check_in", { ascending: false }),
      supabase.from("reservation_payment_summary" as any).select("*"),
    ]);
    setPayments(p.data ?? []);
    setReservations(r.data ?? []);
    const m: Record<string, any> = {};
    (s.data ?? []).forEach((row: any) => { m[row.reservation_id] = row; });
    setSummaries(m);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.reservation_id) return toast.error("Réservation requise");
    const payload = { ...form, paid_at: form.status === "paid" ? new Date().toISOString() : null };
    const { error } = await supabase.from("payments").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Paiement enregistré");
    setOpen(false);
    setForm({ reservation_id: "", amount: 0, currency: "FCFA", status: "paid", payment_type: "deposit", reference: "" });
    load();
  }

  // Aggregate per-reservation summary list
  const summaryRows = reservations.map((r) => {
    const s = summaries[r.id];
    return {
      reservation: r,
      total: Number(r.total_price ?? 0),
      paid: Number(s?.paid_amount ?? 0),
      remaining: Number(s?.remaining_amount ?? r.total_price ?? 0),
      status: s?.payment_status_label ?? (r.total_price > 0 ? "unpaid" : "unset"),
    };
  }).filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const c = row.reservation.clients;
    return row.reservation.reservation_code.toLowerCase().includes(q) ||
      `${c?.first_name} ${c?.last_name}`.toLowerCase().includes(q);
  });

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalRemaining = summaryRows.reduce((s, r) => s + r.remaining, 0);

  const statusBadge: Record<string, string> = {
    unpaid: "bg-red-500/15 text-red-400 border-red-500/30",
    advance: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    settled: "bg-green-500/15 text-green-400 border-green-500/30",
    unset: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Paiements"
        subtitle={`Encaissé : ${formatFCFA(totalPaid)} • Reste à percevoir : ${formatFCFA(totalRemaining)}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-gold text-noir"><Plus className="w-4 h-4 mr-2" /> Nouveau paiement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-2xl text-gold-gradient">Nouveau paiement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Réservation</Label>
                  <Select value={form.reservation_id} onValueChange={(v) => setForm({ ...form, reservation_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {reservations.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.clients?.first_name} {r.clients?.last_name} — {r.reservation_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.reservation_id && summaries[form.reservation_id] && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Total : {formatFCFA(summaries[form.reservation_id].total_price)} •
                      Déjà payé : {formatFCFA(summaries[form.reservation_id].paid_amount)} •
                      Reste : {formatFCFA(summaries[form.reservation_id].remaining_amount)}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant (FCFA)</Label><Input type="number" min={0} step={1000} value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
                  <div><Label>Devise</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Acompte</SelectItem>
                        <SelectItem value="balance">Solde</SelectItem>
                        <SelectItem value="full">Total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="partial">Partiel</SelectItem>
                        <SelectItem value="paid">Payé</SelectItem>
                        <SelectItem value="refunded">Remboursé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Référence</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Ex : MoMo, Orange Money, Espèces…" /></div>
                <Button onClick={create} className="w-full gradient-gold text-noir">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Code, nom client…" className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="unpaid">Non payé</SelectItem>
            <SelectItem value="advance">Avance versée</SelectItem>
            <SelectItem value="settled">Soldé</SelectItem>
            <SelectItem value="unset">Prix non défini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Récapitulatif par réservation */}
      <h2 className="font-display text-xl text-gold-gradient mb-3">Solde par réservation</h2>
      <div className="space-y-2 mb-8">
        {summaryRows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aucune réservation correspondante.</Card>}
        {summaryRows.map((row) => (
          <Card key={row.reservation.id} className="p-4 bg-card border-border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{row.reservation.clients?.first_name} {row.reservation.clients?.last_name}</span>
                  <span className="text-xs text-gold font-mono">{row.reservation.reservation_code}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusBadge[row.status]}`}>{statusLabel(row.status)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{row.reservation.suite_type}</div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-right text-sm">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Total</div>
                  <div className="font-medium">{formatFCFA(row.total)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Payé</div>
                  <div className="font-medium text-green-400">{formatFCFA(row.paid)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Reste</div>
                  <div className={`font-medium ${row.remaining > 0 ? "text-orange-400" : "text-green-400"}`}>{formatFCFA(row.remaining)}</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Historique des paiements */}
      <h2 className="font-display text-xl text-gold-gradient mb-3">Historique des paiements</h2>
      <div className="space-y-2">
        {payments.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aucun paiement.</Card>}
        {payments.map((p) => (
          <Card key={p.id} className="p-4 bg-card border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{p.reservations?.clients?.first_name} {p.reservations?.clients?.last_name}</div>
                <div className="text-xs text-muted-foreground">
                  {p.reservations?.reservation_code} • {p.payment_type} {p.reference && `• ${p.reference}`}
                </div>
                <div className="text-xs text-muted-foreground">{formatDate(p.created_at)}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-gold">{formatFCFA(Number(p.amount))}</div>
                <div className="text-xs text-muted-foreground">{statusLabel(p.status)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
