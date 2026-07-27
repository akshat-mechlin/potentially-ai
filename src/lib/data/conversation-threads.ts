type SupabaseClient = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/data/workspace").getUserWorkspaceContext>>["supabase"]
>;

export type ConversationThread = {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  run_contact_id: string | null;
  recipient_user_id: string | null;
  initiator_user_id: string | null;
  initiator_display_name: string | null;
  initiator_workspace_name: string | null;
  last_message_at: string | null;
  created_at: string;
};

export async function getThreadForContact(
  supabase: SupabaseClient,
  workspaceId: string,
  contactId: string,
) {
  const { data } = await supabase
    .from("conversation_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .maybeSingle();

  return (data as ConversationThread | null) ?? null;
}

/**
 * Resolve a thread for a playbook run contact id.
 * Tries conversation_threads first so recipients (no access to sender prospects) still load chat.
 */
export async function getThreadForRunContact(
  supabase: SupabaseClient,
  runContactId: string,
  userId?: string,
) {
  const { data: byRunContact } = await supabase
    .from("conversation_threads")
    .select("*")
    .eq("run_contact_id", runContactId)
    .maybeSingle();

  if (byRunContact) {
    return byRunContact as ConversationThread;
  }

  if (userId) {
    const { data: asRecipient } = await supabase
      .from("conversation_threads")
      .select("*")
      .eq("recipient_user_id", userId)
      .eq("run_contact_id", runContactId)
      .maybeSingle();

    if (asRecipient) {
      return asRecipient as ConversationThread;
    }
  }

  const { data: prospect } = await supabase
    .from("playbook_run_contacts")
    .select("contact_id, run:playbook_runs(workspace_id)")
    .eq("id", runContactId)
    .maybeSingle();

  if (!prospect?.contact_id) return null;

  const runRaw = prospect.run as { workspace_id: string } | { workspace_id: string }[] | null;
  const workspaceId = Array.isArray(runRaw) ? runRaw[0]?.workspace_id : runRaw?.workspace_id;
  if (!workspaceId) return null;

  return getThreadForContact(supabase, workspaceId, prospect.contact_id as string);
}

export async function getThreadMessages(
  supabase: SupabaseClient,
  threadId: string,
) {
  const { data, error } = await supabase
    .from("thread_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const messages = data ?? [];
  if (messages.length === 0) return messages;

  const { loadSignedThreadAttachments, groupAttachmentsByMessage } = await import(
    "@/lib/data/thread-attachments"
  );
  const attachments = await loadSignedThreadAttachments(supabase, threadId);
  const byMessage = groupAttachmentsByMessage(attachments);

  return messages.map((message) => ({
    ...message,
    attachments: byMessage.get(message.id as string) ?? [],
  }));
}

export async function refreshThreadLastMessageAt(
  supabase: SupabaseClient,
  threadId: string,
) {
  const { data: latest } = await supabase
    .from("thread_messages")
    .select("created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("conversation_threads")
    .update({ last_message_at: (latest?.created_at as string | null) ?? null })
    .eq("id", threadId);
}

export async function deleteThreadMessage(
  supabase: SupabaseClient,
  threadId: string,
  messageId: string,
) {
  const { data: message, error: loadError } = await supabase
    .from("thread_messages")
    .select("id, thread_id, message_type")
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!message) throw new Error("Message not found");
  if (message.message_type === "system") {
    throw new Error("System messages cannot be deleted");
  }

  const { error } = await supabase.from("thread_messages").delete().eq("id", messageId);
  if (error) throw error;

  await refreshThreadLastMessageAt(supabase, threadId);
}

type ThreadWriter = Pick<SupabaseClient, "from">;

async function resolveProspectThread(
  supabase: ThreadWriter,
  runContactId: string,
) {
  const { data: prospect } = await supabase
    .from("playbook_run_contacts")
    .select("contact_id, run:playbook_runs(workspace_id)")
    .eq("id", runContactId)
    .maybeSingle();

  if (!prospect?.contact_id) return null;

  const runRaw = prospect.run as { workspace_id: string } | { workspace_id: string }[] | null;
  const workspaceId = Array.isArray(runRaw) ? runRaw[0]?.workspace_id : runRaw?.workspace_id;
  if (!workspaceId) return null;

  let thread = await getThreadForContact(
    supabase as SupabaseClient,
    workspaceId,
    prospect.contact_id as string,
  );

  if (!thread) {
    const { data: created, error } = await supabase
      .from("conversation_threads")
      .insert({
        workspace_id: workspaceId,
        contact_id: prospect.contact_id,
        run_contact_id: runContactId,
      })
      .select("*")
      .single();

    if (error) throw error;
    thread = created as ConversationThread;
  }

  return { thread, workspaceId, contactId: prospect.contact_id as string };
}

/** Log cross-party events on the shared thread (email replies, Calendly, etc.). */
export async function appendRunContactThreadMessage(
  supabase: ThreadWriter,
  runContactId: string,
  input: {
    body: string;
    message_type: "system" | "inbound_email";
    metadata?: Record<string, unknown>;
  },
) {
  const resolved = await resolveProspectThread(supabase, runContactId);
  if (!resolved) return null;

  const now = new Date().toISOString();
  const { data: message, error } = await supabase
    .from("thread_messages")
    .insert({
      thread_id: resolved.thread.id,
      sender_user_id: null,
      body: input.body,
      message_type: input.message_type,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) throw error;

  await supabase
    .from("conversation_threads")
    .update({
      last_message_at: now,
      run_contact_id: runContactId,
    })
    .eq("id", resolved.thread.id);

  return message?.id ?? null;
}

export async function insertProspectAuditLog(
  supabase: ThreadWriter,
  runContactId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  const resolved = await resolveProspectThread(supabase, runContactId);
  if (!resolved) return;

  await supabase.from("audit_logs").insert({
    workspace_id: resolved.workspaceId,
    action,
    entity_type: "playbook_run_contact",
    entity_id: runContactId,
    metadata,
  });
}
