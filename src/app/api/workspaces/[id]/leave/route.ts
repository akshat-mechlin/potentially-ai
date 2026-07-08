import { NextResponse } from "next/server";
import { leaveWorkspace } from "@/lib/data/workspace-management";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await leaveWorkspace(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to leave group:", error);
    return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
  }
}
