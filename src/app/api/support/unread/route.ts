import { NextResponse } from "next/server";
import {
  getSupportUnreadCount,
  markSupportTicketRead,
} from "@/lib/data/support-tickets";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

export async function GET() {
  try {
    const disabled = await featureDisabledResponse("support_ticketing", "Support");
    if (disabled) return disabled;
    const unread = await getSupportUnreadCount();
    return NextResponse.json({ unread });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Support unread failed:", error);
    return NextResponse.json({ error: "Failed to load unread count" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("support_ticketing", "Support");
    if (disabled) return disabled;
    const body = (await request.json().catch(() => ({}))) as { ticketId?: string };
    if (!body.ticketId) {
      return NextResponse.json({ error: "ticketId required" }, { status: 400 });
    }
    await markSupportTicketRead(body.ticketId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Mark support read failed:", error);
    return NextResponse.json({ error: "Failed to mark ticket read" }, { status: 500 });
  }
}
