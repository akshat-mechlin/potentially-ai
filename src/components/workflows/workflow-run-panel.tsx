"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageSquare, X } from "lucide-react";
import { RunWorkflow } from "@/components/playbooks/run-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { playbookRunApiBase } from "@/lib/routes/playbook-runs";
import { cn } from "@/lib/utils";
import type { WorkflowLastRun, WorkflowRunMatchPreview } from "@/types/workflows";
import type { PlaybookProspect } from "@/types/playbooks";

interface WorkflowRunPanelProps {
  workflowId: string;
  playbookId: string;
  runId: string;
  lastRun: WorkflowLastRun | null;
  onClose: () => void;
  onStatsChange?: () => void;
}

export function WorkflowRunPanel({
  workflowId,
  playbookId,
  runId,
  lastRun,
  onClose,
  onStatsChange,
}: WorkflowRunPanelProps) {
  const { data, refetch } = useQuery<{ prospects: PlaybookProspect[] }>({
    queryKey: ["playbook-run", runId],
    queryFn: () => fetch(playbookRunApiBase(runId)).then((r) => r.json()),
    enabled: Boolean(runId),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!data?.prospects) return;
    void fetch(`/api/workflows/${workflowId}/run-status`)
      .then((r) => r.json())
      .then(() => onStatsChange?.())
      .catch(() => {});
  }, [data?.prospects, workflowId, onStatsChange]);

  const prospects = data?.prospects ?? [];
  const replied = prospects.filter((p) => p.status === "replied" || p.status === "booked");
  const sent = prospects.filter((p) =>
    ["sent", "queued", "replied", "booked"].includes(p.status),
  );
  const preview: WorkflowRunMatchPreview[] = lastRun?.matches_preview ?? [];
  const stats = lastRun?.stats;

  return (
    <aside className="flex h-full w-full max-w-xl shrink-0 flex-col border-l border-border bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Run results</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select, draft, approve, and send without leaving Workflows.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">{stats?.matched ?? lastRun?.matched_count ?? 0} matched</Badge>
            {lastRun?.branch ? (
              <Badge variant="outline">
                {lastRun.branch.true_count} true / {lastRun.branch.false_count} false
              </Badge>
            ) : null}
            {typeof lastRun?.email_count === "number" ? (
              <Badge variant="outline">{lastRun.email_count} email</Badge>
            ) : null}
            {typeof lastRun?.intro_count === "number" && lastRun.intro_count > 0 ? (
              <Badge variant="outline">{lastRun.intro_count} intros</Badge>
            ) : null}
            <Badge variant="outline">{stats?.selected ?? 0} selected</Badge>
            <Badge variant="outline">{stats?.drafted ?? 0} drafts</Badge>
            <Badge variant="outline">{stats?.sent ?? sent.length} sent</Badge>
            <Badge variant="secondary">{stats?.replied ?? replied.length} replies</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild size="icon" variant="ghost" className="h-8 w-8" aria-label="Open full run">
            <Link href={`/playbook-runs/${runId}`}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {preview.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Top matches
              </p>
              <ul className="space-y-1.5">
                {preview.slice(0, 8).map((row) => (
                  <li
                    key={row.contact_id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.full_name || "Contact"}
                      </p>
                      <p className="truncate text-muted-foreground">
                        {[row.email, row.company_name].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {row.score}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            className={cn("rounded-xl border border-border/80 bg-background/60 p-3")}
            onBlurCapture={() => {
              void refetch().then(() => onStatsChange?.());
            }}
          >
            <RunWorkflow playbookId={playbookId} runId={runId} embedded />
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Replies & outcomes
              </p>
            </div>
            {replied.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                Replies show up here after prospects respond. Sent: {sent.length}.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {replied.map((prospect) => (
                  <li key={prospect.id}>
                    <Link
                      href={`/playbooks/${playbookId}/prospects/${prospect.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-2.5 py-2 text-xs transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate font-medium">
                        {prospect.contact?.full_name ?? "Contact"}
                      </span>
                      <Badge variant="secondary">{prospect.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {lastRun?.warnings?.length ? (
            <section className="space-y-1">
              {lastRun.warnings.map((warning) => (
                <p key={warning} className="text-[11px] text-muted-foreground">
                  {warning}
                </p>
              ))}
            </section>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
