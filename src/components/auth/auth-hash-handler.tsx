"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";

function parseAuthHash(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(raw);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");
  const error = params.get("error") ?? params.get("error_description");
  return { accessToken, refreshToken, type, error };
}

function clearAuthHash() {
  const clean = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", clean);
}

function resolveNextPath(searchParams: URLSearchParams) {
  const next = searchParams.get("next");
  if (next?.startsWith("/") && !next.startsWith("//")) return next;
  if (searchParams.get("invite")) return "/groups";
  return "/dashboard";
}

function AuthHashHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isDemoMode()) return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash || "";
    if (!hash.includes("access_token=") && !hash.includes("error=")) return;

    const { accessToken, refreshToken, type, error } = parseAuthHash(hash);
    if (error || !accessToken || !refreshToken) {
      clearAuthHash();
      return;
    }

    let cancelled = false;
    const nextPath = resolveNextPath(searchParams);

    void (async () => {
      try {
        const supabase = createClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;

        clearAuthHash();
        if (cancelled) return;

        if (type === "recovery") {
          router.replace("/reset-password");
          return;
        }

        router.replace(nextPath);
      } catch (err) {
        console.error("Failed to recover auth session from URL hash:", err);
        clearAuthHash();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return null;
}

/**
 * Recovers a Supabase session from email-confirm / magic-link hash fragments
 * (`#access_token=...&refresh_token=...&type=signup`) then redirects.
 */
export function AuthHashHandler() {
  return (
    <Suspense fallback={null}>
      <AuthHashHandlerInner />
    </Suspense>
  );
}
