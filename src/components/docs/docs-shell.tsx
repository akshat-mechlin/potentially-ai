"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { DocsNav } from "@/components/docs/docs-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DocsShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div data-docs-shell className="w-full max-w-none lg:-mx-2 xl:-mx-3 2xl:-mx-4">
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div>
          <p className="text-sm font-semibold text-foreground">Documentation</p>
          <p className="text-xs text-muted-foreground">Browse guides and walkthroughs</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="gap-1.5"
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          Guides
        </Button>
      </div>

      <div
        className={cn(
          "mb-6 rounded-xl border border-border bg-card p-4 lg:hidden",
          mobileNavOpen ? "block" : "hidden",
        )}
      >
        <DocsNav />
      </div>

      <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 xl:grid-cols-[20rem_minmax(0,1fr)] xl:gap-8 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-border bg-card p-4">
            <DocsNav />
          </div>
        </aside>

        <div className="min-w-0 rounded-xl border border-border bg-card p-5 sm:p-8 xl:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
