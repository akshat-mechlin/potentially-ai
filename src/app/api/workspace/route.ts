import { NextResponse } from "next/server";
import { listOAuthConnections, listWorkspaceMembers } from "@/lib/data/workspace-team";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "connections") {
      const connections = await listOAuthConnections();
      return NextResponse.json({ connections });
    }

    const members = await listWorkspaceMembers();
    return NextResponse.json({ members });
  } catch (error) {
    console.error("Workspace data failed:", error);
    return NextResponse.json({ error: "Failed to load workspace data" }, { status: 500 });
  }
}
