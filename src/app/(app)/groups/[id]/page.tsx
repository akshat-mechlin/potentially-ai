"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Cable,
  Loader2,
  LogOut,
  Plus,
  Search,
  Trash2,
  Users,
  BookOpen,
  Contact,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WorkspaceInviteModal } from "@/components/workspace/workspace-invite-modal";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import {
  MobileEmpty,
  MobileFab,
  MobileMenuList,
  MobileSectionLabel,
} from "@/components/mobile/primitives";
import type { WorkspaceDetail } from "@/lib/data/workspace-management";
import { toast } from "sonner";

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function GroupDetailPage() {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params.id;
  const { refreshWorkspaces, evictWorkspace } = useWorkspaces();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const { data: group, isLoading } = useQuery<WorkspaceDetail>({
    queryKey: ["workspace-detail", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${groupId}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to load group");
      }
      return res.json();
    },
    enabled: mounted && Boolean(groupId),
  });

  const invalidateAll = async (workspaceId: string) => {
    evictWorkspace(workspaceId);
    await refreshWorkspaces();
  };

  const handleLeave = async () => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/workspaces/${groupId}/leave`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to leave group");
      toast.success(payload.message ?? "You left the group");
      setLeaveOpen(false);
      await invalidateAll(groupId);
      router.replace("/groups");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave group");
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    setActionBusy(true);
    try {
      const res = await fetch(`/api/workspaces/${groupId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to delete group");
      toast.success(payload.message ?? "Group deleted");
      setDeleteOpen(false);
      await invalidateAll(groupId);
      router.replace("/groups");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete group");
    } finally {
      setActionBusy(false);
    }
  };

  const loading = !mounted || isLoading;
  const soleOwner = group?.is_owner && group.member_count <= 1;
  const canLeave = group && !group.is_owner;
  const canDelete = group?.is_owner;

  const statCards = group && (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Members", value: group.member_count, icon: Users },
        { label: "Contacts", value: group.contacts_count, icon: Contact },
        { label: "Playbooks", value: group.playbooks_count, icon: BookOpen },
        { label: "Connected accounts", value: group.connected_accounts, icon: Cable },
      ].map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <stat.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-lg font-semibold tabular-nums">{stat.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const membersList = group && (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Team members</CardTitle>
        <CardDescription className="text-xs">
          {group.can_manage ? "Invite teammates to share contacts in this group." : "Members in this group."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {group.members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members yet.</p>
        ) : (
          group.members.map((member) => (
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
        {group.can_manage && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Invite member
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const actions = group && (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className="justify-start" asChild>
          <Link href={`/search?group=${group.id}`}>
            <Search className="mr-2 h-3.5 w-3.5" />
            Search this group&apos;s network
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="justify-start" asChild>
          <Link href="/connectors">
            <Cable className="mr-2 h-3.5 w-3.5" />
            Manage connectors
          </Link>
        </Button>
        {group.can_manage && (
          <Button variant="outline" size="sm" className="justify-start" onClick={() => setInviteOpen(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Invite members
          </Button>
        )}
        {canLeave && (
          <Button
            variant="outline"
            size="sm"
            className="justify-start text-destructive hover:text-destructive"
            onClick={() => setLeaveOpen(true)}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Leave group
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="justify-start text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {soleOwner ? "Delete group" : "Delete group (owner only)"}
          </Button>
        )}
        {group.is_owner && group.member_count > 1 && (
          <p className="text-xs text-muted-foreground">
            Owners cannot leave while other members remain. Delete the group or transfer ownership first.
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">Group not found or you don&apos;t have access.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/groups">Back to groups</Link>
        </Button>
      </div>
    );
  }

  if (isMobileApp) {
    return (
      <>
        <div className="space-y-4 pb-24">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
              <Link href="/groups">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">{group.name}</h1>
              <p className="text-xs text-muted-foreground">
                {formatRole(group.role)} · {group.plan ?? "free"}
                {group.joined_at ? ` · Joined ${format(new Date(group.joined_at), "MMM d, yyyy")}` : ""}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Members", value: group.member_count },
              { label: "Contacts", value: group.contacts_count },
              { label: "Playbooks", value: group.playbooks_count },
              { label: "Accounts", value: group.connected_accounts },
            ].map((stat) => (
              <div key={stat.label} className="mobile-card-flat p-3">
                <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <MobileMenuList>
            <MobileSectionLabel>Quick actions</MobileSectionLabel>
            <Link href={`/search?group=${group.id}`} className="mobile-menu-item">
              <Search className="h-4 w-4" />
              <span>Search this group</span>
            </Link>
            <Link href="/connectors" className="mobile-menu-item">
              <Cable className="h-4 w-4" />
              <span>Connectors</span>
            </Link>
            {group.can_manage && (
              <button type="button" className="mobile-menu-item w-full text-left" onClick={() => setInviteOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>Invite members</span>
              </button>
            )}
            {canLeave && (
              <button
                type="button"
                className="mobile-menu-item w-full text-left text-destructive"
                onClick={() => setLeaveOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                <span>Leave group</span>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="mobile-menu-item w-full text-left text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete group</span>
              </button>
            )}
          </MobileMenuList>

          <MobileMenuList>
            <MobileSectionLabel>Members</MobileSectionLabel>
            {group.members.length === 0 ? (
              <MobileEmpty>No members</MobileEmpty>
            ) : (
              group.members.map((member) => (
                <div key={member.id} className="mobile-list-row">
                  <span className="mobile-menu-item-icon-muted">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.connections_count} connections</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {member.role}
                  </span>
                </div>
              ))
            )}
          </MobileMenuList>
        </div>

        {group.can_manage && (
          <MobileFab onClick={() => setInviteOpen(true)} label="Invite">
            <Plus className="h-6 w-6" />
          </MobileFab>
        )}

        <WorkspaceInviteModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          workspaceId={group.id}
          workspaceName={group.name}
        />

        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave {group.name}?</DialogTitle>
              <DialogDescription>
                You will lose access to this group&apos;s shared network. You can rejoin if invited again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={actionBusy} onClick={() => setLeaveOpen(false)}>
                Cancel
              </Button>
              <Button disabled={actionBusy} onClick={handleLeave}>
                {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {group.name}?</DialogTitle>
              <DialogDescription>
                This permanently deletes the group, all contacts, playbooks, and settings. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={actionBusy} onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={actionBusy} onClick={handleDelete}>
                {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">{group.name}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Your role: {formatRole(group.role)} · Plan: {group.plan ?? "free"}
              {group.joined_at ? ` · Joined ${format(new Date(group.joined_at), "MMM d, yyyy")}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Search across all your groups from the main search page. Use actions below to focus on this group.
            </p>
          </div>
        </div>
      </div>

      {statCards}

      <div className="grid gap-4 lg:grid-cols-2">
        {membersList}
        {actions}
      </div>

      <WorkspaceInviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={group.id}
        workspaceName={group.name}
      />

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave {group.name}?</DialogTitle>
            <DialogDescription>
              You will lose access to this group&apos;s shared network. You can rejoin if invited again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={actionBusy} onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={actionBusy} onClick={handleLeave}>
              {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {group.name}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the group, all contacts, playbooks, and settings. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={actionBusy} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={actionBusy} onClick={handleDelete}>
              {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
