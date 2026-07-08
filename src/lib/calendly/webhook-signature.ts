import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Calendly-Webhook-Signature header (format: t=<unix>,v1=<hex>).
 * @see https://developer.calendly.com/api-docs/ZG9jOjM2MzE2MDM4-webhook-signatures
 */
export function verifyCalendlyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  signingKey: string,
) {
  if (!signatureHeader) {
    throw new Error("Missing Calendly-Webhook-Signature header");
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    throw new Error("Invalid Calendly-Webhook-Signature header");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", signingKey).update(signedPayload, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new Error("Invalid webhook signature");
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (ageSeconds > 300) {
    throw new Error("Webhook timestamp outside tolerance");
  }
}
