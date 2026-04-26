import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function useSetting(key: string) {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    setValue(data?.value ?? {});
    setLoading(false);
  }

  useEffect(() => { load(); }, [key]);

  async function save(newVal: any) {
    const { error } = await supabase.from("settings").upsert({ key, value: newVal, is_public: true }, { onConflict: "key" });
    if (error) { toast.error(error.message); return; }
    toast.success("Enregistré");
    setValue(newVal);
  }
  return { value, setValue, save, loading };
}

export function SettingPage({ title, subtitle, settingKey, fields }: {
  title: string; subtitle?: string; settingKey: string;
  fields: { key: string; label: string; type?: "text" | "textarea" | "password"; rows?: number }[];
}) {
  const { value, setValue, save, loading } = useSetting(settingKey);
  if (loading) return <div className="p-8">Chargement…</div>;
  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title={title} subtitle={subtitle} />
      <Card className="p-6 bg-card border-border space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea rows={f.rows ?? 6} value={value?.[f.key] ?? ""} onChange={(e) => setValue({ ...value, [f.key]: e.target.value })} />
            ) : (
              <Input type={f.type ?? "text"} value={value?.[f.key] ?? ""} onChange={(e) => setValue({ ...value, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
        <Button onClick={() => save(value)} className="gradient-gold text-noir">Enregistrer</Button>
      </Card>
    </div>
  );
}
