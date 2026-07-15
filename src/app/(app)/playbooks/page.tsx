"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { Playbook } from "@/types/playbooks";
import { toast } from "sonner";

function CreatePlaybookDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (playbook: Playbook) => void;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, description }),
      });
      if (!res.ok) throw new Error("Failed to create playbook");
      const playbook = (await res.json()) as Playbook;
      toast.success("Playbook created");
      onOpenChange(false);
      setName("");
      setGoal("");
      setDescription("");
      onCreated(playbook);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create playbook");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mobile-more-sheet bottom-0 top-auto max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-b-0 sm:max-w-lg sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border">
        <DialogHeader>
          <DialogTitle>New playbook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <div className="space-y-2">
            <Label required>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Book intro calls" />
          </div>
          <div className="space-y-2">
            <Label>Goal</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="15-minute intro call" />
          </div>
          <div className="space-y-2 desktop-only">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PlaybooksPage() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const { enabled, loading: flagsLoading } = usePlaybookEnabled();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery<{ playbooks: Playbook[] }>({
    queryKey: ["playbooks"],
    queryFn: () => fetch("/api/playbooks").then((r) => r.json()),
    enabled: mounted,
  });

  const onCreated = (playbook: Playbook) => {
    queryClient.invalidateQueries({ queryKey: ["playbooks"] });
    window.location.href = `/playbooks/${playbook.id}`;
  };

  if (mounted && !flagsLoading && !enabled) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Playbooks are disabled. Enable <code>playbook_mode</code> in Admin.
        </CardContent>
      </Card>
    );
  }

  if (!mounted || isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isMobileApp) {
    return (
      <>
        <div className="mobile-menu-list">
          {data?.playbooks.map((playbook) => (
            <Link key={playbook.id} href={`/playbooks/${playbook.id}`} className="mobile-menu-item">
              <span className="mobile-menu-item-icon-muted">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{playbook.name}</span>
              <Badge variant={playbook.status === "active" ? "default" : "secondary"} className="shrink-0 text-[10px]">
                {playbook.status}
              </Badge>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          {!data?.playbooks.length && (
            <div className="mobile-empty">No playbooks yet</div>
          )}
        </div>

        <button type="button" className="mobile-fab" onClick={() => setOpen(true)} aria-label="New playbook">
          <Plus className="h-6 w-6" />
        </button>

        <CreatePlaybookDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sub text-muted-foreground">
          Warm-path-first outreach workflows with human-in-the-loop approval
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New playbook
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {data?.playbooks.map((playbook) => (
          <Link key={playbook.id} href={`/playbooks/${playbook.id}`}>
            <Card className="h-full transition-all hover:border-primary/30 hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{playbook.name}</CardTitle>
                  </div>
                  <Badge variant={playbook.status === "active" ? "default" : "secondary"}>
                    {playbook.status}
                  </Badge>
                </div>
                {playbook.description && <CardDescription>{playbook.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2">
                {playbook.goal && (
                  <p className="text-sm text-muted-foreground">Goal: {playbook.goal}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{playbook.automation_level}</Badge>
                  <Badge variant="outline">{playbook.outreach_mode.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex items-center justify-end pt-2 text-sm text-primary">
                  Open playbook
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {!data?.playbooks.length && (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Play className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Create your first Playbook to match ICP contacts and run assist-mode outreach.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <CreatePlaybookDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
    </div>
  );
}
