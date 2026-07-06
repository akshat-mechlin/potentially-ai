import { isDataDemoMode } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";

const demoFlags: Record<string, boolean> = {
  playbook_mode: true,
  platform_chat: true,
};

export async function isFeatureEnabled(key: string): Promise<boolean> {
  if (isDataDemoMode()) return demoFlags[key] ?? true;

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    return data?.enabled ?? false;
  } catch {
    return false;
  }
}
