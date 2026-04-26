// Run automations for a single reservation (used at creation) or for matching due ones.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const { reservation_id, trigger } = body ?? {};

    const { data: automations } = await supabase
      .from("whatsapp_automations").select("*").eq("is_active", true);

    const matched = (automations ?? []).filter((a) => !trigger || a.trigger_type === trigger);

    let executed = 0;
    for (const auto of matched) {
      try {
        const supaUrl = Deno.env.get("SUPABASE_URL")!;
        const resp = await fetch(`${supaUrl}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ reservation_id, template_key: auto.template_key }),
        });
        if (resp.ok) executed++;
      } catch (e) { console.error("auto failed", e); }
    }

    return new Response(JSON.stringify({ success: true, executed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
