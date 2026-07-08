"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { playbookRunHref } from "@/lib/routes/playbook-runs";
import type { PlaybookRun } from "@/types/playbooks";

interface RunListProps {
  playbookId: string;
  runs: PlaybookRun[];
}

export function RunList({ playbookId, runs }: RunListProps) {
  const { isMobileApp } = useMobileApp();

  if (!runs.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No runs yet. Start your first run above to match prospects.
        </CardContent>
      </Card>
    );
  }

  if (isMobileApp) {
    return (
      <div className="space-y-2">
        {runs.map((run) => (
          <Link key={run.id} href={playbookRunHref(run.id)} className="block">
            <div className="mobile-list-row">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{new Date(run.created_at).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {run.stats?.matched ?? 0} matched · {run.stats?.sent ?? 0} sent
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {run.dry_run && <Badge variant="secondary">dry</Badge>}
                <Badge variant="outline">{run.status}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <Link key={run.id} href={playbookRunHref(run.id)} className="block">
          <Card className="transition-all hover:border-primary/40 hover:shadow-sm">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">{new Date(run.created_at).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {run.stats?.matched ?? 0} matched · {run.stats?.sent ?? 0} sent ·{" "}
                  {run.stats?.replied ?? 0} replied
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {run.dry_run && <Badge variant="secondary">dry run</Badge>}
                <Badge variant="outline">{run.status}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
