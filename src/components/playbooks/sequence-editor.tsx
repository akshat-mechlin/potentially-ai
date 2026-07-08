"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldHint } from "@/components/playbooks/field-hint";
import { DesktopOnly } from "@/components/mobile/primitives";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { SequenceStep } from "@/types/playbooks";
import { toast } from "sonner";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const;

const TONE_PRESETS = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Direct" },
] as const;

const GOAL_PRESETS = [
  { value: "Follow up on my previous note", label: "Follow up on previous note" },
  { value: "Checking in", label: "Checking in" },
  { value: "Share a helpful resource", label: "Share a helpful resource" },
  { value: "Ask for a short call", label: "Ask for a short call" },
  { value: "Confirm interest and next steps", label: "Confirm interest & next steps" },
] as const;

const CUSTOM = "custom";
const DEFAULT_WEEKDAYS = [1, 2, 3, 4, 5];

type DraftStep = {
  delay_days: number;
  tone: string;
  goal_override: string;
  allowed_weekdays: number[];
};

function normalizeWeekdays(values?: number[] | null) {
  if (!values?.length) return [...DEFAULT_WEEKDAYS];
  return [...new Set(values.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b);
}

function toneSelectValue(tone: string) {
  return TONE_PRESETS.some((p) => p.value === tone) ? tone : CUSTOM;
}

function goalSelectValue(goal: string) {
  return GOAL_PRESETS.some((p) => p.value === goal) ? goal : goal ? CUSTOM : GOAL_PRESETS[0].value;
}

interface SequenceEditorProps {
  playbookId: string;
}

export function SequenceEditor({ playbookId }: SequenceEditorProps) {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const [busy, setBusy] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState<DraftStep[]>([
    {
      delay_days: 3,
      tone: "friendly",
      goal_override: "Follow up on my previous note",
      allowed_weekdays: [...DEFAULT_WEEKDAYS],
    },
  ]);

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
          allowed_weekdays: normalizeWeekdays(s.allowed_weekdays),
        })),
      );
    }
  }, [sequenceData?.steps]);

  const canSave = useMemo(
    () => sequenceSteps.every((step) => step.allowed_weekdays.length > 0),
    [sequenceSteps],
  );

  const updateStep = (index: number, patch: Partial<DraftStep>) => {
    setSequenceSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const toggleWeekday = (index: number, day: number) => {
    const current = sequenceSteps[index].allowed_weekdays;
    const nextDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    updateStep(index, { allowed_weekdays: nextDays });
  };

  const saveSequence = async () => {
    if (!canSave) {
      toast.error("Select at least one weekday for each step");
      return;
    }
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
            After the first email is sent, cron queues follow-ups after the delay, only on the days
            you allow for each step.
          </CardDescription>
        </DesktopOnly>
      </CardHeader>
      <CardContent className={cn("space-y-4", isMobileApp && "px-4 pb-4")}>
        {sequenceSteps.map((step, index) => {
          const toneValue = toneSelectValue(step.tone);
          const goalValue = goalSelectValue(step.goal_override);

          return (
            <div key={index} className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Step {index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <FieldHint
                    label="Delay (days)"
                    hint="Wait this many days after the previous send before this follow-up becomes due. The actual send still only happens on allowed weekdays."
                  />
                  <Input
                    type="number"
                    min={0}
                    value={step.delay_days}
                    onChange={(e) => updateStep(index, { delay_days: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <FieldHint
                    label="Trigger on weekdays"
                    hint="Only fire this follow-up on selected days. After the delay passes, the job waits until the next allowed weekday."
                  />
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = step.allowed_weekdays.includes(day.value);
                      return (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className="rounded-full px-3"
                          onClick={() => toggleWeekday(index, day.value)}
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <FieldHint
                    label="Tone"
                    hint="Writing style for this follow-up email. Pick a preset, or Custom to type your own tone."
                  />
                  <Select
                    value={toneValue}
                    onValueChange={(value) => {
                      if (value === CUSTOM) {
                        if (toneSelectValue(step.tone) !== CUSTOM) {
                          updateStep(index, { tone: "" });
                        }
                        return;
                      }
                      updateStep(index, { tone: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {toneValue === CUSTOM && (
                    <Input
                      className="mt-2"
                      value={step.tone}
                      onChange={(e) => updateStep(index, { tone: e.target.value })}
                      placeholder="Describe custom tone"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <FieldHint
                    label="Goal override"
                    hint="What this follow-up should achieve. Presets cover common cases; Custom lets you write your own goal."
                  />
                  <Select
                    value={goalValue}
                    onValueChange={(value) => {
                      if (value === CUSTOM) {
                        if (goalSelectValue(step.goal_override) !== CUSTOM) {
                          updateStep(index, { goal_override: "" });
                        }
                        return;
                      }
                      updateStep(index, { goal_override: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {goalValue === CUSTOM && (
                    <Input
                      className="mt-2"
                      value={step.goal_override}
                      onChange={(e) => updateStep(index, { goal_override: e.target.value })}
                      placeholder="Describe custom goal"
                    />
                  )}
                </div>
              </div>
              {sequenceSteps.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() =>
                    setSequenceSteps((prev) => prev.filter((_, stepIndex) => stepIndex !== index))
                  }
                >
                  Remove step
                </Button>
              )}
            </div>
          );
        })}
        <div className={cn("flex gap-2", isMobileApp && "flex-col")}>
          <Button
            variant="outline"
            size="sm"
            className={cn(isMobileApp && "w-full rounded-xl")}
            onClick={() =>
              setSequenceSteps([
                ...sequenceSteps,
                {
                  delay_days: 7,
                  tone: "friendly",
                  goal_override: "Checking in",
                  allowed_weekdays: [...DEFAULT_WEEKDAYS],
                },
              ])
            }
          >
            Add step
          </Button>
          <Button
            size="sm"
            onClick={saveSequence}
            disabled={busy || !canSave}
            className={cn(isMobileApp && "w-full rounded-xl")}
          >
            Save sequence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
