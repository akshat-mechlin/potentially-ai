import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordResetEmail } from "@/lib/email/templates";
import { deliverAuthEmail } from "@/lib/email/auth-delivery";
import { createAdminClient, ensurePublicActionLink, getAppUrl } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/app-config";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true, message: "Reset link sent (demo mode)" });
    }

    const body = await request.json();
    const { email } = schema.parse(body);
    const supabase = createAdminClient();
    const redirectTo = `${getAppUrl(request)}/reset-password`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // Always return success to avoid email enumeration
    if (!error && data.properties?.action_link) {
      const publicActionLink = ensurePublicActionLink(
        data.properties.action_link,
        request,
      );
      const template = passwordResetEmail(publicActionLink);
      const delivery = await deliverAuthEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });

      if (!delivery.sent) {
        console.warn("[forgot-password] Email not sent:", delivery.reason);
        console.warn("[forgot-password] Reset link:", publicActionLink);
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    console.error("Password reset email failed:", error);
    return NextResponse.json({ error: "Failed to send reset email" }, { status: 500 });
  }
}
