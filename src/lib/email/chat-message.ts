import { sendEmail } from "@/lib/email/send";
import { buildAudienceCta } from "@/lib/email/audience";
import { chatMessageEmail } from "@/lib/email/templates";
import {
  buildInboundReplyTo,
  getPlatformFromAddress,
  resolveOutboundFromAddress,
} from "@/lib/email/from-address";
import type { OutboundFromInputWithDomain } from "@/lib/data/workspace-email-settings";

export async function sendChatMessageEmail(input: {
  to: string;
  recipientName: string | null;
  senderName: string;
  senderWorkspaceName: string | null;
  body: string;
  runContactId: string;
  emailSettings?: OutboundFromInputWithDomain & { mode: "platform" | "custom" };
  senderEmail?: string | null;
}) {
  const audience = await buildAudienceCta({
    email: input.to,
    deepLinkPath: `/chats/${input.runContactId}`,
    onPlatformLabel: "Open conversation",
    offPlatformLabel: "Join Potentially to reply",
    secondaryOnPlatformLabel: "Already have an account? Open your inbox",
  });

  const { subject, html } = await chatMessageEmail({
    recipientName: input.recipientName,
    senderName: input.senderName,
    senderWorkspaceName: input.senderWorkspaceName,
    body: input.body,
    ctaUrl: audience.ctaUrl,
    secondaryUrl: audience.secondaryUrl,
    onPlatform: audience.onPlatform,
  });

  const { from, replyTo } = input.emailSettings
    ? resolveOutboundFromAddress(input.emailSettings, input.senderEmail ?? undefined, {
        runContactId: input.runContactId,
      })
    : {
        from: getPlatformFromAddress(),
        replyTo:
          buildInboundReplyTo(input.runContactId) || input.senderEmail || undefined,
      };

  return sendEmail({
    to: input.to,
    subject,
    html,
    from,
    replyTo,
    headers: {
      "X-Potentially-Chat": audience.onPlatform ? "notify" : "invite",
      "X-Potentially-Run-Contact": input.runContactId,
    },
  });
}
