import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserWorkspaceContext } from "@/lib/data/workspace";

export type WorkflowActor = {
  supabase: SupabaseClient;
  userId: string;
  workspaceId: string;
};

export async function resolveWorkflowActor(
  existing?: WorkflowActor | null,
): Promise<WorkflowActor> {
  if (existing) return existing;

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  return {
    supabase: supabase as unknown as SupabaseClient,
    userId: user.id,
    workspaceId,
  };
}

export function adminActorForWorkflow(input: {
  userId: string;
  workspaceId: string;
}): WorkflowActor {
  return {
    supabase: createAdminClient() as unknown as SupabaseClient,
    userId: input.userId,
    workspaceId: input.workspaceId,
  };
}
