"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DesktopOnly, MobileSegmented } from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const FLAG_LABELS: Record<string, string> = {
  ai_search: "AI-powered network search",
  graph_view: "Interactive network graph",
  outreach_engine: "AI outreach message generation",
  team_collaboration: "Group invites and team features",
  beta_connectors: "Beta connector integrations",
  billing_enforcement: "Enforce plan limits on search and imports",
};

type AdminData = {
  users: Array<{ name: string; email: string; workspaces: number; admin: boolean }>;
  workspaces: Array<{ name: string; members: number; plan: string; contacts: number }>;
  featureFlags: Array<{ key: string; enabled: boolean; description?: string | null }>;
};

type AdminTab = "users" | "groups" | "flags";

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

  const flagMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) throw new Error("Failed to update flag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Feature flag updated");
    },
    onError: () => toast.error("Failed to update feature flag"),
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

  const usersPanel = isMobileApp ? (
    <div className="mobile-menu-list">
      {data?.users.map((user) => (
        <div key={user.email} className="mobile-list-row">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {user.admin && <Badge className="text-[10px]">Admin</Badge>}
            <span className="text-[10px] text-muted-foreground">{user.workspaces} groups</span>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.users.map((user) => (
          <div key={user.email} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {user.admin && <Badge>Admin</Badge>}
              <span className="text-xs text-muted-foreground">{user.workspaces} groups</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const groupsPanel = isMobileApp ? (
    <div className="mobile-menu-list">
      {data?.workspaces.map((ws) => (
        <div key={ws.name} className="mobile-list-row">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{ws.name}</p>
            <p className="text-xs text-muted-foreground">
              {ws.members} members · {ws.contacts} contacts
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {ws.plan}
          </Badge>
        </div>
      ))}
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Groups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.workspaces.map((ws) => (
          <div key={ws.name} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{ws.name}</p>
              <p className="text-xs text-muted-foreground">
                {ws.members} members · {ws.contacts} contacts
              </p>
            </div>
            <Badge variant="outline">{ws.plan}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const flagsPanel = isMobileApp ? (
    <div className="mobile-menu-list">
      {data?.featureFlags.map((flag) => (
        <div key={flag.key} className="mobile-list-row items-start gap-3 py-3">
          <div className="min-w-0 flex-1">
            <code className="text-xs">{flag.key}</code>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {flag.description ?? FLAG_LABELS[flag.key] ?? "No description"}
            </p>
          </div>
          <Switch
            checked={flag.enabled}
            onCheckedChange={(enabled) => flagMutation.mutate({ key: flag.key, enabled })}
          />
        </div>
      ))}
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature Flags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.featureFlags.map((flag) => (
          <div key={flag.key} className="flex items-center justify-between gap-4">
            <div>
              <code className="text-sm">{flag.key}</code>
              <p className="text-xs text-muted-foreground">
                {flag.description ?? FLAG_LABELS[flag.key] ?? "No description"}
              </p>
            </div>
            <Switch
              checked={flag.enabled}
              onCheckedChange={(enabled) => flagMutation.mutate({ key: flag.key, enabled })}
            />
          </div>
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
