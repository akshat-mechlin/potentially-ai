"use client";

import { useLayoutEffect } from "react";
import { useIsClient } from "@/hooks/use-is-client";

const SPLASH_SESSION_KEY = "potentially-splash-seen";
const MIN_VISIBLE_MS = 900;

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
  if (isStandalone) return true;

  return !sessionStorage.getItem(SPLASH_SESSION_KEY);
}

/** Dismisses the static splash after fonts + minimum display time. */
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

    const finish = () => {
      dismissStaticSplash();
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    };

    const scheduleFinish = () => {
      const elapsed = performance.now() - startedAt;
      window.setTimeout(finish, Math.max(0, MIN_VISIBLE_MS - elapsed));
    };

    if (document.readyState === "complete") {
      if (document.fonts?.ready) {
        void document.fonts.ready.then(scheduleFinish);
      } else {
        scheduleFinish();
      }
      return;
    }

    const onLoad = () => {
      if (document.fonts?.ready) {
        void document.fonts.ready.then(scheduleFinish);
      } else {
        scheduleFinish();
      }
    };

    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, [mounted]);

  return null;
}
