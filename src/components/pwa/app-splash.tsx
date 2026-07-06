"use client";

import { useLayoutEffect } from "react";
import { useIsClient } from "@/hooks/use-is-client";

const SPLASH_SESSION_KEY = "potentially-splash-seen";
const MIN_VISIBLE_MS = 750;
const MAX_VISIBLE_MS = 2200;

function dismissStaticSplash() {
  document.documentElement.classList.add("splash-dismissed");
}

function syncViewportClasses() {
  const root = document.documentElement;
  const isMobile = window.matchMedia("(max-width: 1023px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

  root.classList.toggle("mobile-viewport", isMobile);
  root.classList.toggle("pwa-standalone", isStandalone);
  root.dataset.mobileApp = isMobile || isStandalone ? "true" : "false";
}

function shouldShowSplash(): boolean {
  if (typeof window === "undefined") return false;

  const isMobile = window.matchMedia("(max-width: 1023px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);

  if (!isMobile && !isStandalone) return false;

  try {
    return !sessionStorage.getItem(SPLASH_SESSION_KEY);
  } catch {
    return true;
  }
}

/** Dismisses the static splash after a short branded moment — never blocks on fonts/load (iOS PWA safe). */
export function AppSplash() {
  const mounted = useIsClient();

  useLayoutEffect(() => {
    if (!mounted) return;

    syncViewportClasses();

    if (!shouldShowSplash()) {
      dismissStaticSplash();
      return;
    }

    const startedAt = performance.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      dismissStaticSplash();
      try {
        sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        // sessionStorage may be unavailable in some embedded browsers
      }
    };

    const scheduleFinish = () => {
      const elapsed = performance.now() - startedAt;
      window.setTimeout(finish, Math.max(0, MIN_VISIBLE_MS - elapsed));
    };

    // Do not await document.fonts.ready — it can hang indefinitely in iOS standalone PWA.
    scheduleFinish();

    // Hard cap so auth/app content is never blocked behind the splash overlay.
    const safetyTimer = window.setTimeout(finish, MAX_VISIBLE_MS);

    return () => {
      window.clearTimeout(safetyTimer);
    };
  }, [mounted]);

  return null;
}
