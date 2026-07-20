"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DesktopOnly, MobileSegmented } from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatFeatureFlagLabel,
  getFeatureFlagDescription,
} from "@/lib/admin/feature-flags-catalog";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  workspaces: number;
  admin: boolean;
};

type AdminWorkspace = {
  id: string;
  name: string;
  members: number;
  plan: string;
  contacts: number;
};

type AdminData = {
  users: AdminUser[];
  workspaces: AdminWorkspace[];
  featureFlags: Array<{ key: string; enabled: boolean; description?: string | null }>;
};

type AdminTab = "users" | "groups" | "flags";

function FeatureFlagRow({
  flag,
  onToggle,
  disabled,
}: {
  flag: { key: string; enabled: boolean; description?: string | null };
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{formatFeatureFlagLabel(flag.key)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getFeatureFlagDescription(flag.key, flag.description)}
        </p>
      </div>
      <Switch checked={flag.enabled} disabled={disabled} onCheckedChange={onToggle} />
    </div>
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { isMobileApp } = useMobileApp();
  const [activeTab, setActiveTab] = useState<AdminTab>("flags");

  const { data, isLoading, error } = useQuery<AdminData>({
    queryKey: ["admin"],
    queryFn: async () => {
      const res = await fetch("/api/admin");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to load admin data");
      }
      return res.json();
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const flagMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "feature_flag", key, enabled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update flag");
      return body;
    },
    onMutate: async ({ key, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ["admin"] });
      const previous = queryClient.getQueryData<AdminData>(["admin"]);
      queryClient.setQueryData<AdminData>(["admin"], (current) => {
        if (!current) return current;
        return {
          ...current,
          featureFlags: current.featureFlags.map((flag) =>
            flag.key === key ? { ...flag, enabled } : flag,
          ),
        };
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["admin"], context.previous);
      toast.error(err instanceof Error ? err.message : "Failed to update feature flag");
    },
    onSuccess: () => toast.success("Feature flag updated"),
    onSettled: () => {
      void queryClient.refetchQueries({ queryKey: ["admin"] });
    },
  });

  const pendingFlagKey =
    flagMutation.isPending && flagMutation.variables ? flagMutation.variables.key : null;

  const userMutation = useMutation({
    mutationFn: async ({ userId, is_admin }: { userId: string; is_admin: boolean }) => {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "user", userId, is_admin }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update user");
      return body;
    },
    onSuccess: () => {
      invalidate();
      toast.success("User role updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update user"),
  });

  const workspaceMutation = useMutation({
    mutationFn: async ({ workspaceId, plan }: { workspaceId: string; plan: string }) => {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "workspace", workspaceId, plan }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update group plan");
      return body;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Group plan updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update group plan"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading admin panel...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">Admin access required</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "You do not have permission to view this page."}
        </p>
      </div>
    );
  }

  const usersPanel = (
    <Card className={isMobileApp ? "mobile-card-flat border-0 shadow-none" : undefined}>
      <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
        <CardTitle className="text-base">Users</CardTitle>
        <CardDescription>Promote members to platform admin or revoke access</CardDescription>
      </CardHeader>
      <CardContent className={isMobileApp ? "space-y-3 px-4 pb-4" : "space-y-3"}>
        {data?.users.map((user) => (
          <div
            key={user.id}
            className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{user.name}</p>
                {user.admin && <Badge>Admin</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user.workspaces} groups</p>
            </div>
            <div className="flex items-center gap-2 sm:min-w-[10rem]">
              <Label htmlFor={`role-${user.id}`} className="sr-only">
                Role for {user.name}
              </Label>
              <Select
                value={user.admin ? "admin" : "member"}
                onValueChange={(value) =>
                  userMutation.mutate({ userId: user.id, is_admin: value === "admin" })
                }
                disabled={userMutation.isPending}
              >
                <SelectTrigger id={`role-${user.id}`} className="h-9 w-full sm:w-[9rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const groupsPanel = (
    <Card className={isMobileApp ? "mobile-card-flat border-0 shadow-none" : undefined}>
      <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
        <CardTitle className="text-base">Groups</CardTitle>
        <CardDescription>Change billing plan for a group</CardDescription>
      </CardHeader>
      <CardContent className={isMobileApp ? "space-y-3 px-4 pb-4" : "space-y-3"}>
        {data?.workspaces.map((ws) => (
          <div
            key={ws.id}
            className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{ws.name}</p>
              <p className="text-xs text-muted-foreground">
                {ws.members} members · {ws.contacts} contacts
              </p>
            </div>
            <Select
              value={ws.plan}
              onValueChange={(plan) => workspaceMutation.mutate({ workspaceId: ws.id, plan })}
              disabled={workspaceMutation.isPending}
            >
              <SelectTrigger className="h-9 w-full capitalize sm:w-[9rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const flagsPanel = (
    <Card className={isMobileApp ? "mobile-card-flat border-0 shadow-none" : undefined}>
      <CardHeader className={isMobileApp ? "px-4 pt-4 pb-2" : undefined}>
        <CardTitle className="text-base">Feature flags</CardTitle>
        <CardDescription>Toggle platform capabilities for all users</CardDescription>
      </CardHeader>
      <CardContent className={isMobileApp ? "space-y-3 px-4 pb-4" : "space-y-3"}>
        {data?.featureFlags.map((flag) => (
          <FeatureFlagRow
            key={flag.key}
            flag={flag}
            disabled={pendingFlagKey === flag.key}
            onToggle={(enabled) => flagMutation.mutate({ key: flag.key, enabled })}
          />
        ))}
      </CardContent>
    </Card>
  );

  if (isMobileApp) {
    return (
      <div className="space-y-4 pb-24">
        <MobileSegmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "flags", label: "Flags" },
            { value: "users", label: "Users" },
            { value: "groups", label: "Groups" },
          ]}
        />
        {activeTab === "users" && usersPanel}
        {activeTab === "groups" && groupsPanel}
        {activeTab === "flags" && flagsPanel}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DesktopOnly>
        <p className="text-sub text-muted-foreground">Manage users, groups, and feature flags</p>
      </DesktopOnly>

      <div className="grid gap-6 lg:grid-cols-2">
        {usersPanel}
        {groupsPanel}
      </div>

      {flagsPanel}
    </div>
  );
}
