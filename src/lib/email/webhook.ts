import { Resend } from "resend";
import { Webhook } from "standardwebhooks";
import { parseRunContactIdFromInboundAddress } from "@/lib/email/from-address";

export type ResendWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
};

export type ReplyMetadata = {
  from: string;
  subject: string;
  text: string;
  html: string;
  inReplyTo?: string;
  references?: string;
  runContactId?: string;
  providerMessageId?: string;
};

export function verifyResendWebhook(payload: string, headers: Headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return JSON.parse(payload) as ResendWebhookEvent;
    }
    throw new Error("RESEND_WEBHOOK_SECRET is not configured");
  }

  const wh = new Webhook(secret);
  return wh.verify(payload, {
    "webhook-id": headers.get("webhook-id") ?? "",
    "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
    "webhook-signature": headers.get("webhook-signature") ?? "",
  }) as ResendWebhookEvent;
}

function normalizeHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function headerMap(headers: unknown): Record<string, string | string[]> {
  if (!headers || typeof headers !== "object") return {};
  return headers as Record<string, string | string[]>;
}

function extractRunContactIdFromRecipients(to: unknown, receivedFor: unknown) {
  const bags = [to, receivedFor];
  for (const bag of bags) {
    const list = Array.isArray(bag) ? bag : typeof bag === "string" ? [bag] : [];
    for (const entry of list) {
      if (typeof entry !== "string") continue;
      const id = parseRunContactIdFromInboundAddress(entry);
      if (id) return id;
    }
  }
  return undefined;
}

/** Webhook payloads are metadata-only; merge with Receiving API when email_id is present. */
export async function extractReplyMetadata(event: ResendWebhookEvent): Promise<ReplyMetadata> {
  const data = event.data;
  const emailId = typeof data.email_id === "string" ? data.email_id : null;
  let headers = headerMap(data.headers);
  let text = normalizeHeaderValue(data.text as string | undefined) ?? "";
  let html = normalizeHeaderValue(data.html as string | undefined) ?? "";
  let from = normalizeHeaderValue(data.from as string | undefined) ?? "";
  let subject = normalizeHeaderValue(data.subject as string | undefined) ?? "";
  let to: unknown = data.to;
  let receivedFor: unknown = data.received_for;

  if (emailId && process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_your")) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data: received, error } = await resend.emails.receiving.get(emailId);
      if (error) {
        console.warn("[email.webhook] receiving.get failed:", error.message);
      } else if (received) {
        headers = { ...headers, ...headerMap(received.headers) };
        text = received.text?.trim() || text;
        html = received.html?.trim() || html;
        from = received.from?.trim() || from;
        subject = received.subject?.trim() || subject;
        to = received.to ?? to;
        receivedFor = received.received_for ?? receivedFor;
      }
    } catch (error) {
      console.warn("[email.webhook] receiving.get threw:", error);
    }
  }

  const runContactFromHeader = normalizeHeaderValue(
    headers["x-potentially-run-contact"] ?? headers["X-Potentially-Run-Contact"],
  );
  const runContactFromTo = extractRunContactIdFromRecipients(to, receivedFor);

  return {
    from: parseDisplayFromLoose(from),
    subject,
    text,
    html,
    inReplyTo: normalizeHeaderValue(headers["in-reply-to"] ?? headers["In-Reply-To"]),
    references: normalizeHeaderValue(headers.references ?? headers.References),
    runContactId: runContactFromHeader || runContactFromTo,
    providerMessageId: emailId ?? undefined,
  };
}

function parseDisplayFromLoose(from: string) {
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}
