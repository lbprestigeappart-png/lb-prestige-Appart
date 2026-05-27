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
import { Plus, Pencil, Trash2, Upload, FileCheck2, ExternalLink, X, ImagePlus, UtensilsCrossed, Wine } from "lucide-react";
import { toast } from "sonner";

type Dish = {
  id?: string;
  name: string;
  description: string;
  price_fcfa: number;
  display_order: number;
  image_path?: string | null;
  _imageFile?: File | null;
  _imagePreview?: string | null;
};
type Drink = {
  id?: string;
  name: string;
  drink_type: "alcoholic" | "soft";
  price_fcfa: number;
  display_order: number;
  image_path?: string | null;
  _imageFile?: File | null;
  _imagePreview?: string | null;
};
type Restaurant = {
  id: string;
  name: string;
  phone: string;
  contract_path: string | null;
  contract_signed: boolean;
  display_order: number;
  dishes?: Dish[];
  drinks?: Drink[];
};

const empty = (): Restaurant => ({
  id: "", name: "", phone: "+237", contract_path: null,
  contract_signed: false, display_order: 0, dishes: [], drinks: [],
});

function publicImageUrl(path?: string | null) {
  if (!path) return null;
  const { data } = supabase.storage.from("dish-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function RestaurantsAdmin() {
  const [rows, setRows] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Restaurant>(empty());
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: rs }, { data: ds }, { data: bs }] = await Promise.all([
      supabase.from("restaurants" as any).select("*").order("display_order").order("created_at"),
      supabase.from("restaurant_dishes" as any).select("*").order("display_order"),
      supabase.from("restaurant_drinks" as any).select("*").order("display_order"),
    ]);
    const grouped: Restaurant[] = ((rs ?? []) as any[]).map((r) => ({
      ...r,
      dishes: ((ds ?? []) as any[]).filter((d) => d.restaurant_id === r.id),
      drinks: ((bs ?? []) as any[]).filter((d) => d.restaurant_id === r.id),
    }));
    setRows(grouped);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ ...empty(), dishes: [{ name: "", description: "", price_fcfa: 0, display_order: 0 }], drinks: [] });
    setContractFile(null);
    setOpen(true);
  }
  function openEdit(r: Restaurant) {
    setEditing({ ...r, dishes: r.dishes ? [...r.dishes] : [], drinks: r.drinks ? [...r.drinks] : [] });
    setContractFile(null);
    setOpen(true);
  }

  async function remove(r: Restaurant) {
    if (!confirm(`Supprimer "${r.name}" et tous ses plats/boissons ?`)) return;
    await supabase.from("restaurant_dishes" as any).delete().eq("restaurant_id", r.id);
    await supabase.from("restaurant_drinks" as any).delete().eq("restaurant_id", r.id);
    const { error } = await supabase.from("restaurants" as any).delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Restaurant supprimé");
    load();
  }

  // ---- Dishes ----
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
  function pickDishImage(i: number, file: File | null) {
    const preview = file ? URL.createObjectURL(file) : null;
    setDish(i, { _imageFile: file, _imagePreview: preview });
  }

  // ---- Drinks ----
  function setDrink(i: number, patch: Partial<Drink>) {
    setEditing((e) => {
      const drinks = [...(e.drinks ?? [])];
      drinks[i] = { ...drinks[i], ...patch };
      return { ...e, drinks };
    });
  }
  function addDrink() {
    setEditing((e) => ({
      ...e,
      drinks: [...(e.drinks ?? []), { name: "", drink_type: "soft", price_fcfa: 0, display_order: (e.drinks?.length ?? 0) }],
    }));
  }
  function removeDrink(i: number) {
    setEditing((e) => ({ ...e, drinks: (e.drinks ?? []).filter((_, idx) => idx !== i) }));
  }
  function pickDrinkImage(i: number, file: File | null) {
    const preview = file ? URL.createObjectURL(file) : null;
    setDrink(i, { _imageFile: file, _imagePreview: preview });
  }

  async function uploadImage(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("dish-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) { toast.error("Image: " + error.message); return null; }
    return path;
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
        if (upErr) { toast.error("Contrat : " + upErr.message); return; }
        contractPath = path;
      }

      let restaurantId = editing.id;
      const payload = {
        name: editing.name.trim(),
        phone: editing.phone.trim(),
        contract_path: contractPath,
        contract_signed: editing.contract_signed,
        display_order: editing.display_order,
      };
      if (restaurantId) {
        const { error } = await supabase.from("restaurants" as any).update(payload).eq("id", restaurantId);
        if (error) { toast.error(error.message); return; }
      } else {
        const { data, error } = await supabase.from("restaurants" as any).insert(payload).select("id").single();
        if (error || !data) { toast.error(error?.message ?? "Erreur"); return; }
        restaurantId = (data as any).id;
      }

      // Upload pending images, then replace dishes & drinks
      const dishes = (editing.dishes ?? []).filter((d) => d.name.trim());
      for (const d of dishes) {
        if (d._imageFile) {
          const p = await uploadImage(d._imageFile);
          if (p) d.image_path = p;
        }
      }
      const drinks = (editing.drinks ?? []).filter((d) => d.name.trim());
      for (const d of drinks) {
        if (d._imageFile) {
          const p = await uploadImage(d._imageFile);
          if (p) d.image_path = p;
        }
      }

      await supabase.from("restaurant_dishes" as any).delete().eq("restaurant_id", restaurantId);
      if (dishes.length) {
        const ins = dishes.map((d, i) => ({
          restaurant_id: restaurantId,
          name: d.name.trim(),
          description: d.description?.trim() || null,
          price_fcfa: Number(d.price_fcfa) || 0,
          image_path: d.image_path || null,
          display_order: i,
        }));
        const { error } = await supabase.from("restaurant_dishes" as any).insert(ins);
        if (error) { toast.error(error.message); return; }
      }

      await supabase.from("restaurant_drinks" as any).delete().eq("restaurant_id", restaurantId);
      if (drinks.length) {
        const ins = drinks.map((d, i) => ({
          restaurant_id: restaurantId,
          name: d.name.trim(),
          drink_type: d.drink_type || "soft",
          price_fcfa: Number(d.price_fcfa) || 0,
          image_path: d.image_path || null,
          display_order: i,
        }));
        const { error } = await supabase.from("restaurant_drinks" as any).insert(ins);
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
        subtitle="Conciergerie restauration — partenaires, plats & boissons"
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
              <TableHead>Boissons</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun restaurant. Ajoutez-en un.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="font-mono text-xs">{r.phone}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.dishes?.length ?? 0}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.drinks?.length ?? 0}</TableCell>
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
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-gold-gradient">
              {editing.id ? "Modifier le restaurant" : "Nouveau restaurant"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
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

            {/* DISHES */}
            <div className="rounded-lg border border-border p-4 bg-secondary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-gold" />
                  <Label className="text-base">Plats signatures</Label>
                </div>
                <Button size="sm" variant="outline" onClick={addDish}><Plus className="w-3 h-3" /> Ajouter</Button>
              </div>
              <div className="space-y-3">
                {(editing.dishes ?? []).map((d, i) => {
                  const preview = d._imagePreview || publicImageUrl(d.image_path);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-md border border-border bg-card">
                      <div className="col-span-2">
                        <label className="block aspect-square rounded-md border border-dashed border-border bg-background overflow-hidden relative cursor-pointer hover:border-gold/50">
                          {preview ? (
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-[10px] gap-1">
                              <ImagePlus className="w-5 h-5" />Photo
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => pickDishImage(i, e.target.files?.[0] ?? null)} />
                        </label>
                      </div>
                      <div className="col-span-9 space-y-2">
                        <Input placeholder="Nom du plat" value={d.name} onChange={(e) => setDish(i, { name: e.target.value })} />
                        <Textarea rows={2} placeholder="Description / accompagnement"
                          value={d.description} onChange={(e) => setDish(i, { description: e.target.value })} />
                        <Input type="number" placeholder="Prix FCFA" value={d.price_fcfa}
                          onChange={(e) => setDish(i, { price_fcfa: Number(e.target.value) })} />
                      </div>
                      <Button size="sm" variant="ghost" className="col-span-1" onClick={() => removeDish(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
                {(editing.dishes ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun plat — cliquez "Ajouter".</p>
                )}
              </div>
            </div>

            {/* DRINKS */}
            <div className="rounded-lg border border-border p-4 bg-secondary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wine className="w-4 h-4 text-gold" />
                  <Label className="text-base">Carte des boissons</Label>
                </div>
                <Button size="sm" variant="outline" onClick={addDrink}><Plus className="w-3 h-3" /> Ajouter</Button>
              </div>
              <div className="space-y-3">
                {(editing.drinks ?? []).map((d, i) => {
                  const preview = d._imagePreview || publicImageUrl(d.image_path);
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-md border border-border bg-card items-center">
                      <div className="col-span-2">
                        <label className="block aspect-square rounded-md border border-dashed border-border bg-background overflow-hidden relative cursor-pointer hover:border-gold/50">
                          {preview ? (
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-[10px] gap-1">
                              <ImagePlus className="w-5 h-5" />Photo
                            </div>
                          )}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => pickDrinkImage(i, e.target.files?.[0] ?? null)} />
                        </label>
                      </div>
                      <Input className="col-span-4" placeholder="Nom" value={d.name} onChange={(e) => setDrink(i, { name: e.target.value })} />
                      <select
                        className="col-span-3 h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={d.drink_type}
                        onChange={(e) => setDrink(i, { drink_type: e.target.value as any })}
                      >
                        <option value="soft">Soft</option>
                        <option value="alcoholic">Alcoolisé</option>
                      </select>
                      <Input className="col-span-2" type="number" placeholder="Prix" value={d.price_fcfa}
                        onChange={(e) => setDrink(i, { price_fcfa: Number(e.target.value) })} />
                      <Button size="sm" variant="ghost" className="col-span-1" onClick={() => removeDrink(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
                {(editing.drinks ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucune boisson — cliquez "Ajouter".</p>
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
