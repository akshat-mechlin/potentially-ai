import { isDataDemoMode } from "@/lib/app-config";
import { getDemoFeatureFlags } from "@/lib/demo-store/admin";
import { createClient } from "@/lib/supabase/server";

export async function isFeatureEnabled(key: string): Promise<boolean> {
  if (isDataDemoMode()) {
    const flag = getDemoFeatureFlags().find((item) => item.key === key);
    return flag?.enabled ?? true;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    return data?.enabled ?? false;
  } catch {
    return false;
  }
}
