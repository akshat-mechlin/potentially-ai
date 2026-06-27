import { NextResponse } from "next/server";
import { z } from "zod";
import { magicLinkEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient, getAppUrl } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/app-config";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true, message: "Magic link sent (demo mode)" });
    }

    const body = await request.json();
    const { email } = schema.parse(body);
    const supabase = createAdminClient();
    const redirectTo = `${getAppUrl()}/api/auth/callback?next=/dashboard`;

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

    const template = magicLinkEmail(actionLink);
    await sendEmail({ to: email, subject: template.subject, html: template.html });

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
