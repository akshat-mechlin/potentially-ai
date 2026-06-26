"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const users = [
  { name: "Alex Morgan", email: "alex@potentially.ai", workspaces: 2, admin: false },
  { name: "Admin User", email: "admin@potentially.ai", workspaces: 5, admin: true },
];

const workspaces = [
  { name: "Acme Ventures", members: 3, plan: "pro", contacts: 847 },
  { name: "Beta Corp", members: 1, plan: "free", contacts: 120 },
];

const featureFlags = [
  { key: "ai_search", enabled: true },
  { key: "graph_view", enabled: true },
  { key: "outreach_engine", enabled: true },
  { key: "team_collaboration", enabled: false },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, workspaces, and feature flags</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.map((user) => (
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
            {workspaces.map((ws) => (
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
          {featureFlags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between">
              <code className="text-sm">{flag.key}</code>
              <Switch checked={flag.enabled} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
