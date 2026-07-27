"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Building2, Mail, UserPlus, Users, Loader2, Send, Sparkles, Network } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SearchResultContact, WorkspaceEmailSettings } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, getInitials } from "@/lib/utils";
import { contactHref } from "@/lib/routes/contacts";
import { useWorkspaceStore } from "@/stores";
import { toast } from "sonner";

function canSendViaPotentially(settings: WorkspaceEmailSettings | undefined) {
  if (!settings) return false;
  if (settings.mode === "platform") return true;
  return settings.senderDomainStatus === "verified";
}

interface SearchResultCardProps {
  contact: SearchResultContact;
  index: number;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}

export function SearchResultCard({
  contact,
  index,
  selectable,
  selected,
  onToggle,
}: SearchResultCardProps) {
  const router = useRouter();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  const [introOpen, setIntroOpen] = useState(false);
  const [requestingIntro, setRequestingIntro] = useState<"mailto" | "potentially" | null>(null);

  const { data: emailSettings } = useQuery<WorkspaceEmailSettings>({
    queryKey: ["workspace-email-settings", workspaceId],
    queryFn: async () => {
      const params = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
      const res = await fetch(`/api/workspace/email-settings${params}`);
      if (!res.ok) throw new Error("Failed to load email settings");
      return res.json();
    },
  });
  const potentiallySendReady = canSendViaPotentially(emailSettings);
  const isPlatform = contact.source === "platform";
  const canViewProfile = !isPlatform || contact.in_contacts;
  const profileHref = canViewProfile ? contactHref(contact.id) : undefined;

  const handleRequestIntro = async (delivery: "mailto" | "potentially") => {
    setRequestingIntro(delivery);
    try {
      const res = await fetch("/api/intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_contact_id: contact.id, delivery }),
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
      setIntroOpen(false);
      router.push("/intros");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request introduction");
    } finally {
      setRequestingIntro(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "border-border transition-shadow",
          selectable
            ? selected
              ? "border-primary shadow-md"
              : "cursor-pointer hover:border-primary/30 hover:shadow-md"
            : "hover:border-primary/20 hover:shadow-md",
        )}
        onClick={selectable ? () => onToggle?.() : undefined}
      >
        <CardContent className="flex items-start gap-4 p-4">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle?.()}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 h-4 w-4 shrink-0 rounded border-border"
              aria-label={`Select ${contact.full_name || "contact"}`}
            />
          )}
          <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(contact.full_name ?? contact.email)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                {profileHref ? (
                  <Link
                    href={profileHref}
                    className="font-medium hover:underline"
                    onClick={(e) => selectable && e.stopPropagation()}
                  >
                    {contact.full_name || contact.email || "Unknown contact"}
                  </Link>
                ) : (
                  <p className="font-medium">{contact.full_name || "Unknown prospect"}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {contact.title}
                  {contact.company_name && (
                    <span className="inline-flex items-center gap-1">
                      {" "}
                      at <Building2 className="inline h-3 w-3" />
                      {contact.company_name}
                    </span>
                  )}
                </p>
                {isPlatform && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {contact.enrichment_status === "enriched" ? (
                      <Badge variant="outline" className="text-[10px]">
                        Enriched
                      </Badge>
                    ) : null}
                    {contact.in_contacts ? (
                      <Badge variant="outline" className="text-[10px]">
                        In contacts
                      </Badge>
                    ) : null}
                  </div>
                )}
                {!isPlatform && contact.network_owner_name && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    In {contact.network_owner_name}&apos;s network
                    {contact.group_name ? ` · ${contact.group_name}` : ""}
                  </p>
                )}
                {!isPlatform && !contact.network_owner_name && contact.group_name && (
                  <p className="mt-1 text-xs text-muted-foreground">{contact.group_name}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px]",
                    isPlatform
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
                  )}
                >
                  {isPlatform ? (
                    <>
                      <Sparkles className="mr-1 h-3 w-3" />
                      Apollo
                    </>
                  ) : (
                    <>
                      <Network className="mr-1 h-3 w-3" />
                      Your Network
                    </>
                  )}
                </Badge>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {contact.score}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{contact.reason}</p>

            {contact.warm_intro_path.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Path:</span>
                {contact.warm_intro_path.map((name, i) => (
                  <span key={i}>
                    {i > 0 && " → "}
                    {name}
                  </span>
                ))}
              </div>
            )}

            {!selectable && !isPlatform && (
              <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" asChild>
                  <Link href={contactHref(contact.id)}>
                    View profile
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
                {contact.email && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={contactHref(contact.id, "outreach")}>
                      <Mail className="mr-1 h-3 w-3" />
                      Email
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntroOpen(true)}
                  disabled={!contact.email}
                >
                  <UserPlus className="mr-1 h-3 w-3" />
                  Request intro
                </Button>
              </div>
            )}

            {!selectable && isPlatform && contact.in_contacts && (
              <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" asChild>
                  <Link href={contactHref(contact.id)}>
                    View contact
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={introOpen} onOpenChange={setIntroOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Request intro</DialogTitle>
            <DialogDescription>
              Tell {contact.full_name || "this contact"} that you would like an introduction on
              Potentially.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              disabled={requestingIntro !== null}
              onClick={() => void handleRequestIntro("mailto")}
            >
              {requestingIntro === "mailto" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Open in mail app
            </Button>
            {potentiallySendReady ? (
              <Button
                className="flex-1"
                disabled={requestingIntro !== null}
                onClick={() => void handleRequestIntro("potentially")}
              >
                {requestingIntro === "potentially" ? (
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
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
