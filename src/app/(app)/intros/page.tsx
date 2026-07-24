"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Clock, CheckCircle, XCircle, Loader2, Plus, Mail, Send } from "lucide-react";
import {
  MOBILE_BOTTOM_SHEET,
  MobileEmpty,
  MobileFab,
  MobileMenuList,
} from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FeatureDisabled } from "@/components/shared/feature-disabled";
import { useOutreachEnabled } from "@/hooks/use-feature-flags";
import { useWorkspaceStore } from "@/stores";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import type { Contact, Introduction, WorkspaceEmailSettings } from "@/types";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  draft: { icon: Clock, label: "Draft", color: "text-muted-foreground" },
  requested: { icon: Handshake, label: "Requested", color: "text-yellow-600" },
  accepted: { icon: CheckCircle, label: "Accepted", color: "text-green-600" },
  declined: { icon: XCircle, label: "Declined", color: "text-red-600" },
  completed: { icon: CheckCircle, label: "Completed", color: "text-green-600" },
};

function canSendViaPotentially(settings: WorkspaceEmailSettings | undefined) {
  if (!settings) return false;
  if (settings.mode === "platform") return true;
  return settings.senderDomainStatus === "verified";
}

export default function IntrosPage() {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [submitting, setSubmitting] = useState<"mailto" | "potentially" | null>(null);
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  const { enabled: outreachEnabled, loading: flagLoading } = useOutreachEnabled();

  const { data: introsData, isLoading } = useQuery<{ introductions: Introduction[] }>({
    queryKey: ["intros"],
    queryFn: () => fetch("/api/intros").then((r) => r.json()),
    enabled: outreachEnabled,
  });

  const { data: contactsData } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts", "picker"],
    queryFn: () => fetch("/api/contacts?limit=500").then((r) => r.json()),
    enabled: outreachEnabled,
  });

  const { data: emailSettings } = useQuery<WorkspaceEmailSettings>({
    queryKey: ["workspace-email-settings", workspaceId],
    queryFn: async () => {
      const params = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
      const res = await fetch(`/api/workspace/email-settings${params}`);
      if (!res.ok) throw new Error("Failed to load email settings");
      return res.json();
    },
    enabled: outreachEnabled,
  });
  const potentiallySendReady = canSendViaPotentially(emailSettings);

  if (flagLoading) {
    return <Skeleton className="h-40 rounded-2xl" />;
  }

  if (!outreachEnabled) {
    return <FeatureDisabled title="Outreach / introductions" flag="outreach_engine" />;
  }

  const handleRequest = async (delivery: "mailto" | "potentially") => {
    if (!contactId) {
      toast.error("Select a contact");
      return;
    }

    setSubmitting(delivery);
    try {
      const res = await fetch("/api/intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_contact_id: contactId, delivery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request introduction");

      if (delivery === "mailto") {
        const href = data.mailto?.href as string | undefined;
        if (!href) throw new Error("Could not build mail app link");
        window.location.href = href;
        toast.success(
          data.target_name
            ? `Intro request opened for ${data.target_name}`
            : "Intro request opened in your mail app",
        );
      } else {
        toast.success(
          data.email_skipped
            ? "Intro logged (send skipped in this environment)"
            : data.target_name
              ? `Intro request emailed to ${data.target_name}`
              : "Intro request emailed",
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["intros"] });
      setOpen(false);
      setContactId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request introduction");
    } finally {
      setSubmitting(null);
    }
  };

  const introductions = introsData?.introductions ?? [];

  const requestDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={isMobileApp ? MOBILE_BOTTOM_SHEET : undefined}>
        <DialogHeader>
          <DialogTitle>Request intro</DialogTitle>
          <DialogDescription>
            Choose a contact, then email them that you would like an introduction on Potentially.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger className={isMobileApp ? "rounded-xl" : undefined}>
              <SelectValue placeholder="Select contact" />
            </SelectTrigger>
            <SelectContent>
              {(contactsData?.contacts ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className={`flex flex-col gap-2 ${isMobileApp ? "" : "sm:flex-row"}`}>
            <Button
              variant="outline"
              onClick={() => void handleRequest("mailto")}
              disabled={submitting !== null}
              className={isMobileApp ? "w-full rounded-xl" : "flex-1"}
            >
              {submitting === "mailto" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Open in mail app
            </Button>
            {potentiallySendReady ? (
              <Button
                onClick={() => void handleRequest("potentially")}
                disabled={submitting !== null}
                className={isMobileApp ? "w-full rounded-xl" : "flex-1"}
              >
                {submitting === "potentially" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send with Potentially
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground sm:self-center">
                Configure email in{" "}
                <Link href="/settings" className="underline underline-offset-2">
                  Settings
                </Link>{" "}
                to send from Potentially.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isMobileApp) {
    return (
      <>
        {isLoading ? (
          <MobileEmpty>Loading...</MobileEmpty>
        ) : (
          <MobileMenuList>
            {introductions.map((intro) => {
              const contact = intro.target_contact;
              if (!contact) return null;
              const config = statusConfig[intro.status];
              return (
                <div key={intro.id} className="mobile-list-row">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{contact.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{contact.company_name}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {config.label}
                  </Badge>
                </div>
              );
            })}
            {!introductions.length && <MobileEmpty>No introductions yet</MobileEmpty>}
          </MobileMenuList>
        )}

        <MobileFab onClick={() => setOpen(true)} label="Request intro">
          <Plus className="h-6 w-6" />
        </MobileFab>
        {requestDialog}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sub text-muted-foreground">Track and manage warm introduction requests</p>
        <Button onClick={() => setOpen(true)}>Request intro</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading introductions...</p>
      ) : (
        <div className="space-y-4">
          {introductions.map((intro) => {
            const contact = intro.target_contact;
            if (!contact) return null;
            const config = statusConfig[intro.status];
            const StatusIcon = config.icon;
            return (
              <Card key={intro.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(contact.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{contact.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.title} at {contact.company_name}
                    </p>
                    {intro.connector_name && (
                      <p className="mt-1 text-xs text-muted-foreground">Via {intro.connector_name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm ${config.color}`}>
                      <StatusIcon className="h-4 w-4" />
                      {config.label}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(intro.created_at)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {requestDialog}
    </div>
  );
}
