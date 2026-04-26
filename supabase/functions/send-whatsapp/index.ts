// Send a WhatsApp message via Twilio (gateway).
// Two modes:
//   1) { reservation_id, template_key } -> render template + send to client.phone, log
//   2) { phone, content } -> raw message to a phone number, log
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { reservation_id, template_key, phone, content } = body ?? {};

    let toPhone: string | null = null;
    let messageContent: string | null = null;
    let recipientName: string | null = null;
    let resId: string | null = null;
    let tplKey: string | null = template_key ?? null;

    if (reservation_id && template_key) {
      const { data: tpl, error: tplErr } = await supabase
        .from("whatsapp_templates").select("*").eq("key", template_key).single();
      if (tplErr || !tpl) throw new Error(`Template ${template_key} introuvable`);

      const { data: r, error: rErr } = await supabase
        .from("reservations").select("*, clients(*), properties(*)").eq("id", reservation_id).single();
      if (rErr || !r) throw new Error("Réservation introuvable");

      const origin = req.headers.get("origin") ?? Deno.env.get("PUBLIC_SITE_URL") ?? "https://lb-prestige.app";
      const link = `${origin}/client/${r.client_token}`;

      messageContent = renderTemplate(tpl.content, {
        prenom: r.clients.first_name ?? "",
        nom: r.clients.last_name ?? "",
        lien: link,
        code: r.reservation_code,
        arrivee: new Date(r.check_in).toLocaleDateString("fr-FR"),
        depart: new Date(r.check_out).toLocaleDateString("fr-FR"),
      });
      toPhone = r.clients.phone;
      recipientName = `${r.clients.first_name} ${r.clients.last_name ?? ""}`.trim();
      resId = r.id;
    } else if (phone && content) {
      toPhone = phone;
      messageContent = content;
    } else {
      throw new Error("Paramètres manquants : (reservation_id + template_key) ou (phone + content)");
    }

    if (!toPhone) throw new Error("Numéro de téléphone client manquant");

    // Insert pending log first
    const { data: log } = await supabase.from("whatsapp_logs").insert({
      reservation_id: resId,
      template_key: tplKey,
      recipient_name: recipientName,
      recipient_phone: toPhone,
      content: messageContent,
      status: "pending",
    } as any).select().single();

    // Call Twilio via gateway
    const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM") ?? "whatsapp:+14155238886"; // sandbox default
    const toFormatted = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;

    const twResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toFormatted,
        From: fromNumber,
        Body: messageContent!,
      }),
    });

    const twData = await twResp.json();

    if (!twResp.ok) {
      await supabase.from("whatsapp_logs").update({
        status: "failed",
        error_message: typeof twData === "object" ? JSON.stringify(twData) : String(twData),
      }).eq("id", log!.id);
      throw new Error(`Twilio: ${twData?.message ?? twResp.status}`);
    }

    await supabase.from("whatsapp_logs").update({
      status: "sent",
      provider_message_id: twData.sid,
      sent_at: new Date().toISOString(),
    }).eq("id", log!.id);

    if (resId && template_key === "welcome") {
      await supabase.from("reservations").update({ whatsapp_welcome_sent: true }).eq("id", resId);
    }

    return new Response(JSON.stringify({ success: true, sid: twData.sid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-whatsapp error", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
