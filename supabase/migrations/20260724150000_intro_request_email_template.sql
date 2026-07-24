-- Seed intro_request platform email template (admin CMS + send-time fallback still uses code defaults).
-- Email goes to the contact: someone on Potentially would like an introduction to them.

INSERT INTO public.platform_email_templates (
  key, name, description, subject, preview, banner, heading, greeting, body,
  quote_enabled, cta_label_on_platform, cta_label_off_platform, footer_note,
  secondary_label_off_platform
) VALUES
(
  'intro_request',
  'Introduction request',
  'Email a contact when someone on Potentially would like an introduction to them.',
  '{{requester_name}} on Potentially would like an introduction',
  '{{requester_name}} on Potentially would like an introduction to you',
  'Warm introductions. Stronger relationships. Built for teams.',
  'Introduction request',
  'Hi {{name}},',
  '<p style="margin:0 0 16px;"><strong style="font-weight:600;color:#1A1A1A;">{{requester_name}}</strong> is reaching out through Potentially and would like an introduction to you.</p><p style="margin:0 0 16px;">Potentially helps people find warm paths through their professional networks. {{requester_name}} came across your profile there and thought a short introduction would be a good next step.</p><p style="margin:0 0 16px;">If you are open to connecting, reply to this email and say hello. A quick note back is enough to get the conversation started. If now is not the right time, you can ignore this message with no further follow up from us.</p><p style="margin:0;">Thanks for considering it. We appreciate your time.</p>',
  true,
  'Open Potentially',
  'Learn about Potentially',
  'This message was sent because someone using Potentially asked to be introduced to you. Reply to continue the conversation, or ignore if you prefer not to connect.',
  null
)
ON CONFLICT (key) DO NOTHING;
