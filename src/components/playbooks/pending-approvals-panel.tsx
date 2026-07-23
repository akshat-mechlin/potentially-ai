"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { playbookRunApiBase, playbookRunHref } from "@/lib/routes/playbook-runs";
import { cn } from "@/lib/utils";
import type { AutomationLevel, PendingPlaybookApproval } from "@/types/playbooks";

type DraftEdit = { subject: string; body: string };

export function PendingApprovalsPanel({
  playbookId,
  automationLevel,
}: {
  playbookId: string;
  automationLevel: AutomationLevel;
}) {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();
  const [draftEdits, setDraftEdits] = useState<Record<string, DraftEdit>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const needsReview = automationLevel === "assist" || automationLevel === "supervised";

  const { data, isLoading } = useQuery({
    queryKey: ["playbook-pending-approvals", playbookId],
    queryFn: async () => {
      const res = await fetch(`/api/playbooks/${playbookId}/pending-approvals`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load approvals");
      return body.approvals as PendingPlaybookApproval[];
    },
    enabled: mounted && !!playbookId,
  });

  const approvals = data ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["playbook-pending-approvals", playbookId] });
    void queryClient.invalidateQueries({ queryKey: ["playbook", playbookId] });
  };

  const editFor = (item: PendingPlaybookApproval): DraftEdit =>
    draftEdits[item.id] ?? {
      subject: item.draft_subject ?? "",
      body: item.draft_body ?? "",
    };

  const saveDraft = async (item: PendingPlaybookApproval, edit: DraftEdit) => {
    await fetch(`${playbookRunApiBase(item.run_id)}/prospects/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft_subject: edit.subject, draft_body: edit.body }),
    });
  };

  const sendOne = async (item: PendingPlaybookApproval) => {
    setBusy(item.id);
    try {
      const edit = editFor(item);
      await saveDraft(item, edit);
      const res = await fetch(`${playbookRunApiBase(item.run_id)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: item.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to send");
      toast.success(payload.dry_run ? "Dry run. Email logged." : "Email sent");
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setBusy(null);
    }
  };

  const sendAll = useMutation({
    mutationFn: async () => {
      // Group by run for bulk endpoint
      const byRun = new Map<string, PendingPlaybookApproval[]>();
      for (const item of approvals) {
        const list = byRun.get(item.run_id) ?? [];
        list.push(item);
        byRun.set(item.run_id, list);
      }

      for (const item of approvals) {
        await saveDraft(item, editFor(item));
      }

      for (const [runId, items] of byRun) {
        const res = await fetch(`${playbookRunApiBase(runId)}/send/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospect_ids: items.map((i) => i.id) }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Bulk send failed");
      }
    },
    onSuccess: () => {
      toast.success("All pending emails sent");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const title = useMemo(() => {
    if (approvals.length === 0) return "Pending approvals";
    return `Pending approvals (${approvals.length})`;
  }, [approvals.length]);

  if (!needsReview && approvals.length === 0) return null;

  return (
    <div className={cn("space-y-3", isMobileApp && "space-y-2")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={isMobileApp ? "mobile-section-label" : "text-sm font-semibold"}>
            {title}
          </h2>
          {!isMobileApp && (
            <p className="text-sm text-muted-foreground">
              Sequence follow-ups and drafts waiting for your review before send.
            </p>
          )}
        </div>
        {approvals.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendAll.mutate()}
            disabled={sendAll.isPending || busy !== null}
          >
            {sendAll.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Approve all
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading approvals…
          </CardContent>
        </Card>
      ) : approvals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No follow-ups waiting. When the sequence cron drafts the next email in Assist or
              Supervised mode, it shows up here for approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {approvals.map((item) => {
            const edit = editFor(item);
            const stepLabel =
              item.current_sequence_step > 0
                ? `Follow-up · step ${item.current_sequence_step + 1}`
                : "Draft";
            return (
              <Card
                key={item.id}
                className={isMobileApp ? "mobile-card-flat border-0 shadow-none" : undefined}
              >
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {item.contact_name || item.contact_email || "Contact"}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{stepLabel}</Badge>
                      <Badge variant="secondary">pending approval</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[item.contact_email, item.contact_company].filter(Boolean).join(" · ")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    value={edit.subject}
                    onChange={(e) =>
                      setDraftEdits((prev) => ({
                        ...prev,
                        [item.id]: { ...edit, subject: e.target.value },
                      }))
                    }
                    placeholder="Subject"
                  />
                  <Textarea
                    value={edit.body}
                    onChange={(e) =>
                      setDraftEdits((prev) => ({
                        ...prev,
                        [item.id]: { ...edit, body: e.target.value },
                      }))
                    }
                    rows={isMobileApp ? 4 : 6}
                    placeholder="Email body"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => sendOne(item)}
                      disabled={busy === item.id || sendAll.isPending}
                      className={isMobileApp ? "flex-1 rounded-xl" : ""}
                    >
                      {busy === item.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={playbookRunHref(item.run_id)}>Open run</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
