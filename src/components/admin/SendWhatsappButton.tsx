import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { MessageCircle, Loader2, ExternalLink } from "lucide-react";
import { sendWhatsapp, buildWaMeLink } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const TEMPLATES = [
  { key: "welcome", label: "🎉 Bienvenue + lien client" },
  { key: "checkin_reminder", label: "🛎️ Rappel arrivée" },
  { key: "checkout_reminder", label: "👋 Rappel check-out" },
  { key: "review_request", label: "⭐ Demande d'avis" },
  { key: "promotion", label: "💎 Promotion" },
];

type Props = {
  reservationId: string;
  phone?: string | null;
  onSent?: () => void;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
};

export default function SendWhatsappButton({ reservationId, phone, onSent, size = "sm", variant = "outline" }: Props) {
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState<typeof TEMPLATES>(TEMPLATES);

  useEffect(() => {
    supabase.from("whatsapp_templates").select("key,name,is_active").eq("is_active", true).then(({ data }) => {
      if (data?.length) {
        setAvailable(
          data.map((d) => ({
            key: d.key,
            label: TEMPLATES.find((t) => t.key === d.key)?.label ?? d.name,
          }))
        );
      }
    });
  }, []);

  async function handleSend(templateKey: string) {
    setBusy(true);
    await sendWhatsapp({ reservation_id: reservationId, template_key: templateKey });
    setBusy(false);
    onSent?.();
  }

  const hasPhone = !!phone;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={busy} className="gap-1">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
          WhatsApp
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs">
          {hasPhone ? "Envoyer un modèle" : "⚠ Pas de téléphone — fallback wa.me"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((t) => (
          <DropdownMenuItem key={t.key} onClick={() => handleSend(t.key)} className="text-xs">
            {t.label}
          </DropdownMenuItem>
        ))}
        {hasPhone && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open(buildWaMeLink(phone!, ""), "_blank")} className="text-xs">
              <ExternalLink className="w-3 h-3 mr-2" /> Ouvrir conversation wa.me
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
