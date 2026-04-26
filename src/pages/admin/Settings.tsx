import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Crown } from "lucide-react";
import WhatsappConfig from "@/components/admin/WhatsappConfig";

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

      <div className="mb-4">
        <WhatsappConfig />
      </div>

      <Card className="p-6 bg-card border-border">
        <h2 className="font-display text-xl text-gold-gradient mb-3">À propos</h2>
        <p className="text-sm text-muted-foreground">
          LB Prestige Appart — Plateforme de gestion de conciergerie. Toutes les données sont stockées de manière sécurisée et seuls les administrateurs y ont accès.
        </p>
      </Card>
    </div>
  );
}
