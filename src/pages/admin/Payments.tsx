import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDate, statusLabel } from "@/lib/format";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reservation_id: "", amount: 0, currency: "XAF", status: "pending", payment_type: "deposit", reference: "" });

  async function load() {
    const [p, r] = await Promise.all([
      supabase.from("payments").select("*, reservations(reservation_code, clients(first_name,last_name))").order("created_at", { ascending: false }),
      supabase.from("reservations").select("id, reservation_code, clients(first_name,last_name)").order("check_in", { ascending: false }),
    ]);
    setPayments(p.data ?? []);
    setReservations(r.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.reservation_id) return toast.error("Réservation requise");
    const payload = { ...form, paid_at: form.status === "paid" ? new Date().toISOString() : null };
    const { error } = await supabase.from("payments").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Paiement enregistré");
    setOpen(false);
    load();
  }

  const total = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Paiements" subtitle={`Total encaissé : ${total.toLocaleString("fr-FR")} XAF`}
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
                      {reservations.map((r) => <SelectItem key={r.id} value={r.id}>{r.clients?.first_name} {r.clients?.last_name} — {r.reservation_code}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Montant</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
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
                <div><Label>Référence</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
                <Button onClick={create} className="w-full gradient-gold text-noir">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="space-y-2">
        {payments.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aucun paiement.</Card>}
        {payments.map((p) => (
          <Card key={p.id} className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{p.reservations?.clients?.first_name} {p.reservations?.clients?.last_name}</div>
                <div className="text-xs text-muted-foreground">{p.reservations?.reservation_code} • {p.payment_type} {p.reference && `• ${p.reference}`}</div>
                <div className="text-xs text-muted-foreground">{formatDate(p.created_at)}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-gold">{Number(p.amount).toLocaleString("fr-FR")} {p.currency}</div>
                <div className="text-xs text-muted-foreground">{statusLabel(p.status)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
