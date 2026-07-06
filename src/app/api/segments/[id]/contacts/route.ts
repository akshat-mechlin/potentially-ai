import { NextResponse } from "next/server";
import { z } from "zod";
import { addContactsToSegment, removeContactsFromSegment } from "@/lib/data/segments";

const schema = z.object({
  contact_ids: z.array(z.string()).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { contact_ids } = schema.parse(await request.json());
    await addContactsToSegment(id, contact_ids);
    return NextResponse.json({ ok: true, added: contact_ids.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid contact list" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to add contacts to segment:", error);
    return NextResponse.json({ error: "Failed to update segment" }, { status: 500 });
  }
}

const removeSchema = z.object({
  contact_ids: z.array(z.string()).min(1),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { contact_ids } = removeSchema.parse(await request.json());
    await removeContactsFromSegment(id, contact_ids);
    return NextResponse.json({ ok: true, removed: contact_ids.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid contact list" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to remove contacts from segment:", error);
    return NextResponse.json({ error: "Failed to update segment" }, { status: 500 });
  }
}
