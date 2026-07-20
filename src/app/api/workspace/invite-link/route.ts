import { NextResponse } from "next/server";
import { getOrCreateWorkspaceInviteLink } from "@/lib/data/workspace-team";
import { featureDisabledResponse } from "@/lib/data/feature-flags";

export async function GET(request: Request) {
  try {
    const disabled = await featureDisabledResponse("team_collaboration", "Team collaboration");
    if (disabled) return disabled;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id") ?? undefined;
    const data = await getOrCreateWorkspaceInviteLink(workspaceId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to get workspace invite link:", error);
    return NextResponse.json({ error: "Failed to get invite link" }, { status: 500 });
  }
}
