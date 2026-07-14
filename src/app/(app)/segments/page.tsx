"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Trash2 } from "lucide-react";
import {
  MOBILE_BOTTOM_SHEET,
  DesktopOnly,
  MobileEmpty,
  MobileFab,
  MobileOnly,
} from "@/components/mobile/primitives";
import { MobileLargeTitle, MobileListSection, MobileListTile } from "@/components/mobile/native-ui";
import { useIsClient } from "@/hooks/use-is-client";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import type { Segment } from "@/types/playbooks";
import { toast } from "sonner";

export default function SegmentsPage() {
  const router = useRouter();
  const mounted = useIsClient();
  const { enabled, loading: flagsLoading } = usePlaybookEnabled();
  const { isMobile } = useMobileApp();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<{ segments: Segment[] }>({
    queryKey: ["segments"],
    queryFn: () => fetch("/api/segments").then((r) => r.json()),
    enabled: mounted,
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const created = (await res.json()) as Segment;
      if (!res.ok) throw new Error("Failed to create segment");
      toast.success("Segment created");
      setOpen(false);
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      if (created?.id) {
        router.push(`/segments/${created.id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create segment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const confirmed = await confirm({
      title: "Delete this segment?",
      description: "Contacts stay in your network. Only this segment grouping will be removed.",
      confirmLabel: "Delete segment",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Segment deleted");
      queryClient.invalidateQueries({ queryKey: ["segments"] });
    } catch {
      toast.error("Failed to delete segment");
    }
  };

  if (mounted && !flagsLoading && !enabled) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Segments require Playbooks. Enable <code>playbook_mode</code> in Admin.
        </CardContent>
      </Card>
    );
  }

  const createDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={isMobile ? MOBILE_BOTTOM_SHEET : undefined}>
        <DialogHeader>
          <DialogTitle>New segment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fintech CTOs" />
          </div>
          <DesktopOnly>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </DesktopOnly>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full rounded-xl">
            {saving ? "Creating..." : "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!mounted || isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <MobileOnly>
        <MobileLargeTitle title="Segments" subtitle="Saved lists for Playbook targeting" />
        <MobileListSection>
          {data?.segments.map((segment) => (
            <MobileListTile
              key={segment.id}
              href={`/segments/${segment.id}`}
              icon={Users}
              title={segment.name}
              subtitle={segment.description ?? `${segment.contact_count} contacts`}
              trailing={
                <span className="text-xs tabular-nums text-muted-foreground">
                  {segment.contact_count}
                </span>
              }
              iconMuted
            />
          ))}
          {!data?.segments.length && <MobileEmpty>No segments yet</MobileEmpty>}
        </MobileListSection>
        <MobileFab onClick={() => setOpen(true)} label="New segment">
          <Plus className="h-6 w-6" />
        </MobileFab>
      </MobileOnly>

      <DesktopOnly className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sub text-muted-foreground">Saved contact lists for Playbook targeting</p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New segment
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data?.segments.map((segment) => (
            <Link key={segment.id} href={`/segments/${segment.id}`} className="group block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base group-hover:text-primary">{segment.name}</CardTitle>
                      {segment.description && (
                        <CardDescription className="mt-1 line-clamp-2">{segment.description}</CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={(e) => handleDelete(segment.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{segment.contact_count} contacts</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
          {!data?.segments.length && (
            <Card className="col-span-full border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No segments yet. Select contacts on the Contacts page or create one here.
              </CardContent>
            </Card>
          )}
        </div>
      </DesktopOnly>

      {createDialog}
      {confirmDialog}
    </>
  );
}
