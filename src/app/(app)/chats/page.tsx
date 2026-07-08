"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { ChatInboxList } from "@/components/chats/chat-inbox-list";
import { DesktopOnly, MobileOnly } from "@/components/mobile/primitives";
import { MobileLargeTitle } from "@/components/mobile/native-ui";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import type { ChatDirection, ChatInboxItem } from "@/types/chats";

const FILTERS: Array<{ id: ChatDirection | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "outreach", label: "Outreach" },
  { id: "inbox", label: "Inbox" },
];

export default function ChatsPage() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const { enabled, loading: flagsLoading } = usePlaybookEnabled();
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<ChatDirection | "all">("all");

  const { data, isLoading } = useQuery<{ chats: ChatInboxItem[] }>({
    queryKey: ["chats", direction],
    queryFn: () => fetch(`/api/chats?direction=${direction}`).then((r) => r.json()),
    enabled: mounted && enabled,
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

  const filterBar = (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => (
        <Button
          key={filter.id}
          type="button"
          size="sm"
          variant={direction === filter.id ? "default" : "outline"}
          className="h-8 rounded-full px-3 text-xs"
          onClick={() => setDirection(filter.id)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );

  const inbox = (
    <ChatInboxList
      chats={data?.chats ?? []}
      isLoading={isLoading}
      search={search}
      onSearchChange={setSearch}
      compact={!isMobileApp}
    />
  );

  if (isMobileApp) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <MobileLargeTitle
          title="Chats"
          subtitle={`${data?.chats.length ?? 0} conversations`}
        />
        {filterBar}
        <div className="min-h-0 flex-1">{inbox}</div>
      </div>
    );
  }

  return (
    <>
      <MobileOnly>
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Chats</h1>
            <p className="text-sm text-muted-foreground">
              Outreach to prospects and inbox messages from others
            </p>
          </div>
          {filterBar}
          <div className="min-h-[60vh] rounded-lg border">{inbox}</div>
        </div>
      </MobileOnly>

      <DesktopOnly>
        <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Chats</h1>
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages and activity
              </p>
            </div>
            {filterBar}
          </div>
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
            <div className="w-full max-w-sm shrink-0 border-r border-border bg-card">
              {inbox}
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">
                Select a conversation from the list
              </p>
              <p className="max-w-sm text-xs text-muted-foreground/80">
                Outreach shows playbook prospects. Inbox shows messages sent to you on Potentially.
              </p>
            </div>
          </div>
        </div>
      </DesktopOnly>
    </>
  );
}
