import { sendEmail, type SendEmailParams } from "@/lib/email/send";

export function isRecoverableEmailDeliveryError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes("only send testing emails") ||
    message.includes("resend test mode") ||
    message.includes("domain is not verified") ||
    message.includes("not verified") ||
    message.includes("verify your domain")
  );
}

export type AuthEmailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: string; recoverable: true }
  | { sent: false; reason: string; recoverable: false };

export async function deliverAuthEmail(
  params: SendEmailParams,
): Promise<AuthEmailDeliveryResult> {
  try {
    const result = await sendEmail(params);
    if (result && "skipped" in result && result.skipped) {
      return {
        sent: false,
        reason: "Email service is not configured for this environment.",
        recoverable: true,
      };
    }
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email delivery failed";
    if (isRecoverableEmailDeliveryError(error)) {
      return { sent: false, reason, recoverable: true };
    }
    return { sent: false, reason, recoverable: false };
  }
}
