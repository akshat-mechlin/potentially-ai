import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey === "your-service-role-key") {
    throw new Error("Supabase admin client is not configured");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAppUrl(request?: Request) {
  return resolveAppUrl(request);
}

/** Prefer configured URL; fall back to request host when env still points at localhost. */
export function resolveAppUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (
    configured &&
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }

  if (request) {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host")?.trim();
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    if (host) {
      return `${proto}://${host}`;
    }
  }

  return configured || "http://localhost:1020";
}
