import { EMAIL_LOGO_MARK_SVG } from "@/components/brand-mark";

export const EMAIL_COLORS = {
  cream: "#F9F8F4",
  forest: "#2D4739",
  forestDark: "#2D4A3E",
  sage: "#E8EDE9",
  sageLight: "#F2F4EF",
  text: "#1A1A1A",
  body: "#4A4A4A",
  muted: "#6B7280",
  white: "#FFFFFF",
  border: "#D8DCD4",
} as const;

const COLORS = EMAIL_COLORS;

/** DM Serif Display for headings (matches app font-display) */
const FONT_SERIF = '"DM Serif Display", Georgia, "Times New Roman", serif';

/** Fira Sans for body & UI (matches app font-sans) */
const FONT_SANS =
  "'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600&display=swap" rel="stylesheet" />`;

const MARKETING_TAGLINE = "Relationship intelligence for teams";
const DEFAULT_BANNER = "Warm introductions. Stronger relationships. Built for teams.";

export interface BrandedEmailContent {
  preview: string;
  heading: string;
  greeting?: string;
  /** HTML body (already escaped / constructed by callers). */
  body: string;
  /** Optional quote / message block HTML. */
  quoteHtml?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  footerNote?: string;
  /** Top forest banner. Defaults to product marketing line when omitted; pass null to hide. */
  banner?: string | null;
  showCopyLink?: boolean;
}

/** @deprecated Use BrandedEmailContent */
export type AuthEmailContent = BrandedEmailContent;

export function renderBrandedEmail(content: BrandedEmailContent) {
  const greeting = content.greeting
    ? `<p style="margin:0 0 18px;font-family:${FONT_SANS};font-size:16px;font-weight:500;line-height:1.6;color:${COLORS.text};">${content.greeting}</p>`
    : "";

  const quote = content.quoteHtml
    ? `<div style="margin:0 0 28px;padding:16px 18px;border-left:3px solid ${COLORS.forest};background-color:${COLORS.sageLight};border-radius:0 12px 12px 0;">
        <p style="margin:0;font-family:${FONT_SANS};font-size:15px;line-height:1.65;color:${COLORS.body};">${content.quoteHtml}</p>
      </div>`
    : "";

  const secondary =
    content.secondaryLabel && content.secondaryUrl
      ? `<p style="margin:18px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.55;color:${COLORS.muted};">
          <a href="${content.secondaryUrl}" style="color:${COLORS.forest};text-decoration:underline;font-weight:500;">${content.secondaryLabel}</a>
        </p>`
      : "";

  const footerNote = content.footerNote
    ? `<p style="margin:20px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.55;color:${COLORS.muted};">${content.footerNote}</p>`
    : "";

  const bannerText = content.banner === null ? null : (content.banner ?? DEFAULT_BANNER);
  const banner = bannerText
    ? `<tr>
        <td style="background-color:${COLORS.forest};padding:12px 20px;text-align:center;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;font-weight:500;line-height:1.45;color:${COLORS.white};letter-spacing:0.02em;">
            ${bannerText}
          </p>
        </td>
      </tr>`
    : "";

  const copyLink =
    content.showCopyLink === false
      ? ""
      : `<p style="margin:28px 0 0;padding-top:22px;border-top:1px solid ${COLORS.sage};font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLORS.muted};">
          Or copy this link into your browser:<br />
          <a href="${content.ctaUrl}" style="color:${COLORS.forest};word-break:break-all;text-decoration:underline;">${content.ctaUrl}</a>
        </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${content.heading}</title>
  ${FONT_LINKS}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.cream};font-family:${FONT_SANS};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${content.preview}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${COLORS.cream};">
    ${banner}
    <tr>
      <td align="center" style="padding:44px 20px 52px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="vertical-align:middle;line-height:0;">
                    ${EMAIL_LOGO_MARK_SVG}
                  </td>
                  <td style="padding-left:14px;font-family:${FONT_SERIF};font-size:28px;font-weight:400;color:${COLORS.text};line-height:1;vertical-align:middle;">
                    Potentially
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:${COLORS.white};border:1px solid ${COLORS.border};border-radius:20px;padding:42px 36px;box-shadow:0 4px 24px rgba(45,71,57,0.07);">
              <h1 style="margin:0 0 10px;font-family:${FONT_SERIF};font-size:30px;font-weight:400;color:${COLORS.text};line-height:1.25;letter-spacing:-0.01em;">
                ${content.heading}
              </h1>
              <div style="width:48px;height:3px;background-color:${COLORS.forest};border-radius:2px;margin:0 0 26px;"></div>
              ${greeting}
              <div style="margin:0 0 ${content.quoteHtml ? "20px" : "28px"};font-family:${FONT_SANS};font-size:16px;font-weight:400;line-height:1.65;color:${COLORS.body};">
                ${content.body}
              </div>
              ${quote}
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:12px;background-color:${COLORS.forest};">
                    <a href="${content.ctaUrl}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;letter-spacing:0.01em;">
                      ${content.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              ${secondary}
              ${footerNote}
              ${copyLink}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 12px 0;text-align:center;">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLORS.muted};">
                ${MARKETING_TAGLINE}
              </p>
              <p style="margin:8px 0 0;font-family:${FONT_SERIF};font-size:15px;font-weight:400;color:${COLORS.forest};letter-spacing:-0.01em;">
                potentially.ai
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type EmailPayload = { subject: string; html: string };

export async function signupVerificationEmail(
  name: string,
  actionLink: string,
): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  return renderPlatformEmail("signup_verification", {
    vars: { name: name || "there", cta_url: actionLink },
    ctaUrl: actionLink,
    onPlatform: true,
  });
}

export async function passwordResetEmail(actionLink: string): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  return renderPlatformEmail("password_reset", {
    vars: { cta_url: actionLink },
    ctaUrl: actionLink,
    onPlatform: true,
  });
}

export async function magicLinkEmail(actionLink: string): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  return renderPlatformEmail("magic_link", {
    vars: { cta_url: actionLink },
    ctaUrl: actionLink,
    onPlatform: true,
  });
}

export async function workspaceInviteEmail(
  workspaceName: string,
  inviteLink: string,
): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  return renderPlatformEmail("workspace_invite", {
    vars: { workspace_name: workspaceName, cta_url: inviteLink },
    ctaUrl: inviteLink,
    onPlatform: true,
  });
}

export async function chatMessageEmail(input: {
  recipientName: string | null;
  senderName: string;
  senderWorkspaceName: string | null;
  body: string;
  ctaUrl: string;
  secondaryUrl?: string;
  onPlatform: boolean;
}): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  const senderLine = input.senderWorkspaceName
    ? `${input.senderName} (${input.senderWorkspaceName})`
    : input.senderName;

  return renderPlatformEmail("chat_message", {
    vars: {
      name: input.recipientName || "there",
      sender_name: input.senderName,
      sender_workspace: input.senderWorkspaceName ?? "",
      sender_line: senderLine,
      cta_url: input.ctaUrl,
    },
    ctaUrl: input.ctaUrl,
    onPlatform: input.onPlatform,
    secondaryUrl: input.secondaryUrl,
    quoteText: input.body,
    forceHideBanner: input.onPlatform,
    footerNoteOverride: input.onPlatform
      ? "Reply in Potentially to keep the conversation in one place."
      : undefined,
  });
}

export async function supportTicketReceivedEmail(input: {
  recipientName: string | null;
  subject: string;
  ticketUrl: string;
}): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  return renderPlatformEmail("support_ticket_received", {
    vars: {
      name: input.recipientName || "there",
      subject: input.subject,
      cta_url: input.ticketUrl,
    },
    ctaUrl: input.ticketUrl,
    onPlatform: true,
  });
}

export async function supportAdminAlertEmail(input: {
  title: string;
  message: string;
  ticketUrl: string;
}): Promise<EmailPayload> {
  const { renderPlatformEmail } = await import("@/lib/email/platform-templates");
  return renderPlatformEmail("support_admin_alert", {
    vars: {
      title: input.title,
      message: input.message,
      cta_url: input.ticketUrl,
    },
    ctaUrl: input.ticketUrl,
    onPlatform: true,
    showCopyLink: true,
  });
}
