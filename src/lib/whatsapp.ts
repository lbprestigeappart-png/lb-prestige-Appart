import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizePhoneE164 } from "@/lib/format";

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
 * In manual_wa_me mode (default), the edge function returns a wa.me link
 * that we automatically open in a new tab.
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
      toast.success("WhatsApp ouvert — envoyez le message depuis votre application");
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

/** Build a wa.me link client-side */
export function buildWaMeLink(phone: string, content: string) {
  const e164 = normalizePhoneE164(phone);
  const clean = e164.replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(content)}`;
}

/** Render a template with {var} placeholders */
export function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/** Copy text to clipboard with toast feedback */
export async function copyToClipboard(text: string, label = "Copié") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Impossible de copier");
  }
}

/** Update a whatsapp log status */
export async function updateLogStatus(
  logId: string,
  status: "sent_manually" | "failed_manual" | "manual_sent_pending_confirmation" | "opened_wa"
) {
  const patch: any = { status };
  if (status === "sent_manually") patch.sent_at = new Date().toISOString();
  const { error } = await supabase.from("whatsapp_logs").update(patch).eq("id", logId);
  if (error) {
    toast.error(error.message);
    return false;
  }
  return true;
}
