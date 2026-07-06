import { NextResponse } from "next/server";
import { z } from "zod";
import { isDataDemoMode } from "@/lib/app-config";
import { createDemoWorkspace, getDemoWorkspaces } from "@/lib/demo-store";
import { listUserWorkspaces } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/auth";

const workspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  try {
    if (isDataDemoMode()) {
      return NextResponse.json({ workspaces: getDemoWorkspaces() });
    }

    const workspaces = await listUserWorkspaces();
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
    const { user } = await safeGetUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getUserWorkspaceContext } = await import("@/lib/data/workspace");
    await getUserWorkspaceContext(supabase);

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
