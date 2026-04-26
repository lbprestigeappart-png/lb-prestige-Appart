import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("whatsapp_templates").select("*").order("name");
    setTemplates(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(t: any) {
    const { error } = await supabase.from("whatsapp_templates").update({
      name: t.name, content: t.content, description: t.description, is_active: t.is_active,
    }).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Modèle enregistré");
  }

  async function addNew() {
    const key = `custom_${Date.now()}`;
    const { error } = await supabase.from("whatsapp_templates").insert({
      key, name: "Nouveau modèle", content: "Bonjour {prenom}, …", description: "",
    });
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce modèle ?")) return;
    await supabase.from("whatsapp_templates").delete().eq("id", id);
    load();
  }

  function update(id: string, patch: any) {
    setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Modèles WhatsApp" subtitle="Variables disponibles : {prenom}, {nom}, {lien}, {code}, {arrivee}, {depart}"
        actions={<Button onClick={addNew} className="gradient-gold text-noir"><Plus className="w-4 h-4 mr-2" /> Nouveau</Button>}
      />
      <div className="space-y-4">
        {templates.map((t) => (
          <Card key={t.id} className="p-5 bg-card border-border">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <Label>Nom</Label>
                <Input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} />
                <div className="text-xs text-muted-foreground mt-1 font-mono">key: {t.key}</div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Switch checked={t.is_active} onCheckedChange={(v) => update(t.id, { is_active: v })} />
                <span className="text-xs">Actif</span>
              </div>
            </div>
            <div className="mb-3">
              <Label>Description interne</Label>
              <Input value={t.description ?? ""} onChange={(e) => update(t.id, { description: e.target.value })} />
            </div>
            <div className="mb-3">
              <Label>Contenu</Label>
              <Textarea rows={8} value={t.content} onChange={(e) => update(t.id, { content: e.target.value })} className="font-mono text-sm" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save(t)} className="gradient-gold text-noir"><Save className="w-4 h-4 mr-2" /> Enregistrer</Button>
              <Button variant="outline" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 mr-2 text-destructive" /> Supprimer</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
