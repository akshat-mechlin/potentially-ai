import { NextResponse } from "next/server";
import { unsubscribeContact } from "@/lib/data/playbook-replies";

export async function POST(request: Request) {
  try {
    const { contact_id } = (await request.json()) as { contact_id?: string };
    if (!contact_id) {
      return NextResponse.json({ error: "contact_id required" }, { status: 400 });
    }
    await unsubscribeContact(contact_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  }
}
