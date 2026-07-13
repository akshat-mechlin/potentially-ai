import { NextResponse } from "next/server";
import { markProspectBooked } from "@/lib/data/playbook-replies";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string; prospectId: string }> },
) {
  try {
    const { prospectId } = await params;
    await markProspectBooked(prospectId);
    return NextResponse.json({ ok: true, status: "booked" });
  } catch (error) {
    console.error("Failed to mark booked:", error);
    return NextResponse.json({ error: "Failed to mark booked" }, { status: 500 });
  }
}
