import { NextResponse } from "next/server";
import { createWorkflow, listWorkflows } from "@/lib/data/workflows";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

export async function GET() {
  try {
    const disabled = await featureDisabledResponse("playbook_mode", "Playbooks");
    if (disabled) return disabled;

    const workflows = await listWorkflows();
    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("List workflows failed:", error);
    return NextResponse.json({ error: "Failed to list workflows" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("playbook_mode", "Playbooks");
    if (disabled) return disabled;

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
    };
    const workflow = await createWorkflow({
      name: body.name,
      description: body.description,
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Create workflow failed:", error);
    return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
  }
}
