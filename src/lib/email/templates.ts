import { EMAIL_LOGO_MARK_SVG } from "@/components/brand-mark";

const COLORS = {
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

/** DM Serif Display for headings (matches app font-display) */
const FONT_SERIF = '"DM Serif Display", Georgia, "Times New Roman", serif';

/** Fira Sans for body & UI (matches app font-sans) */
const FONT_SANS =
  "'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const FONT_LINKS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fira+Sans:wght@400;500;600&display=swap" rel="stylesheet" />`;

export interface AuthEmailContent {
  preview: string;
  heading: string;
  greeting?: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
  banner?: string;
}

function baseTemplate(content: AuthEmailContent) {
  const greeting = content.greeting
    ? `<p style="margin:0 0 20px;font-family:${FONT_SANS};font-size:16px;font-weight:500;line-height:1.6;color:${COLORS.text};">${content.greeting}</p>`
    : "";

  const footerNote = content.footerNote
    ? `<p style="margin:20px 0 0;font-family:${FONT_SANS};font-size:13px;line-height:1.55;color:${COLORS.muted};">${content.footerNote}</p>`
    : "";

  const banner = content.banner
    ? `<tr>
        <td style="background-color:${COLORS.forest};padding:10px 16px;text-align:center;">
          <p style="margin:0;font-family:${FONT_SANS};font-size:13px;font-weight:500;line-height:1.4;color:${COLORS.white};letter-spacing:0.01em;">
            ${content.banner}
          </p>
        </td>
      </tr>`
    : "";

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
      <td align="center" style="padding:40px 20px 48px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                <tr>
                  <td style="vertical-align:middle;line-height:0;">
                    ${EMAIL_LOGO_MARK_SVG}
                  </td>
                  <td style="padding-left:14px;font-family:${FONT_SERIF};font-size:26px;font-weight:400;color:${COLORS.text};line-height:1;vertical-align:middle;">
                    Potentially
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:${COLORS.white};border:1px solid ${COLORS.border};border-radius:20px;padding:44px 36px;box-shadow:0 2px 16px rgba(45,74,62,0.06);">
              <h1 style="margin:0 0 12px;font-family:${FONT_SERIF};font-size:30px;font-weight:400;color:${COLORS.text};line-height:1.25;">
                ${content.heading}
              </h1>
              <div style="width:56px;height:3px;background-color:${COLORS.forest};border-radius:2px;margin:0 0 28px;"></div>
              ${greeting}
              <p style="margin:0 0 32px;font-family:${FONT_SANS};font-size:16px;font-weight:400;line-height:1.625;color:${COLORS.body};">
                ${content.body}
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius:12px;background-color:${COLORS.forest};">
                    <a href="${content.ctaUrl}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${FONT_SANS};font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;letter-spacing:0.01em;">
                      ${content.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>
              ${footerNote}
              <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid ${COLORS.sage};font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLORS.muted};">
                Or copy this link into your browser:<br />
                <a href="${content.ctaUrl}" style="color:${COLORS.forest};word-break:break-all;text-decoration:underline;">${content.ctaUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:28px 12px 0;text-align:center;">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:1.6;color:${COLORS.muted};">
                Relationship intelligence for teams
              </p>
              <p style="margin:6px 0 0;font-family:${FONT_SERIF};font-size:14px;font-weight:600;color:${COLORS.forest};letter-spacing:-0.01em;">
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

export function signupVerificationEmail(name: string, actionLink: string) {
  const content: AuthEmailContent = {
    preview: "Confirm your email to start using Potentially",
    banner: "Relationship intelligence for teams who value warm introductions",
    heading: "Welcome aboard",
    greeting: `Hi ${name},`,
    body: "Thanks for joining Potentially. Confirm your email to unlock AI search, warm introductions, and your relationship graph.",
    ctaLabel: "Confirm email address",
    ctaUrl: actionLink,
    footerNote:
      "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.",
  };

  return {
    subject: "Confirm your Potentially account",
    html: baseTemplate(content),
  };
}

export function passwordResetEmail(actionLink: string) {
  const content: AuthEmailContent = {
    preview: "Reset your Potentially password",
    heading: "Reset your password",
    body: "We received a request to reset your password. Click the button below to choose a new one.",
    ctaLabel: "Reset password",
    ctaUrl: actionLink,
    footerNote:
      "If you didn't request this, you can ignore this email. Your password won't change.",
  };

  return {
    subject: "Reset your Potentially password",
    html: baseTemplate(content),
  };
}

export function magicLinkEmail(actionLink: string) {
  const content: AuthEmailContent = {
    preview: "Your secure sign-in link for Potentially",
    heading: "Sign in to Potentially",
    body: "Click below to sign in securely. No password needed. This one-time link takes you straight to your workspace.",
    ctaLabel: "Sign in to Potentially",
    ctaUrl: actionLink,
    footerNote: "This link expires shortly and can only be used once.",
  };

  return {
    subject: "Your Potentially sign-in link",
    html: baseTemplate(content),
  };
}

export function workspaceInviteEmail(workspaceName: string, inviteLink: string) {
  const content: AuthEmailContent = {
    preview: `You've been invited to join ${workspaceName} on Potentially`,
    heading: "You're invited",
    body: `You've been invited to collaborate on <strong style="font-weight:600;color:${COLORS.text};">${workspaceName}</strong>. Join the workspace to search your shared network and request warm introductions.`,
    ctaLabel: "Accept invitation",
    ctaUrl: inviteLink,
    footerNote: "This invitation expires in 7 days.",
  };

  return {
    subject: `Join ${workspaceName} on Potentially`,
    html: baseTemplate(content),
  };
}
