"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type AdminData = {
  users: Array<{ name: string; email: string; workspaces: number; admin: boolean }>;
  workspaces: Array<{ name: string; members: number; plan: string; contacts: number }>;
  featureFlags: Array<{ key: string; enabled: boolean }>;
};

export default function AdminPage() {
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, workspaces, and feature flags</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                  <span className="text-xs text-muted-foreground">{user.workspaces} workspaces</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspaces</CardTitle>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.featureFlags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between">
              <code className="text-sm">{flag.key}</code>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(enabled) => flagMutation.mutate({ key: flag.key, enabled })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
