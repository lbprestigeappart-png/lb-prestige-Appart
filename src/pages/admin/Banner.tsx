import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function BannerPage() {
  const [property, setProperty] = useState<any>(null);

  async function load() {
    const { data } = await supabase.from("properties").select("*").eq("is_default", true).maybeSingle();
    setProperty(data);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!property) return;
    const { error } = await supabase.from("properties").update({
      banner_title: property.banner_title, banner_message: property.banner_message,
      banner_url: property.banner_url, name: property.name, subtitle: property.subtitle,
      location: property.location, contact_phone: property.contact_phone,
      contact_email: property.contact_email, whatsapp_number: property.whatsapp_number,
      updated_at: new Date().toISOString(),
    }).eq("id", property.id);
    if (error) return toast.error(error.message);
    toast.success("Enregistré — l'espace client est mis à jour en temps réel");
    load();
  }

  async function uploadBanner(file: File) {
    const path = `banner-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("banners").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("banners").getPublicUrl(path);
    // Add cache-buster to ensure clients see the new image immediately
    const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;
    setProperty({ ...property, banner_url: cacheBustedUrl });
    toast.success("Image téléversée — n'oubliez pas d'enregistrer");
  }

  if (!property) return <div className="p-8">Chargement…</div>;

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Bannière & identité" subtitle="Personnalisation de l'espace client" />
      <Card className="p-6 bg-card border-border space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nom</Label><Input value={property.name ?? ""} onChange={(e) => setProperty({ ...property, name: e.target.value })} /></div>
          <div><Label>Sous-titre</Label><Input value={property.subtitle ?? ""} onChange={(e) => setProperty({ ...property, subtitle: e.target.value })} /></div>
        </div>
        <div><Label>Localisation affichée</Label><Input value={property.location ?? ""} onChange={(e) => setProperty({ ...property, location: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Téléphone</Label><Input value={property.contact_phone ?? ""} onChange={(e) => setProperty({ ...property, contact_phone: e.target.value })} /></div>
          <div><Label>WhatsApp (E.164)</Label><Input value={property.whatsapp_number ?? ""} onChange={(e) => setProperty({ ...property, whatsapp_number: e.target.value })} /></div>
        </div>
        <div><Label>E-mail conciergerie</Label><Input value={property.contact_email ?? ""} onChange={(e) => setProperty({ ...property, contact_email: e.target.value })} /></div>
        <hr className="border-border" />
        <div><Label>Titre bannière</Label><Input value={property.banner_title ?? ""} onChange={(e) => setProperty({ ...property, banner_title: e.target.value })} /></div>
        <div><Label>Message bannière</Label><Textarea rows={3} value={property.banner_message ?? ""} onChange={(e) => setProperty({ ...property, banner_message: e.target.value })} /></div>
        <div>
          <Label>Image bannière</Label>
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])} />
          {property.banner_url && <img key={property.banner_url} src={property.banner_url} alt="Aperçu bannière" className="mt-2 rounded-lg w-full max-h-48 object-cover" />}
        </div>
        <Button onClick={save} className="gradient-gold text-noir">Enregistrer</Button>
      </Card>
    </div>
  );
}
