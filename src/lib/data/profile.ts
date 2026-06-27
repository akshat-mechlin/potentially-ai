import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_PROFILE } from "@/lib/demo-data";
import type { Profile } from "@/types";
import { getUserWorkspaceContext } from "./workspace";

export async function getProfile(): Promise<Profile | null> {
  if (isDataDemoMode()) return DEMO_PROFILE;

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(updates: {
  name?: string;
  title?: string;
  bio?: string;
}) {
  if (isDataDemoMode()) {
    return { ...DEMO_PROFILE, ...updates };
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}
