import { createHmac, timingSafeEqual } from "crypto";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!signatureHeader) {
    throw new Error("Missing stripe-signature header");
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    throw new Error("Invalid stripe-signature header");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

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

export function parseStripeEvent(payload: string): StripeEvent {
  return JSON.parse(payload) as StripeEvent;
}

export async function createStripeCheckoutSession(options: {
  plan: "pro";
  customerEmail?: string;
  userId: string;
  workspaceId: string;
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!secretKey || !priceId) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1020";
  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${appUrl}/groups?upgraded=1`,
    cancel_url: `${appUrl}/pricing`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    allow_promotion_codes: "true",
    client_reference_id: options.workspaceId,
    "metadata[user_id]": options.userId,
    "metadata[workspace_id]": options.workspaceId,
    "metadata[plan]": options.plan,
    "subscription_data[metadata][user_id]": options.userId,
    "subscription_data[metadata][workspace_id]": options.workspaceId,
    "subscription_data[metadata][plan]": options.plan,
  });

  if (options.customerEmail) {
    params.set("customer_email", options.customerEmail);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Stripe checkout failed");
  }

  const session = (await response.json()) as { url?: string };
  return session.url ?? null;
}

export function extractPlanFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const plan = (metadata as Record<string, unknown>).plan;
  return typeof plan === "string" ? plan : null;
}

export function extractWorkspaceIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const workspaceId = (metadata as Record<string, unknown>).workspace_id;
  return typeof workspaceId === "string" ? workspaceId : null;
}
