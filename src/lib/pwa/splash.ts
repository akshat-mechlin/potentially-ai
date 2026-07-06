/** Paths where the launch splash must never block interaction (auth + marketing). */
export const SPLASH_SKIP_PREFIXES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/pricing",
  "/features",
  "/unsubscribe",
] as const;

export function shouldSkipSplashForPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return SPLASH_SKIP_PREFIXES.some(
    (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}

export function dismissSplashElement() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("splash-dismissed");
}
