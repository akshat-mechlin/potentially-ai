import { NextResponse } from "next/server";
import { z } from "zod";
import { signupVerificationEmail } from "@/lib/email/templates";
import { deliverAuthEmail } from "@/lib/email/auth-delivery";
import { createAdminClient, getAppUrl } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/app-config";

const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  invite: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true, message: "Account created (demo mode)" });
    }

    const body = await request.json();
    const { name, email, password, invite } = signupSchema.parse(body);
    const supabase = createAdminClient();
    const redirectTo = invite
      ? `${getAppUrl(request)}/api/auth/callback?next=/groups&invite=${encodeURIComponent(invite)}`
      : `${getAppUrl(request)}/api/auth/callback?next=/dashboard`;

    if (redirectTo.includes("localhost") || redirectTo.includes("127.0.0.1")) {
      console.error(
        "[signup] Refusing localhost redirectTo in verification email:",
        redirectTo,
        "Set NEXT_PUBLIC_APP_URL=https://potentially.mechlintech.com and Supabase Site URL to the same domain.",
      );
      return NextResponse.json(
        {
          error:
            "Server is misconfigured for email verification redirects. Set NEXT_PUBLIC_APP_URL to your production domain.",
        },
        { status: 500 },
      );
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { full_name: name },
        redirectTo,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Try signing in instead." },
          { status: 409 },
        );
      }
      throw error;
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ error: "Failed to generate verification link" }, { status: 500 });
    }

    const template = signupVerificationEmail(name, actionLink);
    const delivery = await deliverAuthEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    if (!delivery.sent) {
      const userId = data.user?.id;
      if (userId) {
        await supabase.auth.admin.deleteUser(userId).catch((deleteError) => {
          console.error("Failed to roll back unverified signup user:", deleteError);
        });
      }

      console.error("[signup] Verification email not sent:", delivery.reason);
      return NextResponse.json({ error: delivery.reason }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: "Check your email to verify your account",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Signup email failed:", error);
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
