/**
 * Seed script for Potentially.ai
 * Run with: npm run seed
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env
 */

import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { loadEnv } from "./load-env";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || url.includes("your-project")) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env");
  process.exit(1);
}

if (!serviceKey || serviceKey === "your-service-role-key") {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
});

const DEMO_USER_EMAIL = "demo@potentially.ai";
const DEMO_PASSWORD = "demo123456";

async function seed() {
  console.log("🌱 Seeding Potentially.ai database...\n");

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_USER_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Alex Morgan" },
  });

  if (authError && !authError.message.includes("already been registered")) {
    console.error("Auth error:", authError.message);
    return;
  }

  const userId = authData?.user?.id;
  if (!userId) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const user = existing?.users?.find((u) => u.email === DEMO_USER_EMAIL);
    if (!user) {
      console.error("Could not find or create demo user");
      return;
    }
    console.log("✓ Demo user exists:", DEMO_USER_EMAIL);
    await seedWorkspace(user.id);
    return;
  }

  console.log("✓ Created demo user:", DEMO_USER_EMAIL);
  await seedWorkspace(userId);
}

async function seedWorkspace(userId: string) {
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .upsert({ name: "Acme Ventures", slug: "acme-ventures", plan: "pro" }, { onConflict: "slug" })
    .select()
    .single();

  if (wsError) {
    console.error("Workspace error:", wsError.message);
    return;
  }

  console.log("✓ Workspace:", workspace.name);

  const { error: memberError } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: workspace.id,
      user_id: userId,
      role: "owner",
    },
    { onConflict: "workspace_id,user_id" },
  );

  if (memberError) {
    console.error("Workspace member error:", memberError.message);
    return;
  }

  const companies = [
    { name: "Stripe", industry: "Fintech", domain: "stripe.com" },
    { name: "Anthropic", industry: "AI", domain: "anthropic.com" },
    { name: "Sequoia Capital", industry: "Venture Capital", domain: "sequoiacap.com" },
  ];

  for (const co of companies) {
    await supabase.from("companies").upsert({
      ...co,
      workspace_id: workspace.id,
    });
  }

  console.log("✓ Companies seeded");

  const contacts = [
    { full_name: "Sarah Chen", title: "CTO", email: "sarah@stripe.com", company_name: "Stripe" },
    {
      full_name: "James Park",
      title: "Founder & CEO",
      email: "james@anthropic.com",
      company_name: "Anthropic",
    },
    {
      full_name: "Emily Rodriguez",
      title: "Partner",
      email: "emily@sequoiacap.com",
      company_name: "Sequoia Capital",
    },
  ];

  for (const contact of contacts) {
    let embedding: number[] | undefined;
    const { isAIConfigured } = await import("../src/lib/ai");
    if (isAIConfigured()) {
      try {
        const { buildContactEmbedding } = await import("../src/lib/data/embeddings");
        embedding = await buildContactEmbedding(contact);
      } catch {
        // embeddings are optional during seed
      }
    }

    await supabase.from("contacts").upsert({
      ...contact,
      workspace_id: workspace.id,
      owner_id: userId,
      tags: ["demo"],
      ...(embedding ? { embedding } : {}),
    });
  }

  console.log("✓ Contacts seeded");
  console.log("\n✅ Seed complete!");
  console.log(`   Login: ${DEMO_USER_EMAIL} / ${DEMO_PASSWORD}`);
}

seed().catch(console.error);
