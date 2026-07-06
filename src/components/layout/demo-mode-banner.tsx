"use client";

import { usePathname } from "next/navigation";
import { isDemoMode } from "@/lib/app-config";
import { isImmersiveMobileRoute, shouldHideAppHeader } from "@/lib/mobile-nav";
import { useMobileApp } from "@/hooks/use-mobile-app";

function isProductionHostname() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
}

export function DemoModeBanner() {
  const pathname = usePathname();
  const { isMobileApp } = useMobileApp();

  if (!isDemoMode()) return null;
  if (isMobileApp && (isImmersiveMobileRoute(pathname) || shouldHideAppHeader(pathname))) return null;

  const onProduction = isProductionHostname();

  return (
    <>
      <div className="mobile-only mb-3 flex flex-col items-center gap-1">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          Demo
        </span>
        {onProduction && (
          <p className="px-2 text-center text-[10px] text-destructive">
            Production is in demo mode — rebuild with NEXT_PUBLIC_DEMO_MODE=false
          </p>
        )}
      </div>
      <div
        className={`desktop-only mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
          onProduction
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "border-primary/20 bg-secondary/60 text-secondary-foreground"
        }`}
      >
        <div>
          <p className="font-medium text-foreground">
            {onProduction ? "Production misconfiguration: demo mode is active" : "Running in demo mode"}
          </p>
          <p className="mt-0.5 text-muted-foreground">
            {onProduction ? (
              <>
                Sign-in and data persistence will not work until you set{" "}
                <code className="rounded bg-card px-1 py-0.5 text-xs">NEXT_PUBLIC_DEMO_MODE=false</code>,
                set <code className="rounded bg-card px-1 py-0.5 text-xs">NEXT_PUBLIC_APP_URL</code> to your
                domain, add Supabase keys, and <strong>rebuild</strong> the app.
              </>
            ) : (
              <>
                Data is stored in memory for this session. Set{" "}
                <code className="rounded bg-card px-1 py-0.5 text-xs">NEXT_PUBLIC_DEMO_MODE=false</code> and
                add your Supabase service role key to enable live auth and persistence.
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
