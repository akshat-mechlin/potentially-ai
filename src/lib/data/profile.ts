import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_PROFILE } from "@/lib/demo-data";
import type { Profile } from "@/types";
import { getUserWorkspaceContext } from "./workspace";

type ContextUser = {
  id: string;
  email: string;
};

export type ProfileUpdates = {
  name?: string | null;
  title?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  company?: string | null;
  location?: string | null;
  website_url?: string | null;
  avatar_url?: string | null;
};

function nameFromContextUser(user: ContextUser): string | null {
  return user.email?.split("@")[0] || null;
}

function emptyProfileExtras() {
  return {
    avatar_url: null as string | null,
    bio: null as string | null,
    title: null as string | null,
    linkedin_url: null as string | null,
    company: null as string | null,
    location: null as string | null,
    website_url: null as string | null,
  };
}

function profileFromContextUser(user: ContextUser): Profile {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email ?? "",
    name: nameFromContextUser(user),
    ...emptyProfileExtras(),
    is_admin: false,
    created_at: now,
    updated_at: now,
  };
}

function mergeProfileWithContext(row: Profile | null, user: ContextUser): Profile {
  const base = row ?? profileFromContextUser(user);
  return {
    ...base,
    company: base.company ?? null,
    location: base.location ?? null,
    website_url: base.website_url ?? null,
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

/** Own profile or a teammate's (RLS). */
export async function getProfileById(profileId: string): Promise<Profile | null> {
  if (isDataDemoMode()) {
    if (profileId === DEMO_PROFILE.id || profileId === "me") return DEMO_PROFILE;
    return {
      ...DEMO_PROFILE,
      id: profileId,
      name: "Jordan Lee",
      email: "jordan@acme.com",
      title: "Partnerships",
      bio: "Building introductions across the network.",
      company: "Acme Ventures",
      location: "San Francisco",
      avatar_url: null,
    };
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return null;

  const id = profileId === "me" ? user.id : profileId;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (data.id === user.id) {
    return mergeProfileWithContext(data as Profile, user);
  }
  return {
    ...(data as Profile),
    company: (data as Profile).company ?? null,
    location: (data as Profile).location ?? null,
    website_url: (data as Profile).website_url ?? null,
  };
}

export async function updateProfile(updates: ProfileUpdates) {
  if (isDataDemoMode()) {
    return { ...DEMO_PROFILE, ...updates };
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) throw new Error("Unauthorized");

  const existing = await getProfile();
  const payload = {
    id: user.id,
    email: existing?.email || user.email || "",
    name: updates.name !== undefined ? updates.name : (existing?.name ?? nameFromContextUser(user)),
    title: updates.title !== undefined ? updates.title : (existing?.title ?? null),
    bio: updates.bio !== undefined ? updates.bio : (existing?.bio ?? null),
    linkedin_url:
      updates.linkedin_url !== undefined ? updates.linkedin_url : (existing?.linkedin_url ?? null),
    company: updates.company !== undefined ? updates.company : (existing?.company ?? null),
    location: updates.location !== undefined ? updates.location : (existing?.location ?? null),
    website_url:
      updates.website_url !== undefined ? updates.website_url : (existing?.website_url ?? null),
    avatar_url:
      updates.avatar_url !== undefined ? updates.avatar_url : (existing?.avatar_url ?? null),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) throw error;
  return mergeProfileWithContext(data as Profile, user);
}
