import type { WorkflowGraph, WorkflowNodeKind } from "@/types/workflows";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Filter,
  GitBranch,
  Handshake,
  ListFilter,
  Mail,
  Bell,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";

export interface WorkflowNodeDefinition {
  kind: WorkflowNodeKind;
  label: string;
  description: string;
  icon: LucideIcon;
  category: "start" | "match" | "agent" | "logic" | "action";
  accent: string;
  defaultConfig: Record<string, unknown>;
  handles: {
    inputs?: number;
    outputs?: number;
    /** Named outputs for branches */
    outputIds?: string[];
  };
}

export const WORKFLOW_NODE_CATALOG: WorkflowNodeDefinition[] = [
  {
    kind: "trigger",
    label: "Trigger",
    description: "Start when you run manually, on a schedule, or when a contact is added",
    icon: Zap,
    category: "start",
    accent: "oklch(0.72 0.12 75)",
    defaultConfig: {
      mode: "manual",
      cron: "0 9 * * 1-5",
    },
    handles: { outputs: 1 },
  },
  {
    kind: "icp",
    label: "ICP match",
    description: "Score and pick contacts that match your ideal customer profile",
    icon: Filter,
    category: "match",
    accent: "oklch(0.62 0.1 145)",
    defaultConfig: {
      title_include: ["CTO", "Founder", "VP"],
      keywords_must: [],
      keywords_nice: ["fintech", "SaaS"],
      geographies: [],
      min_strength_score: 20,
      min_match_score: 35,
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "segment",
    label: "Segment",
    description: "Save matched contacts into a reusable segment",
    icon: ListFilter,
    category: "match",
    accent: "oklch(0.58 0.08 200)",
    defaultConfig: {
      mode: "create",
      name: "ICP matches",
      description: "Auto-built from workflow ICP",
      segment_id: null,
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "playbook",
    label: "Playbook agent",
    description: "Create or attach an Agent Mode playbook with full outreach config",
    icon: Bot,
    category: "agent",
    accent: "oklch(0.55 0.12 280)",
    defaultConfig: {
      mode: "create",
      name: "Workflow playbook",
      automation_level: "assist",
      outreach_mode: "warm_preferred",
      goal: "Book an intro call",
      tone: "professional",
      playbook_id: null,
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "condition",
    label: "Condition",
    description: "Branch the flow with true / false paths",
    icon: GitBranch,
    category: "logic",
    accent: "oklch(0.65 0.14 145)",
    defaultConfig: {
      field: "match_score",
      operator: "gte",
      value: 60,
      label_true: "true",
      label_false: "false",
    },
    handles: { inputs: 1, outputIds: ["true", "false"] },
  },
  {
    kind: "delay",
    label: "Wait",
    description: "Pause before the next step",
    icon: Timer,
    category: "logic",
    accent: "oklch(0.6 0.04 260)",
    defaultConfig: {
      amount: 2,
      unit: "days",
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "approve",
    label: "Human approval",
    description: "Hold for review before continuing",
    icon: ShieldCheck,
    category: "logic",
    accent: "oklch(0.62 0.1 40)",
    defaultConfig: {
      message: "Review matched prospects before outreach",
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "action_email",
    label: "Send outreach",
    description: "Draft or send playbook email / in-app messages",
    icon: Mail,
    category: "action",
    accent: "oklch(0.58 0.12 220)",
    defaultConfig: {
      channel: "email",
      require_approval: true,
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "action_intro",
    label: "Request intro",
    description: "Kick off a warm introduction for matched contacts",
    icon: Handshake,
    category: "action",
    accent: "oklch(0.6 0.1 30)",
    defaultConfig: {
      auto_message: true,
    },
    handles: { inputs: 1, outputs: 1 },
  },
  {
    kind: "action_notify",
    label: "Notify",
    description: "Ping you when this step runs",
    icon: Bell,
    category: "action",
    accent: "oklch(0.68 0.1 85)",
    defaultConfig: {
      channel: "in_app",
      message: "Workflow step completed",
    },
    handles: { inputs: 1, outputs: 1 },
  },
];

export function getNodeDefinition(kind: WorkflowNodeKind) {
  return WORKFLOW_NODE_CATALOG.find((item) => item.kind === kind);
}

export function createDefaultWorkflowGraph(): WorkflowGraph {
  return {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 40, y: 180 },
        data: {
          kind: "trigger",
          label: "Manual run",
          description: "Start this workflow when you are ready",
          config: { mode: "manual" },
        },
      },
      {
        id: "icp-1",
        type: "icp",
        position: { x: 300, y: 160 },
        data: {
          kind: "icp",
          label: "ICP match",
          description: "Find contacts that fit your ICP",
          config: {
            title_include: ["CTO", "Founder", "VP Engineering"],
            keywords_nice: ["fintech", "SaaS"],
            min_strength_score: 20,
            min_match_score: 35,
          },
        },
      },
      {
        id: "segment-1",
        type: "segment",
        position: { x: 580, y: 160 },
        data: {
          kind: "segment",
          label: "Build segment",
          description: "Save matches for Agent Mode",
          config: {
            mode: "create",
            name: "ICP matches",
            description: "Built by workflow",
          },
        },
      },
      {
        id: "playbook-1",
        type: "playbook",
        position: { x: 860, y: 160 },
        data: {
          kind: "playbook",
          label: "Playbook agent",
          description: "Configure outreach like a playbook",
          config: {
            mode: "create",
            name: "Workflow playbook",
            automation_level: "assist",
            outreach_mode: "warm_preferred",
            goal: "Book an intro call",
            tone: "professional",
          },
        },
      },
      {
        id: "condition-1",
        type: "condition",
        position: { x: 1140, y: 160 },
        data: {
          kind: "condition",
          label: "High fit?",
          description: "Branch by match score",
          config: {
            field: "match_score",
            operator: "gte",
            value: 60,
            label_true: "true",
            label_false: "false",
          },
        },
      },
      {
        id: "email-1",
        type: "action_email",
        position: { x: 1420, y: 40 },
        data: {
          kind: "action_email",
          label: "Send outreach",
          description: "High-fit prospects",
          config: { channel: "email", require_approval: true },
        },
      },
      {
        id: "intro-1",
        type: "action_intro",
        position: { x: 1420, y: 280 },
        data: {
          kind: "action_intro",
          label: "Request intro",
          description: "Warm path for lower fit",
          config: { auto_message: true },
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-1", target: "icp-1", animated: true },
      { id: "e2", source: "icp-1", target: "segment-1", animated: true },
      { id: "e3", source: "segment-1", target: "playbook-1", animated: true },
      { id: "e4", source: "playbook-1", target: "condition-1", animated: true },
      {
        id: "e5",
        source: "condition-1",
        sourceHandle: "true",
        target: "email-1",
        label: "true",
        animated: true,
      },
      {
        id: "e6",
        source: "condition-1",
        sourceHandle: "false",
        target: "intro-1",
        label: "false",
        animated: true,
      },
    ],
    viewport: { x: 0, y: 40, zoom: 0.85 },
  };
}
