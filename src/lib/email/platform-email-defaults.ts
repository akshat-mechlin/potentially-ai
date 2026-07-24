/** Platform email template keys managed from the admin panel. */
export const PLATFORM_EMAIL_TEMPLATE_KEYS = [
  "signup_verification",
  "password_reset",
  "magic_link",
  "workspace_invite",
  "chat_message",
  "intro_request",
  "support_ticket_received",
  "support_admin_alert",
  "ticket_status_update",
  "ticket_staff_reply",
  "outreach_marketing_footer",
] as const;

export type PlatformEmailTemplateKey = (typeof PLATFORM_EMAIL_TEMPLATE_KEYS)[number];

export type PlatformEmailTemplateFields = {
  name: string;
  description: string;
  subject: string;
  preview: string;
  /** null = hide marketing banner */
  banner: string | null;
  heading: string;
  greeting: string | null;
  body: string;
  quote_enabled: boolean;
  cta_label_on_platform: string;
  cta_label_off_platform: string;
  footer_note: string | null;
  secondary_label_off_platform: string | null;
};

export type PlatformEmailTemplateRow = PlatformEmailTemplateFields & {
  key: PlatformEmailTemplateKey;
  updated_at?: string | null;
  updated_by?: string | null;
};

const DEFAULT_BANNER = "Warm introductions. Stronger relationships. Built for teams.";

/** Code defaults used for seed, reset, and send-time fallback. */
export const PLATFORM_EMAIL_TEMPLATE_DEFAULTS: Record<
  PlatformEmailTemplateKey,
  PlatformEmailTemplateFields
> = {
  signup_verification: {
    name: "Signup verification",
    description: "Sent after signup to confirm the email address.",
    subject: "Confirm your Potentially account",
    preview: "Confirm your email to start using Potentially",
    banner: DEFAULT_BANNER,
    heading: "Welcome aboard",
    greeting: "Hi {{name}},",
    body: "Thanks for joining Potentially. Confirm your email to unlock AI search, warm introductions, and your relationship graph.",
    quote_enabled: false,
    cta_label_on_platform: "Confirm email address",
    cta_label_off_platform: "Confirm email address",
    footer_note:
      "This link expires in 24 hours. If you did not create an account, you can safely ignore this email.",
    secondary_label_off_platform: null,
  },
  password_reset: {
    name: "Password reset",
    description: "Sent when a user requests a password reset.",
    subject: "Reset your Potentially password",
    preview: "Reset your Potentially password",
    banner: null,
    heading: "Reset your password",
    greeting: null,
    body: "We received a request to reset your password. Click the button below to choose a new one.",
    quote_enabled: false,
    cta_label_on_platform: "Reset password",
    cta_label_off_platform: "Reset password",
    footer_note:
      "If you did not request this, you can ignore this email. Your password will not change.",
    secondary_label_off_platform: null,
  },
  magic_link: {
    name: "Magic link sign-in",
    description: "One-time sign-in link email.",
    subject: "Your Potentially sign-in link",
    preview: "Your secure sign-in link for Potentially",
    banner: DEFAULT_BANNER,
    heading: "Sign in to Potentially",
    greeting: null,
    body: "Click below to sign in securely. No password needed. This one-time link takes you straight to your workspace.",
    quote_enabled: false,
    cta_label_on_platform: "Sign in to Potentially",
    cta_label_off_platform: "Sign in to Potentially",
    footer_note: "This link expires shortly and can only be used once.",
    secondary_label_off_platform: null,
  },
  workspace_invite: {
    name: "Workspace invite",
    description: "Invite a teammate to a workspace.",
    subject: "Join {{workspace_name}} on Potentially",
    preview: "You have been invited to join {{workspace_name}} on Potentially",
    banner: DEFAULT_BANNER,
    heading: "You're invited",
    greeting: null,
    body: 'You have been invited to collaborate on <strong style="font-weight:600;color:#1A1A1A;">{{workspace_name}}</strong>. Join the workspace to search your shared network and request warm introductions.',
    quote_enabled: false,
    cta_label_on_platform: "Accept invitation",
    cta_label_off_platform: "Accept invitation",
    footer_note: "This invitation expires in 7 days.",
    secondary_label_off_platform: null,
  },
  chat_message: {
    name: "Chat message",
    description: "Email when someone receives a Potentially chat message.",
    subject: "New message from {{sender_name}}",
    preview: "{{sender_name}} sent you a message on Potentially",
    banner: "Join Potentially to reply and grow your network with warm introductions",
    heading: "New message",
    greeting: "Hi {{name}},",
    body: '<strong style="font-weight:600;color:#1A1A1A;">{{sender_line}}</strong> sent you a message on Potentially.',
    quote_enabled: true,
    cta_label_on_platform: "Open conversation",
    cta_label_off_platform: "Join Potentially to reply",
    footer_note:
      "Create a free account to reply and unlock relationship intelligence for your team.",
    secondary_label_off_platform: "Already have an account? Open your inbox",
  },
  intro_request: {
    name: "Introduction request",
    description: "Email a contact when someone on Potentially would like an introduction to them.",
    subject: "{{requester_name}} on Potentially would like an introduction",
    preview: "{{requester_name}} on Potentially would like an introduction to you",
    banner: DEFAULT_BANNER,
    heading: "Introduction request",
    greeting: "Hi {{name}},",
    body: '<p style="margin:0 0 16px;"><strong style="font-weight:600;color:#1A1A1A;">{{requester_name}}</strong> is reaching out through Potentially and would like an introduction to you.</p><p style="margin:0 0 16px;">Potentially helps people find warm paths through their professional networks. {{requester_name}} came across your profile there and thought a short introduction would be a good next step.</p><p style="margin:0 0 16px;">If you are open to connecting, reply to this email and say hello. A quick note back is enough to get the conversation started. If now is not the right time, you can ignore this message with no further follow up from us.</p><p style="margin:0;">Thanks for considering it. We appreciate your time.</p>',
    quote_enabled: true,
    cta_label_on_platform: "Open Potentially",
    cta_label_off_platform: "Learn about Potentially",
    footer_note:
      "This message was sent because someone using Potentially asked to be introduced to you. Reply to continue the conversation, or ignore if you prefer not to connect.",
    secondary_label_off_platform: null,
  },
  support_ticket_received: {
    name: "Support ticket received",
    description: "Confirmation to the user after they open a support ticket.",
    subject: "Ticket received: {{subject}}",
    preview: "We received your support request: {{subject}}",
    banner: null,
    heading: "We got your request",
    greeting: "Hi {{name}},",
    body: 'We received your support request <strong style="font-weight:600;color:#1A1A1A;">{{subject}}</strong>. Our team will reply soon.',
    quote_enabled: false,
    cta_label_on_platform: "View ticket",
    cta_label_off_platform: "View ticket",
    footer_note: "You can add more detail anytime from your support inbox.",
    secondary_label_off_platform: null,
  },
  support_admin_alert: {
    name: "Support admin alert",
    description: "Notify platform admins about a support ticket event.",
    subject: "{{title}}",
    preview: "{{title}}",
    banner: null,
    heading: "Support alert",
    greeting: null,
    body: "{{message}}",
    quote_enabled: false,
    cta_label_on_platform: "Open ticket",
    cta_label_off_platform: "Open ticket",
    footer_note: null,
    secondary_label_off_platform: null,
  },
  ticket_status_update: {
    name: "Ticket status update",
    description: "Sent from admin when a ticket status changes.",
    subject: "Ticket update: {{subject}}",
    preview: "Your support ticket status is now {{status}}",
    banner: null,
    heading: "Ticket update",
    greeting: "Hi {{name}},",
    body: 'Your support ticket status is now <strong style="font-weight:600;color:#1A1A1A;">{{status}}</strong>.',
    quote_enabled: false,
    cta_label_on_platform: "View ticket",
    cta_label_off_platform: "Join Potentially to view ticket",
    footer_note: "Reply anytime from your support inbox in Potentially.",
    secondary_label_off_platform: null,
  },
  ticket_staff_reply: {
    name: "Ticket staff reply",
    description: "Sent from admin when support replies on a ticket.",
    subject: "Re: {{subject}}",
    preview: "Potentially Support replied to: {{subject}}",
    banner: DEFAULT_BANNER,
    heading: "Support replied",
    greeting: "Hi {{name}},",
    body: "Potentially Support replied to your ticket.",
    quote_enabled: true,
    cta_label_on_platform: "View and reply",
    cta_label_off_platform: "Join Potentially to reply",
    footer_note: "Open the ticket in Potentially to continue the conversation.",
    secondary_label_off_platform: null,
  },
  outreach_marketing_footer: {
    name: "Outreach marketing footer",
    description:
      "Slim Potentially strip appended to playbook outreach. Heading = brand line, body = tagline, CTA labels = invite/open links.",
    subject: "Sent with Potentially",
    preview: "Sent with Potentially",
    banner: null,
    heading: "Sent with Potentially",
    greeting: null,
    body: "Relationship intelligence for teams",
    quote_enabled: false,
    cta_label_on_platform: "Open Potentially",
    cta_label_off_platform: "Join Potentially",
    footer_note: "Prefer a warmer intro next time?",
    secondary_label_off_platform: null,
  },
};

export const PLATFORM_EMAIL_MERGE_TAGS = [
  "{{name}}",
  "{{email}}",
  "{{workspace_name}}",
  "{{subject}}",
  "{{status}}",
  "{{title}}",
  "{{message}}",
  "{{sender_name}}",
  "{{sender_workspace}}",
  "{{sender_line}}",
  "{{requester_name}}",
  "{{target_name}}",
  "{{cta_url}}",
  "{{attachment_note}}",
] as const;

export function isPlatformEmailTemplateKey(value: string): value is PlatformEmailTemplateKey {
  return (PLATFORM_EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}
