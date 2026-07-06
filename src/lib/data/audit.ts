import { isDataDemoMode } from "@/lib/app-config";
import { getDemoAuditLogs } from "@/lib/demo-store/playbooks";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { AuditLogEntry } from "@/types/playbooks";

export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  if (isDataDemoMode()) {
    const { addDemoAuditLog } = await import("@/lib/demo-store/playbooks");
    addDemoAuditLog(action, entityType, entityId, metadata);
    return;
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return;

  await supabase.from("audit_logs").insert({
    workspace_id: workspaceId,
    user_id: user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function listAuditEvents(options?: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<AuditLogEntry[]> {
  if (isDataDemoMode()) {
    return getDemoAuditLogs().map((log) => ({
      id: log.id,
      workspace_id: "demo-workspace-001",
      user_id: "demo-user-001",
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      metadata: log.metadata,
      created_at: log.created_at,
    }));
  }

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.entityType) query = query.eq("entity_type", options.entityType);
  if (options?.entityId) query = query.eq("entity_id", options.entityId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}
