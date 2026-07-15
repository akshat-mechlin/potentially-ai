import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteWorkspace,
  getWorkspaceDetail,
  updateWorkspace,
} from "@/lib/data/workspace-management";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  logo_url: z.string().min(1).max(2000).nullable().optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const detail = await getWorkspaceDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error) {
    console.error("Failed to load group detail:", error);
    return NextResponse.json({ error: "Failed to load group" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const updates = updateSchema.parse(body);
    const workspace = await updateWorkspace(id, updates);
    return NextResponse.json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to update group:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteWorkspace(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
