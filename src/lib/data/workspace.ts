import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_WORKSPACE } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

export async function getUserWorkspaceContext() {
  if (isDataDemoMode()) {
    return {
      supabase: null,
      user: { id: "demo-user-001", email: "demo@potentially.ai" },
      workspaceId: DEMO_WORKSPACE.id,
      profile: { name: "Alex Morgan", is_admin: false },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, workspaceId: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, is_admin, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    user,
    workspaceId: membership?.workspace_id ?? null,
    profile,
  };
}
