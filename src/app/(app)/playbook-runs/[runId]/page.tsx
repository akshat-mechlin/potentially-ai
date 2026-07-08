"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { RunWorkflow } from "@/components/playbooks/run-workflow";
import { PlaybookShell } from "@/components/playbooks/playbook-shell";
import { MobileHeaderTitle } from "@/components/layout/mobile-header-title";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { PlaybookProspect, PlaybookRun } from "@/types/playbooks";

type RunDetailResponse = {
  run: PlaybookRun;
  prospects: PlaybookProspect[];
};

export default function PlaybookRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();

  const { data, isLoading, isError } = useQuery<RunDetailResponse>({
    queryKey: ["playbook-run", runId],
    queryFn: async () => {
      const res = await fetch(`/api/playbooks/runs/${runId}`);
      if (!res.ok) {
        throw new Error("Run not found");
      }
      return res.json();
    },
    enabled: mounted && !!runId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError || !data?.run) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Run not found or you don&apos;t have access.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {isMobileApp && <MobileHeaderTitle title="Run" />}
      <PlaybookShell playbookId={data.run.playbook_id}>
        <RunWorkflow playbookId={data.run.playbook_id} runId={runId} />
      </PlaybookShell>
    </>
  );
}
