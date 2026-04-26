import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

type Client = { id: string; first_name: string; last_name: string | null; phone: string | null; email: string | null; notes: string | null };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", email: "", notes: "" });

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ first_name: "", last_name: "", phone: "", email: "", notes: "" });
    setOpen(true);
  }
  function openEdit(c: Client) {
    setEditing(c);
    setForm({ first_name: c.first_name, last_name: c.last_name ?? "", phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" });
    setOpen(true);
  }

  async function save() {
    if (!form.first_name.trim()) return toast.error("Prénom requis");
    if (editing) {
      const { error } = await supabase.from("clients").update(form).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Client mis à jour");
    } else {
      const { error } = await supabase.from("clients").insert(form);
      if (error) return toast.error(error.message);
      toast.success("Client créé");
    }
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce client ? Les réservations associées seront supprimées.")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Client supprimé");
    load();
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.first_name.toLowerCase().includes(q) || (c.last_name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q) || (c.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Clients" subtitle={`${clients.length} fiche${clients.length > 1 ? "s" : ""} client`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="gradient-gold text-noir hover:opacity-90"><Plus className="w-4 h-4 mr-2" /> Nouveau client</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display text-2xl text-gold-gradient">{editing ? "Modifier" : "Nouveau"} client</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prénom *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                  <div><Label>Nom</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
                </div>
                <div><Label>Téléphone (format international, ex +237...)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+237699..." /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Notes internes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={save} className="w-full gradient-gold text-noir">{editing ? "Mettre à jour" : "Créer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, téléphone, e-mail…" className="pl-10" />
      </div>

      <div className="grid gap-3">
        {filtered.map((c) => (
          <Card key={c.id} className="p-4 bg-card border-border hover:border-gold/40 transition">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">{c.first_name} {c.last_name}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                </div>
                {c.notes && <p className="text-xs text-muted-foreground mt-2 italic">{c.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Aucun client.</p>}
      </div>
    </div>
  );
}
