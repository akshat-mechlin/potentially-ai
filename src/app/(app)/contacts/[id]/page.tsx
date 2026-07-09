"use client";

import { Suspense, use, useState } from "react";
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
import type { Contact, OutreachResult } from "@/types";
import { MobileHeaderTitle } from "@/components/layout/mobile-header-title";
import {
  DesktopOnly,
  MobileKpiStrip,
  MobileSegmented,
} from "@/components/mobile/primitives";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

type ContactTab = "overview" | "timeline" | "outreach";

export default function ContactDetailPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading contact...</p>}>
      <ContactDetailContent {...props} />
    </Suspense>
  );
}

function ContactDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const defaultTab: ContactTab = searchParams.get("tab") === "outreach" ? "outreach" : "overview";
  const { isMobileApp } = useMobileApp();
  const [activeTab, setActiveTab] = useState<ContactTab>(defaultTab);
  const [outreachType, setOutreachType] = useState<"cold_email" | "warm_intro" | "linkedin">(
    "cold_email",
  );
  const [tone, setTone] = useState<"professional" | "casual" | "friendly">("professional");
  const [goal, setGoal] = useState("Schedule a 15-minute intro call");
  const [generating, setGenerating] = useState(false);
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);

  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) throw new Error("Contact not found");
      return res.json();
    },
  });

  const { data: allContacts } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts", "mutual", id],
    queryFn: () => fetch("/api/contacts?limit=4").then((r) => r.json()),
  });

  const { data: summary } = useQuery({
    queryKey: ["contact-summary", id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${id}/summary`);
      if (!res.ok) throw new Error("Failed to load summary");
      const data = await res.json();
      return data.summary as string;
    },
    enabled: !!contact,
  });

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
      setOutreach(data);
      toast.success("Outreach generated");
    } catch {
      toast.error("Failed to generate outreach");
    } finally {
      setGenerating(false);
    }
  };

  const handleRequestIntro = async () => {
    try {
      const res = await fetch("/api/intros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_contact_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request introduction");
      toast.success("Introduction requested");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request introduction");
    }
  };

  const mutualContacts = (allContacts?.contacts ?? []).filter((c) => c.id !== id).slice(0, 3);

  const timelineEvents = [
    { type: "email", title: "Email exchange", date: contact.last_interaction_at },
    { type: "meeting", title: "Coffee chat", date: contact.created_at },
    { type: "linkedin", title: "Connected on LinkedIn", date: contact.created_at },
  ];

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
          {outreach.subject && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subject</p>
              <p className="text-sm font-medium">{outreach.subject}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Body</p>
            <p className="whitespace-pre-wrap text-sm">{outreach.body}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">CTA</p>
            <p className="text-sm">{outreach.cta}</p>
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
                  <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs">
                    <Mail className="mr-1 h-3 w-3" />
                    Email
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
                <Button size="sm" className="h-8 rounded-full px-3 text-xs" onClick={handleRequestIntro}>
                  <Send className="mr-1 h-3 w-3" />
                  Intro
                </Button>
              </div>
            </div>
          </div>

          <MobileKpiStrip
            items={[{ label: "Strength", value: `${contact.strength_score}%`, icon: Sparkles }]}
          />

          <MobileSegmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "overview", label: "Overview" },
              { value: "timeline", label: "Timeline" },
              { value: "outreach", label: "Outreach" },
            ]}
          />

          {activeTab === "overview" && (
            <div className="space-y-3">
              <div className="mobile-card-flat space-y-2 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Summary
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
              </div>

              {mutualContacts.length > 0 && (
                <div className="mobile-menu-list">
                  <p className="mobile-section-label px-1">Mutual connections</p>
                  {mutualContacts.map((c) => (
                    <Link key={c.id} href={`/contacts/${c.id}`} className="mobile-menu-item">
                      <span className="mobile-menu-item-icon-muted">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">{getInitials(c.full_name)}</AvatarFallback>
                        </Avatar>
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{c.full_name}</span>
                      <span className="truncate text-xs text-muted-foreground">{c.title}</span>
                    </Link>
                  ))}
                </div>
              )}

              {contact.tags.length > 0 && (
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
              <Button variant="outline" size="sm">
                <Mail className="mr-1 h-3 w-3" />
                Email
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
            <Button size="sm" onClick={handleRequestIntro}>
              <Send className="mr-1 h-3 w-3" />
              Request intro
            </Button>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-primary">{contact.strength_score}%</div>
          <p className="text-xs text-muted-foreground">Relationship strength</p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="outreach">Outreach</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{summary}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mutual connections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mutualContacts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contacts/${c.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(c.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.title}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {contact.tags.length > 0 && (
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
    </div>
  );
}
