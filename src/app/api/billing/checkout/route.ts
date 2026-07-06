import { NextResponse } from "next/server";
import { z } from "zod";
import { PLANS } from "@/lib/billing/plans";
import { createStripeCheckoutSession, isStripeConfigured } from "@/lib/billing/stripe";
import { getUserWorkspaceContext } from "@/lib/data/workspace";

const checkoutSchema = z.object({
  plan: z.enum(["pro", "enterprise"]),
  workspace_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, workspace_id: requestedWorkspaceId } = checkoutSchema.parse(body);

    if (plan === "enterprise") {
      return NextResponse.json({
        mode: "contact",
        message: "Contact sales@potentially.ai for Enterprise pricing",
        mailto: "mailto:sales@potentially.ai?subject=Enterprise%20plan",
      });
    }

    const { supabase, user, workspaceId } = await getUserWorkspaceContext();
    if (!supabase || !user) {
      return NextResponse.json({ error: "Sign in to upgrade" }, { status: 401 });
    }

    const targetWorkspaceId = requestedWorkspaceId ?? workspaceId;
    if (!targetWorkspaceId) {
      return NextResponse.json({ error: "No group selected for upgrade" }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({
        mode: "manual",
        message: `Add STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID to .env. The ${PLANS.pro.name} plan is $${PLANS.pro.priceMonthly}/month.`,
        missing: ["STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID"],
      });
    }

    const checkoutUrl = await createStripeCheckoutSession({
      plan: "pro",
      customerEmail: user.email ?? undefined,
      userId: user.id,
      workspaceId: targetWorkspaceId,
    });

    if (!checkoutUrl) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ mode: "stripe", url: checkoutUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    console.error("Checkout failed:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
