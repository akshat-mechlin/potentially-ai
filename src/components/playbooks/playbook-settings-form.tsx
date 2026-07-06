"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
            Contacts are scored against titles, keywords, relationship strength, and warm paths.
          </CardDescription>
        </DesktopOnly>
      </CardHeader>
      <CardContent className={cn("space-y-4", isMobileApp && "px-4 pb-4")}>
        <div className="space-y-2">
          <Label>Title includes (comma-separated)</Label>
          <Input
            value={icpTitles}
            onChange={(e) => setIcpTitles(e.target.value)}
            placeholder="cto, founder, vp sales"
          />
        </div>
        <div className="space-y-2">
          <Label>Keywords (nice to have)</Label>
          <Input
            value={icpKeywords}
            onChange={(e) => setIcpKeywords(e.target.value)}
            placeholder="fintech, saas, ai"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Dedupe across playbooks</p>
            <p className="text-xs text-muted-foreground">Skip contacts already in active runs</p>
          </div>
          <Switch checked={dedupeEnabled} onCheckedChange={setDedupeEnabled} />
        </div>
        <div className="space-y-2">
          <Label>Cooldown days</Label>
          <Input value={cooldownDays} onChange={(e) => setCooldownDays(e.target.value)} type="number" />
        </div>
        <div className="space-y-2">
          <Label>Daily send cap</Label>
          <Input value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder="e.g. 50" />
        </div>
        <div className="space-y-2">
          <Label>Calendly URL</Label>
          <Input
            value={calendlyUrl}
            onChange={(e) => setCalendlyUrl(e.target.value)}
            placeholder="https://calendly.com/you/15min"
          />
        </div>
        <div className="space-y-2">
          <Label>Automation level</Label>
          <Select value={automationLevel} onValueChange={(v) => setAutomationLevel(v as Playbook["automation_level"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assist">Assist — approve each send</SelectItem>
              <SelectItem value="supervised">Supervised — drafts queued for review</SelectItem>
              <SelectItem value="autonomous">Autonomous — auto-send after drafts</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Email template</Label>
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
