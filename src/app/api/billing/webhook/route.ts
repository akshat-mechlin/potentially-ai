import { NextResponse } from "next/server";
import {
  extractWorkspaceIdFromMetadata,
  parseStripeEvent,
  verifyStripeWebhookSignature,
} from "@/lib/billing/stripe";
import { applyWorkspacePlan, applyWorkspacePlanFromStripeMetadata } from "@/lib/billing/subscriptions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    verifyStripeWebhookSignature(payload, signature);
    const event = parseStripeEvent(payload);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const workspaceId =
          extractWorkspaceIdFromMetadata(session.metadata) ||
          (typeof session.client_reference_id === "string" ? session.client_reference_id : null);

        if (workspaceId) {
          await applyWorkspacePlanFromStripeMetadata(session.metadata, {
            customerId: typeof session.customer === "string" ? session.customer : null,
            subscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const status = subscription.status;
        const workspaceId = extractWorkspaceIdFromMetadata(subscription.metadata);

        if (workspaceId && (status === "active" || status === "trialing")) {
          await applyWorkspacePlanFromStripeMetadata(subscription.metadata, {
            customerId: typeof subscription.customer === "string" ? subscription.customer : null,
            subscriptionId: typeof subscription.id === "string" ? subscription.id : null,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const workspaceId = extractWorkspaceIdFromMetadata(subscription.metadata);
        if (workspaceId) {
          await applyWorkspacePlan(workspaceId, "free", {
            customerId: typeof subscription.customer === "string" ? subscription.customer : null,
            subscriptionId: null,
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed:", error);
    const message = error instanceof Error ? error.message : "Webhook error";
    const status = message.includes("signature") || message.includes("STRIPE_WEBHOOK_SECRET") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
