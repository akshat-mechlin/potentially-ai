"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { ThreadMessage } from "@/types/playbooks";
import { toast } from "sonner";

interface ProspectChatProps {
  runId: string;
  prospectId: string;
  enabled?: boolean;
}

function MessageBubble({ msg }: { msg: ThreadMessage }) {
  const isInbound = msg.message_type === "inbound_email";
  const isSystem = msg.message_type === "system";

  return (
    <div
      className={cn(
        "w-fit max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
        isInbound && "mr-auto bg-muted",
        isSystem && "mx-auto bg-muted/50 text-center text-xs text-muted-foreground",
        !isInbound && !isSystem && "ml-auto bg-primary text-primary-foreground",
      )}
    >
      {msg.body}
    </div>
  );
}

export function ProspectChat({ runId, prospectId, enabled = true }: ProspectChatProps) {
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [threadIdOverride, setThreadIdOverride] = useState<string | null>(null);
  const { isMobileApp } = useMobileApp();

  const { data, isLoading } = useQuery<{ messages: ThreadMessage[]; chat_enabled: boolean }>({
    queryKey: ["prospect-thread", runId, prospectId],
    queryFn: () =>
      fetch(`/api/playbooks/runs/${runId}/prospects/${prospectId}/thread`).then((r) => r.json()),
    enabled: enabled && !!runId && !!prospectId,
  });

  const threadId = threadIdOverride ?? data?.messages?.at(-1)?.thread_id ?? null;

  useEffect(() => {
    if (isDemoMode() || !threadId || data?.chat_enabled === false) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["prospect-thread", runId, prospectId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
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
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/playbooks/runs/${runId}/prospects/${prospectId}/thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["prospect-thread", runId, prospectId] });
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const messages = (
    <div className="flex flex-col gap-3">
      {data?.messages.map((msg) => (
        <MessageBubble key={msg.id} msg={msg} />
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
          placeholder="Write a note or message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button size="icon" onClick={send} disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
