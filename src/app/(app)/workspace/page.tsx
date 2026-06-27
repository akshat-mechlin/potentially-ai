"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Mail,
  Calendar,
  Upload,
  Plus,
  Loader2,
  CheckCircle,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/hooks/use-is-client";
import { toast } from "sonner";

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const SYNC_SOURCES: Record<string, string> = {
  Google: "google",
  Outlook: "outlook",
  "CSV Import": "csv",
};

const ICONS: Record<string, typeof Mail> = {
  Google: Mail,
  Outlook: Calendar,
  "CSV Import": Upload,
};

export default function WorkspacePage() {
  const mounted = useIsClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["workspace-members"],
    queryFn: () => fetch("/api/workspace").then((r) => r.json()),
    enabled: mounted,
  });

  const { data: connectionsData, isLoading: connectionsLoading } = useQuery({
    queryKey: ["workspace-connections"],
    queryFn: () => fetch("/api/workspace?type=connections").then((r) => r.json()),
    enabled: mounted,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(workspaceSchema),
  });

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors, isSubmitting: inviting },
  } = useForm({
    resolver: zodResolver(inviteSchema),
  });

  const onCreateWorkspace = async (data: z.infer<typeof workspaceSchema>) => {
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to create workspace");
      toast.success(`Workspace "${data.name}" created`);
      setCreateOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ["workspace-members"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create workspace");
    }
  };

  const onInvite = async (data: z.infer<typeof inviteSchema>) => {
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send invite");
      toast.success(result.message);
      setInviteOpen(false);
      resetInvite();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    }
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: SYNC_SOURCES[provider] ?? "google" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Sync failed");
      toast.success(result.message ?? `${provider} sync started`);
      queryClient.invalidateQueries({ queryKey: ["workspace-connections"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setTimeout(() => setSyncing(null), 2000);
    }
  };

  const connections = connectionsData?.connections ?? [];
  const members = membersData?.members ?? [];
  const loadingConnections = !mounted || connectionsLoading;
  const loadingMembers = !mounted || membersLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sub text-muted-foreground">Manage connections, team, and data sources</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreateWorkspace)} className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace name</Label>
                <Input placeholder="Acme Ventures" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message as string}</p>
                )}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Accounts</CardTitle>
            <CardDescription>Sync contacts and calendar data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingConnections
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                ))
              : connections.map((conn: { provider: string; status: string; lastSync: string; contacts: number }) => {
              const Icon = ICONS[conn.provider] ?? Mail;
              return (
                <div key={conn.provider} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{conn.provider}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.contacts} contacts · Last sync {conn.lastSync}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.status === "active" || conn.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(conn.provider)}
                      disabled={syncing === conn.provider}
                    >
                      {syncing === conn.provider ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Sync"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
            {syncing && (
              <div className="space-y-2">
                <Progress value={65} />
                <p className="text-xs text-muted-foreground">Syncing {syncing}...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
            <CardDescription>Manage workspace access and roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingMembers
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))
              : members.map((member: { name: string; email: string; role: string }) => (
              <div key={member.email} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                  {member.role}
                </span>
              </div>
            ))}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite team member</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleInviteSubmit(onInvite)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input type="email" placeholder="colleague@company.com" {...registerInvite("email")} />
                    {inviteErrors.email && (
                      <p className="text-xs text-destructive">{inviteErrors.email.message as string}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={inviting} className="w-full">
                    {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send invite
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
