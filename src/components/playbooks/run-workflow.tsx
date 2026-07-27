"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare,
  ChevronRight,
  Loader2,
  Mail,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import { ApolloDiscoverPanel } from "@/components/playbooks/apollo-discover-panel";
import { playbookRunApiBase } from "@/lib/routes/playbook-runs";
import type { PlaybookProspect, PlaybookRun } from "@/types/playbooks";
import { toast } from "sonner";

type RunDetailResponse = {
  run: PlaybookRun;
  prospects: PlaybookProspect[];
};

interface RunWorkflowProps {
  playbookId: string;
  runId: string;
  /** Compact layout for embedding inside Workflows. */
  embedded?: boolean;
}

function EmptySection({
  icon: Icon,
  title,
  description,
  compact,
}: {
  icon: typeof Users;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  if (compact) {
    return <div className="mobile-empty">{title}</div>;
  }

  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <Icon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

function ProspectLinkCard({
  playbookId,
  prospect,
  trailing,
  mobile,
}: {
  playbookId: string;
  prospect: PlaybookProspect;
  trailing?: React.ReactNode;
  mobile?: boolean;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{prospect.contact?.full_name ?? "Contact"}</p>
          {!mobile && prospect.match_score > 0 && (
            <Badge variant="outline">{prospect.match_score} score</Badge>
          )}
        </div>
        <p className={cn("text-sm text-muted-foreground", mobile && "truncate text-xs")}>
          {prospect.contact?.title}
          {prospect.contact?.company_name ? ` · ${prospect.contact.company_name}` : ""}
        </p>
        {!mobile && prospect.match_reason && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{prospect.match_reason}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </>
  );

  if (mobile) {
    return (
      <Link href={`/playbooks/${playbookId}/prospects/${prospect.id}`} className="block">
        <div className="mobile-list-row">{content}</div>
      </Link>
    );
  }

  return (
    <Link href={`/playbooks/${playbookId}/prospects/${prospect.id}`} className="block">
      <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
        <CardContent className="flex items-center justify-between gap-3 p-4">{content}</CardContent>
      </Card>
    </Link>
  );
}

export function RunWorkflow({ playbookId, runId, embedded = false }: RunWorkflowProps) {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const compact = embedded || isMobileApp;
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [selectedSkipped, setSelectedSkipped] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, { subject: string; body: string }>>({});

  const { data, isLoading, refetch } = useQuery<RunDetailResponse>({
    queryKey: ["playbook-run", runId],
    queryFn: () => fetch(playbookRunApiBase(runId)).then((r) => r.json()),
    enabled: mounted && !!runId,
  });

  const matchedProspects = useMemo(
    () => data?.prospects.filter((p) => p.status === "matched") ?? [],
    [data?.prospects],
  );

  const approvalProspects = useMemo(
    () =>
      data?.prospects.filter((p) =>
        ["selected", "pending_approval", "sent", "replied", "booked", "queued"].includes(p.status),
      ) ?? [],
    [data?.prospects],
  );

  const skippedProspects = useMemo(
    () => data?.prospects.filter((p) => p.status === "skipped") ?? [],
    [data?.prospects],
  );

  const pendingApproval = useMemo(
    () => approvalProspects.filter((p) => p.status === "pending_approval"),
    [approvalProspects],
  );

  const pipelineProspects = useMemo(
    () => approvalProspects.filter((p) => ["sent", "replied", "booked", "queued"].includes(p.status)),
    [approvalProspects],
  );

  const selectedCount = approvalProspects.filter((p) => p.status === "selected").length;

  const toggleProspect = (prospectId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedProspects((prev) => {
      const next = new Set(prev);
      if (next.has(prospectId)) next.delete(prospectId);
      else next.add(prospectId);
      return next;
    });
  };

  const toggleSkippedProspect = (prospectId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(prospectId)) next.delete(prospectId);
      else next.add(prospectId);
      return next;
    });
  };

  const finalizeSelection = async () => {
    if (!selectedProspects.size) return;
    setBusy("finalize");
    try {
      const res = await fetch(`${playbookRunApiBase(runId)}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_ids: [...selectedProspects] }),
      });
      if (!res.ok) throw new Error("Failed to finalize");
      toast.success(`${selectedProspects.size} prospects selected`);
      setSelectedProspects(new Set());
      refetch();
    } catch {
      toast.error("Failed to finalize selection");
    } finally {
      setBusy(null);
    }
  };

  const includeSkippedSelection = async () => {
    if (!selectedSkipped.size) return;
    setBusy("include-skipped");
    try {
      const res = await fetch(`${playbookRunApiBase(runId)}/include-skipped`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_ids: [...selectedSkipped] }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to include prospects");
      toast.success(`${payload.included ?? selectedSkipped.size} contact(s) added to the run`);
      setSelectedSkipped(new Set());
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to include skipped contacts");
    } finally {
      setBusy(null);
    }
  };

  const generateDrafts = async () => {
    setBusy("drafts");
    try {
      const res = await fetch(`${playbookRunApiBase(runId)}/drafts`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate drafts");
      toast.success("Drafts generated. Review and approve to send.");
      refetch();
    } catch {
      toast.error("Failed to generate drafts");
    } finally {
      setBusy(null);
    }
  };

  const sendProspect = async (prospectId: string) => {
    setBusy(prospectId);
    try {
      const edit = draftEdits[prospectId];
      if (edit) {
        await fetch(`${playbookRunApiBase(runId)}/prospects/${prospectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft_subject: edit.subject, draft_body: edit.body }),
        });
      }
      const res = await fetch(`${playbookRunApiBase(runId)}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_id: prospectId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to send");
      toast.success(payload.dry_run ? "Dry run. Email logged." : "Email sent");
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setBusy(null);
    }
  };

  const bulkSend = async () => {
    if (!pendingApproval.length) return;
    setBusy("bulk");
    try {
      const ids = pendingApproval.map((p) => p.id);
      for (const prospectId of ids) {
        const edit = draftEdits[prospectId];
        if (edit) {
          await fetch(`${playbookRunApiBase(runId)}/prospects/${prospectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ draft_subject: edit.subject, draft_body: edit.body }),
          });
        }
      }
      const res = await fetch(`${playbookRunApiBase(runId)}/send/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospect_ids: ids }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error("Bulk send failed");
      toast.success(`Sent ${payload.sent ?? 0} of ${ids.length} emails`);
      refetch();
    } catch {
      toast.error("Bulk send failed");
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !data?.run) {
    return <Skeleton className="h-64" />;
  }

  const run = data.run;

  return (
    <div className={cn(compact ? "space-y-3" : "space-y-6")}>
      <div className={cn(compact ? "flex flex-wrap gap-2" : "")}>
        {compact ? (
          <>
            <Badge variant="outline">{run.status}</Badge>
            {run.dry_run && <Badge variant="secondary">dry</Badge>}
          </>
        ) : (
          <Card className="w-full">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Started {new Date(run.created_at).toLocaleString()}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline">{run.status}</Badge>
                  {run.dry_run && <Badge variant="secondary">dry run</Badge>}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/playbooks/${playbookId}/runs`}>All runs</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ApolloDiscoverPanel
        runId={runId}
        icpProfile={run.icp_snapshot}
        compact={compact}
        onImported={refetch}
      />

      <section className="mobile-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="mobile-section-label">
            {compact ? `Matched · ${matchedProspects.length}` : `1. Matched prospects (${matchedProspects.length})`}
          </p>
          {matchedProspects.length > 0 && (
            <Button
              size="sm"
              onClick={finalizeSelection}
              disabled={!selectedProspects.size || busy === "finalize"}
              className={compact ? "h-8 rounded-full px-3 text-xs" : ""}
            >
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              {compact ? `Select (${selectedProspects.size})` : `Finalize ${selectedProspects.size} selected`}
            </Button>
          )}
        </div>
        {matchedProspects.length ? (
          matchedProspects.map((prospect) => (
            <div key={prospect.id} className="relative">
              <ProspectLinkCard
                playbookId={playbookId}
                prospect={prospect}
                mobile={compact}
                trailing={
                  <input
                    type="checkbox"
                    checked={selectedProspects.has(prospect.id)}
                    onClick={(e) => toggleProspect(prospect.id, e)}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-border"
                    aria-label={`Select ${prospect.contact?.full_name}`}
                  />
                }
              />
            </div>
          ))
        ) : (
          <EmptySection
            icon={Users}
            title="No matches"
            description="This run has no matches yet, or all matches were already moved forward."
            compact={compact}
          />
        )}
      </section>

      {(skippedProspects.length > 0 || !compact) && (
      <section className="mobile-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="mobile-section-label">
            {compact ? `Skipped · ${skippedProspects.length}` : `Skipped / deduped (${skippedProspects.length})`}
          </p>
          {skippedProspects.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={includeSkippedSelection}
              disabled={!selectedSkipped.size || busy === "include-skipped"}
              className={compact ? "h-8 rounded-full px-3 text-xs" : ""}
            >
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              {compact
                ? `Include (${selectedSkipped.size})`
                : `Include ${selectedSkipped.size} in run`}
            </Button>
          )}
        </div>
        {skippedProspects.length ? (
          skippedProspects.map((prospect) => (
            <div key={prospect.id} className="relative">
              <ProspectLinkCard
                playbookId={playbookId}
                prospect={prospect}
                mobile={compact}
                trailing={
                  <>
                    <Badge variant="secondary">{prospect.skip_reason ?? "skipped"}</Badge>
                    <input
                      type="checkbox"
                      checked={selectedSkipped.has(prospect.id)}
                      onClick={(e) => toggleSkippedProspect(prospect.id, e)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-border"
                      aria-label={`Include ${prospect.contact?.full_name}`}
                    />
                  </>
                }
              />
            </div>
          ))
        ) : (
          !compact && (
            <EmptySection
              icon={Users}
              title="No skipped contacts"
              description="Contacts skipped by dedupe or cooldown rules will appear here. You can manually include them to continue the run."
            />
          )
        )}
      </section>
      )}

      <section className="mobile-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="mobile-section-label">
            {compact ? `Drafts · ${selectedCount}` : `2. Generate drafts (${selectedCount} ready)`}
          </p>
          <Button
            onClick={generateDrafts}
            disabled={selectedCount === 0 || busy === "drafts"}
            size="sm"
            className={compact ? "h-8 rounded-full px-3 text-xs" : ""}
          >
            {busy === "drafts" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" />
            )}
            {compact ? "Generate" : "Generate email drafts"}
          </Button>
        </div>
        {selectedCount === 0 && !compact && (
          <EmptySection
            icon={Sparkles}
            title="No prospects finalized yet"
            description="Select matched prospects above and click Finalize, or include skipped contacts manually, then generate drafts."
          />
        )}
      </section>

      <section className="mobile-section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="mobile-section-label">
            {compact ? `Send · ${pendingApproval.length}` : `3. Approve & send (${pendingApproval.length})`}
          </p>
          {pendingApproval.length > 0 && (
            <Button size="sm" variant="outline" onClick={bulkSend} disabled={busy === "bulk"} className={compact ? "h-8 rounded-full px-3 text-xs" : ""}>
              Approve all
            </Button>
          )}
        </div>
        {pendingApproval.length ? (
          pendingApproval.map((prospect) => {
            const edit = draftEdits[prospect.id] ?? {
              subject: prospect.draft_subject ?? "",
              body: prospect.draft_body ?? "",
            };
            return (
              <Card key={prospect.id} className={compact ? "mobile-card-flat border-0 shadow-none" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      <Link
                        href={`/playbooks/${playbookId}/prospects/${prospect.id}`}
                        className="hover:underline"
                      >
                        {prospect.contact?.full_name}
                      </Link>
                    </CardTitle>
                    {!compact && (
                      <Badge variant="outline">
                        <Mail className="mr-1 h-3 w-3" />
                        pending approval
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={edit.subject} onChange={(e) => setDraftEdits((prev) => ({ ...prev, [prospect.id]: { ...edit, subject: e.target.value } }))} />
                  <Textarea value={edit.body} onChange={(e) => setDraftEdits((prev) => ({ ...prev, [prospect.id]: { ...edit, body: e.target.value } }))} rows={compact ? 4 : 6} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => sendProspect(prospect.id)} disabled={busy === prospect.id} className={compact ? "flex-1 rounded-xl" : ""}>
                      {busy === prospect.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send
                    </Button>
                    {!compact && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/playbooks/${playbookId}/prospects/${prospect.id}`}>Open conversation</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          !compact && (
            <EmptySection icon={Mail} title="Nothing waiting for approval" description="Generate drafts first, then review and send emails here." />
          )
        )}
      </section>

      <section className="mobile-section">
        <p className="mobile-section-label">
          {compact ? `Pipeline · ${pipelineProspects.length}` : `4. Pipeline (${pipelineProspects.length})`}
        </p>
        {pipelineProspects.length ? (
          pipelineProspects.map((prospect) => (
            <ProspectLinkCard
              key={prospect.id}
              playbookId={playbookId}
              prospect={prospect}
              mobile={compact}
              trailing={<Badge variant="outline">{prospect.status}</Badge>}
            />
          ))
        ) : (
          !compact && (
            <EmptySection icon={Send} title="No active pipeline yet" description="Sent, replied, booked, and queued prospects show up here." />
          )
        )}
      </section>
    </div>
  );
}
