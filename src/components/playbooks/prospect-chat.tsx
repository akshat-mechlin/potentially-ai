"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MessageSquare, Trash2 } from "lucide-react";
import { ChatComposer } from "@/components/playbooks/chat-composer";
import { ChatMessageAttachments } from "@/components/playbooks/chat-attachments";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  isOwnChatMessage,
  isOwnOutgoingThreadMessage,
  isSenderOnlyThreadMessage,
  shouldNotifySenderOfThreadEvent,
} from "@/lib/chat/thread-visibility";
import {
  assertChatAttachmentFiles,
  chatMessageBodyOrAttachmentFallback,
  resolveChatAttachmentMime,
} from "@/lib/chat/attachments";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { cn, formatMessageTimestamp } from "@/lib/utils";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import type { ChatDeliveryMode } from "@/types/chats";
import type { ThreadMessage, ThreadMessageAttachment } from "@/types/playbooks";
import { toast } from "sonner";

interface ProspectChatProps {
  runId: string;
  prospectId: string;
  enabled?: boolean;
}

type ThreadResponse = {
  messages: ThreadMessage[];
  thread_id: string | null;
  chat_enabled: boolean;
  delivery_mode: ChatDeliveryMode | null;
  recipient_on_platform: boolean;
  viewer_role: "sender" | "recipient";
};

function threadQueryKey(runId: string, prospectId: string) {
  return ["prospect-thread", runId, prospectId] as const;
}

function mergeThreadResponse(current: ThreadResponse | undefined, payload: ThreadResponse) {
  if (!current) return payload;

  const serverIds = new Set(payload.messages.map((message) => message.id));
  const extras = current.messages.filter(
    (message) => !serverIds.has(message.id) && !message.id.startsWith("pending-"),
  );
  if (!extras.length) return payload;

  const messages = [...payload.messages, ...extras].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return { ...payload, messages };
}

function appendThreadMessage(current: ThreadResponse, row: ThreadMessage) {
  if (current.messages.some((message) => message.id === row.id)) {
    return current;
  }

  const messages = [...current.messages];

  if (isOwnOutgoingThreadMessage(row, current.viewer_role)) {
    const pendingIdx = messages.findIndex(
      (message) => message.id.startsWith("pending-") && message.body === row.body,
    );
    if (pendingIdx >= 0) {
      messages[pendingIdx] = row;
      return { ...current, messages };
    }
  }

  messages.push(row);
  return { ...current, messages };
}

function pendingAttachmentsFromFiles(
  files: File[],
  threadId: string,
  messageId: string,
): ThreadMessageAttachment[] {
  return files.map((file, index) => ({
    id: `pending-attach-${messageId}-${index}`,
    thread_id: threadId,
    message_id: messageId,
    uploaded_by: "pending",
    file_name: file.name,
    file_size: file.size,
    mime_type: resolveChatAttachmentMime(file),
    storage_path: "",
    created_at: new Date().toISOString(),
    url:
      file.type.startsWith("image/") ||
      file.type.startsWith("video/") ||
      file.type.startsWith("audio/")
        ? URL.createObjectURL(file)
        : null,
  }));
}

function MessageBubble({
  msg,
  viewerRole,
  onDelete,
  deleting,
}: {
  msg: ThreadMessage;
  viewerRole: "sender" | "recipient";
  onDelete?: (messageId: string) => void;
  deleting?: boolean;
}) {
  const isSystem = msg.message_type === "system";
  const isOwn = isOwnChatMessage(msg, viewerRole);
  const canDelete = Boolean(onDelete) && isOwn && !isSystem && !msg.id.startsWith("pending-");
  const hasAttachments = Boolean(msg.attachments?.length);
  const showBody = Boolean(msg.body.trim()) && !(hasAttachments && msg.body === "See attached file(s).");

  return (
    <div className={cn("group space-y-1", isOwn && !isSystem && "flex flex-col items-end")}>
      {msg.message_type === "outbound_chat_email" && viewerRole === "sender" && (
        <p className="text-center text-[10px] text-muted-foreground">Sent via email invite</p>
      )}
      {msg.message_type === "platform_outbound" && viewerRole === "sender" && (
        <p className="text-center text-[10px] text-muted-foreground">Delivered in-app</p>
      )}
      {msg.message_type === "inbound_email" && viewerRole === "sender" && (
        <p className="text-center text-[10px] text-muted-foreground">Reply via email</p>
      )}
      <div
        className={cn("flex max-w-[85%] items-end gap-1", isOwn && !isSystem && "flex-row-reverse")}
      >
        <div
          className={cn(
            "w-fit max-w-full space-y-2 rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
            !isOwn && !isSystem && "bg-muted",
            isSystem && "mx-auto bg-muted/50 text-center text-xs text-muted-foreground",
            isOwn && !isSystem && "bg-primary text-primary-foreground",
          )}
        >
          {showBody ? <p>{msg.body}</p> : null}
          <ChatMessageAttachments attachments={msg.attachments} isOwn={isOwn && !isSystem} />
        </div>
        {canDelete && (
          <button
            type="button"
            className="mb-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            aria-label="Delete message"
            disabled={deleting}
            onClick={() => onDelete?.(msg.id)}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
      {!isSystem ? (
        <time
          dateTime={msg.created_at}
          className={cn(
            "px-1 text-[10px] text-muted-foreground",
            isOwn && "text-right",
          )}
          title={new Date(msg.created_at).toLocaleString()}
        >
          {formatMessageTimestamp(msg.created_at)}
        </time>
      ) : null}
    </div>
  );
}

function DeliveryBanner({ data }: { data: ThreadResponse }) {
  if (data.viewer_role === "recipient") {
    return (
      <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <MessageSquare className="mr-1.5 inline h-3.5 w-3.5" />
        Messages here are delivered in-app between Potentially accounts.
      </div>
    );
  }

  if (data.recipient_on_platform) {
    return (
      <div className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
        <MessageSquare className="mr-1.5 inline h-3.5 w-3.5" />
        This person is on Potentially. Chat messages go to their inbox.
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
      <Mail className="mr-1.5 inline h-3.5 w-3.5" />
      Not on Potentially yet. Messages are emailed with an invite to join and reply here.
    </div>
  );
}

export function ProspectChat({ runId, prospectId, enabled = true }: ProspectChatProps) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingMessageIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { isMobileApp } = useMobileApp();
  const { confirm, confirmDialog } = useConfirmDialog();

  const { data, isLoading } = useQuery<ThreadResponse>({
    queryKey: threadQueryKey(runId, prospectId),
    queryFn: async () => {
      const res = await fetch(`/api/chats/${prospectId}/thread`);
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to load thread");
      }
      return res.json();
    },
    enabled: enabled && !!prospectId,
    staleTime: 15_000,
  });

  const threadId = data?.thread_id ?? null;

  useEffect(() => {
    if (isDemoMode() || !threadId || data?.chat_enabled === false) return;

    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();
    const queryKey = threadQueryKey(runId, prospectId);

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return;

      const next = supabase
        .channel(`prospect-thread:${threadId}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "thread_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new as ThreadMessage;
            queryClient.setQueryData<ThreadResponse>(queryKey, (current) => {
              if (!current) {
                void queryClient.invalidateQueries({ queryKey });
                return current;
              }
              if (current.viewer_role === "recipient" && isSenderOnlyThreadMessage(row)) {
                return current;
              }
              if (current.viewer_role === "sender" && shouldNotifySenderOfThreadEvent(row)) {
                toast.info(
                  row.metadata?.event === "calendly_booked"
                    ? "Meeting booked via Calendly"
                    : "Reply received via email",
                );
              }

              const nextState = appendThreadMessage(current, row);
              if (
                pendingMessageIdRef.current &&
                nextState.messages.some((message) => message.id === row.id)
              ) {
                pendingMessageIdRef.current = null;
              }
              void queryClient.invalidateQueries({ queryKey });
              return nextState;
            });
            void queryClient.invalidateQueries({ queryKey: ["chats"] });
            void queryClient.invalidateQueries({ queryKey: ["chat-detail", prospectId] });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "thread_messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.old as { id?: string };
            if (!row.id) return;
            queryClient.setQueryData<ThreadResponse>(queryKey, (current) => {
              if (!current) {
                void queryClient.invalidateQueries({ queryKey });
                return current;
              }
              return {
                ...current,
                messages: current.messages.filter((message) => message.id !== row.id),
              };
            });
            void queryClient.invalidateQueries({ queryKey: ["chats"] });
            void queryClient.invalidateQueries({ queryKey: ["chat-detail", prospectId] });
          },
        )
        .subscribe();

      if (cancelled) {
        void supabase.removeChannel(next);
        return;
      }
      channel = next;
    });

    return () => {
      cancelled = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [threadId, data?.chat_enabled, queryClient, runId, prospectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  if (!enabled || data?.chat_enabled === false) {
    return (
      <p className="text-sm text-muted-foreground">
        Platform chat is disabled. Enable the <code className="text-xs">platform_chat</code> feature
        flag in Admin.
      </p>
    );
  }

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed && files.length === 0) return;

    try {
      assertChatAttachmentFiles(files);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid attachment");
      return;
    }

    let messageBody: string;
    try {
      messageBody = chatMessageBodyOrAttachmentFallback(trimmed, files);
    } catch {
      return;
    }

    const viewerRole = data?.viewer_role ?? "sender";
    const optimisticId = `pending-${Date.now()}`;
    const previous = queryClient.getQueryData<ThreadResponse>(threadQueryKey(runId, prospectId));
    const outgoingFiles = [...files];

    pendingMessageIdRef.current = optimisticId;

    queryClient.setQueryData<ThreadResponse>(threadQueryKey(runId, prospectId), (current) => {
      if (!current) return current;
      const optimisticMessage: ThreadMessage = {
        id: optimisticId,
        thread_id: current.thread_id ?? "",
        sender_user_id: null,
        body: messageBody,
        message_type: viewerRole === "recipient" ? "platform_inbound" : "platform_outbound",
        metadata: {},
        created_at: new Date().toISOString(),
        attachments: pendingAttachmentsFromFiles(
          outgoingFiles,
          current.thread_id ?? "",
          optimisticId,
        ),
      };
      return {
        ...current,
        messages: [...current.messages, optimisticMessage],
      };
    });

    setMessage("");
    setFiles([]);
    setSending(true);
    try {
      let res: Response;
      if (outgoingFiles.length > 0) {
        const form = new FormData();
        form.set("body", trimmed);
        for (const file of outgoingFiles) {
          form.append("files", file);
        }
        res = await fetch(`/api/chats/${prospectId}/thread`, {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch(`/api/chats/${prospectId}/thread`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        });
      }

      const payload = (await res.json()) as ThreadResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to send");
      pendingMessageIdRef.current = null;
      queryClient.setQueryData<ThreadResponse>(threadQueryKey(runId, prospectId), (current) =>
        mergeThreadResponse(current, payload),
      );
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-detail", prospectId] });
      if (payload.viewer_role === "sender" && !payload.recipient_on_platform) {
        toast.success("Message emailed with invite link");
      } else if (payload.viewer_role === "sender" && payload.recipient_on_platform) {
        toast.success("Message delivered in-app");
      }
    } catch (error) {
      pendingMessageIdRef.current = null;
      if (previous) {
        queryClient.setQueryData(threadQueryKey(runId, prospectId), previous);
      }
      setMessage(trimmed);
      setFiles(outgoingFiles);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    const confirmed = await confirm({
      title: "Delete this message?",
      description: "This permanently removes the message from the conversation.",
      confirmLabel: "Delete message",
    });
    if (!confirmed) return;

    const previous = queryClient.getQueryData<ThreadResponse>(threadQueryKey(runId, prospectId));
    setDeletingId(messageId);
    queryClient.setQueryData<ThreadResponse>(threadQueryKey(runId, prospectId), (current) => {
      if (!current) return current;
      return {
        ...current,
        messages: current.messages.filter((item) => item.id !== messageId),
      };
    });

    try {
      const res = await fetch(`/api/chats/${prospectId}/thread/${messageId}`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to delete message");
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-detail", prospectId] });
      toast.success("Message deleted");
    } catch (error) {
      if (previous) {
        queryClient.setQueryData(threadQueryKey(runId, prospectId), previous);
      }
      toast.error(error instanceof Error ? error.message : "Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  };

  const viewerRole = data?.viewer_role ?? "sender";

  const messages = (
    <div className="flex flex-col gap-3">
      {data && <DeliveryBanner data={data} />}
      {data?.messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          viewerRole={viewerRole}
          onDelete={(id) => void deleteMessage(id)}
          deleting={deletingId === msg.id}
        />
      ))}
      {!data?.messages.length && (
        <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
      )}
      <div ref={bottomRef} />
    </div>
  );

  if (isMobileApp) {
    return (
      <div className="mobile-chat">
        <div className="mobile-chat-messages">
          {isLoading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            messages
          )}
        </div>
        <ChatComposer
          variant="mobile"
          message={message}
          onMessageChange={setMessage}
          files={files}
          onFilesChange={setFiles}
          onSend={() => void send()}
          sending={sending}
          placeholder="Message"
        />
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="flex h-[420px] flex-col rounded-lg border">
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          messages
        )}
      </ScrollArea>
      <ChatComposer
        message={message}
        onMessageChange={setMessage}
        files={files}
        onFilesChange={setFiles}
        onSend={() => void send()}
        sending={sending}
      />
      {confirmDialog}
    </div>
  );
}
