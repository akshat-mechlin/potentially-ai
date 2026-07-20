import { isDataDemoMode } from "@/lib/app-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminActorForWorkflow } from "@/lib/workflows/actor";
import { executeWorkflow } from "@/lib/workflows/execute";
import { extractWorkflowConfig } from "@/lib/workflows/graph";
import { listWorkflows, getWorkflow, updateWorkflow } from "@/lib/data/workflows";
import type { Workflow, WorkflowGraph, WorkflowTriggerMode } from "@/types/workflows";

function triggerModeFromGraph(graph: WorkflowGraph): WorkflowTriggerMode {
  const trigger = graph.nodes.find((node) => node.type === "trigger" || node.data.kind === "trigger");
  const mode = String(trigger?.data.config?.mode ?? "manual");
  if (mode === "schedule" || mode === "new_contact") return mode;
  return "manual";
}

function scheduleIntervalHours(graph: WorkflowGraph): number {
  const trigger = graph.nodes.find((node) => node.type === "trigger" || node.data.kind === "trigger");
  const interval = String(trigger?.data.config?.interval ?? "daily");
  if (interval === "hourly") return 1;
  if (interval === "every_6_hours") return 6;
  if (interval === "weekly") return 24 * 7;
  return 24;
}

export function isScheduleDue(workflow: Workflow, now = new Date()): boolean {
  if (triggerModeFromGraph(workflow.graph) !== "schedule") return false;
  if (workflow.status !== "active") return false;
  if (workflow.last_run?.wait_status === "waiting") return false;
  const hours = scheduleIntervalHours(workflow.graph);
  const lastAt = workflow.last_run?.at ? new Date(workflow.last_run.at).getTime() : 0;
  if (!lastAt) return true;
  return now.getTime() - lastAt >= hours * 60 * 60 * 1000;
}

function isWaitReady(workflow: Workflow, now = new Date()): boolean {
  if (workflow.status !== "active") return false;
  if (workflow.last_run?.wait_status !== "waiting") return false;
  if (!workflow.last_run.wait_until) return false;
  return new Date(workflow.last_run.wait_until).getTime() <= now.getTime();
}

/** Run all active new-contact workflows in the current user session workspace. */
export async function triggerNewContactWorkflows(options?: {
  importedCount?: number;
}): Promise<{ ran: number; workflow_ids: string[] }> {
  if (isDataDemoMode()) return { ran: 0, workflow_ids: [] };

  const items = await listWorkflows();
  const ranIds: string[] = [];

  for (const item of items) {
    if (item.status !== "active") continue;
    const workflow = await getWorkflow(item.id);
    if (!workflow) continue;
    if (triggerModeFromGraph(workflow.graph) !== "new_contact") continue;

    try {
      await executeWorkflow(workflow.id, { triggerMode: "new_contact" });
      ranIds.push(workflow.id);
    } catch (error) {
      console.error(`New-contact workflow ${workflow.id} failed:`, error);
    }
  }

  if (ranIds.length && options?.importedCount) {
    // executeWorkflow already notifies when notify node present
  }

  return { ran: ranIds.length, workflow_ids: ranIds };
}

/** Session-scoped: run due scheduled workflows for the current workspace. */
export async function runDueScheduledWorkflowsForSession(): Promise<{
  ran: number;
  workflow_ids: string[];
}> {
  if (isDataDemoMode()) return { ran: 0, workflow_ids: [] };

  const items = await listWorkflows();
  const ranIds: string[] = [];

  for (const item of items) {
    const workflow = await getWorkflow(item.id);
    if (!workflow) continue;

    try {
      if (isWaitReady(workflow)) {
        await executeWorkflow(workflow.id, {
          triggerMode: workflow.last_run?.trigger_mode ?? "manual",
          resumeFromWait: true,
        });
        ranIds.push(workflow.id);
        continue;
      }
      if (!isScheduleDue(workflow)) continue;
      await executeWorkflow(workflow.id, { triggerMode: "schedule" });
      ranIds.push(workflow.id);
    } catch (error) {
      console.error(`Scheduled workflow ${workflow.id} failed:`, error);
    }
  }

  return { ran: ranIds.length, workflow_ids: ranIds };
}

/**
 * Cron path: fully execute due scheduled workflows and resume short waits
 * using the workflow owner's identity via the service-role client.
 */
export async function processDueScheduledWorkflows(): Promise<{
  ran: number;
  resumed: number;
  notified: number;
  errors: number;
}> {
  if (isDataDemoMode()) return { ran: 0, resumed: 0, notified: 0, errors: 0 };

  const admin = createAdminClient();
  const { data, error } = await admin.from("workflows").select("*").eq("status", "active");
  if (error) throw error;

  let ran = 0;
  let resumed = 0;
  let notified = 0;
  let errors = 0;

  for (const row of data ?? []) {
    const workflow = row as unknown as Workflow;
    const actor = adminActorForWorkflow({
      userId: workflow.created_by,
      workspaceId: workflow.workspace_id,
    });

    try {
      if (isWaitReady(workflow)) {
        await executeWorkflow(workflow.id, {
          actor,
          resumeFromWait: true,
          triggerMode: workflow.last_run?.trigger_mode ?? "manual",
        });
        resumed += 1;
        continue;
      }

      if (!isScheduleDue(workflow)) continue;
      const config = extractWorkflowConfig(workflow.graph);
      if (config.trigger.mode !== "schedule") continue;

      await executeWorkflow(workflow.id, { actor, triggerMode: "schedule" });
      ran += 1;

      try {
        await admin.from("notifications").insert({
          user_id: workflow.created_by,
          workspace_id: workflow.workspace_id,
          title: "Scheduled workflow ran",
          message: `${workflow.name} finished its scheduled run. Open Workflows to review results.`,
          type: "workflow",
          link: `/workflows/${workflow.id}`,
        });
        notified += 1;
      } catch (notifyError) {
        console.error("Schedule notify failed:", notifyError);
      }
    } catch (runError) {
      errors += 1;
      console.error(`Cron workflow ${workflow.id} failed:`, runError);
    }
  }

  return { ran, resumed, notified, errors };
}

export async function clearScheduleDueFlag(workflowId: string) {
  const workflow = await getWorkflow(workflowId);
  if (!workflow?.last_run?.schedule_due) return;
  const rest = { ...workflow.last_run };
  delete rest.schedule_due;
  await updateWorkflow(workflowId, { last_run: rest });
}
