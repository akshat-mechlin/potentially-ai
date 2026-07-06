import { NextResponse } from "next/server";
import { z } from "zod";
import { signupVerificationEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
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
    const emailResult = await sendEmail({ to: email, subject: template.subject, html: template.html });

    if (emailResult && "skipped" in emailResult && emailResult.skipped) {
      console.warn("[signup] Verification link (email not sent):", actionLink);
      return NextResponse.json({
        success: true,
        emailSkipped: true,
        message:
          "Account created, but no verification email was sent. Add RESEND_API_KEY to .env, or use the link logged in your dev server terminal.",
      });
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
