"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Plus, Loader2, Cable, ArrowRight, Building2, Check } from "lucide-react";
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

type GroupsDashboardResponse = {
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    connections_count: number;
  }>;
};

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function GroupsPage() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const handledCreateAction = useRef(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteWorkspace, setInviteWorkspace] = useState<{ id: string; name: string } | null>(
    null,
  );
  const { currentWorkspace, switchWorkspace, refreshWorkspaces } = useWorkspaces();

  const workspaceId = currentWorkspace?.id;

  const { data, isLoading } = useQuery<GroupsDashboardResponse>({
    queryKey: ["workspace-dashboard", workspaceId],
    queryFn: () =>
      fetch(`/api/workspace${workspaceId ? `?workspace_id=${workspaceId}` : ""}`).then((r) =>
        r.json(),
      ),
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
      toast.success("Upgrade initiated — your plan will update after payment completes.");
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
        switchWorkspace(result);
        setInviteWorkspace({ id: result.id, name: result.name ?? formData.name });
        setInviteOpen(true);
      }
      queryClient.invalidateQueries({ queryKey: ["workspace-dashboard"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    }
  };

  const openInviteModal = () => {
    if (!activeWorkspace) return;
    setInviteWorkspace({ id: activeWorkspace.id, name: activeWorkspace.name });
    setInviteOpen(true);
  };

  const workspaces = data?.workspaces ?? [];
  const members = data?.members ?? [];
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) ?? data?.activeWorkspace ?? null;
  const connectedCount = connectorsData?.stats?.connected ?? 0;
  const loading = !mounted || isLoading;

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      {!isMobileApp && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className={isMobileApp ? MOBILE_BOTTOM_SHEET : undefined}>
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onCreateGroup)} className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <div className="space-y-2">
            <Label>Group name</Label>
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
              <MobileMenuList>
                <MobileSectionLabel>Your groups</MobileSectionLabel>
                {workspaces.length === 0 ? (
                  <MobileEmpty>No groups yet</MobileEmpty>
                ) : (
                  workspaces.map((workspace) => {
                    const isActive = workspace.id === activeWorkspace?.id;
                    return (
                      <div key={workspace.id} className="mobile-list-row">
                        <span className="mobile-menu-item-icon-muted">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium">{workspace.name}</p>
                            {isActive && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                <Check className="h-2.5 w-2.5" />
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatRole(workspace.role)} · {workspace.member_count} members ·{" "}
                            {workspace.plan ?? "free"}
                          </p>
                        </div>
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 shrink-0 rounded-full px-3 text-xs"
                            onClick={() => switchWorkspace(workspace)}
                          >
                            Switch
                          </Button>
                        )}
                      </div>
                    );
                  })
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

              <MobileMenuList>
                <MobileSectionLabel>
                  {activeWorkspace ? activeWorkspace.name : "Team members"}
                </MobileSectionLabel>
                {members.length === 0 ? (
                  <MobileEmpty>No members yet</MobileEmpty>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="mobile-list-row">
                      <span className="mobile-menu-item-icon-muted">
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.connections_count} connection
                          {member.connections_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                        {member.role}
                      </span>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  className="mobile-menu-item w-full text-left"
                  disabled={!activeWorkspace}
                  onClick={openInviteModal}
                >
                  <span className="mobile-menu-item-icon">
                    <Plus className="h-4 w-4" />
                  </span>
                  <span className="font-medium">Invite member</span>
                </button>
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
          workspaceId={inviteWorkspace?.id ?? activeWorkspace?.id}
          workspaceName={inviteWorkspace?.name ?? activeWorkspace?.name}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DesktopOnly>
          <p className="text-sub text-muted-foreground">
            Manage groups, invite teammates, and sync connectors. Search spans all groups you belong to
            automatically.
          </p>
        </DesktopOnly>
        {createDialog}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Your Groups
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
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
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
              className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${
                workspaces.length > 9
                  ? "max-h-[calc(9*3.25rem+2rem)] overflow-y-auto overscroll-y-contain pr-1 sm:max-h-[calc(5*3.25rem+1rem)] lg:max-h-[calc(3*3.25rem+0.5rem)]"
                  : ""
              }`}
            >
              {workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspace?.id;
                return (
                  <div
                    key={workspace.id}
                    className={`rounded-lg border px-3 py-2.5 ${
                      isActive ? "border-primary/40 bg-primary/5" : "border-border/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium">{workspace.name}</p>
                          {isActive && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              <Check className="h-2.5 w-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatRole(workspace.role)} · {workspace.member_count} member
                          {workspace.member_count === 1 ? "" : "s"} · {workspace.plan ?? "free"}
                        </p>
                      </div>
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-xs"
                          onClick={() => switchWorkspace(workspace)}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cable className="h-4 w-4 text-primary" />
              Connectors
            </CardTitle>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
            <CardDescription className="text-xs">
              {activeWorkspace ? activeWorkspace.name : "Group members"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground">No members yet.</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {member.connections_count} connection{member.connections_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {member.role}
                  </span>
                </div>
              ))
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!activeWorkspace}
              onClick={openInviteModal}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Invite member
            </Button>
          </CardContent>
        </Card>
      </div>

      <WorkspaceInviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={inviteWorkspace?.id ?? activeWorkspace?.id}
        workspaceName={inviteWorkspace?.name ?? activeWorkspace?.name}
      />
    </div>
  );
}
