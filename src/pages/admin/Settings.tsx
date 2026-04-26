import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Settings as SettingsIcon, Crown } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("user_roles").select("user_id, role");
    setAdmins(data ?? []);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Paramètres" subtitle="Configuration et intégrations" />

      <Card className="p-6 bg-card border-border mb-4">
        <div className="flex items-center gap-3 mb-3">
          <Crown className="w-5 h-5 text-gold" />
          <h2 className="font-display text-xl text-gold-gradient">Compte</h2>
        </div>
        <div className="text-sm text-muted-foreground">Connecté en tant que <span className="text-foreground">{user?.email}</span></div>
        <div className="text-xs text-muted-foreground mt-2">Rôles : {admins.filter((a) => a.user_id === user?.id).map((a) => a.role).join(", ")}</div>
      </Card>

      <Card className="p-6 bg-card border-border mb-4">
        <h2 className="font-display text-xl text-gold-gradient mb-3">Intégration WhatsApp (Twilio)</h2>
        <p className="text-sm text-muted-foreground mb-3">
          La connexion Twilio est gérée via le connecteur Lovable. Les appels passent par la passerelle sécurisée.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Statut</span><span className="text-green-400">✓ Connecté</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Numéro émetteur</span><span className="font-mono text-xs">whatsapp:+14155238886 (Sandbox par défaut)</span></div>
        </div>
        <div className="mt-4 p-3 rounded-md bg-secondary text-xs text-muted-foreground">
          <strong className="text-gold">Important :</strong> pour la production, configurez votre numéro WhatsApp Business approuvé dans le secret <code className="text-gold">TWILIO_WHATSAPP_FROM</code> (format <code>whatsapp:+E164</code>).
          Si non défini, le sandbox Twilio est utilisé.
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h2 className="font-display text-xl text-gold-gradient mb-3">À propos</h2>
        <p className="text-sm text-muted-foreground">
          LB Prestige Appart — Plateforme de gestion de conciergerie. Toutes les données sont stockées de manière sécurisée et seuls les administrateurs y ont accès.
        </p>
      </Card>
    </div>
  );
}
