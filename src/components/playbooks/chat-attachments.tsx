"use client";

import { File, Paperclip, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_FILES,
  formatAttachmentSize,
  isAudioAttachment,
  isImageAttachment,
  isVideoAttachment,
  type ChatAttachment,
} from "@/lib/chat/attachments";
import { cn } from "@/lib/utils";
import type { ThreadMessageAttachment } from "@/types/playbooks";

type AttachmentLike = ThreadMessageAttachment | ChatAttachment;

export function ChatMessageAttachments({
  attachments,
  className,
  isOwn,
}: {
  attachments?: AttachmentLike[];
  className?: string;
  isOwn?: boolean;
}) {
  if (!attachments?.length) return null;

  return (
    <ul className={cn("space-y-2", className)}>
      {attachments.map((file) => (
        <li key={file.id}>
          {isImageAttachment(file.mime_type) && file.url ? (
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={file.file_name}
                className="max-h-48 max-w-full rounded-lg border border-border/60 object-cover"
              />
            </a>
          ) : isVideoAttachment(file.mime_type) && file.url ? (
            <video
              src={file.url}
              controls
              className="max-h-48 max-w-full rounded-lg border border-border/60"
              preload="metadata"
            />
          ) : isAudioAttachment(file.mime_type) && file.url ? (
            <audio src={file.url} controls className="max-w-full" preload="metadata" />
          ) : file.url ? (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                isOwn
                  ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
                  : "border-border bg-background/80 text-foreground hover:bg-muted",
              )}
            >
              <File className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate font-medium">{file.file_name}</span>
              <span className="shrink-0 opacity-70">{formatAttachmentSize(file.file_size)}</span>
            </a>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-2 text-xs",
                isOwn ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              <File className="h-3.5 w-3.5" />
              {file.file_name}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ChatAttachmentPicker({
  files,
  onChange,
  disabled,
  compact,
  listOnly,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  listOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= CHAT_ATTACHMENT_MAX_FILES) break;
      if (next.some((f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
        continue;
      }
      next.push(file);
    }
    onChange(next.slice(0, CHAT_ATTACHMENT_MAX_FILES));
    if (inputRef.current) inputRef.current.value = "";
  };

  const fileList =
    files.length > 0 ? (
      <ul className="space-y-1.5">
        {files.map((file) => (
          <li
            key={`${file.name}-${file.size}-${file.lastModified}`}
            className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs"
          >
            <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
            <span className="shrink-0 text-muted-foreground">{formatAttachmentSize(file.size)}</span>
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
    ) : null;

  if (listOnly) {
    return fileList;
  }

  return (
    <div className={cn("space-y-2", compact && files.length === 0 && "space-y-0")}>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled || files.length >= CHAT_ATTACHMENT_MAX_FILES}
          onClick={() => inputRef.current?.click()}
          aria-label="Attach files"
          title={`Attach files (max ${formatAttachmentSize(CHAT_ATTACHMENT_MAX_BYTES)} each)`}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        {!compact ? (
          <span className="text-xs text-muted-foreground">
            Up to {CHAT_ATTACHMENT_MAX_FILES} files · {formatAttachmentSize(CHAT_ATTACHMENT_MAX_BYTES)} max ·
            images, PDF, audio, video
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={CHAT_ATTACHMENT_ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {!compact ? fileList : null}
    </div>
  );
}
