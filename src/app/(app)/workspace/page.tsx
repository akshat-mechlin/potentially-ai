"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { toast } from "sonner";

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

const connections = [
  { provider: "Google", icon: Mail, status: "active", lastSync: "2 hours ago", contacts: 342 },
  { provider: "Outlook", icon: Calendar, status: "active", lastSync: "1 day ago", contacts: 156 },
  { provider: "CSV Import", icon: Upload, status: "completed", lastSync: "3 days ago", contacts: 89 },
];

const members = [
  { name: "Alex Morgan", email: "alex@acme.com", role: "Owner" },
  { name: "Jordan Lee", email: "jordan@acme.com", role: "Admin" },
  { name: "Sam Taylor", email: "sam@acme.com", role: "Member" },
];

export default function WorkspacePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(workspaceSchema),
  });

  const onCreateWorkspace = async (data: z.infer<typeof workspaceSchema>) => {
    try {
      await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success(`Workspace "${data.name}" created`);
      setCreateOpen(false);
      reset();
    } catch {
      toast.error("Failed to create workspace");
    }
  };

  const handleSync = async (source: string) => {
    setSyncing(source);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.toLowerCase().replace(" ", "_") }),
      });
      toast.success(`${source} sync started`);
    } catch {
      toast.error("Sync failed");
    } finally {
      setTimeout(() => setSyncing(null), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspace</h1>
          <p className="text-muted-foreground">Manage connections, team, and data sources</p>
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
            {connections.map((conn) => (
              <div key={conn.provider} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <conn.icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{conn.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {conn.contacts} contacts · Last sync {conn.lastSync}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
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
            ))}
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
            {members.map((member) => (
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
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
