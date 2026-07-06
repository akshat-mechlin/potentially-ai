import { NextResponse } from "next/server";
import { verifyResendWebhook, extractReplyMetadata } from "@/lib/email/webhook";
import { handleInboundReply } from "@/lib/data/playbook-replies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const event = verifyResendWebhook(payload, request.headers);

    if (event.type === "email.received" || event.type === "email.replied") {
      const meta = extractReplyMetadata(event);
      const result = await handleInboundReply({
        runContactId: meta.runContactId,
        inReplyTo: meta.inReplyTo,
        from: meta.from,
        subject: meta.subject,
        body: meta.text || meta.html,
        providerMessageId: meta.providerMessageId,
      });
      return NextResponse.json({ received: true, ...result });
    }

    return NextResponse.json({ received: true, ignored: event.type });
  } catch (error) {
    console.error("Resend webhook failed:", error);
    const message = error instanceof Error ? error.message : "Webhook error";
    const status = message.includes("SECRET") || message.includes("signature") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
