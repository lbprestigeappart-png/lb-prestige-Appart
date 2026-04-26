import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function AutomationsPage() {
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("whatsapp_automations").select("*").order("name");
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(it: any) {
    const { error } = await supabase.from("whatsapp_automations").update({
      name: it.name, template_key: it.template_key, trigger_type: it.trigger_type,
      offset_days: it.offset_days, is_active: it.is_active, description: it.description,
    }).eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("Automatisation enregistrée");
  }

  function update(id: string, patch: any) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  async function runNow() {
    toast.info("Exécution du planificateur…");
    const { data, error } = await supabase.functions.invoke("scheduler", {});
    if (error) return toast.error(error.message);
    toast.success(`Exécutées : ${(data as any)?.executed ?? 0}`);
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Automatisations" subtitle="Règles d'envoi automatique des messages WhatsApp"
        actions={<Button onClick={runNow} variant="outline">Lancer maintenant</Button>}
      />
      <div className="space-y-4">
        {items.map((it) => (
          <Card key={it.id} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <Input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} className="font-display text-lg" />
                <div className="text-xs text-muted-foreground mt-1 font-mono">key: {it.key}</div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Switch checked={it.is_active} onCheckedChange={(v) => update(it.id, { is_active: v })} />
                <span className="text-xs">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <Label>Modèle (key)</Label>
                <Input value={it.template_key} onChange={(e) => update(it.id, { template_key: e.target.value })} />
              </div>
              <div>
                <Label>Déclencheur</Label>
                <select value={it.trigger_type} onChange={(e) => update(it.id, { trigger_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option value="on_create">À la création</option>
                  <option value="before_checkin">Avant arrivée</option>
                  <option value="on_checkin">Jour d'arrivée</option>
                  <option value="before_checkout">Avant départ</option>
                  <option value="after_checkout">Après départ</option>
                </select>
              </div>
              <div>
                <Label>Décalage (jours)</Label>
                <Input type="number" value={it.offset_days} onChange={(e) => update(it.id, { offset_days: +e.target.value })} />
              </div>
            </div>
            <div className="mb-3">
              <Label>Description</Label>
              <Input value={it.description ?? ""} onChange={(e) => update(it.id, { description: e.target.value })} />
            </div>
            <Button onClick={() => save(it)} className="gradient-gold text-noir"><Save className="w-4 h-4 mr-2" /> Enregistrer</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
