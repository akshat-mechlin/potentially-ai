"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Mail,
  ExternalLink,
  Sparkles,
  Send,
  Loader2,
} from "lucide-react";
import { DEMO_CONTACTS } from "@/lib/demo-data";
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
import type { OutreachResult } from "@/types";
import { toast } from "sonner";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const contact = DEMO_CONTACTS.find((c) => c.id === id);
  const [outreachType, setOutreachType] = useState<"cold_email" | "warm_intro" | "linkedin">(
    "cold_email",
  );
  const [tone, setTone] = useState<"professional" | "casual" | "friendly">("professional");
  const [goal, setGoal] = useState("Schedule a 15-minute intro call");
  const [generating, setGenerating] = useState(false);
  const [outreach, setOutreach] = useState<OutreachResult | null>(null);

  const { data: summary } = useQuery({
    queryKey: ["contact-summary", id],
    queryFn: async () => {
      if (!contact) return "";
      return `${contact.full_name} is ${contact.title || "a professional"}${contact.company_name ? ` at ${contact.company_name}` : ""}. ${contact.bio || ""}`;
    },
    enabled: !!contact,
  });

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
      setOutreach(data);
      toast.success("Outreach generated");
    } catch {
      toast.error("Failed to generate outreach");
    } finally {
      setGenerating(false);
    }
  };

  const mutualContacts = DEMO_CONTACTS.filter((c) => c.id !== id).slice(0, 3);

  const timelineEvents = [
    { type: "email", title: "Email exchange", date: contact.last_interaction_at },
    { type: "meeting", title: "Coffee chat", date: contact.created_at },
    { type: "linkedin", title: "Connected on LinkedIn", date: contact.created_at },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/contacts">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="flex items-start gap-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">{getInitials(contact.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{contact.full_name}</h1>
          <p className="text-muted-foreground">{contact.title}</p>
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
            <Button size="sm">
              <Send className="mr-1 h-3 w-3" />
              Request intro
            </Button>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{contact.strength_score}%</div>
          <p className="text-xs text-muted-foreground">Relationship strength</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
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
              <CardTitle className="text-base">Mutual Connections</CardTitle>
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
              <CardTitle className="text-base">Generate Outreach</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={outreachType} onValueChange={(v) => setOutreachType(v as typeof outreachType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold_email">Cold Email</SelectItem>
                      <SelectItem value="warm_intro">Warm Intro</SelectItem>
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
              <Button onClick={handleGenerateOutreach} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>

              {outreach && (
                <div className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-4">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
