"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bot, Filter, ListFilter, Loader2, Plus, Workflow, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { WorkflowListItem } from "@/types/workflows";

const STEPS = [
  { icon: Zap, title: "Trigger", text: "Start manually, on a schedule, or when contacts land" },
  { icon: Filter, title: "ICP match", text: "Score people against the profile you define" },
  { icon: ListFilter, title: "Segment", text: "Save matches into a reusable Agent Mode list" },
  { icon: Bot, title: "Playbook agent", text: "Hand off into outreach you already configure" },
];

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ workflows: WorkflowListItem[] }>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to load workflows");
      return res.json();
    },
  });

  const workflows = data?.workflows ?? [];
  const firstId = workflows[0]?.id;

  useEffect(() => {
    if (!isLoading && firstId) {
      router.replace(`/workflows/${firstId}`);
    }
  }, [isLoading, firstId, router]);

  const createWorkflow = async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled workflow" }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to create");
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
      router.push(`/workflows/${payload.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workflow");
    }
  };

  if (isLoading || firstId) {
    return (
      <div className="flex h-full min-h-[100dvh] items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="workflow-empty relative flex h-full min-h-[100dvh] flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--foreground) 12%, transparent) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col gap-8 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Agent Mode</p>
            <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
              AI Workflow Playground
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Design automations visually: ICP match → segment → playbook agent → actions. Drag nodes,
              wire handles, and configure every step.
            </p>
          </div>
          <Button size="lg" className="shrink-0" onClick={() => void createWorkflow()}>
            <Plus className="mr-2 h-4 w-4" />
            Create workflow
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-4 text-sm font-semibold text-foreground">{step.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>

          <div className="flex min-h-[280px] flex-col justify-between rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:p-8">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Workflow className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-5 font-display text-2xl text-foreground">Start from a blank canvas</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                You get a full-screen editor with a node palette, configurable steps, and room to grow
                into multi-workflow runs.
              </p>
            </div>
            <Button className="mt-8 w-full sm:w-auto" onClick={() => void createWorkflow()}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first workflow
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
