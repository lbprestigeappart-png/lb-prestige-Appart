import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function WifiPage() {
  const [wifi, setWifi] = useState<any>({});
  const [netflix, setNetflix] = useState<any>({});

  async function load() {
    const { data } = await supabase.from("settings").select("key,value").in("key", ["wifi", "netflix"]);
    for (const row of data ?? []) {
      if (row.key === "wifi") setWifi(row.value);
      if (row.key === "netflix") setNetflix(row.value);
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const ops = [
      supabase.from("settings").upsert({ key: "wifi", value: wifi, is_public: true }, { onConflict: "key" }),
      supabase.from("settings").upsert({ key: "netflix", value: netflix, is_public: true }, { onConflict: "key" }),
    ];
    const res = await Promise.all(ops);
    if (res.some((r) => r.error)) toast.error("Erreur"); else toast.success("Enregistré");
  }

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Wi-Fi & Netflix" />
      <Card className="p-6 bg-card border-border space-y-4 mb-4">
        <h2 className="font-display text-xl text-gold-gradient">Wi-Fi</h2>
        <div><Label>SSID (nom du réseau)</Label><Input value={wifi.ssid ?? ""} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} /></div>
        <div><Label>Mot de passe</Label><Input value={wifi.password ?? ""} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} /></div>
      </Card>
      <Card className="p-6 bg-card border-border space-y-4 mb-4">
        <h2 className="font-display text-xl text-gold-gradient">Netflix</h2>
        <div><Label>Identifiant</Label><Input value={netflix.username ?? ""} onChange={(e) => setNetflix({ ...netflix, username: e.target.value })} /></div>
        <div><Label>Mot de passe</Label><Input value={netflix.password ?? ""} onChange={(e) => setNetflix({ ...netflix, password: e.target.value })} /></div>
        <div><Label>Instructions</Label><Textarea rows={3} value={netflix.instructions ?? ""} onChange={(e) => setNetflix({ ...netflix, instructions: e.target.value })} /></div>
      </Card>
      <Button onClick={save} className="gradient-gold text-noir">Enregistrer</Button>
    </div>
  );
}
