"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Handshake,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  Mail,
  Send,
  Check,
  ChevronDown,
  Search,
} from "lucide-react";
import {
  MOBILE_BOTTOM_SHEET,
  MobileEmpty,
  MobileFab,
  MobileMenuList,
  MobileSegmented,
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
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FeatureDisabled } from "@/components/shared/feature-disabled";
import { useOutreachEnabled } from "@/hooks/use-feature-flags";
import { useWorkspaceStore } from "@/stores";
import { cn, getInitials, formatRelativeTime } from "@/lib/utils";
import type { Contact, Introduction, WorkspaceEmailSettings } from "@/types";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type IntroTab = "sent" | "received";

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

function isNestedPickerTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "[data-radix-popper-content-wrapper], [data-radix-popover-content], [role='listbox']",
    ),
  );
}

function ContactPicker({
  contacts,
  value,
  onChange,
  triggerClassName,
}: {
  contacts: Contact[];
  value: string;
  onChange: (contactId: string) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = contacts.find((c) => c.id === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = c.full_name?.toLowerCase() ?? "";
      const email = c.email?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q);
    });
  }, [contacts, search]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full justify-between px-3 font-normal shadow-sm",
            !selected && "text-muted-foreground",
            triggerClassName,
          )}
        >
          {selected ? (
            <span className="min-w-0 flex-1 truncate text-left">
              <span className="text-foreground">{selected.full_name}</span>
              {selected.email ? (
                <span className="text-muted-foreground"> · {selected.email}</span>
              ) : null}
            </span>
          ) : (
            <span>Select contact</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const content = event.currentTarget as HTMLElement | null;
          content?.querySelector<HTMLInputElement>("input")?.focus();
        }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            className="h-10 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div role="listbox" className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No contacts found
            </p>
          ) : (
            filtered.map((contact) => {
              const isSelected = contact.id === value;
              return (
                <button
                  key={contact.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60",
                  )}
                  onClick={() => {
                    onChange(contact.id);
                    handleOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{contact.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {contact.email || "No email"}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function IntrosPage() {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [submitting, setSubmitting] = useState<"mailto" | "potentially" | null>(null);
  const [activeTab, setActiveTab] = useState<IntroTab>("sent");
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
      setActiveTab("sent");
      setOpen(false);
      setContactId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request introduction");
    } finally {
      setSubmitting(null);
    }
  };

  const introductions = introsData?.introductions ?? [];
  const receivedIntros = introductions.filter((intro) => intro.direction === "received");
  const sentIntros = introductions.filter((intro) => intro.direction !== "received");

  const renderIntroCard = (intro: Introduction, compact = false) => {
    const contact = intro.target_contact;
    const config = statusConfig[intro.status];
    const StatusIcon = config.icon;
    const received = intro.direction === "received";
    const title = received
      ? intro.requester_name || "Someone on Potentially"
      : contact?.full_name || "Unknown contact";
    const subtitle = received
      ? "Would like an introduction to you"
      : [contact?.title, contact?.company_name].filter(Boolean).join(" at ") ||
        contact?.email ||
        "Intro request you sent";

    if (compact) {
      return (
        <div key={intro.id} className="mobile-list-row">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback>{getInitials(title)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {config.label}
          </Badge>
        </div>
      );
    }

    return (
      <Card key={intro.id}>
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(title)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
            {!received && intro.connector_name ? (
              <p className="mt-1 text-xs text-muted-foreground">Via {intro.connector_name}</p>
            ) : null}
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
  };

  const requestDialog = (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setContactId("");
      }}
    >
      <DialogContent
        className={isMobileApp ? MOBILE_BOTTOM_SHEET : undefined}
        onPointerDownOutside={(event) => {
          if (isNestedPickerTarget(event.target)) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isNestedPickerTarget(event.target)) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Request intro</DialogTitle>
          <DialogDescription>
            Choose a contact, then email them that you would like an introduction on Potentially.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-0">
          <ContactPicker
            contacts={contactsData?.contacts ?? []}
            value={contactId}
            onChange={setContactId}
            triggerClassName={isMobileApp ? "rounded-xl" : undefined}
          />
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
        <div className="space-y-4 pb-24">
          <MobileSegmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "sent", label: `Sent${sentIntros.length ? ` (${sentIntros.length})` : ""}` },
              {
                value: "received",
                label: `Received${receivedIntros.length ? ` (${receivedIntros.length})` : ""}`,
              },
            ]}
          />

          {isLoading ? (
            <MobileEmpty>Loading...</MobileEmpty>
          ) : activeTab === "sent" ? (
            <MobileMenuList>
              {sentIntros.map((intro) => renderIntroCard(intro, true))}
              {!sentIntros.length ? <MobileEmpty>No sent introductions yet</MobileEmpty> : null}
            </MobileMenuList>
          ) : (
            <MobileMenuList>
              {receivedIntros.map((intro) => renderIntroCard(intro, true))}
              {!receivedIntros.length ? (
                <MobileEmpty>No received introductions yet</MobileEmpty>
              ) : null}
            </MobileMenuList>
          )}
        </div>

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
        <p className="text-sub text-muted-foreground">
          Track requests you sent and intros others sent to you
        </p>
        <Button onClick={() => setOpen(true)}>Request intro</Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IntroTab)}>
        <TabsList>
          <TabsTrigger value="sent">Sent{sentIntros.length ? ` (${sentIntros.length})` : ""}</TabsTrigger>
          <TabsTrigger value="received">
            Received{receivedIntros.length ? ` (${receivedIntros.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading introductions...</p>
          ) : sentIntros.length ? (
            sentIntros.map((intro) => renderIntroCard(intro))
          ) : (
            <p className="text-sm text-muted-foreground">No sent introductions yet.</p>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading introductions...</p>
          ) : receivedIntros.length ? (
            receivedIntros.map((intro) => renderIntroCard(intro))
          ) : (
            <p className="text-sm text-muted-foreground">No received introductions yet.</p>
          )}
        </TabsContent>
      </Tabs>

      {requestDialog}
    </div>
  );
}
