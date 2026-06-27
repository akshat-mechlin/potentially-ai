import { Resend } from "resend";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

function getFromAddress() {
  return process.env.EMAIL_FROM || "Potentially <onboarding@resend.dev>";
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_your"));
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || apiKey.startsWith("re_your")) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] RESEND_API_KEY not set; email not sent to:", to);
      console.warn("[email] Subject:", subject);
      return { id: "dev-skipped", skipped: true };
    }
    throw new Error("Email service is not configured. Add RESEND_API_KEY to your environment.");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
