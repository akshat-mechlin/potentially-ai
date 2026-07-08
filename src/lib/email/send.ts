import { Resend } from "resend";
import { getPlatformFromAddress } from "@/lib/email/from-address";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
  from?: string;
  replyTo?: string;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_your"));
}

function formatResendError(message: string) {
  if (message.includes("only send testing emails to your own email")) {
    return "Resend test mode only allows sending to your Resend account email. Sign up with that address for testing, or verify a domain at resend.com/domains and update EMAIL_FROM.";
  }
  if (
    message.includes("domain is not verified") ||
    message.includes("not verified") ||
    message.includes("verify your domain")
  ) {
    return "Your send domain is not verified yet. Open Settings → Email, complete DNS verification, or switch to Potentially email.";
  }
  return message;
}

export async function sendEmail({ to, subject, html, headers, from, replyTo }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith("re_your")) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] RESEND_API_KEY not set; email not sent to:", to);
      console.warn("[email] Subject:", subject);
      return { id: "dev-skipped", skipped: true as const };
    }
    throw new Error("Email service is not configured. Add RESEND_API_KEY to your environment.");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: from ?? getPlatformFromAddress(),
    to: [to],
    subject,
    html,
    headers,
    replyTo,
  });

  if (error) {
    throw new Error(formatResendError(error.message));
  }

  return data;
}
