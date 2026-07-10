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

function isLocalHost(value: string) {
  return value.includes("localhost") || value.includes("127.0.0.1");
}

function requestPublicOrigin(request?: Request): string | null {
  if (!request) return null;
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("cf-connecting-host")?.trim() ??
    request.headers.get("host")?.trim();
  if (!host || isLocalHost(host)) return null;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  return `${proto}://${host}`;
}

export function getAppUrl(request?: Request) {
  return resolveAppUrl(request);
}

/**
 * Canonical public app origin for auth emails / OAuth redirects.
 * Prefer server-only APP_URL (not inlined at build) over NEXT_PUBLIC_APP_URL.
 * Never prefer localhost when a public Host / forwarded host is available
 * (common with Cloudflare tunnels terminating on localhost:1020).
 */
export function resolveAppUrl(request?: Request): string {
  const serverUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const configured =
    (serverUrl && !isLocalHost(serverUrl) ? serverUrl : null) ??
    (publicUrl && !isLocalHost(publicUrl) ? publicUrl : null) ??
    serverUrl ??
    publicUrl ??
    "";

  const fromRequest = requestPublicOrigin(request);
  if (fromRequest) {
    // Live public host wins over a misconfigured localhost APP_URL.
    if (!configured || isLocalHost(configured)) return fromRequest;
  }

  if (configured && !isLocalHost(configured)) {
    return configured;
  }

  if (fromRequest) return fromRequest;

  if (request) {
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
      request.headers.get("host")?.trim();
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    if (host) return `${proto}://${host}`;
  }

  return configured || "http://localhost:1020";
}

/** Ensure Supabase action links never redirect users to localhost in production. */
export function ensurePublicActionLink(actionLink: string, request?: Request): string {
  const appUrl = resolveAppUrl(request);
  if (isLocalHost(appUrl)) return actionLink;

  try {
    const url = new URL(actionLink);
    const redirectTo = url.searchParams.get("redirect_to");
    if (redirectTo && isLocalHost(redirectTo)) {
      const fixed = new URL(redirectTo);
      const canonical = new URL(appUrl);
      fixed.protocol = canonical.protocol;
      fixed.host = canonical.host;
      url.searchParams.set("redirect_to", fixed.toString());
      return url.toString();
    }
  } catch {
    // keep original link if parsing fails
  }

  return actionLink;
}
