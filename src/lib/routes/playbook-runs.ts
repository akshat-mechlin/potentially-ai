/** Flat run detail path — avoids nested /playbooks/[id]/runs/[runId] 404 in dev. */
export function playbookRunHref(runId: string) {
  return `/playbook-runs/${runId}`;
}
