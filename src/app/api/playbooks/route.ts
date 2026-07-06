import { NextResponse } from "next/server";
import { z } from "zod";
import { createPlaybook, listPlaybooks } from "@/lib/data/playbooks";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  goal: z.string().optional(),
  workspace_id: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const playbooks = await listPlaybooks(workspaceId);
    return NextResponse.json({ playbooks });
  } catch (error) {
    console.error("Failed to list playbooks:", error);
    return NextResponse.json({ error: "Failed to load playbooks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const playbook = await createPlaybook(body);
    return NextResponse.json(playbook, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid playbook data" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to create playbook:", error);
    return NextResponse.json({ error: "Failed to create playbook" }, { status: 500 });
  }
}
