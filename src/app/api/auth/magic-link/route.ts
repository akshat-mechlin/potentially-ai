import { NextResponse } from "next/server";
import { z } from "zod";
import { magicLinkEmail } from "@/lib/email/templates";
import { deliverAuthEmail } from "@/lib/email/auth-delivery";
import { createAdminClient, ensurePublicActionLink, getAppUrl } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/app-config";

const schema = z.object({
  email: z.string().email(),
  invite: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true, message: "Magic link sent (demo mode)" });
    }

    const body = await request.json();
    const { email, invite } = schema.parse(body);
    const supabase = createAdminClient();
    const redirectTo = invite
      ? `${getAppUrl(request)}/api/auth/callback?next=/groups&invite=${encodeURIComponent(invite)}`
      : `${getAppUrl(request)}/api/auth/callback?next=/dashboard`;

    if (redirectTo.includes("localhost") || redirectTo.includes("127.0.0.1")) {
      console.error(
        "[magic-link] Refusing localhost redirectTo:",
        redirectTo,
        "Set APP_URL / NEXT_PUBLIC_APP_URL to your production domain.",
      );
      return NextResponse.json(
        {
          error:
            "Server is misconfigured for auth email redirects. Set APP_URL to your production domain.",
        },
        { status: 500 },
      );
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ error: "Failed to generate sign-in link" }, { status: 500 });
    }

    const publicActionLink = ensurePublicActionLink(actionLink, request);
    const template = await magicLinkEmail(publicActionLink);
    const delivery = await deliverAuthEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (!delivery.sent) {
      if (!delivery.recoverable) {
        return NextResponse.json({ error: delivery.reason }, { status: 500 });
      }

      console.warn("[magic-link] Email not sent:", delivery.reason);
      console.warn("[magic-link] Sign-in link:", publicActionLink);

      return NextResponse.json(
        {
          error:
            "Email delivery is limited on this server. Use email and password sign-in, or verify your domain in Resend.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Check your email for the sign-in link",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    console.error("Magic link email failed:", error);
    const message = error instanceof Error ? error.message : "Failed to send magic link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
