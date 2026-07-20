import { NextResponse } from "next/server";
import { isDataDemoMode } from "@/lib/app-config";
import { getDemoFeatureFlags } from "@/lib/demo-store/admin";
import { createClient } from "@/lib/supabase/server";
import {
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
  type FeatureFlagsMap,
} from "@/lib/admin/feature-flags-catalog";

export type { FeatureFlagKey, FeatureFlagsMap };

async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve a flag for the current user:
 * 1) per-user override (if any)
 * 2) global feature_flags row
 * Missing keys default to false.
 */
export async function isFeatureEnabled(key: string, userId?: string | null): Promise<boolean> {
  if (isDataDemoMode()) {
    const flag = getDemoFeatureFlags().find((item) => item.key === key);
    return flag?.enabled ?? true;
  }

  try {
    const supabase = await createClient();
    const uid = userId === undefined ? await getSessionUserId() : userId;

    if (uid) {
      const { data: override } = await supabase
        .from("user_feature_flags")
        .select("enabled")
        .eq("user_id", uid)
        .eq("flag_key", key)
        .maybeSingle();
      if (override) return Boolean(override.enabled);
    }

    const { data } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    return data?.enabled ?? false;
  } catch {
    return false;
  }
}

/** Effective flags for the current (or given) user — global + user overrides. */
export async function getAllFeatureFlags(userId?: string | null): Promise<FeatureFlagsMap> {
  const defaults = Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, false])) as FeatureFlagsMap;

  if (isDataDemoMode()) {
    for (const flag of getDemoFeatureFlags()) {
      if (flag.key in defaults) {
        defaults[flag.key as FeatureFlagKey] = flag.enabled;
      }
    }
    return defaults;
  }

  try {
    const supabase = await createClient();
    const uid = userId === undefined ? await getSessionUserId() : userId;

    const [{ data: globals }, overridesResult] = await Promise.all([
      supabase.from("feature_flags").select("key, enabled"),
      uid
        ? supabase.from("user_feature_flags").select("flag_key, enabled").eq("user_id", uid)
        : Promise.resolve({ data: [] as Array<{ flag_key: string; enabled: boolean }> }),
    ]);

    for (const row of globals ?? []) {
      if (row.key in defaults) {
        defaults[row.key as FeatureFlagKey] = Boolean(row.enabled);
      }
    }

    for (const row of overridesResult.data ?? []) {
      if (row.flag_key in defaults) {
        defaults[row.flag_key as FeatureFlagKey] = Boolean(row.enabled);
      }
    }
  } catch {
    // keep defaults
  }

  return defaults;
}

export async function featureDisabledResponse(key: FeatureFlagKey, label?: string) {
  const enabled = await isFeatureEnabled(key);
  if (enabled) return null;
  return NextResponse.json(
    { error: `${label ?? key} is disabled`, code: "feature_disabled", flag: key },
    { status: 403 },
  );
}
