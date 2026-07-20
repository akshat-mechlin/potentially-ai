"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LifeBuoy, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureDisabled } from "@/components/shared/feature-disabled";
import { TicketAttachmentPicker } from "@/components/support/ticket-attachments";
import { useFlag } from "@/hooks/use-feature-flags";
import { formatRelativeTime } from "@/lib/utils";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  last_message_at: string;
  created_at: string;
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  in_progress: "secondary",
  waiting_on_user: "outline",
  resolved: "secondary",
  closed: "outline",
};

export default function SupportPage() {
  const { enabled, loading } = useFlag("support_ticketing");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [files, setFiles] = useState<File[]>([]);

  const { data, isLoading } = useQuery<{ tickets: Ticket[] }>({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support/tickets");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      return json;
    },
    enabled,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.set("subject", subject);
      form.set("body", body);
      form.set("category", category);
      form.set("priority", priority);
      for (const file of files) form.append("files", file);

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create");
      return json as Ticket;
    },
    onSuccess: (ticket) => {
      toast.success("Ticket created — we'll email you when we reply");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
      setSubject("");
      setBody("");
      setFiles([]);
      window.location.href = `/support/${ticket.id}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <Skeleton className="h-40 rounded-2xl" />;
  if (!enabled) return <FeatureDisabled title="Support Ticketing" flag="support_ticketing" />;

  const tickets = data?.tickets ?? [];
  const canSubmit =
    subject.trim().length >= 3 && (body.trim().length >= 5 || files.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sub text-muted-foreground">
            Get help from the Potentially team. You&apos;ll get in-app and email updates on replies.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setFiles([]);
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New ticket
            </Button>
          </DialogTrigger>
          <DialogContent
            className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-5 overflow-y-auto sm:rounded-2xl"
            onPointerDownOutside={(event) => {
              const target = event.target as HTMLElement | null;
              if (
                target?.closest(
                  "[data-radix-select-content], [data-radix-popper-content-wrapper], [role='listbox']",
                )
              ) {
                event.preventDefault();
              }
            }}
            onInteractOutside={(event) => {
              const target = event.target as HTMLElement | null;
              if (
                target?.closest(
                  "[data-radix-select-content], [data-radix-popper-content-wrapper], [role='listbox']",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>New support ticket</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Tell us what you need help with. We&apos;ll reply in-app and by email.
              </p>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="h-11"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="z-60"
                      onCloseAutoFocus={(event) => event.preventDefault()}
                    >
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="connectors">Connectors</SelectItem>
                      <SelectItem value="playbooks">Playbooks</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="z-60"
                      onCloseAutoFocus={(event) => event.preventDefault()}
                    >
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Details</Label>
                <Textarea
                  id="body"
                  rows={10}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What happened? Steps to reproduce, screenshots description, etc."
                  className="min-h-[180px] resize-y"
                />
              </div>
              <TicketAttachmentPicker
                files={files}
                onChange={setFiles}
                disabled={createMutation.isPending}
              />
              <Button
                className="h-11 w-full"
                disabled={createMutation.isPending || !canSubmit}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Submitting…" : "Submit ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <LifeBuoy className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No tickets yet</p>
            <p className="text-xs text-muted-foreground">Open a ticket and our team will follow up.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/support/${ticket.id}`}
                className="flex items-center gap-3 border-t border-border px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ticket.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ticket.category} · Updated {formatRelativeTime(ticket.last_message_at)}
                  </p>
                </div>
                <Badge variant={statusVariant[ticket.status] ?? "outline"}>
                  {ticket.status.replaceAll("_", " ")}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
