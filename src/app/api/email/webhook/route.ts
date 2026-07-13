import { NextResponse } from "next/server";
import { verifyResendWebhook, extractReplyMetadata } from "@/lib/email/webhook";
import { handleInboundReply } from "@/lib/data/playbook-replies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const event = verifyResendWebhook(payload, request.headers);

    console.log("[email.webhook] received", {
      type: event.type,
      email_id: (event.data as { email_id?: string })?.email_id ?? null,
      from: (event.data as { from?: string })?.from ?? null,
      to: (event.data as { to?: string[] })?.to ?? null,
      subject: (event.data as { subject?: string })?.subject ?? null,
    });

    if (event.type === "email.received" || event.type === "email.replied") {
      const meta = await extractReplyMetadata(event);
      const result = await handleInboundReply({
        runContactId: meta.runContactId,
        inReplyTo: meta.inReplyTo,
        from: meta.from,
        subject: meta.subject,
        body: meta.text || meta.html,
        providerMessageId: meta.providerMessageId,
      });

      console.log("[email.webhook] handled", {
        type: event.type,
        matched: result.matched,
        runContactId: "runContactId" in result ? result.runContactId : meta.runContactId ?? null,
        from: meta.from,
        hasBody: Boolean(meta.text || meta.html),
      });

      return NextResponse.json({ received: true, ...result });
    }

    console.log("[email.webhook] ignored event type", event.type);
    return NextResponse.json({ received: true, ignored: event.type });
  } catch (error) {
    console.error("[email.webhook] failed:", error);
    const message = error instanceof Error ? error.message : "Webhook error";
    const status = message.includes("SECRET") || message.includes("signature") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
