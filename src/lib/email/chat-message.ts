import { sendEmail } from "@/lib/email/send";
import { getPlatformFromAddress } from "@/lib/email/from-address";
import { resolveOutboundFromAddress } from "@/lib/email/from-address";
import type { OutboundFromInputWithDomain } from "@/lib/data/workspace-email-settings";

export async function sendChatMessageEmail(input: {
  to: string;
  recipientName: string | null;
  senderName: string;
  senderWorkspaceName: string | null;
  body: string;
  inviteUrl: string;
  chatUrl: string;
  runContactId: string;
  emailSettings?: OutboundFromInputWithDomain & { mode: "platform" | "custom" };
  senderEmail?: string | null;
}) {
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : "Hi,";
  const fromLine = input.senderWorkspaceName
    ? `${input.senderName} (${input.senderWorkspaceName})`
    : input.senderName;

  const html = `
    <p>${greeting}</p>
    <p><strong>${fromLine}</strong> sent you a message on Potentially:</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #16a34a;background:#f8faf8;">
      ${input.body.replace(/\n/g, "<br>")}
    </blockquote>
    <p>
      <a href="${input.inviteUrl}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:8px;">
        Join Potentially to reply
      </a>
    </p>
    <p style="color:#64748b;font-size:13px;">
      Already have an account? <a href="${input.chatUrl}">Open your inbox</a>
    </p>
  `;

  const { from, replyTo } = input.emailSettings
    ? resolveOutboundFromAddress(input.emailSettings, input.senderEmail ?? undefined)
    : { from: getPlatformFromAddress(), replyTo: input.senderEmail ?? undefined };

  return sendEmail({
    to: input.to,
    subject: `New message from ${input.senderName}`,
    html,
    from,
    replyTo,
    headers: {
      "X-Potentially-Chat": "invite",
      "X-Potentially-Run-Contact": input.runContactId,
    },
  });
}
