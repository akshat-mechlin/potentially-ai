import { listRunProspects } from "@/lib/data/playbooks";
import { getWorkflow, updateWorkflow } from "@/lib/data/workflows";
import {
  buildStatsFromProspects,
  refreshNodeProgress,
} from "@/lib/workflows/run-progress";
import type { WorkflowLastRun } from "@/types/workflows";

export async function syncWorkflowRunStatus(workflowId: string): Promise<{
  last_run: WorkflowLastRun | null;
  prospects_summary: {
    matched: number;
    selected: number;
    drafted: number;
    sent: number;
    replied: number;
    booked: number;
    skipped: number;
  } | null;
}> {
  const workflow = await getWorkflow(workflowId);
  if (!workflow?.last_run?.run_id) {
    return { last_run: null, prospects_summary: null };
  }

  const prospects = await listRunProspects(workflow.last_run.run_id);
  const stats = buildStatsFromProspects(prospects);
  const node_progress = refreshNodeProgress(workflow.last_run.node_progress, stats);

  const last_run: WorkflowLastRun = {
    ...workflow.last_run,
    stats,
    node_progress,
    matched_count: stats.matched || workflow.last_run.matched_count,
    skipped_count: stats.skipped || workflow.last_run.skipped_count,
  };

  await updateWorkflow(workflowId, { last_run });

  return {
    last_run,
    prospects_summary: stats,
  };
}
