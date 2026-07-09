import { isDataDemoMode } from "@/lib/app-config";
import { getRecentActivity } from "@/lib/data/activity";
import { getDemoDashboardStats } from "@/lib/demo-store";
import { getUserWorkspaceIds } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { safeGetSessionUser } from "@/lib/supabase/auth";
import type { DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  if (isDataDemoMode()) {
    return getDemoDashboardStats();
  }

  const supabase = await createClient();
  const { user } = await safeGetSessionUser(supabase);
  if (!user) {
    throw new Error("Unauthorized");
  }

  const workspaceIds = await getUserWorkspaceIds(supabase);
  const activity = await getRecentActivity(8);

  const { data: stats, error: statsError } = await supabase.rpc("get_dashboard_stats", {
    p_user_id: user.id,
    p_workspace_ids: workspaceIds,
  });

  if (statsError) throw statsError;

  const counts = (stats ?? {}) as {
    contacts_indexed?: number;
    recent_searches?: number;
    introductions_success?: number;
  };

  return {
    connected_accounts: 0,
    contacts_indexed: counts.contacts_indexed ?? 0,
    recent_searches: counts.recent_searches ?? 0,
    introductions_success: counts.introductions_success ?? 0,
    ai_usage_tokens: 0,
    activity,
  };
}
