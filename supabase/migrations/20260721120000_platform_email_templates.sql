-- Platform-managed transactional email copy (admin CMS).
-- Brand shell stays in application code; this table stores structured fields.

CREATE TABLE IF NOT EXISTS public.platform_email_templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  banner TEXT,
  heading TEXT NOT NULL,
  greeting TEXT,
  body TEXT NOT NULL,
  quote_enabled BOOLEAN NOT NULL DEFAULT false,
  cta_label_on_platform TEXT NOT NULL DEFAULT '',
  cta_label_off_platform TEXT NOT NULL DEFAULT '',
  footer_note TEXT,
  secondary_label_off_platform TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_email_templates ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated/anon: service role only (admin + send paths).

DROP TRIGGER IF EXISTS platform_email_templates_updated_at ON public.platform_email_templates;
CREATE TRIGGER platform_email_templates_updated_at
  BEFORE UPDATE ON public.platform_email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO public.platform_email_templates (
  key, name, description, subject, preview, banner, heading, greeting, body,
  quote_enabled, cta_label_on_platform, cta_label_off_platform, footer_note,
  secondary_label_off_platform
) VALUES
(
  'signup_verification',
  'Signup verification',
  'Sent after signup to confirm the email address.',
  'Confirm your Potentially account',
  'Confirm your email to start using Potentially',
  'Warm introductions. Stronger relationships. Built for teams.',
  'Welcome aboard',
  'Hi {{name}},',
  'Thanks for joining Potentially. Confirm your email to unlock AI search, warm introductions, and your relationship graph.',
  false,
  'Confirm email address',
  'Confirm email address',
  'This link expires in 24 hours. If you did not create an account, you can safely ignore this email.',
  NULL
),
(
  'password_reset',
  'Password reset',
  'Sent when a user requests a password reset.',
  'Reset your Potentially password',
  'Reset your Potentially password',
  NULL,
  'Reset your password',
  NULL,
  'We received a request to reset your password. Click the button below to choose a new one.',
  false,
  'Reset password',
  'Reset password',
  'If you did not request this, you can ignore this email. Your password will not change.',
  NULL
),
(
  'magic_link',
  'Magic link sign-in',
  'One-time sign-in link email.',
  'Your Potentially sign-in link',
  'Your secure sign-in link for Potentially',
  'Warm introductions. Stronger relationships. Built for teams.',
  'Sign in to Potentially',
  NULL,
  'Click below to sign in securely. No password needed. This one-time link takes you straight to your workspace.',
  false,
  'Sign in to Potentially',
  'Sign in to Potentially',
  'This link expires shortly and can only be used once.',
  NULL
),
(
  'workspace_invite',
  'Workspace invite',
  'Invite a teammate to a workspace.',
  'Join {{workspace_name}} on Potentially',
  'You have been invited to join {{workspace_name}} on Potentially',
  'Warm introductions. Stronger relationships. Built for teams.',
  'You''re invited',
  NULL,
  'You have been invited to collaborate on <strong style="font-weight:600;color:#1A1A1A;">{{workspace_name}}</strong>. Join the workspace to search your shared network and request warm introductions.',
  false,
  'Accept invitation',
  'Accept invitation',
  'This invitation expires in 7 days.',
  NULL
),
(
  'chat_message',
  'Chat message',
  'Email when someone receives a Potentially chat message.',
  'New message from {{sender_name}}',
  '{{sender_name}} sent you a message on Potentially',
  'Join Potentially to reply and grow your network with warm introductions',
  'New message',
  'Hi {{name}},',
  '<strong style="font-weight:600;color:#1A1A1A;">{{sender_line}}</strong> sent you a message on Potentially.',
  true,
  'Open conversation',
  'Join Potentially to reply',
  'Create a free account to reply and unlock relationship intelligence for your team.',
  'Already have an account? Open your inbox'
),
(
  'support_ticket_received',
  'Support ticket received',
  'Confirmation to the user after they open a support ticket.',
  'Ticket received: {{subject}}',
  'We received your support request: {{subject}}',
  NULL,
  'We got your request',
  'Hi {{name}},',
  'We received your support request <strong style="font-weight:600;color:#1A1A1A;">{{subject}}</strong>. Our team will reply soon.',
  false,
  'View ticket',
  'View ticket',
  'You can add more detail anytime from your support inbox.',
  NULL
),
(
  'support_admin_alert',
  'Support admin alert',
  'Notify platform admins about a support ticket event.',
  '{{title}}',
  '{{title}}',
  NULL,
  'Support alert',
  NULL,
  '{{message}}',
  false,
  'Open ticket',
  'Open ticket',
  NULL,
  NULL
),
(
  'ticket_status_update',
  'Ticket status update',
  'Sent from admin when a ticket status changes.',
  'Ticket update: {{subject}}',
  'Your support ticket status is now {{status}}',
  NULL,
  'Ticket update',
  'Hi {{name}},',
  'Your support ticket status is now <strong style="font-weight:600;color:#1A1A1A;">{{status}}</strong>.',
  false,
  'View ticket',
  'Join Potentially to view ticket',
  'Reply anytime from your support inbox in Potentially.',
  NULL
),
(
  'ticket_staff_reply',
  'Ticket staff reply',
  'Sent from admin when support replies on a ticket.',
  'Re: {{subject}}',
  'Potentially Support replied to: {{subject}}',
  'Warm introductions. Stronger relationships. Built for teams.',
  'Support replied',
  'Hi {{name}},',
  'Potentially Support replied to your ticket.',
  true,
  'View and reply',
  'Join Potentially to reply',
  'Open the ticket in Potentially to continue the conversation.',
  NULL
),
(
  'outreach_marketing_footer',
  'Outreach marketing footer',
  'Slim Potentially strip appended to playbook outreach. Heading = brand line, body = tagline, CTA labels = invite/open links.',
  'Sent with Potentially',
  'Sent with Potentially',
  NULL,
  'Sent with Potentially',
  NULL,
  'Relationship intelligence for teams',
  false,
  'Open Potentially',
  'Join Potentially',
  'Prefer a warmer intro next time?',
  NULL
)
ON CONFLICT (key) DO NOTHING;
