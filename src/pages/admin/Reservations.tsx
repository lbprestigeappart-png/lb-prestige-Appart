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
import { Plus, Search, Eye, Copy, CheckCircle2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateTime, nightsBetween, statusLabel, buildClientLink } from "@/lib/format";
import SendWhatsappButton from "@/components/admin/SendWhatsappButton";

export default function ReservationsPage() {
  const [list, setList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", check_in: "", check_out: "", guests: 2, suite_type: "Suite Premium", status: "confirmed", internal_notes: "" });
  const [sending, setSending] = useState<string | null>(null);

  async function load() {
    const [resv, cls] = await Promise.all([
      supabase.from("reservations").select("*, clients(first_name,last_name,phone,email)").order("check_in", { ascending: false }),
      supabase.from("clients").select("*").order("first_name"),
    ]);
    setList(resv.data ?? []);
    setClients(cls.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.client_id || !form.check_in || !form.check_out) return toast.error("Champs manquants");
    const { data, error } = await supabase.from("reservations").insert(form as any).select("*, clients(first_name,phone)").single();
    if (error) return toast.error(error.message);
    toast.success("Réservation créée");
    setOpen(false);
    load();
    // auto trigger welcome
    if (data) {
      await supabase.functions.invoke("run-automations", { body: { reservation_id: data.id, trigger: "on_create" } });
    }
  }

  async function sendWelcome(r: any) {
    setSending(r.id);
    const { error } = await supabase.functions.invoke("send-whatsapp", {
      body: { reservation_id: r.id, template_key: "welcome" },
    });
    setSending(null);
    if (error) return toast.error(error.message);
    toast.success("Message WhatsApp envoyé");
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

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Réservations" subtitle={`${list.length} réservation${list.length > 1 ? "s" : ""}`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gradient-gold text-noir"><Plus className="w-4 h-4 mr-2" /> Nouvelle réservation</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-2xl text-gold-gradient">Nouvelle réservation</DialogTitle></DialogHeader>
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
                <Button onClick={create} className="w-full gradient-gold text-noir">Créer & envoyer message de bienvenue</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

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
        {filtered.map((r) => (
          <Card key={r.id} className="p-5 bg-card border-border hover:border-gold/40 transition">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-display text-xl text-foreground">{r.clients?.first_name} {r.clients?.last_name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[r.status]}`}>{statusLabel(r.status)}</span>
                  <span className="text-xs text-gold font-mono">{r.reservation_code}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(r.check_in)} → {formatDate(r.check_out)} • {nightsBetween(r.check_in, r.check_out)} nuits • {r.guests} voyageur{r.guests > 1 ? "s" : ""}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{r.clients?.phone}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyLink(r.client_token)}><Copy className="w-3.5 h-3.5 mr-1" /> Lien</Button>
                <Button size="sm" variant="outline" onClick={() => sendWelcome(r)} disabled={sending === r.id}>
                  <Send className="w-3.5 h-3.5 mr-1" /> {sending === r.id ? "..." : "WhatsApp"}
                </Button>
                <Link to={`/client/${r.client_token}`} target="_blank">
                  <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" /></Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Aucune réservation.</p>}
      </div>
    </div>
  );
}
