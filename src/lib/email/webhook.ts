import { Webhook } from "standardwebhooks";

export type ResendWebhookEvent = {
  type: string;
  data: Record<string, unknown>;
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

export function extractReplyMetadata(event: ResendWebhookEvent) {
  const data = event.data;
  const headers = (data.headers ?? {}) as Record<string, string | string[]>;
  const normalize = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return {
    from: normalize(data.from as string | undefined) ?? "",
    subject: normalize(data.subject as string | undefined) ?? "",
    text: normalize(data.text as string | undefined) ?? "",
    html: normalize(data.html as string | undefined) ?? "",
    inReplyTo: normalize(headers["in-reply-to"] ?? headers["In-Reply-To"]),
    references: normalize(headers.references ?? headers.References),
    runContactId: normalize(headers["x-potentially-run-contact"] ?? headers["X-Potentially-Run-Contact"]),
    providerMessageId: normalize(data.email_id as string | undefined),
  };
}
