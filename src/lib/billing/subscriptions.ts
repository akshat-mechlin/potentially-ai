import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/lib/billing/plans";
import { normalizePlan } from "@/lib/billing/plans";

export async function applyWorkspacePlan(
  workspaceId: string,
  plan: PlanId,
  stripe?: { customerId?: string | null; subscriptionId?: string | null },
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("workspaces")
    .update({
      plan,
      ...(stripe?.customerId ? { stripe_customer_id: stripe.customerId } : {}),
      ...(stripe?.subscriptionId ? { stripe_subscription_id: stripe.subscriptionId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspaceId);

  if (error) throw error;
}

export async function applyWorkspacePlanFromStripeMetadata(
  metadata: unknown,
  stripe?: { customerId?: string | null; subscriptionId?: string | null },
) {
  if (!metadata || typeof metadata !== "object") return false;

  const row = metadata as Record<string, unknown>;
  const workspaceId = typeof row.workspace_id === "string" ? row.workspace_id : null;
  const plan = typeof row.plan === "string" ? normalizePlan(row.plan) : null;

  if (!workspaceId || !plan || plan === "free") return false;

  await applyWorkspacePlan(workspaceId, plan, stripe);
  return true;
}
