import { NextResponse } from "next/server";
import type { DashboardStats } from "@/types";

export async function GET() {
  const stats: DashboardStats = {
    connected_accounts: 3,
    contacts_indexed: 847,
    recent_searches: 24,
    introductions_success: 12,
    ai_usage_tokens: 45200,
  };

  return NextResponse.json(stats);
}
