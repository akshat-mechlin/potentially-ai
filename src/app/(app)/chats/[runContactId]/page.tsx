"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatDetailPanel } from "@/components/chats/chat-detail-panel";
import { ChatInboxList } from "@/components/chats/chat-inbox-list";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import type { ChatDetail, ChatInboxItem } from "@/types/chats";

export default function ChatDetailPage() {
  const { runContactId } = useParams<{ runContactId: string }>();
  const mounted = useIsClient();
  const { isMobile } = useMobileApp();
  const { enabled, loading: flagsLoading } = usePlaybookEnabled();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ chats: ChatInboxItem[] }>({
    queryKey: ["chats", "all"],
    queryFn: () => fetch("/api/chats?direction=all").then((r) => r.json()),
    enabled: mounted && enabled && !isMobile,
  });

  const { data: detail } = useQuery<ChatDetail>({
    queryKey: ["chat-detail", runContactId],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${runContactId}`);
      if (!res.ok) throw new Error("Conversation not found");
      return res.json();
    },
    enabled: mounted && enabled && !isMobile && !!runContactId,
  });

  if (!mounted || flagsLoading) {
    return null;
  }

  if (!enabled) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Chats require Agent Mode. Enable <code className="text-xs">playbook_mode</code> in Admin.
      </div>
    );
  }

  if (isMobile) {
    return <ChatDetailPanel runContactId={runContactId} />;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Chats</h1>
        <p className="text-sm text-muted-foreground">
          Conversations and activity for playbook prospects
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        <div className="w-full max-w-sm shrink-0 border-r border-border bg-card">
          <ChatInboxList
            chats={data?.chats ?? []}
            isLoading={isLoading}
            search={search}
            onSearchChange={setSearch}
            selectedId={runContactId}
            selectedContactId={detail?.inbox?.contact_id}
            compact
          />
        </div>
        <div className="min-w-0 flex-1">
          <ChatDetailPanel runContactId={runContactId} />
        </div>
      </div>
    </div>
  );
}
