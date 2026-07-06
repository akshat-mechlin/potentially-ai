"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { agentModeNav, isAgentModePath, navItems } from "@/lib/nav-items";
import { usePlaybookEnabled } from "@/hooks/use-feature-flags";
import { useUIStore } from "@/stores";
import { BrandLogo } from "@/components/brand-logo";
import { GroupSwitcher } from "./workspace-switcher";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, compactMode } = useUIStore();
  const { enabled: agentModeEnabled } = usePlaybookEnabled();
  const expandedWidth = compactMode ? 224 : 256;
  const collapsedWidth = compactMode ? 56 : 64;
  const agentModeActive = isAgentModePath(pathname);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? expandedWidth : collapsedWidth }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-border bg-sidebar lg:flex"
    >
      <div className="app-sidebar-brand flex h-14 items-center border-b border-border px-4">
        <BrandLogo href="/dashboard" size="sm" showText={sidebarOpen} />
      </div>

      {sidebarOpen && (
        <div className="border-b border-border p-3">
          <GroupSwitcher />
        </div>
      )}

      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "app-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-primary"
                    : "text-sidebar-foreground/70 hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}

          {agentModeEnabled && (
            <div className={cn("mt-3 pt-3", sidebarOpen ? "border-t border-border" : "border-t border-border/60")}>
              {sidebarOpen ? (
                <p
                  className={cn(
                    "mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider",
                    agentModeActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {agentModeNav.label}
                </p>
              ) : (
                <div className="mx-auto mb-1.5 h-px w-6 bg-border" aria-hidden />
              )}

              <div className={cn("flex flex-col gap-0.5", sidebarOpen && "border-l border-border/80 ml-3 pl-1")}>
                {agentModeNav.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "app-nav-link flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                        sidebarOpen ? "px-3" : "justify-center px-2",
                        isActive
                          ? "bg-secondary text-primary"
                          : "text-sidebar-foreground/70 hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full text-muted-foreground"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")}
          />
        </Button>
      </div>
    </motion.aside>
  );
}
