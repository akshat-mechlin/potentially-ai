/** Query params that must never appear in URLs, logs, or referrers. */
export const SENSITIVE_QUERY_PARAM_NAMES = [
  "password",
  "confirmPassword",
  "confirm_password",
  "new_password",
  "newPassword",
  "current_password",
  "currentPassword",
  "email",
  "name",
  "full_name",
  "fullName",
  "access_token",
  "refresh_token",
  "id_token",
  "apikey",
  "api_key",
  "secret",
  "authorization",
  "credentials",
] as const;

/** Per-path query params that are required and must not be stripped. */
const QUERY_PARAM_ALLOWLIST: Record<string, readonly string[]> = {
  "/api/auth/callback": ["code", "next", "connector", "invite", "connect"],
  "/invite": ["token", "invite"],
};

function normalizedPathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function isSensitiveQueryParam(name: string): boolean {
  const lower = name.toLowerCase();
  return SENSITIVE_QUERY_PARAM_NAMES.some((param) => param.toLowerCase() === lower);
}

export function isAllowedQueryParam(pathname: string, name: string): boolean {
  const allowed = QUERY_PARAM_ALLOWLIST[normalizedPathname(pathname)];
  return allowed?.includes(name) ?? false;
}

/** Remove sensitive params from a URL. Returns true if anything was removed. */
export function stripSensitiveSearchParams(url: URL): boolean {
  let changed = false;

  for (const key of [...url.searchParams.keys()]) {
    if (isAllowedQueryParam(url.pathname, key)) continue;
    if (isSensitiveQueryParam(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  return changed;
}

/** True when the hash may contain OAuth/session tokens (visible in the address bar). */
export function hashContainsSessionSecrets(hash: string): boolean {
  const lower = hash.toLowerCase();
  return (
    lower.includes("access_token=") ||
    lower.includes("refresh_token=") ||
    lower.includes("id_token=") ||
    lower.includes("provider_token=")
  );
}

export const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export function isAuthRoute(pathname: string): boolean {
  const path = normalizedPathname(pathname);
  return AUTH_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
