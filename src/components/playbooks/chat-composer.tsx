"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatAttachmentPicker } from "@/components/playbooks/chat-attachments";
import { ChatEmojiPicker } from "@/components/playbooks/chat-emoji-picker";
import { cn } from "@/lib/utils";

type ChatComposerProps = {
  message: string;
  onMessageChange: (value: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onSend: () => void;
  sending?: boolean;
  variant?: "desktop" | "mobile";
  placeholder?: string;
};

export function ChatComposer({
  message,
  onMessageChange,
  files,
  onFilesChange,
  onSend,
  sending,
  variant = "desktop",
  placeholder = "Write a message...",
}: ChatComposerProps) {
  const canSend = Boolean(message.trim() || files.length);
  const isMobile = variant === "mobile";

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend && !sending) onSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    onMessageChange(message + emoji);
  };

  const attachmentList =
    files.length > 0 ? (
      <ChatAttachmentPicker files={files} onChange={onFilesChange} disabled={sending} listOnly />
    ) : null;

  const toolbar = (
    <>
      <ChatEmojiPicker onSelect={insertEmoji} disabled={sending} />
      <ChatAttachmentPicker
        files={files}
        onChange={onFilesChange}
        disabled={sending}
        compact
      />
    </>
  );

  if (isMobile) {
    return (
      <div className="mobile-chat-composer flex-col items-stretch gap-2">
        {attachmentList}
        <div className="flex w-full items-center gap-1">
          {toolbar}
          <input
            className="mobile-chat-input min-w-0 flex-1"
            placeholder={placeholder}
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <Button
            size="icon"
            className="mobile-chat-send shrink-0"
            onClick={onSend}
            disabled={sending || !canSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t p-3">
      {attachmentList}
      <div className="flex items-center gap-1">
        {toolbar}
        <Input
          className="min-w-0 flex-1"
          placeholder={placeholder}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <Button size="icon" className={cn("shrink-0")} onClick={onSend} disabled={sending || !canSend}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
