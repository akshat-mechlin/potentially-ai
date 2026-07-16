"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isOwnChatMessage, isSenderOnlyThreadMessage, shouldNotifySenderOfThreadEvent } from "@/lib/chat/thread-visibility";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import type { ChatDeliveryMode } from "@/types/chats";
import type { ThreadMessage } from "@/types/playbooks";
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
      <div className={cn("flex max-w-[85%] items-end gap-1", isOwn && !isSystem && "flex-row-reverse")}>
        <div
          className={cn(
            "w-fit rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
            !isOwn && !isSystem && "bg-muted",
            isSystem && "mx-auto bg-muted/50 text-center text-xs text-muted-foreground",
            isOwn && !isSystem && "bg-primary text-primary-foreground",
          )}
        >
          {msg.body}
        </div>
        {canDelete && (
          <button
            type="button"
            className="mb-1 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            aria-label="Delete message"
            disabled={deleting}
            onClick={() => onDelete?.(msg.id)}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
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
  const instanceId = useId();
  const [message, setMessage] = useState("");
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

    const supabase = createClient();
    const channelName = `prospect-thread:${threadId}:${instanceId}`;

    const channel = supabase
      .channel(channelName)
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
          queryClient.setQueryData<ThreadResponse>(threadQueryKey(runId, prospectId), (current) => {
            if (!current) return current;
            if (current.messages.some((message) => message.id === row.id)) {
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
            return {
              ...current,
              messages: [...current.messages, row],
            };
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
          queryClient.setQueryData<ThreadResponse>(threadQueryKey(runId, prospectId), (current) => {
            if (!current) return current;
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [threadId, data?.chat_enabled, queryClient, runId, prospectId, instanceId]);

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
    const body = message.trim();
    if (!body) return;

    const viewerRole = data?.viewer_role ?? "sender";
    const optimisticId = `pending-${Date.now()}`;
    const previous = queryClient.getQueryData<ThreadResponse>(threadQueryKey(runId, prospectId));

    queryClient.setQueryData<ThreadResponse>(threadQueryKey(runId, prospectId), (current) => {
      if (!current) return current;
      const optimisticMessage: ThreadMessage = {
        id: optimisticId,
        thread_id: current.thread_id ?? "",
        sender_user_id: null,
        body,
        message_type:
          viewerRole === "recipient" ? "platform_inbound" : "platform_outbound",
        metadata: {},
        created_at: new Date().toISOString(),
      };
      return {
        ...current,
        messages: [...current.messages, optimisticMessage],
      };
    });

    setMessage("");
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${prospectId}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = (await res.json()) as ThreadResponse & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to send");
      queryClient.setQueryData(threadQueryKey(runId, prospectId), payload);
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-detail", prospectId] });
      if (payload.viewer_role === "sender" && !payload.recipient_on_platform) {
        toast.success("Message emailed with invite link");
      } else if (payload.viewer_role === "sender" && payload.recipient_on_platform) {
        toast.success("Message delivered in-app");
      }
    } catch (error) {
      if (previous) {
        queryClient.setQueryData(threadQueryKey(runId, prospectId), previous);
      }
      setMessage(body);
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
        <div className="mobile-chat-composer">
          <input
            className="mobile-chat-input"
            placeholder="Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button
            size="icon"
            className="mobile-chat-send"
            onClick={send}
            disabled={sending || !message.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
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
      <div className="flex gap-2 border-t p-3">
        <Input
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" onClick={send} disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {confirmDialog}
    </div>
  );
}
