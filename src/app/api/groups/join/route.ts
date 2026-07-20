import { NextResponse } from "next/server";
import { z } from "zod";
import { joinWorkspaceFromInviteToken } from "@/lib/data/workspace-team";
import { featureDisabledResponse } from "@/lib/data/feature-flags";
import { createClient } from "@/lib/supabase/server";

const joinSchema = z.object({
  invite: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("team_collaboration", "Team collaboration");
    if (disabled) return disabled;

    const body = await request.json();
    const { invite } = joinSchema.parse(body);
    const supabase = await createClient();
    const workspace = await joinWorkspaceFromInviteToken(supabase, invite);

    if (!workspace) {
      return NextResponse.json({ error: "Invalid or expired invite" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      workspace,
      message: `Joined ${workspace.name}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Group join failed:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
