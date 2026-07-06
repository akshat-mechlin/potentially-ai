"use client";

import { useParams } from "next/navigation";
import { RunWorkflow } from "@/components/playbooks/run-workflow";
import { MobileHeaderTitle } from "@/components/layout/mobile-header-title";
import { useMobileApp } from "@/hooks/use-mobile-app";

export default function PlaybookRunDetailPage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const { isMobileApp } = useMobileApp();

  return (
    <>
      {isMobileApp && <MobileHeaderTitle title="Run" />}
      <RunWorkflow playbookId={id} runId={runId} />
    </>
  );
}
