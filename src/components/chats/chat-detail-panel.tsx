"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink, Loader2, Mail, MessageSquare, Trash2 } from "lucide-react";
import { ProspectChat } from "@/components/playbooks/prospect-chat";
import { ChatActivityTimeline } from "@/components/chats/chat-activity-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsClient } from "@/hooks/use-is-client";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { ChatDetail } from "@/types/chats";
import { toast } from "sonner";

interface ChatDetailPanelProps {
  runContactId: string;
  showBackLink?: boolean;
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function ChatDetailPanel({ runContactId, showBackLink = false }: ChatDetailPanelProps) {
  const mounted = useIsClient();
  const { confirm, confirmDialog } = useConfirmDialog();
  const { isMobileApp } = useMobileApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error } = useQuery<ChatDetail>({
    queryKey: ["chat-detail", runContactId],
    queryFn: async () => {
      const res = await fetch(`/api/chats/${runContactId}`);
      if (!res.ok) throw new Error("Conversation not found");
      return res.json();
    },
    enabled: mounted && !!runContactId,
  });

  const deleteConversation = async () => {
    const confirmed = await confirm({
      title: "Delete this conversation?",
      description:
        "It will be removed from your inbox. The other person will still see the conversation.",
      confirmLabel: "Delete conversation",
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/chats/${runContactId}`, { method: "DELETE" });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to delete conversation");
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      queryClient.removeQueries({ queryKey: ["chat-detail", runContactId] });
      toast.success("Conversation deleted");
      router.push("/chats");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete conversation");
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted || isLoading) {
    return <Skeleton className="h-full min-h-[320px] w-full rounded-lg" />;
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">Conversation not found</p>
        {showBackLink && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/chats">Back to chats</Link>
          </Button>
        )}
      </div>
    );
  }

  const { inbox, activities, chat_enabled } = data;
  const prospectHref = `/playbooks/${inbox.playbook_id}/prospects/${runContactId}`;
  const showProspectLink = inbox.direction === "outreach" && inbox.playbook_id;

  const deleteButton = (
    <Button
      variant="outline"
      size="sm"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => void deleteConversation()}
      disabled={deleting}
    >
      {deleting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
      Delete
    </Button>
  );

  const header = (
    <div className="shrink-0 border-b border-border bg-card px-4 py-3">
      {showBackLink && (
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 h-8 px-2" asChild>
          <Link href="/chats">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Chats
          </Link>
        </Button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{inbox.contact_name}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {[inbox.contact_title, inbox.company_name].filter(Boolean).join(" · ")}
          </p>
          {inbox.contact_email && (
            <p className="truncate text-xs text-muted-foreground">{inbox.contact_email}</p>
          )}
          {inbox.direction === "outreach" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Playbook: {inbox.playbook_name}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {inbox.contact_title ?? "Direct message"}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="capitalize">
            {inbox.direction === "inbox" ? "Inbox" : statusLabel(inbox.status)}
          </Badge>
          {showProspectLink && (
            <Button variant="outline" size="sm" asChild>
              <Link href={prospectHref}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Open prospect
              </Link>
            </Button>
          )}
          {deleteButton}
        </div>
      </div>
    </div>
  );

  if (isMobileApp) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="mobile-native-nav shrink-0 border-b border-border">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" asChild>
            <Link href="/chats" aria-label="Back to chats">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="truncate text-base font-semibold">{inbox.contact_name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {inbox.company_name ?? inbox.playbook_name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-destructive"
            onClick={() => void deleteConversation()}
            disabled={deleting}
            aria-label="Delete conversation"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </Button>
        </div>

        <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-3 mt-2 grid w-auto grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <ProspectChat
                runId={inbox.run_id || "inbox"}
                prospectId={runContactId}
                enabled={chat_enabled}
              />
            </div>
          </TabsContent>
          <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden">
            <ChatActivityTimeline activities={activities} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-background">
      {header}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Mail className="mr-2 h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4 space-y-4 data-[state=inactive]:hidden">
            <ProspectChat
              runId={inbox.run_id}
              prospectId={runContactId}
              enabled={chat_enabled}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Activity timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ChatActivityTimeline activities={activities} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {confirmDialog}
    </div>
  );
}
