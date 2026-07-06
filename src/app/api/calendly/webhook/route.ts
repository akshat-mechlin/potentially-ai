import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markProspectBooked } from "@/lib/data/playbook-replies";
import { isDataDemoMode } from "@/lib/app-config";

export const runtime = "nodejs";

type CalendlyPayload = {
  event?: string;
  payload?: {
    email?: string;
    scheduled_event?: { uri?: string };
  };
};

export async function POST(request: Request) {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("calendly-webhook-signature");
    if (signature !== secret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const body = (await request.json()) as CalendlyPayload;
    if (body.event !== "invitee.created") {
      return NextResponse.json({ received: true, ignored: body.event });
    }

    const email = body.payload?.email?.toLowerCase();
    if (!email) return NextResponse.json({ received: true, matched: false });

    if (isDataDemoMode()) {
      return NextResponse.json({ received: true, demo: true });
    }

    const supabase = createAdminClient();
    const { data: rows } = await supabase
      .from("playbook_run_contacts")
      .select("id, contact:contacts!inner(email)")
      .in("status", ["sent", "replied", "pending_approval"])
      .order("last_action_at", { ascending: false })
      .limit(50);

    const match = (rows ?? []).find((row) => {
      const contact = row.contact as { email: string | null } | { email: string | null }[];
      const contactEmail = Array.isArray(contact) ? contact[0]?.email : contact?.email;
      return contactEmail?.toLowerCase() === email;
    });

    if (!match) return NextResponse.json({ received: true, matched: false });

    await markProspectBooked(match.id);
    return NextResponse.json({ received: true, matched: true, prospect_id: match.id });
  } catch (error) {
    console.error("Calendly webhook failed:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
