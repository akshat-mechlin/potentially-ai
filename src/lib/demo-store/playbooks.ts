import type { Playbook, PlaybookProspect, PlaybookRun, Segment } from "@/types/playbooks";
import { DEMO_CONTACTS } from "@/lib/demo-data";

let segments: Array<Segment & { contact_ids: string[] }> = [
  {
    id: "seg-demo-1",
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name: "Fintech CTO targets",
    description: "High-priority fintech leaders",
    source: "manual",
    contact_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact_ids: [DEMO_CONTACTS[0]?.id, DEMO_CONTACTS[2]?.id].filter(Boolean) as string[],
  },
];

let playbooks: Playbook[] = [
  {
    id: "pb-demo-1",
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name: "Book intro calls",
    description: "Warm outreach to fintech leaders",
    status: "active",
    automation_level: "assist",
    outreach_mode: "warm_preferred",
    goal: "Schedule a 15-minute intro call",
    tone: "professional",
    icp_profile: {
      title_include: ["cto", "chief", "founder"],
      keywords_nice: ["fintech", "saas"],
      min_strength_score: 20,
    },
    matching_config: { min_score: 35, warm_path_weight: 1, cooldown_days: 30 },
    send_config: { include_unsubscribe: true, skip_weekends: true },
    template_id: null,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let runs: PlaybookRun[] = [];
let prospects: PlaybookProspect[] = [];
const threadMessages: Record<
  string,
  Array<{ id: string; body: string; message_type: string; created_at: string }>
> = {};

export function getDemoSegments() {
  return segments.map(({ contact_ids: _c, ...segment }) => segment);
}

export function createDemoSegment(name: string, description?: string, contactIds: string[] = []) {
  const segment: Segment & { contact_ids: string[] } = {
    id: `seg-${Date.now()}`,
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name,
    description: description ?? null,
    source: "manual",
    contact_count: contactIds.length,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact_ids: contactIds,
  };
  segments = [segment, ...segments];
  return segment;
}

export function addContactsToDemoSegment(segmentId: string, contactIds: string[]) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return;
  const merged = new Set([...segment.contact_ids, ...contactIds]);
  segment.contact_ids = [...merged];
  segment.contact_count = segment.contact_ids.length;
  segment.updated_at = new Date().toISOString();
}

export function setDemoSegmentContacts(segmentId: string, contactIds: string[]) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return;
  segment.contact_ids = [...new Set(contactIds)];
  segment.contact_count = segment.contact_ids.length;
  segment.updated_at = new Date().toISOString();
}

export function getDemoPlaybooks() {
  return playbooks;
}

export function getDemoPlaybook(id: string) {
  return playbooks.find((p) => p.id === id) ?? null;
}

export function createDemoPlaybook(name: string, description?: string, goal?: string) {
  const playbook: Playbook = {
    id: `pb-${Date.now()}`,
    workspace_id: "demo-workspace-001",
    created_by: "demo-user-001",
    name,
    description: description ?? null,
    status: "draft",
    automation_level: "assist",
    outreach_mode: "warm_preferred",
    goal: goal ?? null,
    tone: "professional",
    icp_profile: {
      title_include: [],
      keywords_nice: [],
      min_strength_score: 20,
    },
    matching_config: { min_score: 40, warm_path_weight: 1 },
    send_config: { include_unsubscribe: true },
    template_id: null,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  playbooks = [playbook, ...playbooks];
  return playbook;
}

export function updateDemoPlaybook(id: string, updates: Partial<Playbook>) {
  playbooks = playbooks.map((p) =>
    p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p,
  );
  return playbooks.find((p) => p.id === id)!;
}

export function createDemoRun(playbookId: string, segmentId?: string, dryRun = false) {
  const playbook = getDemoPlaybook(playbookId);
  if (!playbook) throw new Error("Playbook not found");

  const pool = segmentId
    ? (segments.find((s) => s.id === segmentId)?.contact_ids ?? [])
    : DEMO_CONTACTS.map((c) => c.id);

  const run: PlaybookRun = {
    id: `run-${Date.now()}`,
    playbook_id: playbookId,
    workspace_id: "demo-workspace-001",
    triggered_by: "demo-user-001",
    segment_id: segmentId ?? null,
    status: "review",
    icp_snapshot: playbook.icp_profile,
    stats: { matched: pool.length, selected: 0, sent: 0 },
    dry_run: dryRun,
    started_at: new Date().toISOString(),
    completed_at: null,
    created_at: new Date().toISOString(),
  };
  runs = [run, ...runs];

  prospects = [
    ...pool.map((contactId, i) => {
      const contact = DEMO_CONTACTS.find((c) => c.id === contactId);
      return {
        id: `pr-${run.id}-${i}`,
        run_id: run.id,
        contact_id: contactId,
        match_score: 90 - i * 5,
        match_reason: "Title fits ICP · Strong relationship signal",
        matched_signals: ["title_match", "relationship_strength"],
        warm_path: ["Alex Morgan"],
        status: "matched" as const,
        draft_subject: null,
        draft_body: null,
        skip_reason: null,
        last_action_at: null,
        created_at: new Date().toISOString(),
        contact: contact
          ? {
              id: contact.id,
              full_name: contact.full_name,
              title: contact.title,
              email: contact.email,
              company_name: contact.company_name,
              strength_score: contact.strength_score,
            }
          : undefined,
      };
    }),
    ...prospects,
  ];

  return { ...run, matched_count: pool.length };
}

export function getDemoRun(runId: string) {
  return runs.find((r) => r.id === runId) ?? null;
}

export function getDemoRunsForPlaybook(playbookId: string) {
  return runs.filter((r) => r.playbook_id === playbookId);
}

export function getDemoRunProspects(runId: string) {
  return prospects.filter((p) => p.run_id === runId);
}

export function updateDemoProspect(id: string, updates: Partial<PlaybookProspect>) {
  prospects = prospects.map((p) => (p.id === id ? { ...p, ...updates } : p));
}

export function getDemoSegmentContactIds(segmentId: string) {
  const segment = segments.find((s) => s.id === segmentId);
  return segment?.contact_ids ?? [];
}

export function getDemoSegment(segmentId: string) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return null;
  const { contact_ids: _ids, ...rest } = segment;
  return rest;
}

export function updateDemoSegment(
  segmentId: string,
  input: { name?: string; description?: string | null },
) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return null;
  if (input.name !== undefined) segment.name = input.name;
  if (input.description !== undefined) segment.description = input.description;
  segment.updated_at = new Date().toISOString();
  const { contact_ids: _ids, ...rest } = segment;
  return rest;
}

export function removeContactsFromDemoSegment(segmentId: string, contactIds: string[]) {
  const segment = segments.find((s) => s.id === segmentId);
  if (!segment) return;
  const remove = new Set(contactIds);
  segment.contact_ids = segment.contact_ids.filter((id) => !remove.has(id));
  segment.contact_count = segment.contact_ids.length;
  segment.updated_at = new Date().toISOString();
}

export function deleteDemoSegment(segmentId: string) {
  segments = segments.filter((s) => s.id !== segmentId);
}

export function getDemoProspectById(prospectId: string) {
  return prospects.find((p) => p.id === prospectId) ?? null;
}

export function getDemoThreadMessages(runContactId: string) {
  return threadMessages[runContactId] ?? [];
}

export function addDemoThreadMessage(
  runContactId: string,
  message: { body: string; message_type: string },
) {
  const list = threadMessages[runContactId] ?? [];
  threadMessages[runContactId] = [
    ...list,
    {
      id: `msg-${Date.now()}`,
      body: message.body,
      message_type: message.message_type,
      created_at: new Date().toISOString(),
    },
  ];
}

let auditLogs: Array<{
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}> = [];

export function getDemoAuditLogs() {
  return auditLogs;
}

export function addDemoAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  auditLogs = [
    {
      id: `audit-${Date.now()}`,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      created_at: new Date().toISOString(),
    },
    ...auditLogs,
  ];
}
