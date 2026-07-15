"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDisplayFromAddress } from "@/lib/email/from-address";
import { useWorkspaceStore } from "@/stores";
import type { EmailSenderMode, SenderDomainStatus, WorkspaceEmailSettings } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type EmailSenderSettingsProps = {
  compact?: boolean;
};

function domainStatusLabel(status: SenderDomainStatus) {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending DNS";
    case "failed":
      return "Verification failed";
    default:
      return "Not set up";
  }
}

export function EmailSenderSettings({ compact = false }: EmailSenderSettingsProps) {
  const queryClient = useQueryClient();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  const [mode, setMode] = useState<EmailSenderMode>("platform");
  const [customSenderName, setCustomSenderName] = useState("");
  const [customSenderEmail, setCustomSenderEmail] = useState("");
  const [savingMode, setSavingMode] = useState(false);
  const [savingSenderDetails, setSavingSenderDetails] = useState(false);
  const [domainBusy, setDomainBusy] = useState(false);

  const { data: settings, isLoading, isFetching } = useQuery<WorkspaceEmailSettings>({
    queryKey: ["workspace-email-settings", workspaceId],
    queryFn: async () => {
      const params = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
      const res = await fetch(`/api/workspace/email-settings${params}`);
      if (!res.ok) throw new Error("Failed to load email settings");
      return res.json() as Promise<WorkspaceEmailSettings>;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data?.mode === "custom" &&
        data.senderDomainStatus === "pending" &&
        data.domainSetup.domainManagementAvailable
      ) {
        return 30_000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!settings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form draft mirrors fetched settings
    setMode(settings.mode === "custom" ? "custom" : "platform");
    setCustomSenderName(settings.customSenderName ?? "");
    setCustomSenderEmail(settings.customSenderEmail ?? "");
  }, [settings]);

  const platformDisplay = settings
    ? parseDisplayFromAddress(settings.platformFromAddress)
    : null;

  const savedSenderName = settings?.customSenderName ?? "";
  const savedSenderEmail = settings?.customSenderEmail ?? "";
  const nameDirty = customSenderName !== savedSenderName;
  const emailDirty = customSenderEmail !== savedSenderEmail;
  const senderDetailsDirty = nameDirty || emailDirty;
  const hasSavedCustomEmail = Boolean(savedSenderEmail);

  const patchSettings = async (
    body: Record<string, unknown>,
    options?: { successMessage?: string; setBusy?: (busy: boolean) => void },
  ) => {
    const setBusy = options?.setBusy ?? (() => undefined);
    setBusy(true);
    try {
      const res = await fetch("/api/workspace/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, workspace_id: workspaceId }),
      });
      const payload = (await res.json()) as WorkspaceEmailSettings | { error?: string };
      if (!res.ok) {
        throw new Error("error" in payload ? payload.error : "Failed to save email settings");
      }
      const saved = payload as WorkspaceEmailSettings;
      queryClient.setQueryData(["workspace-email-settings", workspaceId], saved);
      toast.success(options?.successMessage ?? "Saved");

      if (saved.mode === "custom" && body.custom_sender_email !== undefined) {
        if (saved.senderDomainStatus === "verified") {
          toast.success("Domain verified — ready to send from your address");
        } else if (saved.senderDomainStatus === "pending") {
          toast.message("Domain pending", {
            description: "Add DNS records below or finish setup in Resend.",
          });
        }
      }

      return saved;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save email settings");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleSelectMode = async (nextMode: EmailSenderMode) => {
    setMode(nextMode);
    if (nextMode === "custom") return;

    await patchSettings({ mode: "platform" }, { successMessage: "Using Potentially email", setBusy: setSavingMode });
  };

  const handleSaveSenderDetails = async () => {
    if (!customSenderEmail.trim()) {
      toast.error("Enter your sender email");
      return;
    }

    await patchSettings(
      {
        mode: "custom",
        custom_sender_name: customSenderName.trim() || null,
        custom_sender_email: customSenderEmail.trim(),
      },
      { successMessage: "Sender name and email saved", setBusy: setSavingSenderDetails },
    );
  };

  const runDomainAction = async (action: "sync" | "configure" | "mark_verified") => {
    setDomainBusy(true);
    try {
      const res = await fetch("/api/workspace/email-settings/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, workspace_id: workspaceId }),
      });
      const payload = (await res.json()) as WorkspaceEmailSettings | { error?: string };
      if (!res.ok) {
        throw new Error("error" in payload ? payload.error : "Domain action failed");
      }
      const updated = payload as WorkspaceEmailSettings;
      queryClient.setQueryData(["workspace-email-settings", workspaceId], updated);

      if (action === "configure") {
        toast.success(
          updated.domainSetup.domainManagementAvailable
            ? "Domain registered — add the DNS records below"
            : "Domain setup started — finish verification in Resend",
        );
      } else if (action === "mark_verified") {
        toast.success("Domain marked as verified — ready to send from your address");
      } else {
        toast.success(
          updated.senderDomainStatus === "verified"
            ? "Domain verified — ready to send from your address"
            : updated.senderDomainStatus === "pending"
              ? "Still waiting on DNS — we'll check again automatically"
              : "Could not verify domain yet — confirm DNS records below",
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Domain action failed");
    } finally {
      setDomainBusy(false);
    }
  };

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  const modeOptions = (
    <div className="grid gap-3 sm:grid-cols-2">
      {(
        [
          {
            value: "platform" as const,
            title: "Potentially email",
            description: "Send from the platform address configured by Potentially. No setup required.",
            footer: platformDisplay ? (
              <p className="mt-2 text-xs font-medium text-foreground">
                {platformDisplay.name ? `${platformDisplay.name} · ` : ""}
                {platformDisplay.email}
              </p>
            ) : null,
          },
          {
            value: "custom" as const,
            title: "Your email",
            description:
              "Send from your work address (e.g. you@yourcompany.com). Requires one-time DNS verification.",
            footer: null,
          },
        ] as const
      ).map((option) => {
        const selected = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={!settings?.canEdit}
            aria-pressed={selected}
            onClick={() => handleSelectMode(option.value)}
            className={cn(
              "relative rounded-xl border p-4 pr-10 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border hover:border-primary/40",
              !settings?.canEdit && "cursor-not-allowed opacity-70",
            )}
          >
            {selected && (
              <span
                className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            )}
            <p className="text-sm font-medium">{option.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            {option.footer}
          </button>
        );
      })}
    </div>
  );

  const customFields = mode === "custom" && (
    <div className="space-y-4 rounded-xl border border-dashed p-4">
      <div className="space-y-2">
        <Label htmlFor="custom-sender-name" required>
          Sender name
        </Label>
        <Input
          id="custom-sender-name"
          placeholder="e.g. Akshat Pareek"
          value={customSenderName}
          onChange={(event) => setCustomSenderName(event.target.value)}
          disabled={!settings?.canEdit || savingSenderDetails}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="custom-sender-email" required>
          Sender email
        </Label>
        <Input
          id="custom-sender-email"
          type="email"
          placeholder="you@yourcompany.com"
          value={customSenderEmail}
          onChange={(event) => setCustomSenderEmail(event.target.value)}
          disabled={!settings?.canEdit || savingSenderDetails}
        />
      </div>
      <Button
        type="button"
        className="w-full rounded-xl sm:w-auto"
        disabled={
          !settings?.canEdit ||
          savingSenderDetails ||
          !senderDetailsDirty ||
          !customSenderEmail.trim()
        }
        onClick={handleSaveSenderDetails}
      >
        {savingSenderDetails ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save name & email"
        )}
      </Button>
    </div>
  );

  const domainSetupPanel = mode === "custom" && settings && (() => {
    const canManageDomains = settings.domainSetup.domainManagementAvailable;
    const resendDomainsUrl = "https://resend.com/domains";
    const status = settings.senderDomainStatus;
    const domain = settings.senderDomain;
    const hasEmail = hasSavedCustomEmail;

    return (
      <div className="space-y-4 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Domain verification</p>
            <p className="text-xs text-muted-foreground">
              {domain ? `Domain: ${domain}` : "Save your work email above first"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(isFetching || domainBusy) &&
              status === "pending" &&
              canManageDomains && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            <Badge
              variant={
                status === "verified"
                  ? "default"
                  : status === "failed"
                    ? "destructive"
                    : "secondary"
              }
            >
              {domainStatusLabel(status)}
            </Badge>
          </div>
        </div>

        {status === "verified" ? (
          <p className="text-xs text-muted-foreground">
            This domain is verified and ready to use.
            {canManageDomains
              ? " If it was already configured in Resend, we detected it automatically."
              : " You confirmed DNS setup in Resend."}
          </p>
        ) : !canManageDomains ? (
          <>
            <p className="text-xs text-muted-foreground">
              Your Resend API key can send email but cannot manage domains automatically. Add and
              verify your domain in the Resend dashboard, then mark it verified here.
            </p>

            {status === "not_started" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!settings.canEdit || !hasEmail || domainBusy}
                onClick={() => runDomainAction("configure")}
              >
                {domainBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Configure domain
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg bg-muted/40 p-3 text-xs">
                <p className="font-medium text-foreground">Manual setup in Resend</p>
                <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                  <li>
                    Open{" "}
                    <a
                      href={resendDomainsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Resend → Domains
                    </a>{" "}
                    and add <span className="font-medium text-foreground">{domain}</span>.
                  </li>
                  <li>Copy the DNS records Resend shows (SPF, DKIM, etc.) into your domain provider.</li>
                  <li>Wait for Resend to show the domain as verified.</li>
                  <li>Click below when verification is complete.</li>
                </ol>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={resendDomainsUrl} target="_blank" rel="noopener noreferrer">
                      Open Resend domains
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!settings.canEdit || domainBusy}
                    onClick={() => runDomainAction("mark_verified")}
                  >
                    {domainBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Mark as verified
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              We check Resend automatically when you open or save these settings. If the domain is
              already verified, you can send right away. Otherwise, add the DNS records below at your
              domain provider — status refreshes every 30 seconds.
            </p>
            <div className="flex flex-wrap gap-2">
              {status === "not_started" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!settings.canEdit || !hasEmail || domainBusy}
                  onClick={() => runDomainAction("configure")}
                >
                  {domainBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Configure domain
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!settings.canEdit || !hasEmail || domainBusy}
                onClick={() => runDomainAction("sync")}
              >
                {domainBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh status now
              </Button>
            </div>
          </>
        )}

        {status !== "verified" && settings.domainSetup.records.length > 0 && (
          <div className="space-y-2">
            {settings.domainSetup.records.map((record) => (
              <div key={`${record.record}-${record.name}`} className="rounded-lg bg-muted/50 p-3 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">{record.record}</span>
                  <Badge variant="outline">{record.status}</Badge>
                </div>
                <p className="text-muted-foreground">Type: {record.type}</p>
                <div className="mt-1 flex items-start justify-between gap-2">
                  <div className="min-w-0 break-all">
                    <p>Name: {record.name}</p>
                    <p>Value: {record.value}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyValue(record.value)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  })();

  const readOnlyNote = settings && !settings.canEdit && (
    <p className="text-xs text-muted-foreground">
      Only group owners and admins can change outbound email settings for this group.
    </p>
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading email settings...</p>;
  }

  const body = (
    <>
      {modeOptions}
      {savingMode && mode === "platform" ? (
        <p className="text-xs text-muted-foreground">Saving sender mode...</p>
      ) : null}
      {customFields}
      {domainSetupPanel}
      {readOnlyNote}
    </>
  );

  if (compact) {
    return (
      <div className="mobile-card-flat space-y-4 p-4">
        <div>
          <p className="text-sm font-medium">Outbound email</p>
          <p className="text-xs text-muted-foreground">
            Choose how playbook emails are sent for {currentWorkspace?.name ?? "your group"}.
          </p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outbound email</CardTitle>
        <CardDescription>
          Choose the sender address for playbook outreach in{" "}
          {currentWorkspace?.name ?? "your group"}. Use Potentially email by default, or verify your
          own domain to send from your work address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
