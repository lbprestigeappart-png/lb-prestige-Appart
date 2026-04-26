import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type WhatsappResult = {
  success: boolean;
  mode?: "production" | "sandbox" | "wa_link" | "manual";
  sid?: string;
  wa_link?: string;
  log_id?: string;
  warning?: string;
  fallback_reason?: string;
  error?: string;
};

export type WhatsappPayload =
  | { reservation_id: string; template_key: string; force_mode?: WhatsappResult["mode"] }
  | { phone: string; content: string; force_mode?: WhatsappResult["mode"] };

/**
 * Send a WhatsApp message via the cascading edge function.
 * Automatically opens the wa.me link in a new tab if the cascade falls back to it.
 * Returns the result so callers can update local UI.
 */
export async function sendWhatsapp(payload: WhatsappPayload): Promise<WhatsappResult> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", { body: payload });
  if (error) {
    toast.error(error.message);
    return { success: false, error: error.message };
  }
  const result = data as WhatsappResult;

  if (!result?.success) {
    toast.error(result?.error ?? "Échec de l'envoi");
    return result;
  }

  switch (result.mode) {
    case "production":
      toast.success("Message envoyé via WhatsApp Business");
      break;
    case "sandbox":
      toast.success("Message envoyé via Sandbox Twilio");
      break;
    case "wa_link":
      toast.info("Ouverture de WhatsApp Web (Twilio indisponible)");
      if (result.wa_link) window.open(result.wa_link, "_blank", "noopener,noreferrer");
      break;
    case "manual":
      toast.warning(result.warning ?? "Message à envoyer manuellement");
      break;
    default:
      toast.success("Envoi déclenché");
  }
  return result;
}

/** Build a wa.me link client-side (used for previews / "open WhatsApp" buttons) */
export function buildWaMeLink(phone: string, content: string) {
  const clean = phone.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(content)}`;
}

/** Render a template with {var} placeholders */
export function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
