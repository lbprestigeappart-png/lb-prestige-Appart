import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, FileCheck2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

type Dish = {
  id?: string;
  name: string;
  description: string;
  price_fcfa: number;
  display_order: number;
};
type Restaurant = {
  id: string;
  name: string;
  phone: string;
  contract_path: string | null;
  contract_signed: boolean;
  display_order: number;
  dishes?: Dish[];
};

const empty = (): Restaurant => ({
  id: "", name: "", phone: "+237", contract_path: null,
  contract_signed: false, display_order: 0, dishes: [],
});

export default function RestaurantsAdmin() {
  const [rows, setRows] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant>(empty());
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: rs } = await supabase.from("restaurants" as any)
      .select("*").order("display_order").order("created_at");
    const { data: ds } = await supabase.from("restaurant_dishes" as any)
      .select("*").order("display_order");
    const grouped: Restaurant[] = ((rs ?? []) as any[]).map((r) => ({
      ...r,
      dishes: ((ds ?? []) as any[]).filter((d) => d.restaurant_id === r.id),
    }));
    setRows(grouped);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ ...empty(), dishes: [{ name: "", description: "", price_fcfa: 0, display_order: 0 }] });
    setContractFile(null);
    setOpen(true);
  }
  function openEdit(r: Restaurant) {
    setEditing({ ...r, dishes: r.dishes ? [...r.dishes] : [] });
    setContractFile(null);
    setOpen(true);
  }

  async function remove(r: Restaurant) {
    if (!confirm(`Supprimer "${r.name}" et tous ses plats ?`)) return;
    const { error } = await supabase.from("restaurants" as any).delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Restaurant supprimé");
    load();
  }

  function setDish(i: number, patch: Partial<Dish>) {
    setEditing((e) => {
      const dishes = [...(e.dishes ?? [])];
      dishes[i] = { ...dishes[i], ...patch };
      return { ...e, dishes };
    });
  }
  function addDish() {
    setEditing((e) => ({
      ...e,
      dishes: [...(e.dishes ?? []), { name: "", description: "", price_fcfa: 0, display_order: (e.dishes?.length ?? 0) }],
    }));
  }
  function removeDish(i: number) {
    setEditing((e) => ({ ...e, dishes: (e.dishes ?? []).filter((_, idx) => idx !== i) }));
  }

  async function save() {
    if (!editing.name.trim()) return toast.error("Nom requis");
    if (!editing.phone.trim()) return toast.error("Téléphone requis");
    setSaving(true);
    try {
      let contractPath = editing.contract_path;
      if (contractFile) {
        const ext = contractFile.name.split(".").pop() || "pdf";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("restaurant-contracts")
          .upload(path, contractFile, { upsert: true, contentType: contractFile.type });
        if (upErr) { toast.error("Échec téléversement contrat : " + upErr.message); return; }
        contractPath = path;
      }

      let restaurantId = editing.id;
      if (restaurantId) {
        const { error } = await supabase.from("restaurants" as any).update({
          name: editing.name.trim(),
          phone: editing.phone.trim(),
          contract_path: contractPath,
          contract_signed: editing.contract_signed,
          display_order: editing.display_order,
        }).eq("id", restaurantId);
        if (error) { toast.error(error.message); return; }
      } else {
        const { data, error } = await supabase.from("restaurants" as any).insert({
          name: editing.name.trim(),
          phone: editing.phone.trim(),
          contract_path: contractPath,
          contract_signed: editing.contract_signed,
          display_order: editing.display_order,
        }).select("id").single();
        if (error || !data) { toast.error(error?.message ?? "Erreur"); return; }
        restaurantId = (data as any).id;
      }

      // Replace dishes wholesale
      await supabase.from("restaurant_dishes" as any).delete().eq("restaurant_id", restaurantId);
      const dishes = (editing.dishes ?? []).filter((d) => d.name.trim());
      if (dishes.length) {
        const payload = dishes.map((d, i) => ({
          restaurant_id: restaurantId,
          name: d.name.trim(),
          description: d.description?.trim() || null,
          price_fcfa: Number(d.price_fcfa) || 0,
          display_order: i,
        }));
        const { error } = await supabase.from("restaurant_dishes" as any).insert(payload);
        if (error) { toast.error(error.message); return; }
      }

      toast.success("Enregistré");
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function openContract(path: string) {
    const { data, error } = await supabase.storage.from("restaurant-contracts").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error("Impossible d'ouvrir");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Restaurants"
        subtitle="Conciergerie restauration — partenaires & menus"
        actions={
          <Button onClick={openNew} className="gradient-gold text-noir">
            <Plus className="w-4 h-4" /> Ajouter un restaurant
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Plats</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun restaurant. Ajoutez-en un.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.dishes?.length ?? 0} plat(s)</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {r.contract_signed
                      ? <Badge className="bg-green-600/20 text-green-400 border-green-600/40 hover:bg-green-600/20">Signé</Badge>
                      : <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/20">En attente</Badge>}
                    {r.contract_path && (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openContract(r.contract_path!)}>
                        <ExternalLink className="w-3 h-3" /> Voir
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-gold-gradient">
              {editing.id ? "Modifier le restaurant" : "Nouveau restaurant"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nom du restaurant *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Téléphone *</Label>
                <Input type="tel" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="+237..." />
              </div>
            </div>

            <div>
              <Label>Contrat de partenariat (PDF / image)</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="file" accept="application/pdf,image/*" onChange={(e) => setContractFile(e.target.files?.[0] ?? null)} />
                {(contractFile || editing.contract_path) && (
                  <div className="flex items-center gap-1 text-xs text-gold whitespace-nowrap">
                    <FileCheck2 className="w-4 h-4" /> Chargé
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 mt-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.contract_signed}
                  onChange={(e) => setEditing({ ...editing, contract_signed: e.target.checked })}
                />
                Contrat signé
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Menu & Plats</Label>
                <Button size="sm" variant="outline" onClick={addDish}><Plus className="w-3 h-3" /> Ajouter un plat</Button>
              </div>
              <div className="space-y-2">
                {(editing.dishes ?? []).map((d, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-md border border-border bg-secondary/30">
                    <Input className="col-span-4" placeholder="Nom du plat" value={d.name} onChange={(e) => setDish(i, { name: e.target.value })} />
                    <Textarea className="col-span-5 min-h-[40px]" rows={1} placeholder="Description / accompagnement"
                      value={d.description} onChange={(e) => setDish(i, { description: e.target.value })} />
                    <Input className="col-span-2" type="number" placeholder="Prix" value={d.price_fcfa}
                      onChange={(e) => setDish(i, { price_fcfa: Number(e.target.value) })} />
                    <Button size="sm" variant="ghost" className="col-span-1" onClick={() => removeDish(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(editing.dishes ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun plat — cliquez "Ajouter un plat".</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving} className="gradient-gold text-noir">
              <Upload className="w-4 h-4" /> {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
