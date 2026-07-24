"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
  ExternalLink,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import type { Contact, OutreachResult, WorkspaceEmailSettings } from "@/types";
import type { MutualConnection } from "@/lib/data/mutual-connections";
import { MobileHeaderTitle } from "@/components/layout/mobile-header-title";
import {
  DesktopOnly,
  MobileKpiStrip,
  MobileSegmented,
  MOBILE_BOTTOM_SHEET,
} from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { contactHref } from "@/lib/routes/contacts";
import { STRENGTH_SCORE_HINT } from "@/lib/contacts/enrichment";
import type { ContactDetailPoint } from "@/lib/contacts/profile-details";
import { ContactProfileSummary } from "@/components/contacts/contact-profile-summary";
import { InfoHint } from "@/components/playbooks/field-hint";
import { useOutreachEnabled } from "@/hooks/use-feature-flags";
import { useWorkspaceStore } from "@/stores";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

function canSendViaPotentially(settings: WorkspaceEmailSettings | undefined) {
  if (!settings) return false;
  if (settings.mode === "platform") return true;
  return settings.senderDomainStatus === "verified";
}

function buildMailtoHref(email: string, draft: OutreachResult) {
  const subject = draft.subject?.trim() ?? "";
  const body = [draft.body.trim(), draft.cta.trim()].filter(Boolean).join("\n\n");
  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  return parts.length ? `mailto:${email}?${parts.join("&")}` : `mailto:${email}`;
}

type ContactTab = "overview" | "timeline" | "outreach";

export function ContactDetailView({ contactId }: { contactId: string }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading contact...</p>}>
      <ContactDetailContent contactId={contactId} />
    </Suspense>
  );
}

function ContactDetailContent({ contactId }: { contactId: string }) {
  const id = contactId;
  const searchParams = useSearchParams();
  const defaultTab: ContactTab = searchParams.get("tab") === "outreach" ? "outreach" : "overview";
  const { isMobileApp } = useMobileApp();
  const { enabled: outreachEnabled } = useOutreachEnabled();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  const [activeTab, setActiveTab] = useState<ContactTab>(
    defaultTab === "outreach" && !outreachEnabled ? "overview" : defaultTab,
  );
  const [outreachType, setOutreachType] = useState<"cold_email" | "warm_intro" | "linkedin">(
    "cold_email",
  );
  const [tone, setTone] = useState<"professional" | "casual" | "friendly">("professional");
  const [goal, setGoal] = useState("Schedule a 15-minute intro call");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [requestingIntro, setRequestingIntro] = useState<"mailto" | "potentially" | null>(null);

  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error("Contact not found");
      return res.json();
    },
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

  const { data: mutualPayload, isLoading: mutualsLoading } = useQuery<{
    mutuals: MutualConnection[];
  }>({
    queryKey: ["contacts", "mutual", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}/mutuals`);
      if (!res.ok) throw new Error("Failed to load mutual connections");
      return res.json();
    },
  });

  const { data: profileSummary } = useQuery<{
    summary: string;
    details: ContactDetailPoint[];
  }>({
    queryKey: ["contact-summary", id, "v5"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}/summary`);
      if (!res.ok) throw new Error("Failed to load summary");
      return res.json();
    },
    enabled: !!contact,
  });
  const summary = profileSummary?.summary;
  const detailPoints = profileSummary?.details ?? [];
  const mutualContacts = mutualPayload?.mutuals ?? [];

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading contact...</p>;
  }

  if (!contact) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Contact not found</p>
        <Button asChild className="mt-4">
          <Link href="/contacts">Back to contacts</Link>
        </Button>
      </div>
    );
  }

  const handleGenerateOutreach = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: id,
          type: outreachType,
          tone,
          goal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate outreach");
      setOutreach({
        subject: data.subject ?? "",
        body: data.body ?? "",
        cta: data.cta ?? "",
      });
      toast.success("Outreach generated");
    } catch {
      toast.error("Failed to generate outreach");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendViaPotentially = async () => {
    if (!outreach || !contact.email) return;
    setSending(true);
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: id,
          subject: outreach.subject,
          body: outreach.body,
          cta: outreach.cta,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      toast.success(data.skipped ? "Email logged (send skipped in this environment)" : "Email sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleRequestIntro = (delivery: "mailto" | "potentially") => {
    setRequestingIntro(delivery);
    void (async () => {
      try {
        const res = await fetch("/api/intros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_contact_id: id, delivery }),
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to request introduction");
      } finally {
        setRequestingIntro(null);
      }
    })();
  };

  const timelineEvents = [
    { type: "email", title: "Email exchange", date: contact.last_interaction_at },
    { type: "meeting", title: "Coffee chat", date: contact.created_at },
    { type: "linkedin", title: "Connected on LinkedIn", date: contact.created_at },
  ];

  const introDialog = (
    <Dialog open={introOpen} onOpenChange={setIntroOpen}>
      <DialogContent className={isMobileApp ? MOBILE_BOTTOM_SHEET : undefined}>
        <DialogHeader>
          <DialogTitle>Request intro</DialogTitle>
          <DialogDescription>
            Tell {contact.full_name} that you would like an introduction on Potentially. Choose your
            mail app or send from Potentially when email is configured.
          </DialogDescription>
        </DialogHeader>
        <div className={`flex flex-col gap-2 pb-[env(safe-area-inset-bottom)] sm:pb-0 ${isMobileApp ? "" : "sm:flex-row"}`}>
          <Button
            variant="outline"
            className={isMobileApp ? "w-full rounded-xl" : "flex-1"}
            disabled={requestingIntro !== null}
            onClick={() => handleRequestIntro("mailto")}
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
              className={isMobileApp ? "w-full rounded-xl" : "flex-1"}
              disabled={requestingIntro !== null}
              onClick={() => handleRequestIntro("potentially")}
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
  );

  const outreachForm = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select value={outreachType} onValueChange={(v) => setOutreachType(v as typeof outreachType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cold_email">Cold email</SelectItem>
              <SelectItem value="warm_intro">Warm intro</SelectItem>
              <SelectItem value="linkedin">LinkedIn Message</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tone</label>
          <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Goal</label>
        <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
      </div>
      <Button onClick={handleGenerateOutreach} disabled={generating} className={isMobileApp ? "w-full rounded-xl" : undefined}>
        {generating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Generate
      </Button>
      {outreach && (
        <div className={`space-y-3 rounded-xl bg-muted/30 p-4 ${isMobileApp ? "mobile-card-flat" : "border"}`}>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="outreach-subject">
              Subject
            </label>
            <Input
              id="outreach-subject"
              value={outreach.subject ?? ""}
              onChange={(e) => setOutreach({ ...outreach, subject: e.target.value })}
              placeholder="Email subject"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="outreach-body">
              Body
            </label>
            <Textarea
              id="outreach-body"
              value={outreach.body}
              onChange={(e) => setOutreach({ ...outreach, body: e.target.value })}
              rows={8}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="outreach-cta">
              CTA
            </label>
            <Textarea
              id="outreach-cta"
              value={outreach.cta}
              onChange={(e) => setOutreach({ ...outreach, cta: e.target.value })}
              rows={2}
            />
          </div>
          <div className={`flex flex-wrap gap-2 ${isMobileApp ? "flex-col" : ""}`}>
            {contact.email ? (
              <Button variant="outline" size="sm" className={isMobileApp ? "w-full rounded-xl" : undefined} asChild>
                <a href={buildMailtoHref(contact.email, outreach)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Open in mail app
                </a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Add an email on this contact to send.</p>
            )}
            {contact.email && potentiallySendReady ? (
              <Button
                size="sm"
                className={isMobileApp ? "w-full rounded-xl" : undefined}
                onClick={handleSendViaPotentially}
                disabled={sending || !outreach.body.trim()}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send with Potentially
              </Button>
            ) : null}
            {contact.email && !potentiallySendReady ? (
              <p className="w-full text-xs text-muted-foreground">
                Configure email in{" "}
                <Link href="/settings" className="underline underline-offset-2">
                  Settings
                </Link>{" "}
                to send from Potentially.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );

  if (isMobileApp) {
    return (
      <>
        <MobileHeaderTitle title={contact.full_name} />
        <div className="space-y-4 pb-24">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarFallback className="text-base">{getInitials(contact.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted-foreground">{contact.title}</p>
              {contact.company_name && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {contact.company_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {contact.email && (
                  <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="mr-1 h-3 w-3" />
                      Email
                    </a>
                  </Button>
                )}
                {contact.linkedin_url && (
                  <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" asChild>
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setIntroOpen(true)}
                  disabled={!contact.email}
                >
                  <Send className="mr-1 h-3 w-3" />
                  Intro
                </Button>
              </div>
            </div>
          </div>

          <MobileKpiStrip
            items={[
              {
                label: "Strength",
                value: `${contact.strength_score}%`,
                icon: Sparkles,
                hint: STRENGTH_SCORE_HINT,
              },
            ]}
          />

          <MobileSegmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "overview", label: "Overview" },
              { value: "timeline", label: "Timeline" },
              ...(outreachEnabled ? [{ value: "outreach" as const, label: "Outreach" }] : []),
            ]}
          />

          {activeTab === "overview" && (
            <div className="space-y-3">
              <ContactProfileSummary
                summary={summary}
                details={detailPoints}
                variant="mobile"
              />

              {(mutualsLoading || mutualContacts.length > 0) && (
                <div className="mobile-menu-list">
                  <p className="mobile-section-label px-1">Mutual connections</p>
                  {mutualsLoading ? (
                    <p className="px-1 text-sm text-muted-foreground">Finding connections…</p>
                  ) : (
                    mutualContacts.map((c) => (
                      <Link key={c.id} href={contactHref(c.id)} className="mobile-menu-item">
                        <span className="mobile-menu-item-icon-muted">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(c.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.full_name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {c.reason_label}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {(contact.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="mobile-menu-list">
              {timelineEvents.map((event) => (
                <div key={event.title} className="mobile-list-row">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">{event.type}</p>
                  </div>
                  {event.date && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(event.date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "outreach" && (
            <div className="mobile-card-flat p-4">{outreachForm}</div>
          )}
        </div>
        {introDialog}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <DesktopOnly>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contacts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </DesktopOnly>

      <div className="flex items-start gap-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{getInitials(contact.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-display text-2xl text-foreground sm:text-3xl">{contact.full_name}</h1>
          <p className="text-sub text-muted-foreground">{contact.title}</p>
          {contact.company_name && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {contact.company_name}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {contact.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${contact.email}`}>
                  <Mail className="mr-1 h-3 w-3" />
                  Email
                </a>
              </Button>
            )}
            {contact.linkedin_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  LinkedIn
                </a>
              </Button>
            )}
            <Button size="sm" onClick={() => setIntroOpen(true)} disabled={!contact.email}>
              <Send className="mr-1 h-3 w-3" />
              Request intro
            </Button>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-primary">{contact.strength_score}%</div>
          <p className="inline-flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Relationship strength
            <InfoHint
              label="Relationship strength"
              hint={STRENGTH_SCORE_HINT}
              side="left"
            />
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab === "outreach" && !outreachEnabled ? "overview" : activeTab}
        onValueChange={(v) => setActiveTab(v as ContactTab)}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {outreachEnabled ? <TabsTrigger value="outreach">Outreach</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ContactProfileSummary
            summary={summary}
            details={detailPoints}
            variant="desktop"
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mutual connections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mutualsLoading ? (
                <p className="text-sm text-muted-foreground">Finding connections…</p>
              ) : mutualContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No mutual connections found yet. People at the same company, shared email
                  domains, or linked relationship events will show up here.
                </p>
              ) : (
                mutualContacts.map((c) => (
                  <Link
                    key={c.id}
                    href={contactHref(c.id)}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(c.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[c.title, c.company_name].filter(Boolean).join(" · ") || c.reason_label}
                      </p>
                      <p className="mt-0.5 text-xs text-primary/80">{c.reason_label}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {(contact.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {contact.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {timelineEvents.map((event) => (
                <div key={event.title} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{event.type}</p>
                  </div>
                  {event.date && (
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(event.date)}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outreach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate outreach</CardTitle>
            </CardHeader>
            <CardContent>{outreachForm}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {introDialog}
    </div>
  );
}
