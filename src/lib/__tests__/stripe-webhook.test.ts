import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { verifyStripeWebhookSignature } from "@/lib/billing/stripe";

describe("stripe webhook", () => {
  it("verifies a valid signature", () => {
    const secret = "whsec_test_secret";
    const payload = '{"id":"evt_test"}';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`, "utf8")
      .digest("hex");

    process.env.STRIPE_WEBHOOK_SECRET = secret;

    expect(() =>
      verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${signature}`),
    ).not.toThrow();
  });
});
