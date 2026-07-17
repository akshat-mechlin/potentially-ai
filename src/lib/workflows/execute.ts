import { listContacts } from "@/lib/data/contacts";
import {
  createPlaybook,
  deployPlaybookRun,
  getPlaybook,
  updatePlaybook,
} from "@/lib/data/playbooks";
import {
  createSegment,
  getSegment,
  setSegmentContacts,
  updateSegment,
} from "@/lib/data/segments";
import { getWorkflow, updateWorkflow } from "@/lib/data/workflows";
import { scoreAllContactsForPlaybook } from "@/lib/playbooks/matching";
import { playbookRunHref } from "@/lib/routes/playbook-runs";
import { extractWorkflowConfig, validateWorkflowGraph } from "@/lib/workflows/graph";
import type { WorkflowLastRun } from "@/types/workflows";
import type { AutomationLevel } from "@/types/playbooks";

export type WorkflowRunResult = {
  workflow_id: string;
  segment_id: string;
  playbook_id: string;
  run_id: string;
  run_href: string;
  matched_count: number;
  skipped_count: number;
  dry_run: boolean;
  warnings: string[];
  planned_actions: string[];
};

function passesCondition(
  score: number,
  condition: { field: string; operator: string; value: number | string } | null,
): boolean {
  if (!condition || condition.field !== "match_score") return true;
  const threshold = Number(condition.value);
  if (!Number.isFinite(threshold)) return true;
  if (condition.operator === "gte") return score >= threshold;
  if (condition.operator === "lte") return score <= threshold;
  if (condition.operator === "eq") return score === threshold;
  return true;
}

export async function executeWorkflow(
  workflowId: string,
  options?: { dryRun?: boolean },
): Promise<WorkflowRunResult> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow) throw new Error("Workflow not found");

  const validation = validateWorkflowGraph(workflow.graph);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const config = extractWorkflowConfig(workflow.graph);
  const dryRun = Boolean(options?.dryRun);

  const contacts = await listContacts({ limit: 2000, offset: 0 });
  const scored = scoreAllContactsForPlaybook(
    contacts,
    config.icp,
    config.matching,
    config.playbook.outreach_mode,
    {
      ownerNames: new Map(),
      activeContactIds: new Set(),
      doNotContactIds: new Set(),
    },
  );

  const matched = scored.matched.filter((row) =>
    passesCondition(row.score, config.condition),
  );
  const matchedIds = matched.map((row) => row.contact.id);

  if (matchedIds.length === 0) {
    validation.warnings.push(
      "No contacts matched this ICP. The run will open with an empty prospect list — loosen ICP filters and try again.",
    );
  }

  // Segment
  let segmentId = config.segment.segment_id ?? workflow.segment_id;
  if (config.segment.mode === "link" && segmentId) {
    const existing = await getSegment(segmentId);
    if (!existing) {
      const created = await createSegment({
        name: config.segment.name,
        description: config.segment.description,
        contactIds: matchedIds,
      });
      segmentId = created.id;
    } else {
      await updateSegment(segmentId, {
        name: config.segment.name,
        description: config.segment.description,
      });
      await setSegmentContacts(segmentId, matchedIds);
    }
  } else if (segmentId) {
    await updateSegment(segmentId, {
      name: config.segment.name,
      description: config.segment.description,
    });
    await setSegmentContacts(segmentId, matchedIds);
  } else {
    const created = await createSegment({
      name: config.segment.name,
      description: config.segment.description,
      contactIds: matchedIds,
    });
    segmentId = created.id;
  }

  // Playbook
  let automationLevel: AutomationLevel = config.playbook.automation_level;
  if (config.hasApprove && automationLevel === "autonomous") {
    automationLevel = "supervised";
  }

  let playbookId = config.playbook.playbook_id ?? workflow.playbook_id;
  if (config.playbook.mode === "link" && playbookId) {
    const existing = await getPlaybook(playbookId);
    if (!existing) {
      const created = await createPlaybook({
        name: config.playbook.name,
        description: `Created from workflow: ${workflow.name}`,
        goal: config.playbook.goal,
      });
      playbookId = created.id;
    }
  } else if (!playbookId) {
    const created = await createPlaybook({
      name: config.playbook.name,
      description: `Created from workflow: ${workflow.name}`,
      goal: config.playbook.goal,
    });
    playbookId = created.id;
  }

  await updatePlaybook(playbookId, {
    name: config.playbook.name,
    goal: config.playbook.goal,
    tone: config.playbook.tone,
    automation_level: automationLevel,
    outreach_mode: config.playbook.outreach_mode,
    status: "active",
    icp_profile: config.icp,
    matching_config: config.matching,
    send_config: workflow.send_config?.include_unsubscribe != null
      ? workflow.send_config
      : { include_unsubscribe: true, skip_weekends: true },
  });

  const run = await deployPlaybookRun(playbookId, { segmentId, dryRun });
  const runId = (run as { id: string }).id;

  const planned_actions: string[] = [];
  if (config.hasEmailAction) planned_actions.push("Send outreach via playbook review");
  if (config.hasIntroAction) planned_actions.push("Request warm intros for lower-fit paths");
  if (config.hasNotifyAction) planned_actions.push("Notify on step completion");
  if (config.hasApprove) planned_actions.push("Hold for human approval before send");

  const last_run: WorkflowLastRun = {
    at: new Date().toISOString(),
    run_id: runId,
    segment_id: segmentId,
    playbook_id: playbookId,
    matched_count: matchedIds.length,
    skipped_count: scored.skipped.length,
    dry_run: dryRun,
    warnings: validation.warnings,
    planned_actions,
  };

  await updateWorkflow(workflowId, {
    segment_id: segmentId,
    playbook_id: playbookId,
    icp_profile: config.icp,
    matching_config: config.matching,
    status: "active",
    last_run,
  });

  // Patch graph node configs with linked ids so next save keeps them
  const graph = structuredClone(workflow.graph);
  for (const node of graph.nodes) {
    if (node.type === "segment" || node.data.kind === "segment") {
      node.data.config = {
        ...node.data.config,
        mode: "link",
        segment_id: segmentId,
        name: config.segment.name,
      };
    }
    if (node.type === "playbook" || node.data.kind === "playbook") {
      node.data.config = {
        ...node.data.config,
        mode: "link",
        playbook_id: playbookId,
        name: config.playbook.name,
      };
    }
  }
  await updateWorkflow(workflowId, { graph });

  return {
    workflow_id: workflowId,
    segment_id: segmentId,
    playbook_id: playbookId,
    run_id: runId,
    run_href: playbookRunHref(runId),
    matched_count: matchedIds.length,
    skipped_count: scored.skipped.length,
    dry_run: dryRun,
    warnings: validation.warnings,
    planned_actions,
  };
}
