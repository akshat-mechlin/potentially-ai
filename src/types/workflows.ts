import type { IcpProfile, MatchingConfig, SendConfig } from "@/types/playbooks";

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

export type WorkflowNodeKind =
  | "trigger"
  | "icp"
  | "segment"
  | "playbook"
  | "condition"
  | "delay"
  | "approve"
  | "action_email"
  | "action_intro"
  | "action_notify";

export type WorkflowTriggerMode = "manual" | "schedule" | "new_contact";

export interface WorkflowNodeData {
  kind: WorkflowNodeKind;
  label: string;
  description?: string;
  /** Node-specific configuration */
  config: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowGraphNode {
  id: string;
  type: WorkflowNodeKind;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  type?: string;
  animated?: boolean;
}

export interface WorkflowGraph {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowLastRun {
  at: string;
  run_id: string;
  segment_id: string;
  playbook_id: string;
  matched_count: number;
  skipped_count: number;
  dry_run: boolean;
  warnings: string[];
  planned_actions: string[];
  node_progress?: WorkflowNodeProgress[];
  matches_preview?: WorkflowRunMatchPreview[];
  stats?: WorkflowRunStats;
  notify_sent?: boolean;
  delay?: { amount: number; unit: string } | null;
  trigger_mode?: WorkflowTriggerMode;
  /** Cron marked this workflow due; cleared after the next run. */
  schedule_due?: boolean;
  /** Short waits pause deploy until this timestamp. */
  wait_until?: string | null;
  wait_status?: "waiting" | "resumed" | null;
  email_count?: number;
  intro_count?: number;
  intro_ids?: string[];
  branch?: {
    true_count: number;
    false_count: number;
  };
}

export type WorkflowNodeRunStatus = "pending" | "running" | "done" | "skipped" | "waiting";

export interface WorkflowNodeProgress {
  node_id: string;
  kind: WorkflowNodeKind;
  status: WorkflowNodeRunStatus;
  detail?: string;
}

export interface WorkflowRunMatchPreview {
  contact_id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  score: number;
  match_reason?: string | null;
}

export interface WorkflowRunStats {
  matched: number;
  selected: number;
  drafted: number;
  sent: number;
  replied: number;
  booked: number;
  skipped: number;
}

export interface Workflow {
  id: string;
  workspace_id: string;
  created_by: string;
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
  created_at: string;
  updated_at: string;
}

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  updated_at: string;
  node_count: number;
}
