import { listAuditEvents } from "@/lib/data/audit";
import { filterThreadMessagesForViewer, isSenderOnlyThreadMessage } from "@/lib/chat/thread-visibility";
import { getThreadForRunContact, getThreadMessages } from "@/lib/data/conversation-threads";
import { isFeatureEnabled } from "@/lib/data/feature-flags";
import { getProspectThreadMessages, getProspectThreadContext } from "@/lib/data/playbooks";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { ChatActivityItem, ChatDetail, ChatDirection, ChatInboxItem } from "@/types/chats";
import type { PlaybookProspectStatus, ThreadMessage } from "@/types/playbooks";

const INBOX_STATUSES: PlaybookProspectStatus[] = ["sent", "replied", "booked"];

/** Shown in Chat tab only — not duplicated in Activity. */
const ACTIVITY_EXCLUDED_MESSAGE_TYPES = new Set([
  "platform_inbound",
  "platform_outbound",
  "text",
]);

/** Audit actions mirrored on the shared thread — skip duplicates in Activity. */
const ACTIVITY_EXCLUDED_AUDIT_ACTIONS = new Set([
  "playbook.email_replied",
  "playbook.calendly_booked",
]);

function shouldIncludeMessageInActivity(msg: ThreadMessage) {
  return !ACTIVITY_EXCLUDED_MESSAGE_TYPES.has(msg.message_type);
}

function previewMessage(body: string, max = 80) {
  const trimmed = body.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

type JoinedContact = {
  id: string;
  full_name: string;
  email: string | null;
  title: string | null;
  company_name: string | null;
};

type JoinedRun = {
  id: string;
  playbook: { id: string; name: string } | { id: string; name: string }[];
};

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isChatEligible(
  status: PlaybookProspectStatus,
  messageCount: number,
  hasAuditActivity: boolean,
) {
  if (messageCount > 0 || hasAuditActivity) return true;
  return INBOX_STATUSES.includes(status);
}

function activityFromMessage(msg: ThreadMessage): ChatActivityItem | null {
  if (!shouldIncludeMessageInActivity(msg)) return null;

  if (msg.message_type === "inbound_email") {
    return {
      id: msg.id,
      type: "reply",
      title: "Reply received",
      body: msg.body,
      created_at: msg.created_at,
    };
  }
  if (msg.message_type === "system") {
    if (msg.metadata?.event === "calendly_booked") {
      return {
        id: msg.id,
        type: "booked",
        title: "Meeting booked",
        body: msg.body,
        created_at: msg.created_at,
      };
    }
    return {
      id: msg.id,
      type: "system",
      title: "System",
      body: msg.body,
      created_at: msg.created_at,
    };
  }
  if (msg.message_type === "outbound_chat_email") {
    return {
      id: msg.id,
      type: "message",
      title: "Message emailed",
      body: msg.body,
      created_at: msg.created_at,
    };
  }
  return {
    id: msg.id,
    type: "message",
    title: "Message",
    body: msg.body,
    created_at: msg.created_at,
  };
}

function activityFromAudit(action: string, metadata: Record<string, unknown>, createdAt: string, id: string) {
  if (action === "playbook.email_sent") {
    return {
      id,
      type: "email_sent" as const,
      title: "Email sent",
      body: typeof metadata.subject === "string" ? metadata.subject : null,
      created_at: createdAt,
    };
  }
  if (action === "playbook.email_replied") {
    return {
      id,
      type: "reply" as const,
      title: "Email reply",
      body: typeof metadata.preview === "string" ? metadata.preview : null,
      created_at: createdAt,
    };
  }
  if (action === "playbook.calendly_booked") {
    return {
      id,
      type: "booked" as const,
      title: "Meeting booked",
      created_at: createdAt,
    };
  }
  if (action === "playbook.draft_edited") {
    return {
      id,
      type: "draft" as const,
      title: "Draft updated",
      created_at: createdAt,
    };
  }
  return {
    id,
    type: "audit" as const,
    title: action.replace(/\./g, " "),
    created_at: createdAt,
  };
}

export async function listWorkspaceChats(): Promise<ChatInboxItem[]> {
  const { supabase, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId) return [];

  const { data: prospects, error } = await supabase
    .from("playbook_run_contacts")
    .select(
      `
      id,
      status,
      last_action_at,
      created_at,
      draft_subject,
      contact:contacts(id, full_name, email, title, company_name),
      run:playbook_runs!inner(
        id,
        workspace_id,
        playbook:playbooks!inner(id, name)
      )
    `,
    )
    .in("status", INBOX_STATUSES)
    .order("last_action_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) throw error;
  if (!prospects?.length) return [];

  const contactIds = [
    ...new Set(
      prospects
        .map((row) => unwrapOne(row.contact as JoinedContact | JoinedContact[] | null)?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: threads } = await supabase
    .from("conversation_threads")
    .select("id, contact_id, run_contact_id, last_message_at, recipient_user_id")
    .eq("workspace_id", workspaceId)
    .in("contact_id", contactIds);
  const threadByContact = new Map(
    (threads ?? []).map((thread) => [thread.contact_id as string, thread]),
  );
  const contactByThread = new Map(
    (threads ?? []).map((thread) => [thread.id as string, thread.contact_id as string]),
  );

  const lastMessageByContact = new Map<string, { body: string; created_at: string }>();
  const countByContact = new Map<string, number>();

  const threadIds = (threads ?? []).map((thread) => thread.id as string);
  if (threadIds.length) {
    const { data: allMessages } = await supabase
      .from("thread_messages")
      .select("id, thread_id, body, created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false });

    for (const row of allMessages ?? []) {
      const contactId = contactByThread.get(row.thread_id as string);
      if (!contactId) continue;
      countByContact.set(contactId, (countByContact.get(contactId) ?? 0) + 1);
      if (!lastMessageByContact.has(contactId)) {
        lastMessageByContact.set(contactId, {
          body: row.body as string,
          created_at: row.created_at as string,
        });
      }
    }
  }

  const itemsByContact = new Map<string, ChatInboxItem>();

  for (const row of prospects) {
    const contact = unwrapOne(row.contact as JoinedContact | JoinedContact[] | null);
    const runRaw = unwrapOne(row.run as JoinedRun | JoinedRun[] | null);
    const playbook = runRaw ? unwrapOne(runRaw.playbook) : null;
    if (!contact || !runRaw || !playbook) continue;

    const prospectId = row.id as string;
    const thread = threadByContact.get(contact.id);
    const lastMessage = lastMessageByContact.get(contact.id);
    const messageCount = countByContact.get(contact.id) ?? 0;
    const status = row.status as PlaybookProspectStatus;
    const lastMessageAt =
      lastMessage?.created_at ??
      (thread?.last_message_at as string | null) ??
      (row.last_action_at as string | null) ??
      (row.created_at as string);

    const item: ChatInboxItem = {
      run_contact_id: (thread?.run_contact_id as string | null) ?? prospectId,
      run_id: runRaw.id,
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      contact_id: contact.id,
      contact_name: contact.full_name,
      contact_email: contact.email,
      contact_title: contact.title,
      company_name: contact.company_name,
      status,
      last_message_at: lastMessageAt,
      last_message_preview: lastMessage ? previewMessage(lastMessage.body) : null,
      message_count: messageCount,
      direction: "outreach" as const,
      delivery_mode: thread?.recipient_user_id ? "platform" : messageCount > 0 ? "email" : null,
      recipient_on_platform: Boolean(thread?.recipient_user_id),
    };

    const existing = itemsByContact.get(contact.id);
    if (
      !existing ||
      new Date(item.last_message_at ?? 0).getTime() >
        new Date(existing.last_message_at ?? 0).getTime()
    ) {
      itemsByContact.set(contact.id, item);
    }
  }

  return [...itemsByContact.values()].sort(
    (a, b) =>
      new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime(),
  );
}

export async function listReceivedChats(): Promise<ChatInboxItem[]> {
  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return [];

  const { data: threads, error } = await supabase
    .from("conversation_threads")
    .select(
      "id, run_contact_id, contact_id, last_message_at, created_at, initiator_display_name, initiator_workspace_name, recipient_user_id",
    )
    .eq("recipient_user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) throw error;
  if (!threads?.length) return [];

  const threadIds = threads.map((thread) => thread.id as string);
  const lastMessageByThread = new Map<string, { body: string; created_at: string }>();
  const countByThread = new Map<string, number>();

  const { data: allMessages } = await supabase
    .from("thread_messages")
    .select("id, thread_id, body, created_at, message_type, metadata")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  for (const row of allMessages ?? []) {
    const threadId = row.thread_id as string;
    const msg = row as ThreadMessage;
    if (isSenderOnlyThreadMessage(msg)) continue;

    countByThread.set(threadId, (countByThread.get(threadId) ?? 0) + 1);
    if (!lastMessageByThread.has(threadId)) {
      lastMessageByThread.set(threadId, {
        body: row.body as string,
        created_at: row.created_at as string,
      });
    }
  }

  return threads
    .filter((thread) => (countByThread.get(thread.id as string) ?? 0) > 0)
    .map((thread) => {
      const threadId = thread.id as string;
      const runContactId = thread.run_contact_id as string;
      const lastMessage = lastMessageByThread.get(threadId);
      const messageCount = countByThread.get(threadId) ?? 0;

      return {
        run_contact_id: runContactId,
        run_id: "",
        playbook_id: "",
        playbook_name: "Direct message",
        contact_id: thread.contact_id as string,
        contact_name: (thread.initiator_display_name as string | null) ?? "Someone",
        contact_email: null,
        contact_title: (thread.initiator_workspace_name as string | null) ?? null,
        company_name: null,
        status: "replied" as PlaybookProspectStatus,
        last_message_at:
          lastMessage?.created_at ??
          (thread.last_message_at as string | null) ??
          (thread.created_at as string),
        last_message_preview: lastMessage ? previewMessage(lastMessage.body) : null,
        message_count: messageCount,
        direction: "inbox" as const,
        delivery_mode: "platform" as const,
        recipient_on_platform: true,
      };
    });
}

export async function listChats(direction: ChatDirection | "all" = "all"): Promise<ChatInboxItem[]> {
  if (direction === "outreach") return listWorkspaceChats();
  if (direction === "inbox") return listReceivedChats();

  const [outreach, inbox] = await Promise.all([listWorkspaceChats(), listReceivedChats()]);
  const merged = new Map<string, ChatInboxItem>();
  for (const item of [...outreach, ...inbox]) {
    const key =
      item.direction === "outreach"
        ? `outreach:${item.contact_id}`
        : `${item.direction}:${item.run_contact_id}`;
    merged.set(key, item);
  }
  return [...merged.values()].sort(
    (a, b) =>
      new Date(b.last_message_at ?? 0).getTime() - new Date(a.last_message_at ?? 0).getTime(),
  );
}

export async function getChatDetail(runContactId: string): Promise<ChatDetail | null> {
  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return null;

  const thread = await getThreadForRunContact(supabase, runContactId, user.id);
  let inbox: ChatInboxItem | null = null;
  let contactId: string | null = null;

  if (thread?.recipient_user_id === user.id) {
    const messages = filterThreadMessagesForViewer(
      thread ? await getThreadMessages(supabase, thread.id) : [],
      "recipient",
    );
    const last = messages.at(-1);
    inbox = {
      run_contact_id: (thread.run_contact_id as string | null) ?? runContactId,
      run_id: "",
      playbook_id: "",
      playbook_name: "Direct message",
      contact_id: thread.contact_id as string,
      contact_name: (thread.initiator_display_name as string | null) ?? "Someone",
      contact_email: null,
      contact_title: (thread.initiator_workspace_name as string | null) ?? null,
      company_name: null,
      status: "replied",
      last_message_at:
        last?.created_at ??
        (thread.last_message_at as string | null) ??
        (thread.created_at as string),
      last_message_preview: last ? previewMessage(last.body) : null,
      message_count: messages.length,
      direction: "inbox",
      delivery_mode: "platform",
      recipient_on_platform: true,
    };
    contactId = thread.contact_id as string;
  }

  if (!inbox) {
    const { data: prospect } = await supabase
      .from("playbook_run_contacts")
      .select("contact_id")
      .eq("id", runContactId)
      .maybeSingle();
    contactId = (prospect?.contact_id as string | null) ?? null;
  }

  if (!inbox && contactId && thread) {
    const { data: row } = await supabase
      .from("playbook_run_contacts")
      .select(
        `
        id,
        status,
        last_action_at,
        created_at,
        draft_subject,
        contact:contacts(id, full_name, email, title, company_name),
        run:playbook_runs!inner(
          id,
          playbook:playbooks!inner(id, name)
        )
      `,
      )
      .eq("id", runContactId)
      .maybeSingle();

    if (row) {
      const contact = unwrapOne(row.contact as JoinedContact | JoinedContact[] | null);
      const runRaw = unwrapOne(row.run as JoinedRun | JoinedRun[] | null);
      const playbook = runRaw ? unwrapOne(runRaw.playbook) : null;
      if (contact && runRaw && playbook) {
        const messages = filterThreadMessagesForViewer(
          await getThreadMessages(supabase, thread.id),
          "sender",
        );
        const last = messages.at(-1);
        inbox = {
          run_contact_id: (thread.run_contact_id as string | null) ?? runContactId,
          run_id: runRaw.id,
          playbook_id: playbook.id,
          playbook_name: playbook.name,
          contact_id: contact.id,
          contact_name: contact.full_name,
          contact_email: contact.email,
          contact_title: contact.title,
          company_name: contact.company_name,
          status: row.status as PlaybookProspectStatus,
          last_message_at:
            last?.created_at ??
            (thread.last_message_at as string | null) ??
            (row.last_action_at as string | null) ??
            (row.created_at as string),
          last_message_preview: last ? previewMessage(last.body) : null,
          message_count: messages.length,
          direction: "outreach",
          delivery_mode: thread.recipient_user_id ? "platform" : messages.length > 0 ? "email" : null,
          recipient_on_platform: Boolean(thread.recipient_user_id),
        };
      }
    }
  }

  if (!inbox) {
    const { data: row } = await supabase
      .from("playbook_run_contacts")
      .select(
        `
        id,
        status,
        last_action_at,
        created_at,
        draft_subject,
        contact:contacts(id, full_name, email, title, company_name),
        run:playbook_runs!inner(
          id,
          playbook:playbooks!inner(id, name)
        )
      `,
      )
      .eq("id", runContactId)
      .maybeSingle();

    if (!row) return null;

    const contact = unwrapOne(row.contact as JoinedContact | JoinedContact[] | null);
    const runRaw = unwrapOne(row.run as JoinedRun | JoinedRun[] | null);
    const playbook = runRaw ? unwrapOne(runRaw.playbook) : null;
    if (!contact || !runRaw || !playbook) return null;

    const [messages, auditEvents] = await Promise.all([
      getProspectThreadMessages(runContactId),
      listAuditEvents({ entityType: "playbook_run_contact", entityId: runContactId, limit: 1 }),
    ]);

    const status = row.status as PlaybookProspectStatus;
    if (!isChatEligible(status, messages.length, auditEvents.length > 0)) {
      return null;
    }

    const last = messages.at(-1);
    inbox = {
      run_contact_id: runContactId,
      run_id: runRaw.id,
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      contact_id: contact.id,
      contact_name: contact.full_name,
      contact_email: contact.email,
      contact_title: contact.title,
      company_name: contact.company_name,
      status,
      last_message_at:
        last?.created_at ??
        (row.last_action_at as string | null) ??
        (row.created_at as string),
      last_message_preview: last ? previewMessage(last.body) : null,
      message_count: messages.length,
      direction: "outreach",
      delivery_mode: null,
      recipient_on_platform: false,
    };
  }

  if (!inbox) return null;

  const [messages, auditEvents, chat_enabled, threadContext] = await Promise.all([
    getProspectThreadMessages(runContactId),
    inbox.direction === "outreach"
      ? listAuditEvents({ entityType: "playbook_run_contact", entityId: runContactId, limit: 50 })
      : Promise.resolve([]),
    isFeatureEnabled("platform_chat"),
    getProspectThreadContext(runContactId),
  ]);

  const visibleMessages = filterThreadMessagesForViewer(messages, threadContext.viewer_role);

  const activities: ChatActivityItem[] = [
    ...visibleMessages
      .map(activityFromMessage)
      .filter((item): item is ChatActivityItem => item !== null),
    ...auditEvents
      .filter((event) => !ACTIVITY_EXCLUDED_AUDIT_ACTIONS.has(event.action))
      .map((event) =>
        activityFromAudit(event.action, event.metadata, event.created_at, event.id),
      ),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const last = visibleMessages.at(-1);
  const enrichedInbox: ChatInboxItem = {
    ...inbox,
    last_message_at: last?.created_at ?? inbox.last_message_at,
    last_message_preview: last ? previewMessage(last.body) : inbox.last_message_preview,
    message_count: visibleMessages.length,
  };

  return {
    inbox: enrichedInbox,
    messages: visibleMessages,
    activities,
    chat_enabled,
    delivery_mode: threadContext.delivery_mode,
    recipient_on_platform: threadContext.recipient_on_platform,
    viewer_role: threadContext.viewer_role,
  };
}
