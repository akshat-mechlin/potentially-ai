import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, workspace_id } = await req.json();
    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const embedding = embeddingRes.data[0].embedding;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contacts } = await supabase.rpc("match_contacts", {
      query_embedding: embedding,
      match_workspace_id: workspace_id,
      match_threshold: 0.5,
      match_count: 20,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Rank contacts by relevance. Return JSON: { contacts: [{id, full_name, title, email, company_name, score, reason, warm_intro_path, recommended_action}], summary, suggested_actions }",
        },
        { role: "user", content: `Query: "${query}"\nContacts: ${JSON.stringify(contacts)}` },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
