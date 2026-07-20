"use client";

import { useRef } from "react";
import { File, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_ATTACHMENT_MAX_FILES,
  formatAttachmentSize,
  type SupportAttachment,
} from "@/lib/support/attachments";
import { cn } from "@/lib/utils";

export function TicketAttachmentList({
  attachments,
  className,
}: {
  attachments?: SupportAttachment[];
  className?: string;
}) {
  if (!attachments?.length) return null;

  return (
    <ul className={cn("space-y-1.5", className)}>
      {attachments.map((file) => (
        <li key={file.id}>
          {file.url ? (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
            >
              <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{file.file_name}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatAttachmentSize(file.file_size)}
              </span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <File className="h-3.5 w-3.5" />
              {file.file_name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TicketAttachmentPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= SUPPORT_ATTACHMENT_MAX_FILES) break;
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    onChange(next.slice(0, SUPPORT_ATTACHMENT_MAX_FILES));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || files.length >= SUPPORT_ATTACHMENT_MAX_FILES}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Attach files
        </Button>
        <span className="text-xs text-muted-foreground">
          Up to {SUPPORT_ATTACHMENT_MAX_FILES} files · 10 MB each · images, PDF, CSV, ZIP, Office
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORT_ATTACHMENT_ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs"
            >
              <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatAttachmentSize(file.size)}
              </span>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                disabled={disabled}
                onClick={() => onChange(files.filter((f) => f !== file))}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
