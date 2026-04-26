// Scheduler: runs periodically (via pg_cron). For each active automation,
// finds reservations whose trigger date matches today, and sends the message
// (skipping if already sent for this reservation+template in last 24h).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function addDays(d: string | Date, days: number): string {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const today = new Date().toISOString().slice(0, 10);

    const { data: autos } = await supabase.from("whatsapp_automations").select("*").eq("is_active", true);
    const { data: resvs } = await supabase.from("reservations").select("*").in("status", ["confirmed", "in_progress", "completed"]);

    let executed = 0;
    let skipped = 0;

    for (const auto of autos ?? []) {
      for (const r of resvs ?? []) {
        let triggerDate: string | null = null;
        if (auto.trigger_type === "before_checkin") triggerDate = addDays(r.check_in, -auto.offset_days);
        else if (auto.trigger_type === "on_checkin") triggerDate = r.check_in;
        else if (auto.trigger_type === "before_checkout") triggerDate = addDays(r.check_out, -auto.offset_days);
        else if (auto.trigger_type === "after_checkout") triggerDate = addDays(r.check_out, auto.offset_days);
        else continue; // on_create handled at insert time

        if (triggerDate !== today) continue;

        // Skip if already sent today for this template+reservation
        const { count } = await supabase.from("whatsapp_logs")
          .select("*", { count: "exact", head: true })
          .eq("reservation_id", r.id)
          .eq("template_key", auto.template_key)
          .gte("created_at", `${today}T00:00:00Z`);
        if ((count ?? 0) > 0) { skipped++; continue; }

        const supaUrl = Deno.env.get("SUPABASE_URL")!;
        const resp = await fetch(`${supaUrl}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ reservation_id: r.id, template_key: auto.template_key }),
        });
        if (resp.ok) executed++;
      }
    }

    return new Response(JSON.stringify({ success: true, executed, skipped, date: today }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
