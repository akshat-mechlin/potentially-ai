"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FieldHint } from "@/components/playbooks/field-hint";
import { DesktopOnly } from "@/components/mobile/primitives";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { cn } from "@/lib/utils";
import type { EmailTemplate, Playbook } from "@/types/playbooks";
import { toast } from "sonner";

interface PlaybookSettingsFormProps {
  playbook: Playbook;
}

export function PlaybookSettingsForm({ playbook }: PlaybookSettingsFormProps) {
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [icpTitles, setIcpTitles] = useState("");
  const [icpKeywords, setIcpKeywords] = useState("");
  const [dedupeEnabled, setDedupeEnabled] = useState(true);
  const [cooldownDays, setCooldownDays] = useState("30");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [dailyCap, setDailyCap] = useState("");
  const [automationLevel, setAutomationLevel] = useState<Playbook["automation_level"]>("assist");
  const [templateId, setTemplateId] = useState<string>("none");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form draft mirrors fetched playbook
    setIcpTitles((playbook.icp_profile.title_include ?? []).join(", "));
    setIcpKeywords((playbook.icp_profile.keywords_nice ?? []).join(", "));
    setDedupeEnabled(playbook.matching_config.dedupe_across_playbooks !== false);
    setCooldownDays(String(playbook.matching_config.cooldown_days ?? 30));
    setCalendlyUrl(playbook.calendly_url ?? "");
    setDailyCap(playbook.send_config.daily_cap ? String(playbook.send_config.daily_cap) : "");
    setAutomationLevel(playbook.automation_level);
    setTemplateId(playbook.template_id ?? "none");
  }, [playbook]);

  const { data: templatesData } = useQuery<{ templates: EmailTemplate[] }>({
    queryKey: ["email-templates"],
    queryFn: () => fetch("/api/email-templates").then((r) => r.json()),
    enabled: mounted,
  });

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/playbooks/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp_profile: {
            ...playbook.icp_profile,
            title_include: icpTitles.split(",").map((s) => s.trim()).filter(Boolean),
            keywords_nice: icpKeywords.split(",").map((s) => s.trim()).filter(Boolean),
          },
          matching_config: {
            ...playbook.matching_config,
            dedupe_across_playbooks: dedupeEnabled,
            cooldown_days: Number(cooldownDays) || 30,
          },
          send_config: {
            ...playbook.send_config,
            daily_cap: dailyCap ? Number(dailyCap) : undefined,
          },
          calendly_url: calendlyUrl || null,
          automation_level: automationLevel,
          template_id: templateId === "none" ? null : templateId,
          status: "active",
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Playbook settings saved");
      queryClient.invalidateQueries({ queryKey: ["playbook", playbook.id] });
    } catch {
      toast.error("Failed to save playbook settings");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn(isMobileApp && "mobile-card-flat border-0 shadow-none")}>
      <CardHeader className={cn(isMobileApp && "px-4 pt-4 pb-2")}>
        <CardTitle className="text-base">Ideal customer profile & send rules</CardTitle>
        <DesktopOnly>
          <CardDescription>
            These rules decide who gets matched in Runs and how messages are sent.
          </CardDescription>
        </DesktopOnly>
      </CardHeader>
      <CardContent className={cn("space-y-4", isMobileApp && "px-4 pb-4")}>
        <div className="space-y-2">
          <FieldHint
            label="Title includes"
            hint="Comma-separated job titles that boost match score (e.g. CTO, Founder). Contacts whose title matches these are ranked higher when you start a run."
          />
          <Input
            value={icpTitles}
            onChange={(e) => setIcpTitles(e.target.value)}
            placeholder="cto, founder, vp sales"
          />
        </div>
        <div className="space-y-2">
          <FieldHint
            label="Keywords (nice to have)"
            hint="Optional industry or topic words. They add score when found on the contact, but missing them does not exclude someone."
          />
          <Input
            value={icpKeywords}
            onChange={(e) => setIcpKeywords(e.target.value)}
            placeholder="fintech, saas, ai"
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-1">
            <FieldHint
              label="Dedupe across playbooks"
              hint="When on, contacts already in another active playbook run are skipped so you do not message the same person twice."
            />
            <p className="text-xs text-muted-foreground">Skip contacts already in active runs</p>
          </div>
          <Switch checked={dedupeEnabled} onCheckedChange={setDedupeEnabled} />
        </div>
        <div className="space-y-2">
          <FieldHint
            label="Cooldown days"
            hint="Minimum days after contacting someone before they can be selected again in a new run. Prevents over-messaging the same contact."
          />
          <Input value={cooldownDays} onChange={(e) => setCooldownDays(e.target.value)} type="number" />
        </div>
        <div className="space-y-2">
          <FieldHint
            label="Daily send cap"
            hint="Maximum emails this playbook can send per day. Leave blank for no extra cap beyond your account/email limits."
          />
          <Input value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="e.g. 50" />
        </div>
        <div className="space-y-2">
          <FieldHint
            label="Calendly URL"
            hint="Your Calendly scheduling link. Outbound emails include a tracked booking link automatically. When someone books (embed or Calendly webhook), the prospect is marked booked and follow-ups stop. No manual step."
          />
          <Input
            value={calendlyUrl}
            onChange={(e) => setCalendlyUrl(e.target.value)}
            placeholder="https://calendly.com/you/15min"
          />
        </div>
        <div className="space-y-2">
          <FieldHint
            label="Automation level"
            hint="Assist: you approve every send. Supervised: drafts are queued for review. Autonomous: after drafts are generated, emails send without manual approval."
          />
          <Select value={automationLevel} onValueChange={(v) => setAutomationLevel(v as Playbook["automation_level"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assist">Assist: approve each send</SelectItem>
              <SelectItem value="supervised">Supervised: drafts queued for review</SelectItem>
              <SelectItem value="autonomous">Autonomous: auto-send after drafts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <FieldHint
            label="Email template"
            hint="Template used when generating drafts for this playbook. “AI-generated” writes from the playbook goal instead of a fixed template."
          />
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="AI-generated (default)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">AI-generated (default)</SelectItem>
              {templatesData?.templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={busy} className={cn(isMobileApp && "w-full rounded-xl")}>
          {busy ? "Saving..." : "Save playbook settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
