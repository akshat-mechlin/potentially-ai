/** Shared public-origin helpers for OAuth / auth redirects. */

export function isLocalHost(value: string) {
  return /localhost|127\.0\.0\.1/i.test(value);
}

/**
 * Browser origin for OAuth redirectTo.
 * Prefer the live non-localhost location; otherwise NEXT_PUBLIC_APP_URL when it is public
 * (so Cloudflare tunnel / mis-reported Host never returns users to localhost).
 */
export function getClientAppOrigin() {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isLocalHost(origin)) return origin;
    if (configured && !isLocalHost(configured)) return configured;
    return origin;
  }

  return configured || "http://localhost:1020";
}
