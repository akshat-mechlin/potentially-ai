"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ChevronLeft, Mail, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendlyEmbed } from "@/components/playbooks/calendly-embed";
import { ProspectChat } from "@/components/playbooks/prospect-chat";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { Playbook, PlaybookProspect } from "@/types/playbooks";
import { toast } from "sonner";

type ProspectTab = "conversation" | "email" | "calendly";

export default function ProspectDetailPage() {
  const { id: playbookId, prospectId } = useParams<{ id: string; prospectId: string }>();
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProspectTab>("conversation");

  const { data: playbookData } = useQuery<{ playbook: Playbook }>({
    queryKey: ["playbook", playbookId],
    queryFn: () => fetch(`/api/playbooks/${playbookId}`).then((r) => r.json()),
    enabled: mounted && !!playbookId,
  });

  const { data: runData, isLoading } = useQuery<{ run: { id: string }; prospects: PlaybookProspect[] }>({
    queryKey: ["prospect-search", playbookId, prospectId],
    queryFn: async () => {
      const pb = await fetch(`/api/playbooks/${playbookId}`).then((r) => r.json());
      for (const run of pb.runs ?? []) {
        const detail = await fetch(`/api/playbooks/runs/${run.id}`).then((r) => r.json());
        const prospect = detail.prospects?.find((p: PlaybookProspect) => p.id === prospectId);
        if (prospect) {
          setRunId(run.id);
          return { run, prospects: detail.prospects };
        }
      }
      throw new Error("Prospect not found");
    },
    enabled: mounted && !!playbookId && !!prospectId,
  });

  const prospect = runData?.prospects.find((p) => p.id === prospectId);
  const playbook = playbookData?.playbook;
  const calendlyUrl =
    playbook?.calendly_url ??
    (typeof playbook?.settings?.calendly_url === "string" ? playbook.settings.calendly_url : null) ??
    process.env.NEXT_PUBLIC_CALENDLY_URL ??
    null;

  const markBooked = async () => {
    if (!runId) return;
    try {
      const res = await fetch(
        `/api/playbooks/runs/${runId}/prospects/${prospectId}/book`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed");
      toast.success("Marked as booked");
      queryClient.invalidateQueries({ queryKey: ["prospect-search"] });
    } catch {
      toast.error("Failed to mark booked");
    }
  };

  const simulateReply = async () => {
    try {
      const res = await fetch("/api/playbooks/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_contact_id: prospectId,
          body: "Thanks — let's find time next week.",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Reply recorded");
      queryClient.invalidateQueries({ queryKey: ["prospect-search"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-thread", runId, prospectId] });
    } catch {
      toast.error("Failed to simulate reply");
    }
  };

  if (!mounted || isLoading || !prospect) {
    return <Skeleton className="h-64" />;
  }

  const tabs: Array<{ id: ProspectTab; label: string; icon: typeof MessageSquare }> = [
    { id: "conversation", label: "Chat", icon: MessageSquare },
    { id: "email", label: "Email", icon: Mail },
  ];
  if (calendlyUrl) {
    tabs.push({ id: "calendly", label: "Schedule", icon: Calendar });
  }

  if (isMobileApp) {
    const backHref = runId
      ? `/playbooks/${playbookId}/runs/${runId}`
      : `/playbooks/${playbookId}/runs`;

    return (
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="mobile-native-nav shrink-0">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" asChild>
            <Link href={backHref} aria-label="Go back">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 px-1 text-center">
            <p className="truncate text-base font-semibold">{prospect.contact?.full_name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {prospect.contact?.company_name ?? prospect.contact?.title}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {prospect.status}
          </Badge>
        </div>

        <div className="shrink-0 border-b border-border bg-card px-3 py-2">
          <div className="mobile-segmented">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-active={activeTab === tab.id}
                className="mobile-segmented-item"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "conversation" && (
          <div className="flex min-h-0 flex-1 flex-col">
            {runId && <ProspectChat runId={runId} prospectId={prospectId} />}
          </div>
        )}

        {activeTab === "email" && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-2 text-sm font-semibold">{prospect.draft_subject ?? "No subject"}</p>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {prospect.draft_body ?? "No draft yet."}
            </p>
          </div>
        )}

        {activeTab === "calendly" && calendlyUrl && (
          <div className="flex-1 overflow-y-auto p-4">
            <CalendlyEmbed url={calendlyUrl} onBooked={markBooked} />
          </div>
        )}

        {activeTab === "conversation" && prospect.status === "sent" && (
          <div className="desktop-only border-t border-border bg-card px-4 py-2">
            <Button variant="outline" size="sm" className="w-full" onClick={simulateReply}>
              Simulate reply
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={runId ? `/playbooks/${playbookId}/runs/${runId}` : `/playbooks/${playbookId}/runs`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {runId ? "Back to run" : "Back to runs"}
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/playbooks/${playbookId}`}>Playbook overview</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{prospect.contact?.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {prospect.contact?.title} · {prospect.contact?.company_name}
          </p>
        </div>
        <Badge>{prospect.status}</Badge>
      </div>

      <Tabs defaultValue="conversation">
        <TabsList>
          <TabsTrigger value="conversation">
            <MessageSquare className="mr-2 h-4 w-4" />
            Conversation
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email draft
          </TabsTrigger>
          {calendlyUrl && (
            <TabsTrigger value="calendly">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="conversation" className="space-y-4">
          {runId && <ProspectChat runId={runId} prospectId={prospectId} />}
          {prospect.status === "sent" && (
            <Button variant="outline" size="sm" onClick={simulateReply}>
              Simulate inbound reply (test)
            </Button>
          )}
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{prospect.draft_subject ?? "No subject"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{prospect.draft_body ?? "No draft yet."}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {calendlyUrl && (
          <TabsContent value="calendly">
            <CalendlyEmbed url={calendlyUrl} onBooked={markBooked} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
