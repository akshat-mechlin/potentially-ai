import type {
  WorkflowGraph,
  WorkflowNodeKind,
  WorkflowNodeProgress,
  WorkflowRunMatchPreview,
  WorkflowRunStats,
} from "@/types/workflows";
import type { PlaybookProspect } from "@/types/playbooks";

export function emptyRunStats(matched = 0, skipped = 0): WorkflowRunStats {
  return {
    matched,
    selected: 0,
    drafted: 0,
    sent: 0,
    replied: 0,
    booked: 0,
    skipped,
  };
}

export function buildStatsFromProspects(prospects: PlaybookProspect[]): WorkflowRunStats {
  const stats = emptyRunStats();
  for (const prospect of prospects) {
    switch (prospect.status) {
      case "matched":
        stats.matched += 1;
        break;
      case "selected":
        stats.selected += 1;
        break;
      case "pending_approval":
        stats.drafted += 1;
        break;
      case "sent":
      case "queued":
        stats.sent += 1;
        break;
      case "replied":
        stats.replied += 1;
        break;
      case "booked":
        stats.booked += 1;
        break;
      case "skipped":
        stats.skipped += 1;
        break;
      default:
        break;
    }
  }
  return stats;
}

export function buildInitialNodeProgress(
  graph: WorkflowGraph,
  input: {
    matchedCount: number;
    skippedCount: number;
    hasApprove: boolean;
    hasEmail: boolean;
    hasIntro: boolean;
    hasNotify: boolean;
    hasDelay: boolean;
    hasCondition: boolean;
    delayLabel?: string | null;
    notifySent?: boolean;
  },
): WorkflowNodeProgress[] {
  return graph.nodes.map((node) => {
    const kind = (node.type || node.data.kind) as WorkflowNodeKind;
    switch (kind) {
      case "trigger":
        return { node_id: node.id, kind, status: "done", detail: "Started" };
      case "icp":
        return {
          node_id: node.id,
          kind,
          status: "done",
          detail: `${input.matchedCount} matched`,
        };
      case "condition":
        return {
          node_id: node.id,
          kind,
          status: input.hasCondition ? "done" : "skipped",
          detail: input.hasCondition ? "Filter applied" : undefined,
        };
      case "segment":
        return {
          node_id: node.id,
          kind,
          status: "done",
          detail: `${input.matchedCount} contacts`,
        };
      case "playbook":
        return { node_id: node.id, kind, status: "done", detail: "Run deployed" };
      case "delay":
        return {
          node_id: node.id,
          kind,
          status: input.hasDelay ? "waiting" : "skipped",
          detail: input.delayLabel ?? "Queued in sequence",
        };
      case "approve":
        return {
          node_id: node.id,
          kind,
          status: input.hasApprove ? "running" : "skipped",
          detail: input.hasApprove ? "Waiting for review" : undefined,
        };
      case "action_email":
        return {
          node_id: node.id,
          kind,
          status: input.hasEmail ? "running" : "skipped",
          detail: input.hasEmail ? "Ready to draft/send" : undefined,
        };
      case "action_intro":
        return {
          node_id: node.id,
          kind,
          status: input.hasIntro ? "running" : "skipped",
          detail: input.hasIntro ? "Intro path ready" : undefined,
        };
      case "action_notify":
        return {
          node_id: node.id,
          kind,
          status: input.hasNotify ? (input.notifySent ? "done" : "running") : "skipped",
          detail: input.notifySent ? "Notification sent" : undefined,
        };
      default:
        return { node_id: node.id, kind, status: "pending" };
    }
  });
}

export function refreshNodeProgress(
  progress: WorkflowNodeProgress[] | undefined,
  stats: WorkflowRunStats,
): WorkflowNodeProgress[] {
  if (!progress?.length) return [];

  return progress.map((item) => {
    if (item.kind === "approve") {
      if (stats.drafted > 0 || stats.sent > 0 || stats.replied > 0 || stats.booked > 0) {
        return { ...item, status: "done", detail: "Reviewed" };
      }
      if (stats.selected > 0) {
        return { ...item, status: "running", detail: `${stats.selected} selected` };
      }
      return { ...item, status: "running", detail: "Waiting for review" };
    }

    if (item.kind === "action_email") {
      if (stats.sent + stats.replied + stats.booked > 0) {
        return {
          ...item,
          status: "done",
          detail: `${stats.sent + stats.replied + stats.booked} sent`,
        };
      }
      if (stats.drafted > 0) {
        return { ...item, status: "running", detail: `${stats.drafted} drafts` };
      }
      if (stats.selected > 0) {
        return { ...item, status: "running", detail: "Ready to draft" };
      }
      return item;
    }

    if (item.kind === "action_intro") {
      if (stats.sent + stats.replied + stats.booked > 0) {
        return { ...item, status: "done", detail: "Outreach started" };
      }
      return item;
    }

    if (item.kind === "delay") {
      if (stats.sent > 0 || stats.replied > 0 || stats.booked > 0) {
        return { ...item, status: "done", detail: "Follow-ups scheduled" };
      }
      return item;
    }

    return item;
  });
}

export function toMatchesPreview(
  rows: Array<{
    contact: {
      id: string;
      full_name: string | null;
      email: string | null;
      company_name: string | null;
    };
    score: number;
    reason?: string;
  }>,
  limit = 40,
): WorkflowRunMatchPreview[] {
  return rows.slice(0, limit).map((row) => ({
    contact_id: row.contact.id,
    full_name: row.contact.full_name,
    email: row.contact.email,
    company_name: row.contact.company_name,
    score: row.score,
    match_reason: row.reason ?? null,
  }));
}
