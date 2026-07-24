"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureDisabled } from "@/components/shared/feature-disabled";
import {
  TicketAttachmentList,
  TicketAttachmentPicker,
} from "@/components/support/ticket-attachments";
import { useFlag } from "@/hooks/use-feature-flags";
import type { SupportAttachment } from "@/lib/support/attachments";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const { enabled, loading: flagLoading } = useFlag("support_ticketing");
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["support-ticket", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${params.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      return json as {
        ticket: {
          id: string;
          subject: string;
          status: string;
          priority: string;
          category: string;
          created_at: string;
        };
        messages: Array<{
          id: string;
          body: string;
          is_staff: boolean;
          created_at: string;
          author?: { name: string | null; email: string } | null;
          attachments?: SupportAttachment[];
        }>;
      };
    },
    enabled,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (!enabled || !params.id || !data?.ticket) return;
    void fetch("/api/support/unread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: params.id }),
    }).then(() => {
      void queryClient.invalidateQueries({ queryKey: ["support-unread"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [enabled, params.id, data?.ticket?.id, queryClient, data?.ticket]);

  const replyMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.set("body", body);
      for (const file of files) form.append("files", file);
      const res = await fetch(`/api/support/tickets/${params.id}`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reply");
      return json;
    },
    onSuccess: () => {
      setBody("");
      setFiles([]);
      toast.success("Reply sent");
      queryClient.invalidateQueries({ queryKey: ["support-ticket", params.id] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (flagLoading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!enabled) return <FeatureDisabled title="Support Ticketing" flag="support_ticketing" />;
  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (error || !data) {
    return <p className="text-sm text-destructive">{(error as Error)?.message || "Not found"}</p>;
  }

  const { ticket, messages } = data;
  const closed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/support"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All Tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{ticket.subject}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {ticket.category} · {ticket.priority} · Opened {formatRelativeTime(ticket.created_at)}
            </p>
          </div>
          <Badge variant="outline">{ticket.status.replaceAll("_", " ")}</Badge>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <Card
            key={m.id}
            className={cn(m.is_staff ? "border-primary/30 bg-secondary/40" : "bg-card")}
          >
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.is_staff ? "Potentially Support" : m.author?.name || m.author?.email || "You"}
                </span>
                <span>{formatRelativeTime(m.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.body}</p>
              <TicketAttachmentList attachments={m.attachments} />
            </CardContent>
          </Card>
        ))}
      </div>

      {!closed ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply…"
          />
          <TicketAttachmentPicker
            files={files}
            onChange={setFiles}
            disabled={replyMutation.isPending}
          />
          <Button
            disabled={replyMutation.isPending || (!body.trim() && files.length === 0)}
            onClick={() => replyMutation.mutate()}
          >
            {replyMutation.isPending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This ticket is {ticket.status.replaceAll("_", " ")}.
        </p>
      )}
    </div>
  );
}
