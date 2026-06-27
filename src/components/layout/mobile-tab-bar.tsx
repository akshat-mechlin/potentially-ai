"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTabItems } from "@/lib/nav-items";
import { useUIStore } from "@/stores";

export function MobileTabBar() {
  const pathname = usePathname();
  const { setMobileMoreOpen } = useUIStore();

  const isMoreActive = mobileTabItems.every((item) => !pathname.startsWith(item.href));

  return (
    <nav
      className="mobile-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {mobileTabItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mobile-tab-item flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="truncate text-[10px] font-medium leading-none">
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={cn(
            "mobile-tab-item flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors",
            isMoreActive ? "text-primary" : "text-muted-foreground",
          )}
          aria-label="More options"
        >
          <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
