"use client";

import { useSyncExternalStore } from "react";

export interface MobileAppState {
  isMobile: boolean;
  isStandalone: boolean;
  isMobileApp: boolean;
}

const DESKTOP_SNAPSHOT: MobileAppState = {
  isMobile: false,
  isStandalone: false,
  isMobileApp: false,
};

let cachedSnapshot: MobileAppState = DESKTOP_SNAPSHOT;

function computeMobileAppState(): MobileAppState {
  if (typeof window === "undefined") {
    return DESKTOP_SNAPSHOT;
  }

  const isMobile = window.matchMedia("(max-width: 1023px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const isMobileApp = isMobile || isStandalone;

  if (
    cachedSnapshot.isMobile === isMobile &&
    cachedSnapshot.isStandalone === isStandalone &&
    cachedSnapshot.isMobileApp === isMobileApp
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = { isMobile, isStandalone, isMobileApp };
  return cachedSnapshot;
}

function getServerSnapshot(): MobileAppState {
  return DESKTOP_SNAPSHOT;
}

function subscribe(onStoreChange: () => void) {
  const mobileQuery = window.matchMedia("(max-width: 1023px)");
  const standaloneQuery = window.matchMedia("(display-mode: standalone)");

  mobileQuery.addEventListener("change", onStoreChange);
  standaloneQuery.addEventListener("change", onStoreChange);

  return () => {
    mobileQuery.removeEventListener("change", onStoreChange);
    standaloneQuery.removeEventListener("change", onStoreChange);
  };
}

/** Viewport/PWA detection safe for SSR — server and first client paint match desktop snapshot. */
export function useMobileApp(): MobileAppState {
  return useSyncExternalStore(subscribe, computeMobileAppState, getServerSnapshot);
}
