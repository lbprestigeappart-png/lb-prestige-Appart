// Send WhatsApp via Twilio with cascading fallback strategy:
//   P1: Twilio production (if from_production configured)
//   P2: Twilio sandbox (if recipient has joined sandbox)
//   P3: wa.me deep link (returned to caller, status=fallback_wa)
//   P4: manual_required log entry
//
// Inputs:
//   { reservation_id, template_key }  -> render template, send to client.phone
//   { phone, content }                -> raw message to a phone
// Optional: { force_mode: "production"|"sandbox"|"wa_link"|"manual" }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}
function normalizeWa(num: string) {
  if (!num) return "";
  const t = num.trim();
  return t.startsWith("whatsapp:") ? t : `whatsapp:${t}`;
}
function stripWa(num: string) {
  return num.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
}
function buildWaLink(phone: string, content: string) {
  const clean = stripWa(phone).replace(/^\+/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(content)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let logId: string | null = null;

  try {
    const body = await req.json();
    const { reservation_id, template_key, phone, content, force_mode } = body ?? {};

    // --- Resolve recipient + content ---
    let toPhone: string | null = null;
    let messageContent: string | null = null;
    let recipientName: string | null = null;
    let resId: string | null = null;
    const tplKey: string | null = template_key ?? null;

    if (reservation_id && template_key) {
      const { data: tpl, error: tplErr } = await supabase
        .from("whatsapp_templates").select("*").eq("key", template_key).maybeSingle();
      if (tplErr || !tpl) throw new Error(`Modèle ${template_key} introuvable`);

      const { data: r, error: rErr } = await supabase
        .from("reservations").select("*, clients(*), properties(*)").eq("id", reservation_id).maybeSingle();
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
        suite: r.suite_type ?? "",
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

    if (!toPhone) {
      // No phone at all → manual entry only
      const { data: log } = await supabase.from("whatsapp_logs").insert({
        reservation_id: resId, template_key: tplKey, recipient_name: recipientName,
        recipient_phone: "(absent)", content: messageContent, status: "manual_required",
        mode: "manual", error_message: "Aucun numéro de téléphone client",
      } as any).select().single();
      return new Response(JSON.stringify({
        success: true, mode: "manual", log_id: log?.id,
        warning: "Aucun numéro de téléphone — message marqué à envoyer manuellement",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Load WhatsApp config ---
    const { data: cfgRow } = await supabase
      .from("settings").select("value").eq("key", "whatsapp_config").maybeSingle();
    const cfg = (cfgRow?.value ?? {}) as {
      mode?: "sandbox" | "production" | "manual_wa_me";
      from_sandbox?: string;
      from_production?: string;
      sandbox_join_code?: string;
      enabled?: boolean;
      auto_fallback?: boolean;
    };

    // MANUAL_WA_ME MODE: short-circuit Twilio entirely, always return wa.me link
    if ((cfg.mode === "manual_wa_me" || force_mode === "wa_link") && force_mode !== "production" && force_mode !== "sandbox") {
      const waLink = buildWaLink(toPhone, messageContent!);
      const { data: log } = await supabase.from("whatsapp_logs").insert({
        reservation_id: resId, template_key: tplKey, recipient_name: recipientName,
        recipient_phone: toPhone, content: messageContent, status: "opened_wa",
        mode: "manual_wa_me", wa_link: waLink,
      } as any).select().single();

      if (resId && template_key === "welcome") {
        await supabase.from("reservations").update({ whatsapp_welcome_sent: true }).eq("id", resId);
      }
      return new Response(JSON.stringify({
        success: true, mode: "wa_link", wa_link: waLink, log_id: log?.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (cfg.enabled === false && force_mode !== "wa_link" && force_mode !== "manual") {
      // Disabled → fallback to wa.me link
      const waLink = buildWaLink(toPhone, messageContent!);
      const { data: log } = await supabase.from("whatsapp_logs").insert({
        reservation_id: resId, template_key: tplKey, recipient_name: recipientName,
        recipient_phone: toPhone, content: messageContent, status: "fallback_wa",
        mode: "wa_link", wa_link: waLink, error_message: "Envoi WhatsApp désactivé",
      } as any).select().single();
      return new Response(JSON.stringify({
        success: true, mode: "wa_link", wa_link: waLink, log_id: log?.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SECRET_PROD = Deno.env.get("TWILIO_WHATSAPP_FROM_PRODUCTION");
    const SECRET_SANDBOX = Deno.env.get("TWILIO_WHATSAPP_FROM_SANDBOX");
    const LEGACY_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

    const fromProd = SECRET_PROD || cfg.from_production || "";
    const fromSandbox = SECRET_SANDBOX || cfg.from_sandbox || LEGACY_FROM || "whatsapp:+14155238886";
    const toFormatted = normalizeWa(toPhone);

    // --- Build cascade ---
    type Mode = "production" | "sandbox" | "wa_link" | "manual";
    let cascade: Mode[];
    if (force_mode) {
      cascade = [force_mode as Mode];
    } else {
      cascade = [];
      // Priority 1: production if user selected production AND has a number
      if (cfg.mode === "production" && fromProd) cascade.push("production");
      // Priority 2: sandbox always available as fallback
      cascade.push("sandbox");
      // Priority 3 + 4: wa_link + manual (only if auto_fallback enabled)
      if (cfg.auto_fallback !== false) {
        cascade.push("wa_link");
        cascade.push("manual");
      }
    }

    // Insert pending log
    const { data: pendingLog } = await supabase.from("whatsapp_logs").insert({
      reservation_id: resId, template_key: tplKey, recipient_name: recipientName,
      recipient_phone: toPhone, content: messageContent, status: "pending",
      mode: cascade[0],
    } as any).select().single();
    logId = pendingLog?.id ?? null;

    let lastError = "";
    for (const mode of cascade) {
      if (mode === "production" || mode === "sandbox") {
        if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
          lastError = "Credentials Twilio absents";
          continue;
        }
        const fromNumber = normalizeWa(mode === "production" ? fromProd : fromSandbox);
        if (!fromNumber || fromNumber === "whatsapp:") {
          lastError = `Numéro émetteur ${mode} non configuré`;
          continue;
        }

        try {
          const twResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": TWILIO_API_KEY,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: toFormatted, From: fromNumber, Body: messageContent!,
            }),
          });
          const twData = await twResp.json();

          if (twResp.ok) {
            await supabase.from("whatsapp_logs").update({
              status: "sent", mode,
              provider_message_id: twData.sid,
              sent_at: new Date().toISOString(),
              error_message: null,
            }).eq("id", logId!);

            if (resId && template_key === "welcome") {
              await supabase.from("reservations").update({ whatsapp_welcome_sent: true }).eq("id", resId);
            }
            return new Response(JSON.stringify({
              success: true, mode, sid: twData.sid, log_id: logId,
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          } else {
            // Twilio error 63007 = sandbox not joined, 63016 = template required, 21211 = bad number
            const errMsg = twData?.message || JSON.stringify(twData);
            const code = twData?.code;
            lastError = `Twilio[${mode}] ${code ?? twResp.status}: ${errMsg}`;
            console.error(lastError);
            continue;
          }
        } catch (e: any) {
          lastError = `Twilio[${mode}] exception: ${e.message}`;
          console.error(lastError);
          continue;
        }
      }

      if (mode === "wa_link") {
        const waLink = buildWaLink(toPhone, messageContent!);
        await supabase.from("whatsapp_logs").update({
          status: "fallback_wa", mode: "wa_link", wa_link: waLink,
          error_message: lastError || "Twilio indisponible — lien wa.me généré",
        }).eq("id", logId!);
        return new Response(JSON.stringify({
          success: true, mode: "wa_link", wa_link: waLink, log_id: logId,
          fallback_reason: lastError,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (mode === "manual") {
        await supabase.from("whatsapp_logs").update({
          status: "manual_required", mode: "manual",
          error_message: lastError || "Envoi automatique impossible — à traiter manuellement",
        }).eq("id", logId!);
        return new Response(JSON.stringify({
          success: true, mode: "manual", log_id: logId,
          warning: "Message à envoyer manuellement",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Cascade exhausted
    if (logId) {
      await supabase.from("whatsapp_logs").update({
        status: "error", error_message: lastError,
      }).eq("id", logId);
    }
    throw new Error(lastError || "Échec de la cascade WhatsApp");
  } catch (e: any) {
    console.error("send-whatsapp error", e);
    if (logId) {
      await supabase.from("whatsapp_logs").update({
        status: "error", error_message: e.message,
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
