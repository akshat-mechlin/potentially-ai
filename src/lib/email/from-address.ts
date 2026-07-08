import type { EmailSenderMode } from "@/types";

export function getPlatformFromAddress() {
  return process.env.EMAIL_FROM || "Potentially <onboarding@resend.dev>";
}

export function getPlatformSenderDomain() {
  const { email } = parseDisplayFromAddress(getPlatformFromAddress());
  const match = email.match(/@([^@]+)$/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function formatFromAddress(name: string | null | undefined, email: string) {
  const trimmedName = name?.trim();
  if (trimmedName) return `${trimmedName} <${email}>`;
  return email;
}

export function parseDisplayFromAddress(from: string): { name: string | null; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: null, email: from.trim() };
}

export interface OutboundFromInput {
  mode: EmailSenderMode;
  customSenderName: string | null;
  customSenderEmail: string | null;
}

export function resolveOutboundFromAddress(
  settings: OutboundFromInput,
  replyToEmail?: string | null,
) {
  if (settings.mode === "custom" && settings.customSenderEmail?.trim()) {
    return {
      from: formatFromAddress(settings.customSenderName, settings.customSenderEmail.trim()),
      replyTo: settings.customSenderEmail.trim() || replyToEmail?.trim() || undefined,
    };
  }

  return { from: getPlatformFromAddress() };
}
