export const SUPPORT_ATTACHMENT_BUCKET = "support-attachments";
export const SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_MAX_FILES = 5;

export const SUPPORT_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.zip,.doc,.docx,.xls,.xlsx";

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
]);

export type SupportAttachment = {
  id: string;
  ticket_id: string;
  message_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  url?: string | null;
};

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeAttachmentFileName(name: string) {
  return name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180) || "file";
}

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
};

export function resolveAttachmentMime(file: File) {
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? file.type;
}

export function assertSupportAttachmentFiles(files: File[]) {
  if (files.length > SUPPORT_ATTACHMENT_MAX_FILES) {
    throw new Error(`You can attach up to ${SUPPORT_ATTACHMENT_MAX_FILES} files.`);
  }
  for (const file of files) {
    const mime = resolveAttachmentMime(file);
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new Error(
        `"${file.name}" is not an allowed file type. Use images, PDF, CSV, TXT, ZIP, or Office docs.`,
      );
    }
    if (file.size <= 0 || file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      throw new Error(`"${file.name}" must be between 1 byte and 10 MB.`);
    }
  }
}

export function collectFormFiles(form: FormData, key = "files") {
  return form
    .getAll(key)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}
