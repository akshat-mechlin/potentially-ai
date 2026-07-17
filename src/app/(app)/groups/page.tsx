"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2, Cable, ArrowRight, Building2, ChevronRight } from "lucide-react";
import { GroupLogo } from "@/components/media/group-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceInviteModal } from "@/components/workspace/workspace-invite-modal";
import {
  MOBILE_BOTTOM_SHEET,
  DesktopOnly,
  MobileEmpty,
  MobileFab,
  MobileMenuItem,
  MobileMenuList,
  MobileSectionLabel,
} from "@/components/mobile/primitives";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import type { WorkspaceSummary } from "@/types";
import { toast } from "sonner";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function GroupsPageContent() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const handledCreateAction = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteWorkspace, setInviteWorkspace] = useState<{ id: string; name: string } | null>(null);
  const { refreshWorkspaces } = useWorkspaces();

  const { data: workspacesData, isLoading: workspacesLoading } = useQuery<{ workspaces: WorkspaceSummary[] }>({
    queryKey: ["workspaces"],
    queryFn: () => fetch("/api/workspaces").then((r) => r.json()),
    enabled: mounted,
  });

  const { data: connectorsData } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => fetch("/api/connectors").then((r) => r.json()),
    enabled: mounted,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(groupSchema),
  });

  useEffect(() => {
    if (searchParams.get("upgraded") === "1") {
      toast.success("Upgrade initiated. Your plan will update after payment completes.");
      router.replace("/groups", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const openFromStorage =
      sessionStorage.getItem("open-group-create") === "1" ||
      sessionStorage.getItem("open-workspace-create") === "1";
    const openFromQuery = searchParams.get("action") === "create";

    if (!openFromStorage && !openFromQuery) {
      handledCreateAction.current = false;
      return;
    }

    if (handledCreateAction.current) return;

    handledCreateAction.current = true;
    sessionStorage.removeItem("open-group-create");
    sessionStorage.removeItem("open-workspace-create");
    if (openFromQuery) {
      router.replace("/groups", { scroll: false });
    }
    setCreateOpen(true);
  }, [searchParams, router]);

  const onCreateGroup = async (formData: z.infer<typeof groupSchema>) => {
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create group");
      toast.success(`Group "${formData.name}" created`);
      setCreateOpen(false);
      reset();
      await refreshWorkspaces();
      if (result.id) {
        setInviteWorkspace({ id: result.id, name: result.name ?? formData.name });
        setInviteOpen(true);
        queryClient.invalidateQueries({ queryKey: ["workspace-detail", result.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    }
  };

  const workspaces = workspacesData?.workspaces ?? [];
  const connectedCount = connectorsData?.stats?.connected ?? 0;
  const loading = !mounted || workspacesLoading;

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      {!isMobileApp && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New group
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={isMobileApp ? MOBILE_BOTTOM_SHEET : undefined}>
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
        </DialogHeader>
        <form method="post" action="" onSubmit={handleSubmit(onCreateGroup)} className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <div className="space-y-2">
            <Label required>Group name</Label>
            <Input placeholder="Acme Ventures" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message as string}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting} className={isMobileApp ? "w-full rounded-xl" : undefined}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );

  const groupRows = workspaces.map((workspace) => (
    <Link
      key={workspace.id}
      href={`/groups/${workspace.id}`}
      className="group flex items-center gap-3 rounded-lg border border-border/80 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <GroupLogo
        name={workspace.name}
        src={workspace.logo_url}
        className="h-9 w-9 rounded-lg"
        iconClassName="h-4 w-4"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{workspace.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatRole(workspace.role)} · {workspace.member_count} member
          {workspace.member_count === 1 ? "" : "s"} · {workspace.plan ?? "free"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
    </Link>
  ));

  if (isMobileApp) {
    return (
      <>
        <div className="space-y-4 pb-24">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <p className="px-1 text-xs text-muted-foreground">
                Search combines contacts from every group you belong to. Tap a group for insights and settings.
              </p>

              <MobileMenuList>
                <MobileSectionLabel>Your groups</MobileSectionLabel>
                {workspaces.length === 0 ? (
                  <MobileEmpty>No groups yet</MobileEmpty>
                ) : (
                  groupRows
                )}
              </MobileMenuList>

              <MobileMenuList>
                <MobileMenuItem
                  href="/connectors"
                  icon={Cable}
                  label="Connectors"
                  trailing={
                    <span className="text-xs text-muted-foreground">
                      {connectedCount > 0
                        ? `${connectorsData?.stats?.accounts ?? connectedCount} linked`
                        : "None linked"}
                    </span>
                  }
                />
              </MobileMenuList>
            </>
          )}
        </div>

        <MobileFab onClick={() => setCreateOpen(true)} label="New group">
          <Plus className="h-6 w-6" />
        </MobileFab>
        {createDialog}
        <WorkspaceInviteModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          workspaceId={inviteWorkspace?.id}
          workspaceName={inviteWorkspace?.name}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DesktopOnly>
          <p className="text-sub text-muted-foreground">
            Search spans all groups you belong to automatically. Open a group for members, stats, and management.
          </p>
        </DesktopOnly>
        {createDialog}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Your groups
          </CardTitle>
          <CardDescription className="text-xs">
            Starter tier is included at no cost.{" "}
            <Link href="/pricing" className="text-primary hover:underline">
              Upgrade on the pricing page
            </Link>{" "}
            for higher limits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">No groups yet.</p>
              <Button className="mt-3" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first group
              </Button>
            </div>
          ) : (
            <div
              className={`space-y-2 ${
                workspaces.length > 6 ? "max-h-[28rem] overflow-y-auto overscroll-y-contain pr-1" : ""
              }`}
            >
              {groupRows}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cable className="h-4 w-4 text-primary" />
            Connectors
          </CardTitle>
          <CardDescription className="text-xs">
            Sync contacts from Google, Outlook, or CSV into your groups.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {connectedCount > 0
              ? `${connectorsData?.stats?.accounts ?? connectedCount} linked accounts`
              : "No accounts connected yet"}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/connectors">
              Open
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <WorkspaceInviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={inviteWorkspace?.id}
        workspaceName={inviteWorkspace?.name}
      />
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={null}>
      <GroupsPageContent />
    </Suspense>
  );
}
