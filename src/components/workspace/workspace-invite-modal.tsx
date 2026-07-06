"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkspaceInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId?: string;
  workspaceName?: string;
}

export function WorkspaceInviteModal({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: WorkspaceInviteModalProps) {
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-invite-link", workspaceId],
    queryFn: async () => {
      const params = workspaceId ? `?workspace_id=${workspaceId}` : "";
      const res = await fetch(`/api/workspace/invite-link${params}`);
      if (!res.ok) throw new Error("Failed to load invite link");
      return res.json() as Promise<{ inviteLink: string; workspaceName: string }>;
    },
    enabled: open && Boolean(workspaceId),
  });

  const displayName = workspaceName ?? data?.workspaceName ?? "your group";
  const inviteLink = data?.inviteLink ?? "";

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleDone = async () => {
    const parsedEmails = emails
      .split(/[,;\n]/)
      .map((email) => email.trim())
      .filter(Boolean);

    if (parsedEmails.length > 0) {
      setSending(true);
      try {
        const res = await fetch("/api/workspace/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: parsedEmails.join(", "),
            workspace_id: workspaceId,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to send invites");
        toast.success(result.message || "Invites sent");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send invites");
        setSending(false);
        return;
      }
      setSending(false);
    }

    setEmails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite your friends</DialogTitle>
          <DialogDescription>
            People you may want to invite to {displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex gap-2">
            <Input
              readOnly
              value={isLoading ? "Generating invite link..." : inviteLink}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              onClick={copyLink}
              disabled={!inviteLink || isLoading}
              className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-invite-emails">Invite by email</Label>
            <Input
              id="workspace-invite-emails"
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              placeholder="john@gmail.com, jane@outlook.com, etc."
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handleDone} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
