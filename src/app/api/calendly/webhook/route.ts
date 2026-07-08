import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markProspectBooked } from "@/lib/data/playbook-replies";
import { isDataDemoMode } from "@/lib/app-config";
import { verifyCalendlyWebhookSignature } from "@/lib/calendly/webhook-signature";

export const runtime = "nodejs";

type CalendlyPayload = {
  event?: string;
  payload?: {
    email?: string;
    invitee?: { email?: string };
    tracking?: {
      utm_content?: string | null;
      utm_source?: string | null;
    };
    scheduled_event?: { uri?: string };
  };
};

function extractEmail(body: CalendlyPayload) {
  return (
    body.payload?.email?.toLowerCase() ||
    body.payload?.invitee?.email?.toLowerCase() ||
    null
  );
}

function extractTrackingProspectId(body: CalendlyPayload) {
  const value = body.payload?.tracking?.utm_content?.trim();
  if (!value) return null;
  // UUID from our prospect / run_contact id
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return value;
  }
  return null;
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signingKey = process.env.CALENDLY_WEBHOOK_SECRET;

  if (signingKey) {
    try {
      verifyCalendlyWebhookSignature(
        payload,
        request.headers.get("Calendly-Webhook-Signature"),
        signingKey,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid signature";
      return NextResponse.json({ error: message }, { status: 401 });
    }
  }

  try {
    const body = JSON.parse(payload) as CalendlyPayload;
    if (body.event !== "invitee.created") {
      return NextResponse.json({ received: true, ignored: body.event });
    }

    if (isDataDemoMode()) {
      return NextResponse.json({ received: true, demo: true });
    }

    const trackedId = extractTrackingProspectId(body);
    const email = extractEmail(body);
    const supabase = createAdminClient();

    if (trackedId) {
      const { data: byId } = await supabase
        .from("playbook_run_contacts")
        .select("id, status")
        .eq("id", trackedId)
        .maybeSingle();

      if (byId) {
        if (byId.status !== "booked") {
          await markProspectBooked(byId.id);
        }
        return NextResponse.json({
          received: true,
          matched: true,
          via: "utm_content",
          prospect_id: byId.id,
        });
      }
    }

    if (!email) {
      return NextResponse.json({ received: true, matched: false, reason: "no_email" });
    }

    const { data: rows } = await supabase
      .from("playbook_run_contacts")
      .select("id, status, last_action_at, contact:contacts!inner(email)")
      .in("status", ["sent", "queued", "replied", "pending_approval", "booked"])
      .order("last_action_at", { ascending: false })
      .limit(100);

    const match = (rows ?? []).find((row) => {
      const contact = row.contact as { email: string | null } | { email: string | null }[];
      const contactEmail = Array.isArray(contact) ? contact[0]?.email : contact?.email;
      return contactEmail?.toLowerCase() === email;
    });

    if (!match) {
      return NextResponse.json({ received: true, matched: false, reason: "no_prospect" });
    }

    if (match.status !== "booked") {
      await markProspectBooked(match.id);
    }

    return NextResponse.json({
      received: true,
      matched: true,
      via: "email",
      prospect_id: match.id,
    });
  } catch (error) {
    console.error("Calendly webhook failed:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
