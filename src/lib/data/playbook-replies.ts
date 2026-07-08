import { isDataDemoMode } from "@/lib/app-config";
import { logAuditEvent } from "@/lib/data/audit";
import {
  appendRunContactThreadMessage,
  insertProspectAuditLog,
} from "@/lib/data/conversation-threads";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateDemoProspect, addDemoThreadMessage } from "@/lib/demo-store/playbooks";

const MATCHABLE_STATUSES = ["sent", "replied", "queued", "booked", "pending_approval"] as const;

async function findRunContactByEmail(supabase: ReturnType<typeof createAdminClient>, from: string) {
  const normalized = from.trim().toLowerCase();
  if (!normalized) return null;

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id")
    .ilike("email", normalized);

  const contactIds = (contacts ?? []).map((row) => row.id as string);
  if (contactIds.length) {
    const { data: byContact } = await supabase
      .from("playbook_run_contacts")
      .select("id")
      .in("contact_id", contactIds)
      .in("status", [...MATCHABLE_STATUSES])
      .order("last_action_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (byContact?.id) return byContact.id as string;
  }

  const { data: rows } = await supabase
    .from("playbook_run_contacts")
    .select("id, status, last_action_at, contact:contacts!inner(email)")
    .in("status", [...MATCHABLE_STATUSES])
    .order("last_action_at", { ascending: false })
    .limit(50);

  const match = (rows ?? []).find((row) => {
    const contact = row.contact as { email: string | null } | { email: string | null }[];
    const email = Array.isArray(contact) ? contact[0]?.email : contact?.email;
    return email?.trim().toLowerCase() === normalized;
  });

  return match?.id ?? null;
}

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
    runContactId = await findRunContactByEmail(supabase, input.from);
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
  const replyBody = input.body?.trim() || input.subject?.trim() || "Email reply received";

  await supabase
    .from("playbook_run_contacts")
    .update({
      status: "replied",
      last_action_at: new Date().toISOString(),
      next_action_at: null,
    })
    .eq("id", runContactId);

  await supabase
    .from("outbound_messages")
    .update({ replied_at: new Date().toISOString() })
    .eq("run_contact_id", runContactId)
    .is("replied_at", null);

  await appendRunContactThreadMessage(supabase, runContactId, {
    body: replyBody,
    message_type: "inbound_email",
    metadata: {
      event: "email_reply",
      from: input.from,
      subject: input.subject,
      provider_message_id: input.providerMessageId,
    },
  });

  if (workspaceId) {
    await insertProspectAuditLog(supabase, runContactId, "playbook.email_replied", {
      from: input.from,
      subject: input.subject,
      preview: replyBody.slice(0, 280),
    });
  }

  return { matched: true, runContactId };
}

export async function markProspectBooked(runContactId: string) {
  if (isDataDemoMode()) {
    updateDemoProspect(runContactId, {
      status: "booked",
      next_action_at: null,
    } as Parameters<typeof updateDemoProspect>[1]);
    return;
  }

  const bookedFields = {
    status: "booked" as const,
    calendly_booked_at: new Date().toISOString(),
    last_action_at: new Date().toISOString(),
    next_action_at: null,
  };

  try {
    const supabase = createAdminClient();
    await supabase.from("playbook_run_contacts").update(bookedFields).eq("id", runContactId);
    await appendRunContactThreadMessage(supabase, runContactId, {
      body: "Meeting scheduled via Calendly",
      message_type: "system",
      metadata: { event: "calendly_booked", audience: "all" },
    });
    await insertProspectAuditLog(supabase, runContactId, "playbook.calendly_booked", {});
  } catch {
    const { supabase } = await import("@/lib/data/workspace").then((m) => m.getUserWorkspaceContext());
    if (!supabase) throw new Error("Unauthorized");
    await supabase.from("playbook_run_contacts").update(bookedFields).eq("id", runContactId);
    await appendRunContactThreadMessage(supabase, runContactId, {
      body: "Meeting scheduled via Calendly",
      message_type: "system",
      metadata: { event: "calendly_booked", audience: "all" },
    });
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
