import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { job_id, source, workspace_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase
      .from("sync_jobs")
      .update({ status: "running", started_at: new Date().toISOString(), progress: 0 })
      .eq("id", job_id);

    // Simulate sync progress
    const total = 100;
    for (let i = 0; i <= total; i += 20) {
      await supabase.from("sync_jobs").update({ progress: i, total }).eq("id", job_id);
      await new Promise((r) => setTimeout(r, 500));
    }

    await supabase
      .from("sync_jobs")
      .update({
        status: "completed",
        progress: total,
        total,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job_id);

    await supabase.from("activities").insert({
      workspace_id,
      event: `sync_completed`,
      entity_type: "sync_job",
      entity_id: job_id,
      metadata: { source },
    });

    return new Response(JSON.stringify({ success: true, job_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
