/**
 * Seed script for Potentially.ai
 * Run with: npx tsx scripts/seed.ts
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DEMO_USER_EMAIL = "demo@potentially.ai";
const DEMO_PASSWORD = "demo123456";

async function seed() {
  console.log("🌱 Seeding Potentially.ai database...\n");

  // Create demo user
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
    .upsert({ name: "Acme Ventures", slug: "acme-ventures", plan: "pro" })
    .select()
    .single();

  if (wsError) {
    console.error("Workspace error:", wsError.message);
    return;
  }

  console.log("✓ Workspace:", workspace.name);

  await supabase.from("workspace_members").upsert({
    workspace_id: workspace.id,
    user_id: userId,
    role: "owner",
  });

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
    { full_name: "James Park", title: "Founder & CEO", email: "james@anthropic.com", company_name: "Anthropic" },
    { full_name: "Emily Rodriguez", title: "Partner", email: "emily@sequoiacap.com", company_name: "Sequoia Capital" },
  ];

  for (const contact of contacts) {
    await supabase.from("contacts").upsert({
      ...contact,
      workspace_id: workspace.id,
      owner_id: userId,
      tags: ["demo"],
    });
  }

  console.log("✓ Contacts seeded");
  console.log("\n✅ Seed complete!");
  console.log(`   Login: ${DEMO_USER_EMAIL} / ${DEMO_PASSWORD}`);
}

seed().catch(console.error);
