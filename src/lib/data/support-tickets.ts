import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import {
  supportAdminAlertEmail,
  supportTicketReceivedEmail,
} from "@/lib/email/templates";
import { getAppUrl } from "@/lib/supabase/admin";
import {
  SUPPORT_ATTACHMENT_BUCKET,
  assertSupportAttachmentFiles,
  resolveAttachmentMime,
  sanitizeAttachmentFileName,
  type SupportAttachment,
} from "@/lib/support/attachments";

export type TicketStatus = "open" | "in_progress" | "waiting_on_user" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type SupportTicket = {
  id: string;
  user_id: string;
  assigned_admin_id: string | null;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type SupportTicketMessage = {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_staff: boolean;
  created_at: string;
  author?: { id: string; name: string | null; email: string } | null;
  attachments?: SupportAttachment[];
};

async function uploadMessageAttachments(
  supabase: SupabaseClient,
  params: {
    ticketId: string;
    messageId: string;
    userId: string;
    files: File[];
  },
) {
  if (params.files.length === 0) return [] as SupportAttachment[];
  assertSupportAttachmentFiles(params.files);

  const rows: Array<{
    ticket_id: string;
    message_id: string;
    uploaded_by: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
  }> = [];

  for (const file of params.files) {
    const safeName = sanitizeAttachmentFileName(file.name);
    const mime = resolveAttachmentMime(file) || "application/octet-stream";
    const storagePath = `${params.ticketId}/${params.messageId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(SUPPORT_ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        contentType: mime,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    rows.push({
      ticket_id: params.ticketId,
      message_id: params.messageId,
      uploaded_by: params.userId,
      file_name: file.name,
      file_size: file.size,
      mime_type: mime,
      storage_path: storagePath,
    });
  }

  const { data, error } = await supabase
    .from("support_ticket_attachments")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []) as SupportAttachment[];
}

async function loadSignedAttachments(supabase: SupabaseClient, ticketId: string) {
  const { data, error } = await supabase
    .from("support_ticket_attachments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const signed: SupportAttachment[] = [];
  for (const row of data ?? []) {
    const { data: signedData } = await supabase.storage
      .from(SUPPORT_ATTACHMENT_BUCKET)
      .createSignedUrl(row.storage_path as string, 60 * 60);
    signed.push({
      ...(row as SupportAttachment),
      url: signedData?.signedUrl ?? null,
    });
  }
  return signed;
}

function messageBodyOrAttachmentFallback(body: string, files: File[]) {
  const trimmed = body.trim();
  if (trimmed) return trimmed;
  if (files.length > 0) return "See attached file(s).";
  throw new Error("Message body is required");
}

async function notifyUser(params: {
  userId: string;
  title: string;
  message: string;
  link: string;
  email?: { to: string; subject: string; html: string };
}) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    message: params.message,
    type: "support_ticket",
    link: params.link,
    read: false,
  });

  if (params.email) {
    try {
      await sendEmail(params.email);
    } catch (error) {
      console.error("[support] email failed:", error);
    }
  }
}

async function notifyAllAdmins(params: {
  title: string;
  message: string;
  link: string;
  excludeUserId?: string;
}) {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, name")
    .eq("is_admin", true);

  for (const profile of admins ?? []) {
    if (params.excludeUserId && profile.id === params.excludeUserId) continue;
    await admin.from("notifications").insert({
      user_id: profile.id,
      title: params.title,
      message: params.message,
      type: "support_ticket",
      link: params.link,
      read: false,
    });
    if (profile.email) {
      try {
        const alert = await supportAdminAlertEmail({
          title: params.title,
          message: params.message,
          ticketUrl: params.link,
        });
        await sendEmail({
          to: profile.email,
          subject: alert.subject,
          html: alert.html,
        });
      } catch (error) {
        console.error("[support] admin email failed:", error);
      }
    }
  }
}

export async function listMyTickets() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function getMyTicket(ticketId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;

  const { data: messages, error: msgError } = await supabase
    .from("support_ticket_messages")
    .select("id, ticket_id, author_id, body, is_staff, created_at, author:profiles!support_ticket_messages_author_id_fkey(id, name, email)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (msgError) throw msgError;

  const attachments = await loadSignedAttachments(supabase, ticketId);
  const byMessage = new Map<string, SupportAttachment[]>();
  for (const attachment of attachments) {
    const list = byMessage.get(attachment.message_id) ?? [];
    list.push(attachment);
    byMessage.set(attachment.message_id, list);
  }

  const normalizedMessages = (messages ?? []).map((m) => {
    const authorRaw = m.author as
      | { id: string; name: string | null; email: string }
      | { id: string; name: string | null; email: string }[]
      | null;
    const author = Array.isArray(authorRaw) ? authorRaw[0] ?? null : authorRaw;
    return {
      id: m.id as string,
      ticket_id: m.ticket_id as string,
      author_id: m.author_id as string,
      body: m.body as string,
      is_staff: Boolean(m.is_staff),
      created_at: m.created_at as string,
      author,
      attachments: byMessage.get(m.id as string) ?? [],
    } satisfies SupportTicketMessage;
  });

  return { ticket: ticket as SupportTicket, messages: normalizedMessages };
}

export async function createTicket(input: {
  subject: string;
  body: string;
  category?: string;
  priority?: TicketPriority;
  files?: File[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const files = input.files ?? [];
  assertSupportAttachmentFiles(files);
  const messageBody = messageBodyOrAttachmentFallback(input.body, files);

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", user.id)
    .single();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: input.subject.trim(),
      category: input.category ?? "general",
      priority: input.priority ?? "medium",
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;

  const { data: message, error: msgError } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_id: user.id,
      body: messageBody,
      is_staff: false,
    })
    .select("*")
    .single();
  if (msgError) throw msgError;

  await uploadMessageAttachments(supabase, {
    ticketId: ticket.id,
    messageId: message.id,
    userId: user.id,
    files,
  });

  const productUrl = process.env.NEXT_PUBLIC_APP_URL || getAppUrl();
  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ||
    process.env.ADMIN_APP_URL ||
    "http://localhost:1021";

  await notifyAllAdmins({
    title: `New support ticket: ${ticket.subject}`,
    message:
      files.length > 0
        ? `${profile?.name || profile?.email || "A user"} opened a ticket with ${files.length} attachment(s).`
        : `${profile?.name || profile?.email || "A user"} opened a ticket.`,
    link: `${adminUrl}/tickets/${ticket.id}`,
    excludeUserId: user.id,
  });

  // Confirm to user (in-app always; email when address exists)
  {
    const ticketUrl = `${productUrl}/support/${ticket.id}`;
    let email:
      | { to: string; subject: string; html: string }
      | undefined;
    if (profile?.email) {
      const received = await supportTicketReceivedEmail({
        recipientName: profile.name,
        subject: ticket.subject,
        ticketUrl,
      });
      email = {
        to: profile.email,
        subject: received.subject,
        html: received.html,
      };
    }
    await notifyUser({
      userId: user.id,
      title: "Support ticket created",
      message: `We received “${ticket.subject}”. Our team will reply soon.`,
      link: ticketUrl,
      email,
    });
  }

  await markSupportTicketRead(ticket.id);

  return ticket as SupportTicket;
}

export async function replyToMyTicket(
  ticketId: string,
  body: string,
  files: File[] = [],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  assertSupportAttachmentFiles(files);
  const messageBody = messageBodyOrAttachmentFallback(body, files);

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("user_id", user.id)
    .single();
  if (error) throw error;

  const { data: message, error: msgError } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      body: messageBody,
      is_staff: false,
    })
    .select("*")
    .single();
  if (msgError) throw msgError;

  const attachments = await uploadMessageAttachments(supabase, {
    ticketId,
    messageId: message.id,
    userId: user.id,
    files,
  });

  await supabase
    .from("support_tickets")
    .update({
      last_message_at: new Date().toISOString(),
      status: ticket.status === "waiting_on_user" ? "in_progress" : ticket.status,
    })
    .eq("id", ticketId);

  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ||
    process.env.ADMIN_APP_URL ||
    "http://localhost:1021";

  await notifyAllAdmins({
    title: `Ticket reply: ${ticket.subject}`,
    message:
      files.length > 0
        ? `The user added a new message with ${files.length} attachment(s).`
        : "The user added a new message.",
    link: `${adminUrl}/tickets/${ticketId}`,
    excludeUserId: user.id,
  });

  await markSupportTicketRead(ticketId);

  return { ...message, attachments };
}

export async function getSupportUnreadCount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc("support_unread_message_count", {
    p_user_id: user.id,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function markSupportTicketRead(ticketId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.rpc("mark_support_ticket_read", {
    p_ticket_id: ticketId,
    p_user_id: user.id,
  });
  if (error) throw error;
}
