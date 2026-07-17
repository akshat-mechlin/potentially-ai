import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanLimits, normalizePlan } from "@/lib/billing/plans";
import { listUserWorkspaces } from "@/lib/data/workspace";

export class PlanLimitError extends Error {
  constructor(
    message: string,
    public code: "search_limit" | "contact_limit" | "connector_limit",
  ) {
    super(message);
    this.name = "PlanLimitError";
  }
}

export async function getEffectivePlan(supabase: SupabaseClient, _userId: string) {
  void _userId;
  const workspaces = await listUserWorkspaces(supabase);
  const plans = workspaces.map((workspace) => normalizePlan(workspace.plan));
  if (plans.includes("enterprise")) return "enterprise" as const;
  if (plans.includes("pro")) return "pro" as const;
  return "free" as const;
}

export async function assertSearchAllowed(supabase: SupabaseClient, userId: string) {
  const plan = await getEffectivePlan(supabase, userId);
  const limits = getPlanLimits(plan);
  if (!Number.isFinite(limits.maxSearchesPerMonth)) return;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("search_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart.toISOString());

  if ((count ?? 0) >= limits.maxSearchesPerMonth) {
    throw new PlanLimitError(
      `You've reached the ${limits.maxSearchesPerMonth} AI searches/month limit on the ${limits.name} plan. Upgrade to Pro for unlimited searches.`,
      "search_limit",
    );
  }
}

export async function assertContactImportAllowed(
  supabase: SupabaseClient,
  userId: string,
  additionalCount: number,
) {
  const plan = await getEffectivePlan(supabase, userId);
  const limits = getPlanLimits(plan);
  if (!Number.isFinite(limits.maxContacts)) return;

  const workspaceIds = (await listUserWorkspaces(supabase)).map((workspace) => workspace.id);
  if (!workspaceIds.length) return;

  const { count } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .in("workspace_id", workspaceIds);

  if ((count ?? 0) + additionalCount > limits.maxContacts) {
    throw new PlanLimitError(
      `Import would exceed the ${limits.maxContacts} contact limit on the ${limits.name} plan.`,
      "contact_limit",
    );
  }
}
