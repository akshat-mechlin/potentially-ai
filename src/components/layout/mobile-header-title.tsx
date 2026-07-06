"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores";

/** Overrides the mobile app bar title for the current screen. */
export function MobileHeaderTitle({ title }: { title: string | null }) {
  const setMobileHeaderTitle = useUIStore((s) => s.setMobileHeaderTitle);

  useEffect(() => {
    setMobileHeaderTitle(title);
    return () => setMobileHeaderTitle(null);
  }, [title, setMobileHeaderTitle]);

  return null;
}
