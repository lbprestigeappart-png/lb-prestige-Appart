import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ExternalLink, Upload } from "lucide-react";
import { toast } from "sonner";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("useful_documents").select("*").order("display_order");
    setDocs(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function upload() {
    if (!title || !file) return toast.error("Titre et fichier requis");
    setBusy(true);
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
    const sizeKb = Math.round(file.size / 1024);
    const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} Mo` : `${sizeKb} Ko`;
    const { error } = await supabase.from("useful_documents").insert({
      title, storage_path: path, external_url: pub.publicUrl,
      file_type: file.name.split(".").pop()?.toUpperCase() ?? "PDF",
      file_size: sizeStr, display_order: docs.length,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Document ajouté");
    setTitle(""); setFile(null);
    load();
  }

  async function remove(d: any) {
    if (!confirm("Supprimer ?")) return;
    if (d.storage_path) await supabase.storage.from("documents").remove([d.storage_path]);
    await supabase.from("useful_documents").delete().eq("id", d.id);
    load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Documents utiles" subtitle="PDF affichés dans l'espace client" />
      <Card className="p-6 bg-card border-border mb-6">
        <h2 className="font-display text-xl text-gold-gradient mb-3">Ajouter un document</h2>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div><Label>Titre</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Fichier (PDF, image…)</Label><Input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        <Button onClick={upload} disabled={busy} className="gradient-gold text-noir"><Upload className="w-4 h-4 mr-2" /> {busy ? "Envoi…" : "Téléverser"}</Button>
      </Card>

      <div className="space-y-2">
        {docs.map((d) => (
          <Card key={d.id} className="p-4 bg-card border-border flex items-center justify-between">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-xs text-muted-foreground">{d.file_type} {d.file_size && `• ${d.file_size}`}</div>
            </div>
            <div className="flex gap-2">
              {d.external_url && d.external_url !== "#" && <a href={d.external_url} target="_blank" rel="noreferrer"><Button size="icon" variant="ghost"><ExternalLink className="w-4 h-4" /></Button></a>}
              <Button size="icon" variant="ghost" onClick={() => remove(d)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
