import { NextResponse } from "next/server";
import { z } from "zod";
import { isDataDemoMode } from "@/lib/app-config";
import { createDemoWorkspace, getDemoWorkspaces } from "@/lib/demo-store";
import { createClient } from "@/lib/supabase/server";

const workspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    if (isDataDemoMode()) {
      return NextResponse.json({ workspaces: getDemoWorkspaces() });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace:workspaces(*)")
      .eq("user_id", user.id);

    if (error) throw error;

    const workspaces = (data ?? [])
      .map((row) => row.workspace)
      .filter(Boolean);

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Failed to list workspaces:", error);
    return NextResponse.json({ error: "Failed to list workspaces" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = workspaceSchema.parse(body);

    if (isDataDemoMode()) {
      const workspace = createDemoWorkspace(name);
      return NextResponse.json(workspace);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: workspace, error: wsError } = await supabase.rpc("create_workspace_with_owner", {
      workspace_name: name,
    });

    if (wsError) throw wsError;
    if (!workspace) {
      return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Failed to create workspace:", error);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
