"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // Dev bundles change constantly; unregister stale SW to avoid hydration mismatches.
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => void registration.unregister());
        });
      }
      return;
    }

    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is best-effort for offline shell support.
    });
  }, []);

  return null;
}
