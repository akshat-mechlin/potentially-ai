"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores";
import { moreMenuItems } from "@/lib/nav-items";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MobileMoreSheet() {
  const pathname = usePathname();
  const { mobileMoreOpen, setMobileMoreOpen } = useUIStore();

  return (
    <Dialog open={mobileMoreOpen} onOpenChange={setMobileMoreOpen}>
      <DialogContent className="mobile-more-sheet bottom-0 top-auto max-h-[85dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-b-0 p-0 sm:max-w-lg sm:left-[50%] sm:translate-x-[-50%]">
        <div className="pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle className="font-display text-lg">More</DialogTitle>
          </DialogHeader>

          <div className="border-b border-border p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Workspace
            </p>
            <WorkspaceSwitcher />
          </div>

          <nav className="flex flex-col gap-1 p-3">
            {moreMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-primary"
                      : "text-foreground hover:bg-secondary/60",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </DialogContent>
    </Dialog>
  );
}
