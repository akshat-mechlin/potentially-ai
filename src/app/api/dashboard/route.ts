import { NextResponse } from "next/server";
import { isDataDemoMode } from "@/lib/app-config";
import { getDemoDashboardStats } from "@/lib/demo-store";
import { listContacts } from "@/lib/data/contacts";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    if (isDataDemoMode()) {
      return NextResponse.json(getDemoDashboardStats());
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contacts = await listContacts();

    const { count: searchCount } = await supabase
      .from("search_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: introCount } = await supabase
      .from("introductions")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    return NextResponse.json({
      connected_accounts: 0,
      contacts_indexed: contacts.length,
      recent_searches: searchCount ?? 0,
      introductions_success: introCount ?? 0,
      ai_usage_tokens: 0,
    });
  } catch (error) {
    console.error("Dashboard stats failed:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
