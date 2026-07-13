/** Flat run detail path — avoids nested /playbooks/[id]/runs/[runId] 404 in dev. */
export function playbookRunHref(runId: string) {
  return `/playbook-runs/${runId}`;
}

/**
 * Flat run API base — nested /api/playbooks/runs/[runId]/* conflicts with
 * /api/playbooks/[id] in Next 16 and returns HTML 404 for child routes.
 */
export function playbookRunApiBase(runId: string) {
  return `/api/playbook-runs/${runId}`;
}
