import { NextResponse } from "next/server";
import { deleteWorkflow, getWorkflow, updateWorkflow } from "@/lib/data/workflows";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workflow = await getWorkflow(id);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Get workflow failed:", error);
    return NextResponse.json({ error: "Failed to load workflow" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const workflow = await updateWorkflow(id, body);
    return NextResponse.json(workflow);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Update workflow failed:", error);
    return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteWorkflow(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete workflow failed:", error);
    return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
  }
}
