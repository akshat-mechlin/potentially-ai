/** Shared runtime flags for demo vs live Supabase. */

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return true;
  if (url.includes("your-project")) return true;
  if (anonKey === "your-anon-key" || anonKey.startsWith("your-")) return true;

  return false;
}

/** True when API routes should use in-memory demo data instead of the database. */
export function isDataDemoMode(): boolean {
  if (isDemoMode()) return true;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey === "your-service-role-key") return true;

  return false;
}

export function isSupabaseAuthConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return !!(
    url &&
    anonKey &&
    !url.includes("your-project") &&
    anonKey !== "your-anon-key" &&
    !anonKey.startsWith("your-")
  );
}
