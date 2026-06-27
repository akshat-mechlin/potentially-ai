"use client";

import { useLayoutEffect } from "react";
import { useUIStore } from "@/stores";

/** Applies compact mode class to <html> after mount (avoids hydration mismatch). */
export function CompactModeSync() {
  const compactMode = useUIStore((s) => s.compactMode);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("compact", compactMode);
  }, [compactMode]);

  return null;
}
