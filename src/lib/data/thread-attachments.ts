import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHAT_ATTACHMENT_BUCKET,
  assertChatAttachmentFiles,
  resolveChatAttachmentMime,
  sanitizeAttachmentFileName,
  type ChatAttachment,
} from "@/lib/chat/attachments";

export async function uploadThreadMessageAttachments(
  supabase: SupabaseClient,
  params: {
    threadId: string;
    messageId: string;
    userId: string;
    files: File[];
  },
) {
  if (params.files.length === 0) return [] as ChatAttachment[];
  assertChatAttachmentFiles(params.files);

  const rows: Array<{
    thread_id: string;
    message_id: string;
    uploaded_by: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
  }> = [];

  for (const file of params.files) {
    const safeName = sanitizeAttachmentFileName(file.name);
    const mime = resolveChatAttachmentMime(file) || "application/octet-stream";
    const storagePath = `${params.threadId}/${params.messageId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(CHAT_ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        contentType: mime,
        upsert: false,
      });
    if (uploadError) throw uploadError;

    rows.push({
      thread_id: params.threadId,
      message_id: params.messageId,
      uploaded_by: params.userId,
      file_name: file.name,
      file_size: file.size,
      mime_type: mime,
      storage_path: storagePath,
    });
  }

  const { data, error } = await supabase
    .from("thread_message_attachments")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []) as ChatAttachment[];
}

export async function loadSignedThreadAttachments(
  supabase: SupabaseClient,
  threadId: string,
) {
  const { data, error } = await supabase
    .from("thread_message_attachments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const signed: ChatAttachment[] = [];
  for (const row of data ?? []) {
    const { data: signedData } = await supabase.storage
      .from(CHAT_ATTACHMENT_BUCKET)
      .createSignedUrl(row.storage_path as string, 60 * 60);
    signed.push({
      ...(row as ChatAttachment),
      url: signedData?.signedUrl ?? null,
    });
  }
  return signed;
}

export function groupAttachmentsByMessage(attachments: ChatAttachment[]) {
  const byMessage = new Map<string, ChatAttachment[]>();
  for (const attachment of attachments) {
    const list = byMessage.get(attachment.message_id) ?? [];
    list.push(attachment);
    byMessage.set(attachment.message_id, list);
  }
  return byMessage;
}
