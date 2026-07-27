export const CHAT_ATTACHMENT_BUCKET = "chat-attachments";
export const CHAT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
export const CHAT_ATTACHMENT_MAX_FILES = 5;

export const CHAT_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/x-wav",
]);

export type ChatAttachment = {
  id: string;
  thread_id: string;
  message_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  url?: string | null;
};

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
};

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeAttachmentFileName(name: string) {
  return name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "file";
}

export function resolveChatAttachmentMime(file: File) {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? file.type;
}

export function assertChatAttachmentFiles(files: File[]) {
  if (files.length > CHAT_ATTACHMENT_MAX_FILES) {
    throw new Error(`You can attach up to ${CHAT_ATTACHMENT_MAX_FILES} files.`);
  }
  for (const file of files) {
    const mime = resolveChatAttachmentMime(file);
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new Error(
        `"${file.name}" is not an allowed file type. Use images, PDF, audio, video, CSV, TXT, ZIP, or Office docs.`,
      );
    }
    if (file.size <= 0 || file.size > CHAT_ATTACHMENT_MAX_BYTES) {
      throw new Error(
        `"${file.name}" must be between 1 byte and ${formatAttachmentSize(CHAT_ATTACHMENT_MAX_BYTES)}.`,
      );
    }
  }
}

export function collectFormFiles(form: FormData, key = "files") {
  return form
    .getAll(key)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export function chatMessageBodyOrAttachmentFallback(body: string, files: File[]) {
  const trimmed = body.trim();
  if (trimmed) return trimmed;
  if (files.length > 0) return "See attached file(s).";
  throw new Error("Write a message or attach a file.");
}

export function isImageAttachment(mime: string) {
  return mime.startsWith("image/");
}

export function isVideoAttachment(mime: string) {
  return mime.startsWith("video/");
}

export function isAudioAttachment(mime: string) {
  return mime.startsWith("audio/");
}
