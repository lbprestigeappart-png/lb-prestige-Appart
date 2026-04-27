import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizePhoneE164, buildClientLink } from "@/lib/format";

export type WhatsappMode = "wa_link" | "manual" | "production" | "sandbox";

export type WhatsappResult = {
  success: boolean;
  mode?: WhatsappMode;
  wa_link?: string;
  log_id?: string;
  warning?: string;
  error?: string;
};

export type WhatsappPayload =
  | { reservation_id: string; template_key: string }
  | { phone: string; content: string; template_key?: string; reservation_id?: string };

/** Render a template with {var} placeholders */
export function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

/** Build a wa.me link client-side */
export function buildWaMeLink(phone: string, content: string) {
  const e164 = normalizePhoneE164(phone);
  const clean = e164.replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(content)}`;
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

/** Insert a whatsapp_logs row (best-effort, never blocks the wa.me opening) */
async function logWa(params: {
  reservation_id?: string;
  template_key?: string;
  phone: string;
  content: string;
  wa_link: string;
  recipient_name?: string;
  status?: string;
}) {
  const { data, error } = await supabase
    .from("whatsapp_logs")
    .insert({
      reservation_id: params.reservation_id ?? null,
      template_key: params.template_key ?? null,
      recipient_phone: params.phone,
      recipient_name: params.recipient_name ?? null,
      content: params.content,
      wa_link: params.wa_link,
      mode: "wa_link",
      status: (params.status ?? "opened_wa") as any,
    })
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[whatsapp log]", error);
    return null;
  }
  return data?.id ?? null;
}

/**
 * SEND WHATSAPP — Direct wa.me opening, no edge function.
 *
 * Workflow:
 *  1. Resolve reservation + template if reservation_id/template_key provided
 *  2. Render the message with {prenom} {lien} {code} ...
 *  3. Normalize phone -> E.164
 *  4. Open https://wa.me/<num>?text=<encoded> immediately
 *  5. Log to whatsapp_logs (status=opened_wa)
 */
export async function sendWhatsapp(payload: WhatsappPayload): Promise<WhatsappResult> {
  let phone = "";
  let content = "";
  let recipientName: string | undefined;
  let reservation_id: string | undefined;
  let template_key: string | undefined;

  if ("reservation_id" in payload && payload.reservation_id && (payload as any).template_key) {
    reservation_id = payload.reservation_id;
    template_key = (payload as any).template_key;

    const { data: r, error: rErr } = await supabase
      .from("reservations")
      .select("reservation_code, client_token, check_in, check_out, suite_type, clients(first_name,last_name,phone)")
      .eq("id", reservation_id)
      .maybeSingle();
    if (rErr || !r) {
      toast.error("Réservation introuvable");
      return { success: false, error: "reservation_not_found" };
    }
    const client: any = r.clients;
    phone = normalizePhoneE164(client?.phone);
    recipientName = `${client?.first_name ?? ""} ${client?.last_name ?? ""}`.trim();

    const { data: tpl, error: tErr } = await supabase
      .from("whatsapp_templates")
      .select("content, name")
      .eq("key", template_key)
      .maybeSingle();
    if (tErr || !tpl) {
      toast.error("Modèle introuvable");
      return { success: false, error: "template_not_found" };
    }

    content = renderTemplate(tpl.content, {
      prenom: client?.first_name ?? "",
      nom: client?.last_name ?? "",
      lien: buildClientLink(r.client_token),
      code: r.reservation_code,
      arrivee: new Date(r.check_in).toLocaleDateString("fr-FR"),
      depart: new Date(r.check_out).toLocaleDateString("fr-FR"),
      suite: r.suite_type ?? "",
    });
  } else if ("phone" in payload && payload.phone && payload.content) {
    phone = normalizePhoneE164(payload.phone);
    content = payload.content;
    template_key = (payload as any).template_key;
    reservation_id = (payload as any).reservation_id;
  } else {
    toast.error("Paramètres invalides");
    return { success: false, error: "invalid_payload" };
  }

  if (!phone) {
    toast.error("Numéro de téléphone manquant ou invalide");
    return { success: false, error: "no_phone" };
  }

  const wa_link = buildWaMeLink(phone, content);

  // Open immediately — must happen synchronously after user gesture
  const win = window.open(wa_link, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup blocked → still log + show fallback
    await copyToClipboard(wa_link, "Pop-up bloqué — lien wa.me copié");
  } else {
    toast.success("WhatsApp ouvert — validez l'envoi dans l'application");
  }

  // Log async (best-effort)
  const log_id = await logWa({
    reservation_id,
    template_key,
    phone,
    content,
    wa_link,
    recipient_name: recipientName,
    status: "opened_wa",
  });

  return { success: true, mode: "wa_link", wa_link, log_id: log_id ?? undefined };
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
