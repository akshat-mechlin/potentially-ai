"use client";

import { isDemoMode } from "@/lib/app-config";
import { Info } from "lucide-react";

export function DemoModeBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-secondary/60 px-4 py-3 text-sm text-secondary-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-medium text-foreground">Running in demo mode</p>
        <p className="mt-0.5 text-muted-foreground">
          Data is stored in memory for this session. Set{" "}
          <code className="rounded bg-card px-1 py-0.5 text-xs">NEXT_PUBLIC_DEMO_MODE=false</code>{" "}
          and add your Supabase service role key to enable live auth and persistence.
        </p>
      </div>
    </div>
  );
}
