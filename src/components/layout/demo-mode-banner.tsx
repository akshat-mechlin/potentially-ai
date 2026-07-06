"use client";

import { usePathname } from "next/navigation";
import { isDemoMode } from "@/lib/app-config";
import { isImmersiveMobileRoute, shouldHideAppHeader } from "@/lib/mobile-nav";
import { useMobileApp } from "@/hooks/use-mobile-app";

export function DemoModeBanner() {
  const pathname = usePathname();
  const { isMobileApp } = useMobileApp();

  if (!isDemoMode()) return null;
  if (isMobileApp && (isImmersiveMobileRoute(pathname) || shouldHideAppHeader(pathname))) return null;

  return (
    <>
      <div className="mobile-only mb-3 flex items-center justify-center">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          Demo
        </span>
      </div>
      <div className="desktop-only mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground">
        <div>
          <p className="font-medium text-foreground">Running in demo mode</p>
          <p className="mt-0.5 text-muted-foreground">
            Data is stored in memory for this session. Set{" "}
            <code className="rounded bg-card px-1 py-0.5 text-xs">NEXT_PUBLIC_DEMO_MODE=false</code>{" "}
            and add your Supabase service role key to enable live auth and persistence.
          </p>
        </div>
      </div>
    </>
  );
}
