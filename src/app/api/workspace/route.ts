import { NextResponse } from "next/server";
import { listUserWorkspaces } from "@/lib/data/workspace";
import { listWorkspaceMembers } from "@/lib/data/workspace-team";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const workspaceId = searchParams.get("workspace_id");

  try {
    if (type === "connections") {
      const { listOAuthConnections } = await import("@/lib/data/workspace-team");
      const connections = await listOAuthConnections();
      return NextResponse.json({ connections });
    }

    if (type === "workspaces") {
      const workspaces = await listUserWorkspaces();
      return NextResponse.json({ workspaces });
    }

    const [workspaces, members] = await Promise.all([
      listUserWorkspaces(),
      listWorkspaceMembers(workspaceId),
    ]);

    const activeWorkspace =
      workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0] ?? null;

    return NextResponse.json({
      workspaces,
      activeWorkspace,
      members,
    });
  } catch (error) {
    console.error("Workspace data failed:", error);
    return NextResponse.json({ error: "Failed to load workspace data" }, { status: 500 });
  }
}
