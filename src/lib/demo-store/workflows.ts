import type { Workflow, WorkflowGraph, WorkflowListItem, WorkflowStatus, WorkflowLastRun } from "@/types/workflows";
import { createDefaultWorkflowGraph } from "@/lib/workflows/catalog";

let workflows: Workflow[] = [
  {
    id: "wf-demo-1",
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name: "ICP → Segment → Playbook",
    description: "Match ICP contacts, build a segment, then run Agent Mode outreach",
    status: "draft",
    graph: createDefaultWorkflowGraph(),
    segment_id: "seg-demo-1",
    playbook_id: "pb-demo-1",
    icp_profile: {
      title_include: ["CTO", "Founder", "VP Engineering"],
      keywords_nice: ["fintech", "SaaS"],
      min_strength_score: 20,
    },
    matching_config: { min_score: 35 },
    send_config: { include_unsubscribe: true },
    last_run: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function toListItem(workflow: Workflow): WorkflowListItem {
  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    status: workflow.status,
    updated_at: workflow.updated_at,
    node_count: workflow.graph?.nodes?.length ?? 0,
  };
}

export function getDemoWorkflows(): WorkflowListItem[] {
  return workflows
    .slice()
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map(toListItem);
}

export function getDemoWorkflow(id: string): Workflow | null {
  return workflows.find((w) => w.id === id) ?? null;
}

export function createDemoWorkflow(input?: {
  name?: string;
  description?: string;
  graph?: WorkflowGraph;
}): Workflow {
  const now = new Date().toISOString();
  const workflow: Workflow = {
    id: `wf-demo-${Date.now()}`,
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name: input?.name?.trim() || "Untitled workflow",
    description: input?.description ?? null,
    status: "draft",
    graph: input?.graph ?? createDefaultWorkflowGraph(),
    segment_id: null,
    playbook_id: null,
    icp_profile: {},
    matching_config: {},
    send_config: {},
    last_run: null,
    created_at: now,
    updated_at: now,
  };
  workflows = [workflow, ...workflows];
  return workflow;
}

export function updateDemoWorkflow(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    status: WorkflowStatus;
    graph: WorkflowGraph;
    segment_id: string | null;
    playbook_id: string | null;
    icp_profile: Workflow["icp_profile"];
    matching_config: Workflow["matching_config"];
    send_config: Workflow["send_config"];
    last_run: WorkflowLastRun | null;
  }>,
): Workflow | null {
  const index = workflows.findIndex((w) => w.id === id);
  if (index < 0) return null;
  const next = {
    ...workflows[index],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  workflows[index] = next;
  return next;
}

export function deleteDemoWorkflow(id: string): boolean {
  const before = workflows.length;
  workflows = workflows.filter((w) => w.id !== id);
  return workflows.length < before;
}
