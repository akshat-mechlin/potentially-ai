"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { PlaybookRun, Segment } from "@/types/playbooks";
import { playbookRunHref } from "@/lib/routes/playbook-runs";
import { toast } from "sonner";

interface StartRunFormProps {
  playbookId: string;
  compact?: boolean;
}

export function StartRunForm({ playbookId, compact }: StartRunFormProps) {
  const router = useRouter();
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();
  const [segmentId, setSegmentId] = useState<string>("all");
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: segmentsData } = useQuery<{ segments: Segment[] }>({
    queryKey: ["segments"],
    queryFn: () => fetch("/api/segments").then((r) => r.json()),
    enabled: mounted,
  });

  const startRun = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segment_id: segmentId === "all" ? undefined : segmentId,
          dry_run: dryRun,
        }),
      });
      if (!res.ok) throw new Error("Failed to start run");
      const run = (await res.json()) as PlaybookRun;
      toast.success(`${run.stats?.matched ?? 0} matched`);
      queryClient.invalidateQueries({ queryKey: ["playbook", playbookId] });
      router.push(playbookRunHref(run.id));
    } catch {
      toast.error("Failed to start run");
    } finally {
      setBusy(false);
    }
  };

  if (isMobileApp && !compact) {
    return (
      <div className="mobile-card-flat space-y-3 p-4">
        <p className="mobile-section-label">New run</p>
        <Select value={segmentId} onValueChange={setSegmentId}>
          <SelectTrigger className="w-full rounded-xl bg-muted/50">
            <SelectValue placeholder="All contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            {segmentsData?.segments.map((segment) => (
              <SelectItem key={segment.id} value={segment.id}>
                {segment.name} ({segment.contact_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
          <Label htmlFor={`dry-run-${playbookId}`} className="text-sm">
            Dry run
          </Label>
          <Switch
            id={`dry-run-${playbookId}`}
            checked={dryRun}
            onCheckedChange={setDryRun}
          />
        </div>
        <Button onClick={startRun} disabled={busy} className="h-11 w-full rounded-xl">
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          Match
        </Button>
      </div>
    );
  }

  const inner = (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label>Segment</Label>
        <Select value={segmentId} onValueChange={setSegmentId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            {segmentsData?.segments.map((segment) => (
              <SelectItem key={segment.id} value={segment.id}>
                {segment.name} ({segment.contact_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`dry-run-${playbookId}`}
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <Label htmlFor={`dry-run-${playbookId}`}>Dry run (no real emails)</Label>
      </div>
      <Button onClick={startRun} disabled={busy}>
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        Match contacts
      </Button>
    </div>
  );

  if (compact) return inner;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start a new run</CardTitle>
        <CardDescription>
          Match contacts from a segment or all groups. You can review results on the run screen
          immediately. No need to finish matching first.
        </CardDescription>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}
