import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_PROFILE } from "@/lib/demo-data";
import type { Profile } from "@/types";
import { getUserWorkspaceContext } from "./workspace";

type ContextUser = {
  id: string;
  email: string;
};

function nameFromContextUser(user: ContextUser): string | null {
  return user.email?.split("@")[0] || null;
}

function profileFromContextUser(user: ContextUser): Profile {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email ?? "",
    name: nameFromContextUser(user),
    avatar_url: null,
    bio: null,
    title: null,
    linkedin_url: null,
    is_admin: false,
    created_at: now,
    updated_at: now,
  };
}

function mergeProfileWithContext(row: Profile | null, user: ContextUser): Profile {
  const base = row ?? profileFromContextUser(user);
  return {
    ...base,
    email: base.email || user.email || "",
    name: base.name || nameFromContextUser(user),
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
  return mergeProfileWithContext(data as Profile | null, user);
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
    name: updates.name ?? existing?.name ?? nameFromContextUser(user),
    title: updates.title ?? existing?.title ?? null,
    bio: updates.bio ?? existing?.bio ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return mergeProfileWithContext(data as Profile, user);
}
