import { NextResponse } from "next/server";
import { z } from "zod";
import { getContact } from "@/lib/data/contacts";
import { featureDisabledResponse } from "@/lib/data/feature-flags";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import {
  getWorkspaceEmailSettings,
  getWorkspaceEmailSettingsForSend,
} from "@/lib/data/workspace-email-settings";
import { resolveOutboundFromAddress } from "@/lib/email/from-address";
import { escapeHtmlWithBreaks } from "@/lib/email/html";
import { sendEmail } from "@/lib/email/send";

const sendSchema = z.object({
  contact_id: z.string().min(1),
  subject: z.string().max(500).optional(),
  body: z.string().min(1).max(20_000),
  cta: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("outreach_engine", "Outreach engine");
    if (disabled) return disabled;

    const params = sendSchema.parse(await request.json());
    const contact = await getContact(params.contact_id);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    if (!contact.email) {
      return NextResponse.json({ error: "Contact has no email address" }, { status: 400 });
    }

    const { supabase, user, workspaceId, profile } = await getUserWorkspaceContext();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!workspaceId) {
      return NextResponse.json({ error: "No group selected" }, { status: 400 });
    }

    const emailSettings = supabase
      ? await getWorkspaceEmailSettingsForSend(supabase, workspaceId)
      : await getWorkspaceEmailSettings(workspaceId).then((settings) => ({
          mode: settings.mode,
          customSenderName: settings.customSenderName,
          customSenderEmail: settings.customSenderEmail,
          senderDomainStatus: settings.senderDomainStatus,
        }));

    if (emailSettings.mode === "custom" && emailSettings.senderDomainStatus !== "verified") {
      return NextResponse.json(
        {
          error:
            "Your send domain is not verified yet. Open Settings → Email to finish DNS setup, or switch to Potentially email.",
        },
        { status: 400 },
      );
    }

    const subject = params.subject?.trim() || "Hello";
    const fullBody = [params.body.trim(), params.cta?.trim()].filter(Boolean).join("\n\n");
    const senderEmail =
      (profile as { email?: string | null } | null)?.email ?? user.email ?? undefined;
    const { from, replyTo } = resolveOutboundFromAddress(emailSettings, senderEmail);

    const result = await sendEmail({
      to: contact.email,
      subject,
      html: escapeHtmlWithBreaks(fullBody),
      from,
      replyTo,
    });

    return NextResponse.json({
      sent: true,
      skipped: Boolean(result && "skipped" in result && result.skipped),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Outreach send failed:", error);
    return NextResponse.json({ error: "Failed to send outreach email" }, { status: 500 });
  }
}
