"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RunList } from "@/components/playbooks/run-list";
import { usePlaybook } from "@/hooks/use-playbook";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybookOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { isMobileApp } = useMobileApp();
  const { data, isLoading } = usePlaybook(id);

  if (isLoading || !data?.playbook) {
    return <Skeleton className="h-48" />;
  }

  const recentRuns = data.runs.slice(0, 3);
  const playbook = data.playbook;

  return (
    <div className={isMobileApp ? "space-y-4" : "space-y-6"}>
      <Card className={isMobileApp ? "mobile-card-flat border-0 shadow-none" : undefined}>
        <CardContent className={isMobileApp ? "space-y-3 px-4 py-4" : "space-y-3 p-6"}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{playbook.automation_level} mode</Badge>
            {playbook.tone && <Badge variant="secondary">{playbook.tone}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Configure in order: <span className="font-medium text-foreground">Settings</span> →{" "}
            <span className="font-medium text-foreground">Templates</span> →{" "}
            <span className="font-medium text-foreground">Sequence</span> →{" "}
            <span className="font-medium text-foreground">Runs</span>. Use the tabs above to move
            through each step.{" "}
            <span className="font-medium text-foreground">Audit</span> shows what happened after
            you send.
          </p>
          <Button className={isMobileApp ? "w-full rounded-xl" : undefined} asChild>
            <Link href={`/playbooks/${id}/runs`}>
              <Play className="mr-2 h-4 w-4" />
              {data.runs.length ? "Continue in Runs" : "Start your first run"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className={isMobileApp ? "mobile-section-label" : "text-sm font-semibold"}>
            Recent runs
          </h2>
          {data.runs.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/playbooks/${id}/runs`}>
                View all ({data.runs.length})
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        {recentRuns.length ? (
          <RunList playbookId={id} runs={recentRuns} />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No runs yet. Set Settings / Templates / Sequence first, then start a run.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
