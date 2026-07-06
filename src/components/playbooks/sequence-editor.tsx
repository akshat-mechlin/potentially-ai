"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DesktopOnly } from "@/components/mobile/primitives";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { SequenceStep } from "@/types/playbooks";
import { toast } from "sonner";

interface SequenceEditorProps {
  playbookId: string;
}

export function SequenceEditor({ playbookId }: SequenceEditorProps) {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const [busy, setBusy] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState<
    Array<{ delay_days: number; tone: string; goal_override: string }>
  >([{ delay_days: 3, tone: "friendly", goal_override: "Follow up on my previous note" }]);

  const { data: sequenceData } = useQuery<{ steps: SequenceStep[] }>({
    queryKey: ["playbook-sequence", playbookId],
    queryFn: () => fetch(`/api/playbooks/${playbookId}/sequence`).then((r) => r.json()),
    enabled: mounted && !!playbookId,
  });

  useEffect(() => {
    if (sequenceData?.steps?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- editor state mirrors fetched sequence
      setSequenceSteps(
        sequenceData.steps.map((s) => ({
          delay_days: s.delay_days,
          tone: s.tone,
          goal_override: s.goal_override ?? "",
        })),
      );
    }
  }, [sequenceData?.steps]);

  const saveSequence = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/sequence`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: sequenceSteps }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Sequence saved");
    } catch {
      toast.error("Failed to save sequence");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn(isMobileApp && "mobile-card-flat border-0 shadow-none")}>
      <CardHeader className={cn(isMobileApp && "px-4 pt-4 pb-2")}>
        <CardTitle className="text-base">Follow-up sequence</CardTitle>
        <DesktopOnly>
          <CardDescription>
            After the first email is sent, prospects are queued for follow-ups on business days.
          </CardDescription>
        </DesktopOnly>
      </CardHeader>
      <CardContent className={cn("space-y-4", isMobileApp && "px-4 pb-4")}>
        {sequenceSteps.map((step, index) => (
          <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Delay (business days)</Label>
              <Input
                type="number"
                value={step.delay_days}
                onChange={(e) => {
                  const next = [...sequenceSteps];
                  next[index] = { ...step, delay_days: Number(e.target.value) };
                  setSequenceSteps(next);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Tone</Label>
              <Input
                value={step.tone}
                onChange={(e) => {
                  const next = [...sequenceSteps];
                  next[index] = { ...step, tone: e.target.value };
                  setSequenceSteps(next);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Goal override</Label>
              <Input
                value={step.goal_override}
                onChange={(e) => {
                  const next = [...sequenceSteps];
                  next[index] = { ...step, goal_override: e.target.value };
                  setSequenceSteps(next);
                }}
              />
            </div>
          </div>
        ))}
        <div className={cn("flex gap-2", isMobileApp && "flex-col")}>
          <Button
            variant="outline"
            size="sm"
            className={cn(isMobileApp && "w-full rounded-xl")}
            onClick={() =>
              setSequenceSteps([
                ...sequenceSteps,
                { delay_days: 7, tone: "friendly", goal_override: "Checking in" },
              ])
            }
          >
            Add step
          </Button>
          <Button
            size="sm"
            onClick={saveSequence}
            disabled={busy}
            className={cn(isMobileApp && "w-full rounded-xl")}
          >
            Save sequence
          </Button>
        </div>
        <DesktopOnly>
          <p className="text-xs text-muted-foreground">
            Cron: POST /api/cron/playbook-sequences with Authorization: Bearer CRON_SECRET
          </p>
        </DesktopOnly>
      </CardContent>
    </Card>
  );
}
