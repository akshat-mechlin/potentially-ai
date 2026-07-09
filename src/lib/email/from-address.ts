import type { EmailSenderMode } from "@/types";

const SANDBOX_FROM = "Potentially <onboarding@resend.dev>";

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function getPlatformFromAddress() {
  const configured = process.env.EMAIL_FROM?.trim();
  if (!configured) {
    if (isProductionRuntime()) {
      throw new Error(
        "EMAIL_FROM is not set on the server. Add EMAIL_FROM=\"Potentially <you@yourdomain.com>\" to .env and restart.",
      );
    }
    return SANDBOX_FROM;
  }

  const { email } = parseDisplayFromAddress(configured);
  if (!email.includes("@")) {
    throw new Error(
      `EMAIL_FROM is invalid ("${configured}"). Quote the value in .env, e.g. EMAIL_FROM="Potentially <hrms@mechlintech.com>".`,
    );
  }

  if (email.endsWith("@resend.dev") && isProductionRuntime()) {
    throw new Error(
      "EMAIL_FROM uses onboarding@resend.dev in production. Set EMAIL_FROM to an address on your verified domain, e.g. hrms@mechlintech.com.",
    );
  }

  return configured;
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
