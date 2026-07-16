"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { WorkflowCanvas } from "@/components/workflows/workflow-canvas";
import type { Workflow, WorkflowListItem } from "@/types/workflows";

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: workflow, isLoading } = useQuery<Workflow>({
    queryKey: ["workflow", id],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${id}`);
      if (!res.ok) throw new Error("Workflow not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: listData } = useQuery<{ workflows: WorkflowListItem[] }>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to load workflows");
      return res.json();
    },
  });

  if (isLoading || !workflow) {
    return (
      <div className="flex h-full min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full min-h-[100dvh] w-full overflow-hidden">
      <WorkflowCanvas workflow={workflow} workflows={listData?.workflows ?? []} />
    </div>
  );
}
