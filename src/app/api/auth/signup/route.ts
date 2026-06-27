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
});

export async function POST(request: Request) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true, message: "Account created (demo mode)" });
    }

    const body = await request.json();
    const { name, email, password } = signupSchema.parse(body);
    const supabase = createAdminClient();
    const redirectTo = `${getAppUrl()}/api/auth/callback?next=/dashboard`;

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
    await sendEmail({ to: email, subject: template.subject, html: template.html });

    return NextResponse.json({
      success: true,
      message: "Check your email to verify your account",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
    }
    console.error("Signup email failed:", error);
    const message = error instanceof Error ? error.message : "Signup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
