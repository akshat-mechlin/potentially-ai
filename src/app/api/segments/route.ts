import { NextResponse } from "next/server";
import { z } from "zod";
import { createSegment, listSegments } from "@/lib/data/segments";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contact_ids: z.array(z.string()).optional(),
  workspace_id: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const segments = await listSegments(workspaceId);
    return NextResponse.json({ segments });
  } catch (error) {
    console.error("Failed to list segments:", error);
    return NextResponse.json({ error: "Failed to load segments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const segment = await createSegment({
      name: body.name,
      description: body.description,
      contactIds: body.contact_ids,
      workspaceId: body.workspace_id,
    });
    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid segment data" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to create segment:", error);
    return NextResponse.json({ error: "Failed to create segment" }, { status: 500 });
  }
}
