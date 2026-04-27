import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { MessageCircle, Loader2, ExternalLink, Copy, Phone } from "lucide-react";
import { sendWhatsapp, buildWaMeLink, copyToClipboard, renderTemplate } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneE164, buildClientLink } from "@/lib/format";
import { toast } from "sonner";

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "🎉 Bienvenue + lien client",
  checkin_reminder: "🛎️ Rappel arrivée",
  checkout_reminder: "👋 Rappel check-out",
  review_request: "⭐ Demande d'avis",
  promotion: "💎 Promotion",
};

type Props = {
  reservationId: string;
  phone?: string | null;
  onSent?: () => void;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
};

export default function SendWhatsappButton({ reservationId, phone, onSent, size = "sm", variant = "outline" }: Props) {
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("whatsapp_templates").select("*").eq("is_active", true).then(({ data }) => {
      setTemplates(data ?? []);
    });
  }, []);

  async function handleSend(templateKey: string) {
    setBusy(true);
    await sendWhatsapp({ reservation_id: reservationId, template_key: templateKey });
    setBusy(false);
    onSent?.();
  }

  async function handleCopyMessage(templateKey: string) {
    const tpl = templates.find((t) => t.key === templateKey);
    if (!tpl) return;
    // We need reservation context; fetch minimal data
    const { data: r } = await supabase
      .from("reservations")
      .select("reservation_code, client_token, check_in, check_out, suite_type, clients(first_name,last_name)")
      .eq("id", reservationId).maybeSingle();
    if (!r) return toast.error("Réservation introuvable");
    const client: any = r.clients;
    const content = renderTemplate(tpl.content, {
      prenom: client?.first_name ?? "",
      nom: client?.last_name ?? "",
      lien: buildClientLink(r.client_token),
      code: r.reservation_code,
      arrivee: new Date(r.check_in).toLocaleDateString("fr-FR"),
      depart: new Date(r.check_out).toLocaleDateString("fr-FR"),
      suite: r.suite_type ?? "",
    });
    await copyToClipboard(content, "Message copié dans le presse-papier");
  }

  const cleanPhone = normalizePhoneE164(phone);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={busy} className="gap-1">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
          WhatsApp
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs">
          {cleanPhone ? `Mode manuel wa.me → ${cleanPhone}` : "⚠ Pas de téléphone"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(templates.length ? templates : Object.entries(TEMPLATE_LABELS).map(([k, n]) => ({ key: k, name: n }))).map((t: any) => (
          <div key={t.key} className="flex items-center">
            <DropdownMenuItem onClick={() => handleSend(t.key)} className="text-xs flex-1">
              {TEMPLATE_LABELS[t.key] ?? t.name}
            </DropdownMenuItem>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopyMessage(t.key); }}
              className="px-2 py-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Copier le message"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        ))}
        {cleanPhone && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open(buildWaMeLink(cleanPhone, ""), "_blank")} className="text-xs">
              <ExternalLink className="w-3 h-3 mr-2" /> Ouvrir wa.me (vide)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyToClipboard(cleanPhone, "Numéro copié")} className="text-xs">
              <Phone className="w-3 h-3 mr-2" /> Copier le numéro
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
