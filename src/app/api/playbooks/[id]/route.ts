import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlaybook, listPlaybookRuns, updatePlaybook } from "@/lib/data/playbooks";

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  goal: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  automation_level: z.enum(["assist", "supervised", "autonomous"]).optional(),
  outreach_mode: z.enum(["warm_preferred", "warm_required", "cold_allowed"]).optional(),
  tone: z.string().optional(),
  icp_profile: z.record(z.string(), z.unknown()).optional(),
  calendly_url: z.string().optional().nullable(),
  matching_config: z.record(z.string(), z.unknown()).optional(),
  send_config: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const playbook = await getPlaybook(id);
    if (!playbook) {
      return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    }
    const runs = await listPlaybookRuns(id);
    return NextResponse.json({ playbook, runs });
  } catch (error) {
    console.error("Failed to load playbook:", error);
    return NextResponse.json({ error: "Failed to load playbook" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const updates = updateSchema.parse(await request.json());
    const playbook = await updatePlaybook(id, updates);
    return NextResponse.json(playbook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Failed to update playbook:", error);
    return NextResponse.json({ error: "Failed to update playbook" }, { status: 500 });
  }
}
