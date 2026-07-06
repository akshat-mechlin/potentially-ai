"use client";

import { useParams } from "next/navigation";
import { RunList } from "@/components/playbooks/run-list";
import { StartRunForm } from "@/components/playbooks/start-run-form";
import { usePlaybook } from "@/hooks/use-playbook";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlaybookRunsPage() {
  const { id } = useParams<{ id: string }>();
  const { isMobileApp } = useMobileApp();
  const { data, isLoading } = usePlaybook(id);

  if (isLoading || !data) {
    return <Skeleton className="h-48" />;
  }

  return (
    <div className={isMobileApp ? "space-y-4" : "space-y-6"}>
      <StartRunForm playbookId={id} />
      <div className="space-y-2">
        {!isMobileApp && (
          <>
            <h2 className="text-sm font-semibold">Run history ({data.runs.length})</h2>
            <p className="text-sm text-muted-foreground">
              Click any run to review matches, drafts, approvals, and pipeline — even for past runs.
            </p>
          </>
        )}
        {isMobileApp && data.runs.length > 0 && (
          <p className="mobile-section-label">History · {data.runs.length}</p>
        )}
        <RunList playbookId={id} runs={data.runs} />
      </div>
    </div>
  );
}
