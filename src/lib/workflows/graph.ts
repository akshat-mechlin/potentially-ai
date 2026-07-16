import type {
  WorkflowGraph,
  WorkflowGraphNode,
  WorkflowNodeKind,
} from "@/types/workflows";
import type { AutomationLevel, IcpProfile, MatchingConfig, OutreachMode } from "@/types/playbooks";

export type ExtractedWorkflowConfig = {
  trigger: { mode: string; cron?: string };
  icp: IcpProfile;
  matching: MatchingConfig;
  segment: {
    mode: "create" | "link";
    name: string;
    description: string;
    segment_id: string | null;
  };
  playbook: {
    mode: "create" | "link";
    name: string;
    goal: string;
    tone: string;
    automation_level: AutomationLevel;
    outreach_mode: OutreachMode;
    playbook_id: string | null;
  };
  condition: {
    field: string;
    operator: string;
    value: number | string;
  } | null;
  hasApprove: boolean;
  hasEmailAction: boolean;
  hasIntroAction: boolean;
  hasNotifyAction: boolean;
  hasDelay: boolean;
};

function nodeOfKind(graph: WorkflowGraph, kind: WorkflowNodeKind): WorkflowGraphNode | undefined {
  return graph.nodes.find((node) => node.type === kind || node.data?.kind === kind);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function extractWorkflowConfig(graph: WorkflowGraph): ExtractedWorkflowConfig {
  const trigger = nodeOfKind(graph, "trigger");
  const icpNode = nodeOfKind(graph, "icp");
  const segmentNode = nodeOfKind(graph, "segment");
  const playbookNode = nodeOfKind(graph, "playbook");
  const conditionNode = nodeOfKind(graph, "condition");

  const icpConfig = icpNode?.data?.config ?? {};
  const segmentConfig = segmentNode?.data?.config ?? {};
  const playbookConfig = playbookNode?.data?.config ?? {};
  const conditionConfig = conditionNode?.data?.config ?? {};
  const triggerConfig = trigger?.data?.config ?? {};

  const minMatch = asNumber(icpConfig.min_match_score, 35);

  return {
    trigger: {
      mode: String(triggerConfig.mode ?? "manual"),
      cron: triggerConfig.cron ? String(triggerConfig.cron) : undefined,
    },
    icp: {
      title_include: asStringArray(icpConfig.title_include),
      title_exclude: asStringArray(icpConfig.title_exclude),
      keywords_must: asStringArray(icpConfig.keywords_must),
      keywords_nice: asStringArray(icpConfig.keywords_nice),
      keywords_exclude: asStringArray(icpConfig.keywords_exclude),
      geographies: asStringArray(icpConfig.geographies),
      industries_include: asStringArray(icpConfig.industries_include),
      min_strength_score: asNumber(icpConfig.min_strength_score, 20),
    },
    matching: {
      min_score: minMatch,
      warm_path_weight: 1,
      dedupe_across_playbooks: true,
      cooldown_days: 30,
    },
    segment: {
      mode: segmentConfig.mode === "link" ? "link" : "create",
      name: String(segmentConfig.name ?? "ICP matches").trim() || "ICP matches",
      description: String(segmentConfig.description ?? "Built by workflow").trim(),
      segment_id: segmentConfig.segment_id ? String(segmentConfig.segment_id) : null,
    },
    playbook: {
      mode: playbookConfig.mode === "link" ? "link" : "create",
      name: String(playbookConfig.name ?? "Workflow playbook").trim() || "Workflow playbook",
      goal: String(playbookConfig.goal ?? "Book an intro call"),
      tone: String(playbookConfig.tone ?? "professional"),
      automation_level: (["assist", "supervised", "autonomous"].includes(
        String(playbookConfig.automation_level),
      )
        ? String(playbookConfig.automation_level)
        : "assist") as AutomationLevel,
      outreach_mode: (["warm_preferred", "warm_required", "cold_allowed"].includes(
        String(playbookConfig.outreach_mode),
      )
        ? String(playbookConfig.outreach_mode)
        : "warm_preferred") as OutreachMode,
      playbook_id: playbookConfig.playbook_id ? String(playbookConfig.playbook_id) : null,
    },
    condition: conditionNode
      ? {
          field: String(conditionConfig.field ?? "match_score"),
          operator: String(conditionConfig.operator ?? "gte"),
          value:
            typeof conditionConfig.value === "number" || typeof conditionConfig.value === "string"
              ? conditionConfig.value
              : Number(conditionConfig.value ?? 60) || 60,
        }
      : null,
    hasApprove: Boolean(nodeOfKind(graph, "approve")),
    hasEmailAction: Boolean(nodeOfKind(graph, "action_email")),
    hasIntroAction: Boolean(nodeOfKind(graph, "action_intro")),
    hasNotifyAction: Boolean(nodeOfKind(graph, "action_notify")),
    hasDelay: Boolean(nodeOfKind(graph, "delay")),
  };
}

export type WorkflowValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function hasPath(
  graph: WorkflowGraph,
  fromKind: WorkflowNodeKind,
  toKind: WorkflowNodeKind,
): boolean {
  const from = nodeOfKind(graph, fromKind);
  const to = nodeOfKind(graph, toKind);
  if (!from || !to) return false;

  const adj = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = adj.get(edge.source) ?? [];
    list.push(edge.target);
    adj.set(edge.source, list);
  }

  const seen = new Set<string>();
  const queue = [from.id];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === to.id) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) queue.push(next);
  }
  return false;
}

export function validateWorkflowGraph(graph: WorkflowGraph): WorkflowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!graph.nodes?.length) {
    errors.push("Add at least one node to the canvas.");
    return { ok: false, errors, warnings };
  }

  const required: WorkflowNodeKind[] = ["trigger", "icp", "segment", "playbook"];
  for (const kind of required) {
    if (!nodeOfKind(graph, kind)) {
      errors.push(`Missing required node: ${kind}.`);
    }
  }

  if (errors.length) return { ok: false, errors, warnings };

  if (!hasPath(graph, "trigger", "icp")) {
    errors.push("Connect Trigger → ICP match.");
  }
  if (!hasPath(graph, "icp", "segment")) {
    errors.push("Connect ICP match → Segment.");
  }
  if (!hasPath(graph, "segment", "playbook")) {
    errors.push("Connect Segment → Playbook agent.");
  }

  const extracted = extractWorkflowConfig(graph);
  if (extracted.trigger.mode === "schedule") {
    warnings.push("Schedule triggers are saved, but this run executes now. Cron automation is not live yet.");
  }
  if (extracted.trigger.mode === "new_contact") {
    warnings.push("New-contact triggers are saved, but this run executes against your current network now.");
  }
  if (extracted.hasDelay) {
    warnings.push("Wait nodes are noted in the plan; delays apply in playbook sequences after outreach starts.");
  }
  if (extracted.hasApprove) {
    warnings.push("Human approval keeps the playbook in Assist/Supervised review before sends.");
  }

  return { ok: errors.length === 0, errors, warnings };
}
