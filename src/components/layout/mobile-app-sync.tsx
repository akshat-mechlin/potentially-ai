"use client";

import { useEffect } from "react";
import { useMobileApp } from "@/hooks/use-mobile-app";

/** Syncs mobile/PWA state to `<html>` for CSS-driven native shell styling. */
export function MobileAppSync() {
  const { isMobile, isStandalone } = useMobileApp();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("mobile-viewport", isMobile);
    root.classList.toggle("pwa-standalone", isStandalone);
    root.dataset.mobileApp = isMobile || isStandalone ? "true" : "false";

    return () => {
      root.classList.remove("mobile-viewport", "pwa-standalone");
      delete root.dataset.mobileApp;
    };
  }, [isMobile, isStandalone]);

  return null;
}
