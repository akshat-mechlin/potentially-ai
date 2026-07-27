import { getThreadForRunContact, getThreadMessages } from "@/lib/data/conversation-threads";
import { isDataDemoMode } from "@/lib/app-config";
import {
  getDemoPlaybooks,
  createDemoPlaybook,
  getDemoPlaybook,
  updateDemoPlaybook,
  createDemoRun,
  getDemoRun,
  getDemoRunProspects,
  updateDemoProspect,
} from "@/lib/demo-store/playbooks";
import { getContactsByIds, listContacts } from "@/lib/data/contacts";
import { logAuditEvent } from "@/lib/data/audit";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import { scoreAllContactsForPlaybook } from "@/lib/playbooks/matching";
import { generateOutreach } from "@/lib/ai/openai";
import { buildRecipientFacts } from "@/lib/ai/outreach-prompt";
import type {
  IcpProfile,
  MatchingConfig,
  Playbook,
  PlaybookProspect,
  PlaybookRun,
  SendConfig,
} from "@/types/playbooks";
import type { MatchResult } from "@/lib/playbooks/matching";

const PLAYBOOK_CONTACT_BATCH = 500;
import type { AutomationLevel, OutreachMode, PlaybookStatus } from "@/types/playbooks";

const defaultIcp: IcpProfile = {
  title_include: [],
  keywords_must: [],
  keywords_nice: [],
  min_strength_score: 20,
};

const defaultMatching: MatchingConfig = {
  min_score: 40,
  warm_path_weight: 1,
  dedupe_across_playbooks: true,
  cooldown_days: 30,
};

export async function listPlaybooks(workspaceId?: string | null): Promise<Playbook[]> {
  if (isDataDemoMode()) return getDemoPlaybooks();

  const { supabase, workspaceId: activeId } = await getUserWorkspaceContext(undefined, workspaceId);
  const targetId = workspaceId ?? activeId;
  if (!supabase || !targetId) return [];

  const { data, error } = await supabase
    .from("playbooks")
    .select("*")
    .eq("workspace_id", targetId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Playbook[];
}

export async function getPlaybook(
  id: string,
  actor?: import("@/lib/workflows/actor").WorkflowActor | null,
): Promise<Playbook | null> {
  if (isDataDemoMode()) return getDemoPlaybook(id);

  const supabase = actor?.supabase ?? (await getUserWorkspaceContext()).supabase;
  if (!supabase) return null;

  const { data, error } = await supabase.from("playbooks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Playbook) ?? null;
}

export async function createPlaybook(
  input: {
    name: string;
    description?: string;
    goal?: string;
    workspaceId?: string | null;
  },
  actor?: import("@/lib/workflows/actor").WorkflowActor | null,
) {
  if (isDataDemoMode()) {
    return createDemoPlaybook(input.name, input.description, input.goal);
  }

  const supabase = actor?.supabase ?? null;
  const userId = actor?.userId;
  const workspaceId = actor?.workspaceId;

  if (actor && supabase && userId && workspaceId) {
    const { data, error } = await supabase
      .from("playbooks")
      .insert({
        workspace_id: workspaceId,
        created_by: userId,
        name: input.name,
        description: input.description ?? null,
        goal: input.goal ?? null,
        icp_profile: defaultIcp,
        matching_config: defaultMatching,
        send_config: { include_unsubscribe: true, skip_weekends: true },
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as Playbook;
  }

  const ctx = await getUserWorkspaceContext(undefined, input.workspaceId);
  if (!ctx.supabase || !ctx.user || !ctx.workspaceId) throw new Error("Unauthorized");

  const { data, error } = await ctx.supabase
    .from("playbooks")
    .insert({
      workspace_id: ctx.workspaceId,
      created_by: ctx.user.id,
      name: input.name,
      description: input.description ?? null,
      goal: input.goal ?? null,
      icp_profile: defaultIcp,
      matching_config: defaultMatching,
      send_config: { include_unsubscribe: true, skip_weekends: true },
    })
    .select("*")
    .single();

  if (error) throw error;
  await logAuditEvent("playbook.created", "playbook", data.id, { name: input.name });
  return data as Playbook;
}

export async function updatePlaybook(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    goal: string;
    status: PlaybookStatus;
    automation_level: AutomationLevel;
    outreach_mode: OutreachMode;
    tone: string;
    icp_profile: IcpProfile;
    matching_config: MatchingConfig;
    send_config: SendConfig;
    template_id: string | null;
    calendly_url?: string | null;
  }>,
  actor?: import("@/lib/workflows/actor").WorkflowActor | null,
) {
  if (isDataDemoMode()) return updateDemoPlaybook(id, updates);

  const supabase = actor?.supabase ?? (await getUserWorkspaceContext()).supabase;
  if (!supabase) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("playbooks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Playbook;
}

async function hydrateOwnerNames(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  contacts: Awaited<ReturnType<typeof listContacts>>,
  ownerNames: Map<string, string | null>,
) {
  const ownerIds = [
    ...new Set(
      contacts
        .map((contact) => contact.owner_id)
        .filter(
          (ownerId): ownerId is string =>
            typeof ownerId === "string" && !ownerNames.has(ownerId),
        ),
    ),
  ];

  if (!ownerIds.length) return;

  const { data: owners } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", ownerIds);

  for (const owner of owners ?? []) {
    ownerNames.set(
      owner.id as string,
      (owner.name as string) || (owner.email as string) || null,
    );
  }
}

async function getActivePlaybookContactIds(supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>) {
  const { data: runs } = await supabase
    .from("playbook_runs")
    .select("id")
    .in("status", ["review", "finalized", "executing"]);

  const runIds = (runs ?? []).map((r) => r.id);
  if (!runIds.length) return new Set<string>();

  const { data } = await supabase
    .from("playbook_run_contacts")
    .select("contact_id")
    .in("run_id", runIds)
    .in("status", ["selected", "queued", "pending_approval", "sent"]);

  return new Set((data ?? []).map((row) => row.contact_id as string));
}

async function getDoNotContactIds(supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>) {
  const { data } = await supabase
    .from("contact_preferences")
    .select("contact_id")
    .or("do_not_contact.eq.true,unsubscribed_at.not.is.null");

  return new Set((data ?? []).map((row) => row.contact_id as string));
}

async function getLastContactedMap(supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>) {
  const { data } = await supabase.from("contact_preferences").select("contact_id, last_contacted_at");
  return new Map(
    (data ?? []).map((row) => [row.contact_id as string, row.last_contacted_at as string | null]),
  );
}

async function touchContactLastContacted(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  contactId: string,
) {
  await supabase.from("contact_preferences").upsert({
    contact_id: contactId,
    last_contacted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

async function incrementRunSentCount(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  runId: string,
) {
  const { data: run } = await supabase.from("playbook_runs").select("stats").eq("id", runId).maybeSingle();
  const stats = (run?.stats ?? {}) as Record<string, number>;
  await supabase
    .from("playbook_runs")
    .update({
      status: "executing",
      stats: { ...stats, sent: (stats.sent ?? 0) + 1 },
    })
    .eq("id", runId);

  await maybeCompleteRun(supabase, runId);
}

async function maybeCompleteRun(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  runId: string,
) {
  const { data: open } = await supabase
    .from("playbook_run_contacts")
    .select("id")
    .eq("run_id", runId)
    .in("status", ["matched", "selected", "pending_approval", "queued"]);

  if ((open ?? []).length > 0) return;

  await supabase
    .from("playbook_runs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", runId);
}

export async function deployPlaybookRun(
  playbookId: string,
  options?: {
    segmentId?: string;
    dryRun?: boolean;
    actor?: import("@/lib/workflows/actor").WorkflowActor | null;
  },
) {
  if (isDataDemoMode()) {
    return createDemoRun(playbookId, options?.segmentId, options?.dryRun ?? false);
  }

  const actor = options?.actor;
  const session = actor ? null : await getUserWorkspaceContext();
  const supabase = actor?.supabase ?? session?.supabase;
  const userId = actor?.userId ?? session?.user?.id;
  const workspaceId = actor?.workspaceId ?? session?.workspaceId;
  if (!supabase || !userId || !workspaceId) throw new Error("Unauthorized");

  const playbook = actor
    ? ((
        await supabase.from("playbooks").select("*").eq("id", playbookId).maybeSingle()
      ).data as Playbook | null)
    : await getPlaybook(playbookId);
  if (!playbook) throw new Error("Playbook not found");

  const { data: run, error: runError } = await supabase
    .from("playbook_runs")
    .insert({
      playbook_id: playbookId,
      workspace_id: workspaceId,
      triggered_by: userId,
      segment_id: options?.segmentId ?? null,
      status: "matching",
      icp_snapshot: playbook.icp_profile,
      dry_run: options?.dryRun ?? false,
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (runError) throw runError;

  const activeContactIds = playbook.matching_config.dedupe_across_playbooks !== false
    ? await getActivePlaybookContactIds(supabase)
    : new Set<string>();
  const doNotContactIds = await getDoNotContactIds(supabase);
  const lastContactedAt = await getLastContactedMap(supabase);
  const ownerNames = new Map<string, string | null>();
  const scoringContext = {
    ownerNames,
    activeContactIds,
    doNotContactIds,
    lastContactedAt,
    currentUserId: userId,
  };

  let matched: MatchResult[] = [];
  let skipped: MatchResult[] = [];

  if (options?.segmentId) {
    let ids: string[] = [];
    if (actor) {
      const { data: rows } = await supabase
        .from("segment_contacts")
        .select("contact_id")
        .eq("segment_id", options.segmentId);
      ids = (rows ?? []).map((row: { contact_id: string }) => row.contact_id);
    } else {
      const { getSegmentContactIds } = await import("@/lib/data/segments");
      ids = await getSegmentContactIds(options.segmentId);
    }
    const contacts = await getContactsByIds(ids);
    await hydrateOwnerNames(supabase, contacts, ownerNames);
    const result = scoreAllContactsForPlaybook(
      contacts,
      playbook.icp_profile,
      playbook.matching_config,
      playbook.outreach_mode,
      scoringContext,
    );
    matched = result.matched;
    skipped = result.skipped;
  } else {
    for (let offset = 0; ; offset += PLAYBOOK_CONTACT_BATCH) {
      const batch = await listContacts({
        limit: PLAYBOOK_CONTACT_BATCH,
        offset,
        allGroups: false,
        asAdmin: actor
          ? { supabase, workspaceId }
          : undefined,
      });
      if (!batch.length) break;

      await hydrateOwnerNames(supabase, batch, ownerNames);
      const result = scoreAllContactsForPlaybook(
        batch,
        playbook.icp_profile,
        playbook.matching_config,
        playbook.outreach_mode,
        scoringContext,
      );
      matched.push(...result.matched);
      skipped.push(...result.skipped);

      if (batch.length < PLAYBOOK_CONTACT_BATCH) break;
    }

    matched.sort((a, b) => b.score - a.score);
    skipped.sort((a, b) => b.score - a.score);
  }

  const rows = [
    ...matched.map((m) => ({
      run_id: run.id,
      contact_id: m.contact.id,
      match_score: m.score,
      match_reason: m.reason,
      matched_signals: m.signals,
      warm_path: m.warmPath,
      status: "matched" as const,
    })),
    ...skipped.slice(0, 100).map((m) => ({
      run_id: run.id,
      contact_id: m.contact.id,
      match_score: m.score,
      match_reason: m.reason,
      matched_signals: m.signals,
      warm_path: m.warmPath,
      status: "skipped" as const,
      skip_reason: m.skipReason ?? "filtered",
    })),
  ];

  if (rows.length) {
    await supabase.from("playbook_run_contacts").insert(rows);
  }

  await supabase
    .from("playbook_runs")
    .update({
      status: "review",
      stats: { matched: matched.length, skipped: skipped.length, selected: 0, sent: 0 },
    })
    .eq("id", run.id);

  await logAuditEvent("playbook.run_started", "playbook_run", run.id, {
    playbook_id: playbookId,
    matched: matched.length,
    skipped: skipped.length,
    dry_run: options?.dryRun ?? false,
  });

  return { ...(run as PlaybookRun), matched_count: matched.length, skipped_count: skipped.length };
}

export async function getPlaybookRun(runId: string): Promise<PlaybookRun | null> {
  if (isDataDemoMode()) return getDemoRun(runId);

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase.from("playbook_runs").select("*").eq("id", runId).maybeSingle();
  if (error) throw error;
  return (data as PlaybookRun) ?? null;
}

export async function listRunProspects(runId: string): Promise<PlaybookProspect[]> {
  if (isDataDemoMode()) return getDemoRunProspects(runId);

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("playbook_run_contacts")
    .select("*, contact:contacts(id, full_name, title, email, company_name, location, bio, linkedin_url, tags, strength_score)")
    .eq("run_id", runId)
    .order("match_score", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const contactRaw = row.contact as PlaybookProspect["contact"] | PlaybookProspect["contact"][] | null;
    const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
    return {
      id: row.id,
      run_id: row.run_id,
      contact_id: row.contact_id,
      match_score: row.match_score,
      match_reason: row.match_reason,
      matched_signals: row.matched_signals ?? [],
      warm_path: row.warm_path ?? [],
      status: row.status,
      draft_subject: row.draft_subject,
      draft_body: row.draft_body,
      skip_reason: row.skip_reason,
      last_action_at: row.last_action_at,
      created_at: row.created_at,
      current_sequence_step: (row as { current_sequence_step?: number }).current_sequence_step ?? 0,
      next_action_at: (row as { next_action_at?: string | null }).next_action_at ?? null,
      contact: contact ?? undefined,
    } as PlaybookProspect;
  });
}

export async function finalizeRunProspects(runId: string, prospectIds: string[]) {
  if (isDataDemoMode()) {
    prospectIds.forEach((id) => updateDemoProspect(id, { status: "selected" }));
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  await supabase
    .from("playbook_run_contacts")
    .update({ status: "skipped", skip_reason: "not_selected" })
    .eq("run_id", runId)
    .eq("status", "matched");

  if (prospectIds.length) {
    await supabase
      .from("playbook_run_contacts")
      .update({ status: "selected", last_action_at: new Date().toISOString() })
      .eq("run_id", runId)
      .in("id", prospectIds);
  }

  await supabase
    .from("playbook_runs")
    .update({ status: "finalized", stats: { selected: prospectIds.length } })
    .eq("id", runId);

  await logAuditEvent("playbook.run_finalized", "playbook_run", runId, {
    selected: prospectIds.length,
  });
}

export async function includeSkippedProspects(runId: string, prospectIds: string[]) {
  if (!prospectIds.length) return { included: 0 };

  if (isDataDemoMode()) {
    prospectIds.forEach((id) =>
      updateDemoProspect(id, {
        status: "selected",
        skip_reason: undefined,
        match_reason: "Manually included from skipped list",
        last_action_at: new Date().toISOString(),
      }),
    );
    return { included: prospectIds.length };
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  const { data: rows, error: fetchError } = await supabase
    .from("playbook_run_contacts")
    .select("id")
    .eq("run_id", runId)
    .eq("status", "skipped")
    .in("id", prospectIds);

  if (fetchError) throw fetchError;

  const validIds = (rows ?? []).map((row) => row.id as string);
  if (!validIds.length) {
    throw new Error("No skipped prospects selected");
  }

  const { error: updateError } = await supabase
    .from("playbook_run_contacts")
    .update({
      status: "selected",
      skip_reason: null,
      match_reason: "Manually included from skipped list",
      last_action_at: new Date().toISOString(),
    })
    .eq("run_id", runId)
    .in("id", validIds);

  if (updateError) throw updateError;

  const { data: run } = await supabase
    .from("playbook_runs")
    .select("stats, status")
    .eq("id", runId)
    .maybeSingle();

  const stats = (run?.stats as Record<string, number> | null) ?? {};
  const nextStats = {
    ...stats,
    selected: (stats.selected ?? 0) + validIds.length,
    skipped: Math.max(0, (stats.skipped ?? 0) - validIds.length),
  };

  await supabase
    .from("playbook_runs")
    .update({
      status: run?.status === "review" ? "finalized" : run?.status,
      stats: nextStats,
    })
    .eq("id", runId);

  await logAuditEvent("playbook.skipped_included", "playbook_run", runId, {
    included: validIds.length,
    prospect_ids: validIds,
  });

  return { included: validIds.length };
}

export async function getRunProspect(prospectId: string): Promise<PlaybookProspect | null> {
  if (isDataDemoMode()) {
    const { getDemoProspectById } = await import("@/lib/demo-store/playbooks");
    return getDemoProspectById(prospectId);
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("playbook_run_contacts")
    .select("*, contact:contacts(id, full_name, title, email, company_name, strength_score)")
    .eq("id", prospectId)
    .maybeSingle();

  if (error || !data) return null;

  const contactRaw = data.contact as PlaybookProspect["contact"] | PlaybookProspect["contact"][] | null;
  const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;

  return {
    id: data.id,
    run_id: data.run_id,
    contact_id: data.contact_id,
    match_score: data.match_score,
    match_reason: data.match_reason,
    matched_signals: data.matched_signals ?? [],
    warm_path: data.warm_path ?? [],
    status: data.status,
    draft_subject: data.draft_subject,
    draft_body: data.draft_body,
    skip_reason: data.skip_reason,
    last_action_at: data.last_action_at,
    created_at: data.created_at,
    contact: contact ?? undefined,
  };
}

export async function updateProspectDraft(
  prospectId: string,
  updates: { draft_subject?: string; draft_body?: string },
) {
  if (isDataDemoMode()) {
    updateDemoProspect(prospectId, updates);
    await logAuditEvent("playbook.draft_edited", "playbook_run_contact", prospectId, updates);
    return;
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) throw new Error("Unauthorized");

  await supabase
    .from("playbook_run_contacts")
    .update({ ...updates, last_action_at: new Date().toISOString() })
    .eq("id", prospectId);

  await logAuditEvent("playbook.draft_edited", "playbook_run_contact", prospectId, updates);
}

export async function postThreadMessage(runContactId: string, body: string, files: File[] = []) {
  const { chatMessageBodyOrAttachmentFallback } = await import("@/lib/chat/attachments");
  const messageBody = chatMessageBodyOrAttachmentFallback(body, files);

  if (isDataDemoMode()) {
    const { addDemoThreadMessage } = await import("@/lib/demo-store/playbooks");
    addDemoThreadMessage(runContactId, {
      body: messageBody,
      message_type: "text",
      attachments: files.map((file, index) => ({
        id: `demo-attach-${Date.now()}-${index}`,
        thread_id: "demo-thread",
        message_id: `msg-${Date.now()}`,
        uploaded_by: "demo-user",
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        storage_path: "",
        created_at: new Date().toISOString(),
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    });
    return;
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const { uploadThreadMessageAttachments } = await import("@/lib/data/thread-attachments");
  const existingThread = await getThreadForRunContact(supabase, runContactId, user.id);

  if (existingThread?.recipient_user_id === user.id) {
    const { data: message, error } = await supabase
      .from("thread_messages")
      .insert({
        thread_id: existingThread.id,
        sender_user_id: user.id,
        body: messageBody,
        message_type: "platform_inbound",
        metadata: {},
      })
      .select("id")
      .single();
    if (error) throw error;

    await uploadThreadMessageAttachments(supabase, {
      threadId: existingThread.id,
      messageId: message.id,
      userId: user.id,
      files,
    });

    await supabase
      .from("conversation_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", existingThread.id);
    return;
  }

  const { data: prospect } = await supabase
    .from("playbook_run_contacts")
    .select(
      "contact_id, contact:contacts(id, full_name, email)",
    )
    .eq("id", runContactId)
    .maybeSingle();

  if (!prospect) throw new Error("Prospect not found");

  const contactRaw = prospect.contact as
    | { id: string; full_name: string; email: string | null }
    | { id: string; full_name: string; email: string | null }[]
    | null;
  const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
  if (!contact) throw new Error("Prospect not found");

  const { resolveChatDelivery, emailChatToContact } = await import("@/lib/data/chat-delivery");
  const delivery = await resolveChatDelivery(contact.email);

  const [{ data: profile }, { data: workspace }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle(),
    supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
  ]);

  const senderName =
    (profile?.name as string | null) ??
    (profile?.email as string | null)?.split("@")[0] ??
    "Someone";

  const thread = await ensureThread(
    supabase,
    workspaceId,
    contact.id,
    runContactId,
    {
      recipientUserId: delivery.recipientUserId,
      initiatorUserId: user.id,
      initiatorDisplayName: senderName,
      initiatorWorkspaceName: (workspace?.name as string | null) ?? null,
    },
  );

  if (delivery.recipientUserId && thread.recipient_user_id !== delivery.recipientUserId) {
    await supabase
      .from("conversation_threads")
      .update({ recipient_user_id: delivery.recipientUserId })
      .eq("id", thread.id);
  }

  const messageType =
    delivery.mode === "platform" ? "platform_outbound" : "outbound_chat_email";

  const { data: message, error: messageError } = await supabase
    .from("thread_messages")
    .insert({
      thread_id: thread.id,
      sender_user_id: user.id,
      body: messageBody,
      message_type: messageType,
      metadata: { delivery_mode: delivery.mode },
    })
    .select("id")
    .single();
  if (messageError) throw messageError;

  await uploadThreadMessageAttachments(supabase, {
    threadId: thread.id,
    messageId: message.id,
    userId: user.id,
    files,
  });

  await supabase
    .from("conversation_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", thread.id);

  if (delivery.mode === "email" && contact.email) {
    await emailChatToContact({
      to: contact.email,
      recipientName: contact.full_name,
      senderName,
      senderEmail: (profile?.email as string | null) ?? user.email ?? null,
      senderWorkspaceName: (workspace?.name as string | null) ?? null,
      workspaceId,
      body: messageBody,
      runContactId,
    });
  }
}

export async function generateProspectDrafts(runId: string, playbook: Playbook) {
  const run = await getPlaybookRun(runId);
  const prospects = (await listRunProspects(runId)).filter((p) => p.status === "selected");
  const nextStatus = "pending_approval" as const;

  for (const prospect of prospects) {
    if (!prospect.contact) continue;

    let subject: string;
    let body: string;

    if (playbook.template_id) {
      const { getEmailTemplate, applyTemplate } = await import("@/lib/data/email-templates");
      const template = await getEmailTemplate(playbook.template_id);
      if (template) {
        const applied = applyTemplate(template, {
          name: prospect.contact.full_name,
          company: prospect.contact.company_name,
          title: prospect.contact.title,
        });
        subject = applied.subject;
        body = applied.body;
      } else {
        const outreach = await generateOutreach({
          contactName: prospect.contact.full_name,
          contactTitle: prospect.contact.title,
          companyName: prospect.contact.company_name,
          type: "cold_email",
          tone: playbook.tone,
          goal: playbook.goal ?? "Schedule a brief intro call",
          context: prospect.match_reason ?? undefined,
          recipientFacts: buildRecipientFacts(prospect.contact),
        });
        subject = outreach.subject ?? `Quick intro: ${prospect.contact.full_name}`;
        body = outreach.body;
      }
    } else {
      const outreach = await generateOutreach({
        contactName: prospect.contact.full_name,
        contactTitle: prospect.contact.title,
        companyName: prospect.contact.company_name,
        type: "cold_email",
        tone: playbook.tone,
        goal: playbook.goal ?? "Schedule a brief intro call",
        context: prospect.match_reason ?? undefined,
        recipientFacts: buildRecipientFacts(prospect.contact),
      });
      subject = outreach.subject ?? `Quick intro: ${prospect.contact.full_name}`;
      body = outreach.body;
    }

    if (isDataDemoMode()) {
      updateDemoProspect(prospect.id, {
        status: nextStatus,
        draft_subject: subject,
        draft_body: body,
      });
      continue;
    }

    const { supabase } = await getUserWorkspaceContext();
    if (!supabase) continue;

    await supabase
      .from("playbook_run_contacts")
      .update({
        status: nextStatus,
        draft_subject: subject,
        draft_body: body,
        last_action_at: new Date().toISOString(),
      })
      .eq("id", prospect.id);
  }

  if (playbook.automation_level === "autonomous" && !run?.dry_run) {
    const pending = (await listRunProspects(runId))
      .filter((p) => p.status === "pending_approval")
      .map((p) => p.id);
    if (pending.length) {
      await bulkApproveAndSend(runId, pending);
    }
  } else if (playbook.automation_level === "supervised" && !run?.dry_run) {
    await logAuditEvent("playbook.supervised_queue", "playbook_run", runId, {
      count: prospects.length,
      note: "Drafts ready for supervised review",
    });
  }
}

export async function approveAndSendProspect(
  prospectId: string,
  runId: string,
  actor?: import("@/lib/workflows/actor").WorkflowActor | null,
) {
  const session = actor ? null : await getUserWorkspaceContext();
  const supabase = actor?.supabase ?? session?.supabase;
  const userId = actor?.userId ?? session?.user?.id;
  const workspaceId = actor?.workspaceId ?? session?.workspaceId;
  const profile = session?.profile ?? null;
  if (!supabase || !userId || !workspaceId) throw new Error("Unauthorized");

  // Load prospect with admin/session client (cron has no cookie session).
  let prospect: PlaybookProspect | undefined;
  if (actor) {
    const { data: row, error } = await supabase
      .from("playbook_run_contacts")
      .select(
        "*, contact:contacts(id, full_name, title, email, company_name, location, bio, linkedin_url, tags, strength_score)",
      )
      .eq("id", prospectId)
      .eq("run_id", runId)
      .maybeSingle();
    if (error) throw error;
    if (row) {
      const contactRaw = row.contact as
        | PlaybookProspect["contact"]
        | PlaybookProspect["contact"][]
        | null;
      const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
      prospect = {
        id: row.id,
        run_id: row.run_id,
        contact_id: row.contact_id,
        match_score: row.match_score,
        match_reason: row.match_reason,
        matched_signals: row.matched_signals ?? [],
        warm_path: row.warm_path ?? [],
        status: row.status,
        draft_subject: row.draft_subject,
        draft_body: row.draft_body,
        skip_reason: row.skip_reason,
        last_action_at: row.last_action_at,
        created_at: row.created_at,
        current_sequence_step: row.current_sequence_step ?? 0,
        next_action_at: row.next_action_at ?? null,
        contact: contact ?? undefined,
      } as PlaybookProspect;
    }
  } else {
    const prospects = await listRunProspects(runId);
    prospect = prospects.find((p) => p.id === prospectId);
  }

  if (!prospect?.contact?.email) throw new Error("Contact has no email");

  const { data: runRow } = await supabase
    .from("playbook_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  const run = (runRow as PlaybookRun | null) ?? null;

  let playbook: Playbook | null = null;
  if (run?.playbook_id) {
    const { data: pb } = await supabase
      .from("playbooks")
      .select("*")
      .eq("id", run.playbook_id)
      .maybeSingle();
    playbook = (pb as Playbook | null) ?? null;
  }

  if (isDataDemoMode()) {
    updateDemoProspect(prospectId, { status: "sent" });
    await logAuditEvent("playbook.email_sent", "playbook_run_contact", prospectId, {
      demo: true,
    });
    if (playbook) {
      const { scheduleFollowUpForProspect } = await import("@/lib/data/playbook-sequences");
      await scheduleFollowUpForProspect(
        prospectId,
        playbook,
        prospect.current_sequence_step ?? 0,
        actor,
      );
    }
    return { sent: true, demo: true };
  }

  if (run?.dry_run) {
    await logAuditEvent("playbook.dry_run_send", "playbook_run_contact", prospectId, {
      contact: prospect.contact.full_name,
    });
    await supabase
      .from("playbook_run_contacts")
      .update({ status: "sent", last_action_at: new Date().toISOString() })
      .eq("id", prospectId);
    await incrementRunSentCount(supabase, runId);
    return { sent: true, dry_run: true };
  }

  if (playbook) {
    const { canSendNow } = await import("@/lib/playbooks/send-utils");
    const gate = canSendNow(playbook.send_config);
    if (!gate.ok) throw new Error(gate.reason ?? "Sending not allowed now");

    if (playbook.send_config.daily_cap) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("outbound_messages")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("sent_at", startOfDay.toISOString());
      if ((count ?? 0) >= playbook.send_config.daily_cap) {
        throw new Error("Daily send cap reached");
      }
    }
  }

  const { sendEmail } = await import("@/lib/email/send");
  const { getWorkspaceEmailSettingsForSend } = await import("@/lib/data/workspace-email-settings");
  const { resolveOutboundFromAddress } = await import("@/lib/email/from-address");

  const emailSettings = await getWorkspaceEmailSettingsForSend(supabase, workspaceId);
  if (
    emailSettings.mode === "custom" &&
    emailSettings.senderDomainStatus !== "verified"
  ) {
    throw new Error(
      "Your send domain is not verified yet. Open Settings → Email to finish DNS setup, or switch to Potentially email.",
    );
  }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("email, name")
    .eq("id", userId)
    .maybeSingle();

  const { from, replyTo } = resolveOutboundFromAddress(
    emailSettings,
    senderProfile?.email ?? (profile as { email?: string | null } | null)?.email ?? undefined,
    { runContactId: prospectId },
  );

  const subject = prospect.draft_subject ?? "Hello from Potentially";
  const body = prospect.draft_body ?? "";
  const html = body.replace(/\n/g, "<br>");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:1020";
  const unsubscribeUrl = `${appUrl}/unsubscribe?contact=${prospect.contact_id}`;

  const calendlyBase =
    playbook?.calendly_url ??
    (typeof playbook?.settings?.calendly_url === "string"
      ? playbook.settings.calendly_url
      : null) ??
    process.env.NEXT_PUBLIC_CALENDLY_URL ??
    null;
  let calendlyBlock = "";
  if (calendlyBase) {
    try {
      const calendlyUrl = new URL(calendlyBase);
      calendlyUrl.searchParams.set("utm_source", "potentially");
      calendlyUrl.searchParams.set("utm_content", prospectId);
      if (prospect.contact.email) calendlyUrl.searchParams.set("email", prospect.contact.email);
      if (prospect.contact.full_name) calendlyUrl.searchParams.set("name", prospect.contact.full_name);
      calendlyBlock = `<br><br><p><a href="${calendlyUrl.toString()}">Book a time that works for you</a></p>`;
    } catch {
      calendlyBlock = `<br><br><p><a href="${calendlyBase}">Book a time that works for you</a></p>`;
    }
  }

  const { buildAudienceCta } = await import("@/lib/email/audience");
  const { renderOutreachMarketingFooter } = await import("@/lib/email/platform-templates");
  const audience = await buildAudienceCta({
    email: prospect.contact.email,
    deepLinkPath: "/",
    onPlatformLabel: "Open Potentially",
    offPlatformLabel: "Join Potentially",
  });
  const marketingFooter = await renderOutreachMarketingFooter({
    inviteOrOpenUrl: audience.ctaUrl,
    onPlatform: audience.onPlatform,
    unsubscribeUrl,
  });

  const emailResult = await sendEmail({
    to: prospect.contact.email,
    subject,
    html: `${html}${calendlyBlock}${marketingFooter}`,
    headers: {
      "X-Potentially-Run-Contact": prospectId,
    },
    from,
    replyTo,
  });

  const { data: outbound } = await supabase
    .from("outbound_messages")
    .insert({
      run_id: runId,
      run_contact_id: prospectId,
      contact_id: prospect.contact_id,
      workspace_id: workspaceId,
      channel: "email",
      subject,
      body,
      status: "sent",
      provider_message_id: emailResult?.id ?? null,
      sent_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  void outbound;

  await supabase
    .from("playbook_run_contacts")
    .update({ status: "sent", last_action_at: new Date().toISOString() })
    .eq("id", prospectId);

  await touchContactLastContacted(supabase, prospect.contact_id);
  await incrementRunSentCount(supabase, runId);

  await supabase.from("thread_messages").insert({
    thread_id: (
      await ensureThread(supabase, workspaceId, prospect.contact_id, prospectId)
    ).id,
    sender_user_id: userId,
    body: `Email sent: ${subject}`,
    message_type: "system",
    metadata: { channel: "email", audience: "sender", provider_message_id: emailResult?.id },
  });

  await logAuditEvent("playbook.email_sent", "playbook_run_contact", prospectId, {
    to: prospect.contact.email,
    provider_message_id: emailResult?.id,
  });

  if (playbook) {
    const { scheduleFollowUpForProspect } = await import("@/lib/data/playbook-sequences");
    const currentStep = prospect.current_sequence_step ?? 0;
    await scheduleFollowUpForProspect(prospectId, playbook, currentStep, actor);
  }

  return { sent: true, provider_message_id: emailResult?.id };
}

export async function bulkApproveAndSend(runId: string, prospectIds: string[]) {
  const results: Array<{ prospectId: string; ok: boolean; error?: string }> = [];

  for (const prospectId of prospectIds) {
    try {
      await approveAndSendProspect(prospectId, runId);
      results.push({ prospectId, ok: true });
    } catch (error) {
      results.push({
        prospectId,
        ok: false,
        error: error instanceof Error ? error.message : "Failed",
      });
    }
  }

  await logAuditEvent("playbook.bulk_send", "playbook_run", runId, {
    total: prospectIds.length,
    sent: results.filter((r) => r.ok).length,
  });

  return results;
}

async function ensureThread(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  workspaceId: string,
  contactId: string,
  runContactId: string,
  options?: {
    recipientUserId?: string | null;
    initiatorUserId?: string;
    initiatorDisplayName?: string | null;
    initiatorWorkspaceName?: string | null;
  },
) {
  const { data: existing } = await supabase
    .from("conversation_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (existing.run_contact_id !== runContactId) {
      patch.run_contact_id = runContactId;
    }
    if (options?.recipientUserId && !existing.recipient_user_id) {
      patch.recipient_user_id = options.recipientUserId;
    }
    if (options?.initiatorUserId && !existing.initiator_user_id) {
      patch.initiator_user_id = options.initiatorUserId;
      patch.initiator_display_name = options.initiatorDisplayName ?? null;
      patch.initiator_workspace_name = options.initiatorWorkspaceName ?? null;
    }
    if (Object.keys(patch).length) {
      const { data: updated } = await supabase
        .from("conversation_threads")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();
      return updated ?? existing;
    }
    return existing;
  }

  const { data, error } = await supabase
    .from("conversation_threads")
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      run_contact_id: runContactId,
      recipient_user_id: options?.recipientUserId ?? null,
      initiator_user_id: options?.initiatorUserId ?? null,
      initiator_display_name: options?.initiatorDisplayName ?? null,
      initiator_workspace_name: options?.initiatorWorkspaceName ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listPlaybookRuns(playbookId: string) {
  if (isDataDemoMode()) {
    const { getDemoRunsForPlaybook } = await import("@/lib/demo-store/playbooks");
    return getDemoRunsForPlaybook(playbookId);
  }

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("playbook_runs")
    .select("*")
    .eq("playbook_id", playbookId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const runs = (data ?? []) as PlaybookRun[];
  if (!runs.length) return runs;

  const runIds = runs.map((r) => r.id);
  const { data: pendingRows } = await supabase
    .from("playbook_run_contacts")
    .select("run_id")
    .in("run_id", runIds)
    .eq("status", "pending_approval");

  const counts = new Map<string, number>();
  for (const row of pendingRows ?? []) {
    const runId = row.run_id as string;
    counts.set(runId, (counts.get(runId) ?? 0) + 1);
  }

  return runs.map((run) => ({
    ...run,
    pending_approval_count: counts.get(run.id) ?? 0,
  }));
}

export async function listPendingApprovalsForPlaybook(
  playbookId: string,
): Promise<import("@/types/playbooks").PendingPlaybookApproval[]> {
  if (isDataDemoMode()) return [];

  const { supabase } = await getUserWorkspaceContext();
  if (!supabase) return [];

  const { data: runs, error: runsError } = await supabase
    .from("playbook_runs")
    .select("id")
    .eq("playbook_id", playbookId);
  if (runsError) throw runsError;
  const runIds = (runs ?? []).map((r) => r.id as string);
  if (!runIds.length) return [];

  const { data, error } = await supabase
    .from("playbook_run_contacts")
    .select(
      "id, run_id, contact_id, draft_subject, draft_body, current_sequence_step, last_action_at, created_at, contact:contacts(full_name, email, company_name)",
    )
    .in("run_id", runIds)
    .eq("status", "pending_approval")
    .order("last_action_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const contactRaw = row.contact as
      | { full_name: string | null; email: string | null; company_name: string | null }
      | { full_name: string | null; email: string | null; company_name: string | null }[]
      | null;
    const contact = Array.isArray(contactRaw) ? contactRaw[0] : contactRaw;
    return {
      id: row.id as string,
      run_id: row.run_id as string,
      contact_id: row.contact_id as string,
      draft_subject: (row.draft_subject as string | null) ?? null,
      draft_body: (row.draft_body as string | null) ?? null,
      current_sequence_step: (row.current_sequence_step as number | null) ?? 0,
      last_action_at: (row.last_action_at as string | null) ?? null,
      created_at: row.created_at as string,
      contact_name: contact?.full_name ?? null,
      contact_email: contact?.email ?? null,
      contact_company: contact?.company_name ?? null,
    };
  });
}

export async function getProspectThreadMessages(runContactId: string) {
  if (isDataDemoMode()) {
    const { getDemoThreadMessages } = await import("@/lib/demo-store/playbooks");
    return getDemoThreadMessages(runContactId);
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return [];

  const thread = await getThreadForRunContact(supabase, runContactId, user.id);
  if (!thread) return [];

  return getThreadMessages(supabase, thread.id);
}

export async function getProspectThreadContext(runContactId: string) {
  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) {
    return {
      delivery_mode: null,
      recipient_on_platform: false,
      viewer_role: "sender" as const,
    };
  }

  const thread = await getThreadForRunContact(supabase, runContactId, user.id);

  if (thread?.recipient_user_id === user.id) {
    return {
      delivery_mode: "platform" as const,
      recipient_on_platform: true,
      viewer_role: "recipient" as const,
    };
  }

  if (thread?.recipient_user_id) {
    return {
      delivery_mode: "platform" as const,
      recipient_on_platform: true,
      viewer_role: "sender" as const,
    };
  }

  let contactEmail: string | null = null;
  if (thread?.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("email")
      .eq("id", thread.contact_id)
      .maybeSingle();
    contactEmail = (contact?.email as string | null) ?? null;
  } else {
    const { data: prospect } = await supabase
      .from("playbook_run_contacts")
      .select("contact:contacts(email)")
      .eq("id", runContactId)
      .maybeSingle();
    const contactRaw = prospect?.contact as
      | { email: string | null }
      | { email: string | null }[]
      | null;
    contactEmail = Array.isArray(contactRaw) ? contactRaw[0]?.email ?? null : contactRaw?.email ?? null;
  }

  const { resolveChatDelivery } = await import("@/lib/data/chat-delivery");
  const delivery = await resolveChatDelivery(contactEmail);

  return {
    delivery_mode: delivery.mode,
    recipient_on_platform: delivery.recipientOnPlatform,
    viewer_role: "sender" as const,
  };
}

async function resolveImportedContactIds(
  supabase: NonNullable<Awaited<ReturnType<typeof getUserWorkspaceContext>>["supabase"]>,
  workspaceId: string,
  externalIds: string[],
  emails: string[],
) {
  const ids = new Set<string>();
  if (externalIds.length) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("external_id", externalIds);
    for (const row of data ?? []) ids.add(row.id as string);
  }
  const normalizedEmails = [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (normalizedEmails.length) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .eq("workspace_id", workspaceId)
      .in("email", normalizedEmails);
    for (const row of data ?? []) ids.add(row.id as string);
  }
  return [...ids];
}

export async function importApolloProspectsIntoRun(
  runId: string,
  people: import("@/lib/integrations/apollo/types").ApolloPerson[],
) {
  if (isDataDemoMode()) {
    return { saved: people.length, records: [] as string[] };
  }

  const run = await getPlaybookRun(runId);
  if (!run) throw new Error("Run not found");

  const { saveApolloProspectsForPlaybookRun } = await import("@/lib/data/platform-prospects");
  const result = await saveApolloProspectsForPlaybookRun(people);
  if (!result.saved) throw new Error("No importable Apollo prospects selected.");

  await logAuditEvent("playbook.apollo_save", "playbook_run", runId, {
    saved: result.saved,
    record_ids: result.prospects.map((prospect) => prospect.id),
  });

  return {
    saved: result.saved,
    records: result.prospects,
    matched: 0,
    skipped: 0,
    contact_ids: [] as string[],
  };
}
