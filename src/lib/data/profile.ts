import type { User } from "@supabase/supabase-js";
import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_PROFILE } from "@/lib/demo-data";
import type { Profile } from "@/types";
import { getUserWorkspaceContext } from "./workspace";

function nameFromAuthUser(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    null;
  return name;
}

function profileFromAuthUser(user: User): Profile {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email ?? "",
    name: nameFromAuthUser(user),
    avatar_url:
      typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    bio: null,
    title: null,
    linkedin_url: null,
    is_admin: false,
    created_at: now,
    updated_at: now,
  };
}

function mergeProfileWithAuth(row: Profile | null, user: User): Profile {
  const base = row ?? profileFromAuthUser(user);
  return {
    ...base,
    email: base.email || user.email || "",
    name: base.name || nameFromAuthUser(user),
    avatar_url:
      base.avatar_url ||
      (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null),
  };
}

export async function getProfile(): Promise<Profile | null> {
  if (isDataDemoMode()) return DEMO_PROFILE;

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return mergeProfileWithAuth(data as Profile | null, user);
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

  const existing = await getProfile();
  const payload = {
    id: user.id,
    email: existing?.email || user.email || "",
    name: updates.name ?? existing?.name ?? nameFromAuthUser(user),
    title: updates.title ?? existing?.title ?? null,
    bio: updates.bio ?? existing?.bio ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return mergeProfileWithAuth(data as Profile, user);
}
