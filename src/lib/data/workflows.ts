import { isDataDemoMode } from "@/lib/app-config";
import {
  createDemoWorkflow,
  deleteDemoWorkflow,
  getDemoWorkflow,
  getDemoWorkflows,
  updateDemoWorkflow,
} from "@/lib/demo-store/workflows";
import { createDefaultWorkflowGraph } from "@/lib/workflows/catalog";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type {
  Workflow,
  WorkflowGraph,
  WorkflowListItem,
  WorkflowStatus,
  WorkflowLastRun,
} from "@/types/workflows";
import type { IcpProfile, MatchingConfig, SendConfig } from "@/types/playbooks";

function asWorkflow(row: Record<string, unknown>): Workflow {
  return {
    id: row.id as string,
    workspace_id: row.workspace_id as string,
    created_by: row.created_by as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    status: row.status as WorkflowStatus,
    graph: (row.graph as WorkflowGraph) ?? { nodes: [], edges: [] },
    segment_id: (row.segment_id as string | null) ?? null,
    playbook_id: (row.playbook_id as string | null) ?? null,
    icp_profile: (row.icp_profile as IcpProfile) ?? {},
    matching_config: (row.matching_config as MatchingConfig) ?? {},
    send_config: (row.send_config as SendConfig) ?? {},
    last_run: (row.last_run as Workflow["last_run"]) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listWorkflows(): Promise<WorkflowListItem[]> {
  if (isDataDemoMode()) return getDemoWorkflows();

  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  const { data, error } = await supabase
    .from("workflows")
    .select("id, name, description, status, updated_at, graph")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as WorkflowStatus,
    updated_at: row.updated_at,
    node_count: Array.isArray((row.graph as WorkflowGraph | null)?.nodes)
      ? ((row.graph as WorkflowGraph).nodes.length ?? 0)
      : 0,
  }));
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  if (isDataDemoMode()) return getDemoWorkflow(id);

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase.from("workflows").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return asWorkflow(data as Record<string, unknown>);
}

export async function createWorkflow(input?: {
  name?: string;
  description?: string;
  graph?: WorkflowGraph;
}): Promise<Workflow> {
  if (isDataDemoMode()) return createDemoWorkflow(input);

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      name: input?.name?.trim() || "Untitled workflow",
      description: input?.description ?? null,
      graph: input?.graph ?? createDefaultWorkflowGraph(),
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw error;
  return asWorkflow(data as Record<string, unknown>);
}

export async function updateWorkflow(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    status: WorkflowStatus;
    graph: WorkflowGraph;
    segment_id: string | null;
    playbook_id: string | null;
    icp_profile: IcpProfile;
    matching_config: MatchingConfig;
    send_config: SendConfig;
    last_run: WorkflowLastRun | null;
  }>,
): Promise<Workflow> {
  if (isDataDemoMode()) {
    const updated = updateDemoWorkflow(id, patch);
    if (!updated) throw new Error("Workflow not found");
    return updated;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("workflows")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return asWorkflow(data as Record<string, unknown>);
}

export async function deleteWorkflow(id: string): Promise<void> {
  if (isDataDemoMode()) {
    if (!deleteDemoWorkflow(id)) throw new Error("Workflow not found");
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const { error } = await supabase.from("workflows").delete().eq("id", id);
  if (error) throw error;
}
