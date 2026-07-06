import { isDataDemoMode } from "@/lib/app-config";
import { logAuditEvent } from "@/lib/data/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateDemoProspect, addDemoThreadMessage } from "@/lib/demo-store/playbooks";

export async function handleInboundReply(input: {
  runContactId?: string | null;
  inReplyTo?: string | null;
  from: string;
  subject: string;
  body: string;
  providerMessageId?: string | null;
}) {
  if (isDataDemoMode()) {
    if (input.runContactId) {
      updateDemoProspect(input.runContactId, { status: "replied" });
      addDemoThreadMessage(input.runContactId, {
        body: input.body || input.subject,
        message_type: "inbound_email",
      });
    }
    return { matched: Boolean(input.runContactId) };
  }

  const supabase = createAdminClient();

  let runContactId = input.runContactId ?? null;

  if (!runContactId && input.inReplyTo) {
    const { data: outbound } = await supabase
      .from("outbound_messages")
      .select("run_contact_id, provider_message_id")
      .or(`provider_message_id.eq.${input.inReplyTo},provider_message_id.ilike.%${input.inReplyTo}%`)
      .maybeSingle();
    runContactId = outbound?.run_contact_id ?? null;
  }

  if (!runContactId) {
    const { data: byEmail } = await supabase
      .from("playbook_run_contacts")
      .select("id, contact:contacts!inner(email)")
      .eq("status", "sent")
      .order("last_action_at", { ascending: false })
      .limit(20);

    const match = (byEmail ?? []).find((row) => {
      const contact = row.contact as { email: string | null } | { email: string | null }[];
      const email = Array.isArray(contact) ? contact[0]?.email : contact?.email;
      return email?.toLowerCase() === input.from.toLowerCase();
    });
    runContactId = match?.id ?? null;
  }

  if (!runContactId) return { matched: false };

  const { data: prospect } = await supabase
    .from("playbook_run_contacts")
    .select("*, run:playbook_runs(workspace_id)")
    .eq("id", runContactId)
    .maybeSingle();

  if (!prospect) return { matched: false };

  const run = prospect.run as { workspace_id: string } | { workspace_id: string }[];
  const workspaceId = Array.isArray(run) ? run[0]?.workspace_id : run?.workspace_id;

  await supabase
    .from("playbook_run_contacts")
    .update({ status: "replied", last_action_at: new Date().toISOString() })
    .eq("id", runContactId);

  await supabase
    .from("outbound_messages")
    .update({ replied_at: new Date().toISOString() })
    .eq("run_contact_id", runContactId)
    .is("replied_at", null);

  const { data: thread } = await supabase
    .from("conversation_threads")
    .select("id")
    .eq("run_contact_id", runContactId)
    .maybeSingle();

  if (thread) {
    await supabase.from("thread_messages").insert({
      thread_id: thread.id,
      body: input.body || input.subject,
      message_type: "inbound_email",
      metadata: { from: input.from, provider_message_id: input.providerMessageId },
    });
    await supabase
      .from("conversation_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", thread.id);
  }

  if (workspaceId) {
    await supabase.from("audit_logs").insert({
      workspace_id: workspaceId,
      action: "playbook.email_replied",
      entity_type: "playbook_run_contact",
      entity_id: runContactId,
      metadata: { from: input.from, subject: input.subject },
    });
  }

  return { matched: true, runContactId };
}

export async function markProspectBooked(runContactId: string) {
  if (isDataDemoMode()) {
    updateDemoProspect(runContactId, { status: "booked" });
    return;
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const supabase = createAdminClient();
    await supabase
      .from("playbook_run_contacts")
      .update({
        status: "booked",
        calendly_booked_at: new Date().toISOString(),
        last_action_at: new Date().toISOString(),
      })
      .eq("id", runContactId);
    await logAuditEvent("playbook.calendly_booked", "playbook_run_contact", runContactId, {});
  } catch {
    const { supabase } = await import("@/lib/data/workspace").then((m) => m.getUserWorkspaceContext());
    if (!supabase) throw new Error("Unauthorized");
    await supabase
      .from("playbook_run_contacts")
      .update({
        status: "booked",
        calendly_booked_at: new Date().toISOString(),
        last_action_at: new Date().toISOString(),
      })
      .eq("id", runContactId);
    await logAuditEvent("playbook.calendly_booked", "playbook_run_contact", runContactId, {});
  }
}

export async function unsubscribeContact(contactId: string) {
  if (isDataDemoMode()) return;

  const supabase = createAdminClient();
  await supabase.from("contact_preferences").upsert({
    contact_id: contactId,
    unsubscribed_at: new Date().toISOString(),
    do_not_contact: true,
    updated_at: new Date().toISOString(),
  });
}
