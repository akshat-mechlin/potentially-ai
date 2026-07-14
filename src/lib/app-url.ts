/** Shared public-origin helpers for OAuth / auth redirects. */

export function isLocalHost(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

/**
 * Browser origin for OAuth redirectTo — always the host the user is currently on
 * (localhost when developing locally, production when on potentially.mechlintech.com).
 */
export function getClientAppOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "") || "http://localhost:1020";
}

/**
 * Server origin after OAuth callback — match the host that received the callback.
 * Uses x-forwarded-host when present (Cloudflare tunnel → production domain),
 * otherwise the direct Host header (including localhost for local login).
 */
export function resolveOAuthReturnOrigin(request: Request): string {
  const forwardedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    request.headers.get("cf-connecting-host")?.trim() ??
    null;
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? null;

  if (forwardedHost && !isLocalHost(forwardedHost)) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`.replace(/\/$/, "");
  }

  const host = request.headers.get("host")?.trim();
  if (host) {
    const proto = isLocalHost(host) ? "http" : (forwardedProto ?? "https");
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return (
      (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:1020")
        .trim()
        .replace(/\/$/, "")
    );
  }
}
