import { listContacts } from "@/lib/data/contacts";
import { createIntroduction } from "@/lib/data/intros";
import {
  createPlaybook,
  deployPlaybookRun,
  getPlaybook,
  updatePlaybook,
} from "@/lib/data/playbooks";
import { saveSequenceSteps } from "@/lib/data/playbook-sequences";
import {
  createSegment,
  getSegment,
  setSegmentContacts,
  updateSegment,
} from "@/lib/data/segments";
import { getWorkflow, updateWorkflow } from "@/lib/data/workflows";
import { scoreAllContactsForPlaybook } from "@/lib/playbooks/matching";
import { playbookRunHref } from "@/lib/routes/playbook-runs";
import { resolveWorkflowActor, type WorkflowActor } from "@/lib/workflows/actor";
import {
  extractWorkflowConfig,
  resolveConditionBranches,
  validateWorkflowGraph,
} from "@/lib/workflows/graph";
import {
  buildInitialNodeProgress,
  emptyRunStats,
  toMatchesPreview,
} from "@/lib/workflows/run-progress";
import type { WorkflowLastRun, WorkflowTriggerMode } from "@/types/workflows";
import type { AutomationLevel } from "@/types/playbooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDataDemoMode } from "@/lib/app-config";

export type WorkflowRunResult = WorkflowLastRun & {
  workflow_id: string;
  run_href: string;
};

function passesCondition(
  row: {
    score: number;
    contact: { title?: string | null; strength_score?: number | null };
  },
  condition: { field: string; operator: string; value: number | string } | null,
): boolean {
  if (!condition) return true;

  if (condition.field === "match_score") {
    const threshold = Number(condition.value);
    if (!Number.isFinite(threshold)) return true;
    if (condition.operator === "gte") return row.score >= threshold;
    if (condition.operator === "lte") return row.score <= threshold;
    if (condition.operator === "eq") return row.score === threshold;
    return true;
  }

  if (condition.field === "strength_score") {
    const strength = Number(row.contact.strength_score ?? 0);
    const threshold = Number(condition.value);
    if (!Number.isFinite(threshold)) return true;
    if (condition.operator === "gte") return strength >= threshold;
    if (condition.operator === "lte") return strength <= threshold;
    if (condition.operator === "eq") return strength === threshold;
    return true;
  }

  if (condition.field === "title_contains") {
    const needle = String(condition.value ?? "")
      .trim()
      .toLowerCase();
    if (!needle) return true;
    const title = (row.contact.title ?? "").toLowerCase();
    if (condition.operator === "contains" || condition.operator === "eq") {
      return title.includes(needle);
    }
    return true;
  }

  return true;
}

function delayToMs(amount: number, unit: string): number {
  if (unit === "minutes") return Math.max(1, amount) * 60_000;
  if (unit === "hours") return Math.max(1, amount) * 3_600_000;
  return Math.max(1, amount) * 86_400_000;
}

function delayToDays(amount: number, unit: string): number {
  if (unit === "minutes") return Math.max(1, Math.ceil(amount / (60 * 24)));
  if (unit === "hours") return Math.max(1, Math.ceil(amount / 24));
  return Math.max(1, Math.round(amount) || 1);
}

function isShortWait(amount: number, unit: string): boolean {
  const ms = delayToMs(amount, unit);
  return ms > 0 && ms < 24 * 3_600_000;
}

async function sendWorkflowNotification(input: {
  userId: string;
  workspaceId: string;
  workflowId: string;
  workflowName: string;
  matchedCount: number;
  message?: string;
}) {
  if (isDataDemoMode()) return true;
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      title: "Workflow run ready",
      message:
        input.message ??
        `${input.workflowName}: ${input.matchedCount} contact${input.matchedCount === 1 ? "" : "s"} matched. Review and send from Workflows.`,
      type: "workflow",
      link: `/workflows/${input.workflowId}`,
    });
    return true;
  } catch (error) {
    console.error("Workflow notify failed:", error);
    return false;
  }
}

async function upsertSegmentForPath(
  actor: WorkflowActor,
  input: {
    existingId: string | null;
    name: string;
    description: string;
    contactIds: string[];
  },
): Promise<string> {
  if (input.existingId) {
    const existing = await getSegment(input.existingId, actor);
    if (existing) {
      await updateSegment(
        input.existingId,
        { name: input.name, description: input.description },
        actor,
      );
      await setSegmentContacts(input.existingId, input.contactIds, actor);
      return input.existingId;
    }
  }

  const created = await createSegment(
    {
      name: input.name,
      description: input.description,
      contactIds: input.contactIds,
      workspaceId: actor.workspaceId,
    },
    actor,
  );
  return created.id;
}

export async function executeWorkflow(
  workflowId: string,
  options?: {
    dryRun?: boolean;
    triggerMode?: WorkflowTriggerMode;
    actor?: WorkflowActor | null;
    /** Skip short-wait pause and continue deploy (used by cron resume). */
    resumeFromWait?: boolean;
  },
): Promise<WorkflowRunResult> {
  const actor = await resolveWorkflowActor(options?.actor);
  const workflow = await getWorkflow(workflowId, actor);
  if (!workflow) throw new Error("Workflow not found");

  // Resume a previously parked short wait
  if (
    options?.resumeFromWait &&
    workflow.last_run?.wait_status === "waiting" &&
    workflow.last_run.wait_until &&
    new Date(workflow.last_run.wait_until).getTime() > Date.now()
  ) {
    throw new Error("Workflow wait has not elapsed yet");
  }

  const validation = validateWorkflowGraph(workflow.graph);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  const config = extractWorkflowConfig(workflow.graph);
  const branches = resolveConditionBranches(workflow.graph);
  const dryRun = Boolean(options?.dryRun);
  const triggerMode = (options?.triggerMode ??
    config.trigger.mode ??
    "manual") as WorkflowTriggerMode;

  const delayNode = workflow.graph.nodes.find(
    (node) => node.type === "delay" || node.data.kind === "delay",
  );
  const delayAmount = Number(delayNode?.data.config?.amount ?? 1);
  const delayUnit = String(delayNode?.data.config?.unit ?? "days");
  const delay =
    config.hasDelay && Number.isFinite(delayAmount)
      ? { amount: delayAmount, unit: delayUnit }
      : null;

  // Short wait: park before deploy (unless resuming)
  if (delay && isShortWait(delay.amount, delay.unit) && !options?.resumeFromWait) {
    const wait_until = new Date(Date.now() + delayToMs(delay.amount, delay.unit)).toISOString();
    const last_run: WorkflowLastRun = {
      at: new Date().toISOString(),
      run_id: workflow.last_run?.run_id ?? "",
      segment_id: workflow.segment_id ?? "",
      playbook_id: workflow.playbook_id ?? "",
      matched_count: workflow.last_run?.matched_count ?? 0,
      skipped_count: workflow.last_run?.skipped_count ?? 0,
      dry_run: dryRun,
      warnings: [
        ...validation.warnings,
        `Waiting ${delay.amount} ${delay.unit} before outreach deploy.`,
      ],
      planned_actions: [`Wait ${delay.amount} ${delay.unit}`],
      delay,
      wait_until,
      wait_status: "waiting",
      trigger_mode: triggerMode,
      node_progress: buildInitialNodeProgress(workflow.graph, {
        matchedCount: 0,
        skippedCount: 0,
        hasApprove: config.hasApprove,
        hasEmail: config.hasEmailAction,
        hasIntro: config.hasIntroAction,
        hasNotify: config.hasNotifyAction,
        hasDelay: true,
        hasCondition: Boolean(config.condition),
        delayLabel: `Until ${new Date(wait_until).toLocaleString()}`,
        notifySent: false,
      }),
    };

    await updateWorkflow(workflowId, { status: "active", last_run }, actor);

    return {
      ...last_run,
      workflow_id: workflowId,
      run_href: last_run.run_id ? playbookRunHref(last_run.run_id) : `/workflows/${workflowId}`,
    };
  }

  const contacts = await listContacts({
    limit: 2000,
    offset: 0,
    allGroups: false,
    asAdmin: { supabase: actor.supabase, workspaceId: actor.workspaceId },
  });

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

  const truePath = scored.matched.filter((row) => passesCondition(row, config.condition));
  const falsePath = config.condition
    ? scored.matched.filter((row) => !passesCondition(row, config.condition))
    : [];

  // Route contacts by condition edge targets
  const emailRows = [
    ...(branches.trueLeadsToEmail ? truePath : []),
    ...(branches.falseLeadsToEmail ? falsePath : []),
  ];
  const introRows = [
    ...(branches.trueLeadsToIntro ? truePath : []),
    ...(branches.falseLeadsToIntro ? falsePath : []),
  ];

  // If no action nodes, default email path = true path (or all matches)
  const emailContacts =
    emailRows.length || introRows.length
      ? emailRows
      : truePath.length
        ? truePath
        : scored.matched;
  const introContacts = introRows;

  const emailIds = [...new Set(emailContacts.map((row) => row.contact.id))];
  const introIds = [...new Set(introContacts.map((row) => row.contact.id))].filter(
    (id) => !emailIds.includes(id),
  );

  if (!emailIds.length && !introIds.length) {
    validation.warnings.push(
      "No contacts matched this ICP. The run will open with an empty prospect list — loosen ICP filters and try again.",
    );
  }
  if (truePath.length || falsePath.length) {
    validation.warnings.push(
      `Branching: ${truePath.length} true-path · ${falsePath.length} false-path → ${emailIds.length} email · ${introIds.length} intro`,
    );
  }

  const segmentId = await upsertSegmentForPath(actor, {
    existingId: config.segment.segment_id ?? workflow.segment_id,
    name: config.segment.name,
    description: config.segment.description,
    contactIds: emailIds,
  });

  let automationLevel: AutomationLevel = config.playbook.automation_level;
  if (config.hasApprove && automationLevel === "autonomous") {
    automationLevel = "supervised";
  }

  let playbookId = config.playbook.playbook_id ?? workflow.playbook_id;
  if (config.playbook.mode === "link" && playbookId) {
    const existing = await getPlaybook(playbookId, actor);
    if (!existing) {
      const created = await createPlaybook(
        {
          name: config.playbook.name,
          description: `Created from workflow: ${workflow.name}`,
          goal: config.playbook.goal,
          workspaceId: actor.workspaceId,
        },
        actor,
      );
      playbookId = created.id;
    }
  } else if (!playbookId) {
    const created = await createPlaybook(
      {
        name: config.playbook.name,
        description: `Created from workflow: ${workflow.name}`,
        goal: config.playbook.goal,
        workspaceId: actor.workspaceId,
      },
      actor,
    );
    playbookId = created.id;
  }

  await updatePlaybook(
    playbookId,
    {
      name: config.playbook.name,
      goal: config.playbook.goal,
      tone: config.playbook.tone,
      automation_level: automationLevel,
      outreach_mode: config.playbook.outreach_mode,
      status: "active",
      icp_profile: config.icp,
      matching_config: config.matching,
      send_config:
        workflow.send_config?.include_unsubscribe != null
          ? workflow.send_config
          : { include_unsubscribe: true, skip_weekends: true },
    },
    actor,
  );

  // Day-scale waits → playbook sequence; short waits already handled above
  if (delay && !isShortWait(delay.amount, delay.unit)) {
    const delayDays = delayToDays(delay.amount, delay.unit);
    try {
      await saveSequenceSteps(
        playbookId,
        [
          {
            delay_days: delayDays,
            tone: config.playbook.tone,
            goal_override: config.playbook.goal,
            subject_hint: "Follow up from workflow wait step",
          },
        ],
        actor,
      );
      validation.warnings.push(
        `Wait step applied: follow-up sequence starts after ${delay.amount} ${delay.unit}.`,
      );
    } catch (error) {
      console.error("Failed to apply workflow delay to sequence:", error);
      validation.warnings.push("Wait step could not update the playbook sequence.");
    }
  }

  let runId = "";
  if (emailIds.length || (!introIds.length && !emailIds.length)) {
    const run = await deployPlaybookRun(playbookId, {
      segmentId,
      dryRun,
      actor,
    });
    runId = (run as { id: string }).id;
  }

  // Intro path: create introduction requests
  const createdIntroIds: string[] = [];
  if (introIds.length && !dryRun) {
    const introNode = workflow.graph.nodes.find(
      (node) => node.type === "action_intro" || node.data.kind === "action_intro",
    );
    const autoMessage = introNode?.data.config?.auto_message !== false;
    const message = autoMessage
      ? `Warm intro requested via workflow "${workflow.name}" (${config.playbook.goal}).`
      : undefined;

    for (const contactId of introIds.slice(0, 100)) {
      try {
        const intro = await createIntroduction(contactId, message, {
          supabase: createAdminClient(),
          userId: actor.userId,
          workspaceId: actor.workspaceId,
        });
        createdIntroIds.push(intro.id);
      } catch (error) {
        console.error(`Intro create failed for ${contactId}:`, error);
      }
    }
    validation.warnings.push(
      `Created ${createdIntroIds.length} introduction request${createdIntroIds.length === 1 ? "" : "s"} for the intro path.`,
    );
  } else if (introIds.length && dryRun) {
    validation.warnings.push(
      `Dry run: would request ${introIds.length} introduction${introIds.length === 1 ? "" : "s"}.`,
    );
  }

  const planned_actions: string[] = [];
  if (emailIds.length) planned_actions.push(`Email outreach for ${emailIds.length} contacts`);
  if (introIds.length) planned_actions.push(`Intro requests for ${introIds.length} contacts`);
  if (config.hasNotifyAction) planned_actions.push("Notify workspace on run completion");
  if (config.hasApprove) planned_actions.push("Hold for human approval before send");
  if (delay) planned_actions.push(`Wait ${delay.amount} ${delay.unit}`);

  let notifySent = false;
  if (config.hasNotifyAction) {
    notifySent = await sendWorkflowNotification({
      userId: actor.userId,
      workspaceId: actor.workspaceId,
      workflowId,
      workflowName: workflow.name,
      matchedCount: emailIds.length + introIds.length,
      message: `${workflow.name}: ${emailIds.length} email · ${createdIntroIds.length || introIds.length} intro`,
    });
  }

  const stats = emptyRunStats(emailIds.length, scored.skipped.length);
  const node_progress = buildInitialNodeProgress(workflow.graph, {
    matchedCount: emailIds.length + introIds.length,
    skippedCount: scored.skipped.length,
    hasApprove: config.hasApprove,
    hasEmail: emailIds.length > 0 || config.hasEmailAction,
    hasIntro: introIds.length > 0 || config.hasIntroAction,
    hasNotify: config.hasNotifyAction,
    hasDelay: Boolean(delay),
    hasCondition: Boolean(config.condition),
    delayLabel: delay ? `${delay.amount} ${delay.unit}` : null,
    notifySent,
  }).map((item) => {
    if (item.kind === "action_intro" && (createdIntroIds.length || introIds.length)) {
      return {
        ...item,
        status: "done" as const,
        detail: `${createdIntroIds.length || introIds.length} intros`,
      };
    }
    if (item.kind === "action_email" && emailIds.length) {
      return { ...item, status: "running" as const, detail: `${emailIds.length} in run` };
    }
    if (item.kind === "condition") {
      return {
        ...item,
        status: "done" as const,
        detail: `${truePath.length} true / ${falsePath.length} false`,
      };
    }
    if (item.kind === "delay" && options?.resumeFromWait) {
      return { ...item, status: "done" as const, detail: "Wait completed" };
    }
    return item;
  });

  const last_run: WorkflowLastRun = {
    at: new Date().toISOString(),
    run_id: runId,
    segment_id: segmentId,
    playbook_id: playbookId,
    matched_count: emailIds.length + introIds.length,
    skipped_count: scored.skipped.length,
    dry_run: dryRun,
    warnings: validation.warnings,
    planned_actions,
    node_progress,
    matches_preview: toMatchesPreview([...emailContacts, ...introContacts]),
    stats,
    notify_sent: notifySent,
    delay,
    trigger_mode: triggerMode,
    schedule_due: false,
    wait_until: null,
    wait_status: options?.resumeFromWait ? "resumed" : null,
    email_count: emailIds.length,
    intro_count: createdIntroIds.length || (dryRun ? introIds.length : 0),
    intro_ids: createdIntroIds,
    branch: {
      true_count: truePath.length,
      false_count: falsePath.length,
    },
  };

  await updateWorkflow(
    workflowId,
    {
      segment_id: segmentId,
      playbook_id: playbookId,
      icp_profile: config.icp,
      matching_config: config.matching,
      status: "active",
      last_run,
    },
    actor,
  );

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
  await updateWorkflow(workflowId, { graph }, actor);

  return {
    ...last_run,
    workflow_id: workflowId,
    run_href: runId ? playbookRunHref(runId) : `/workflows/${workflowId}`,
  };
}
