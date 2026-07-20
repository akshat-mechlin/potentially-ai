"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  agentModeNav,
  agentModeCoreItems,
  agentModeWorkflowItem,
  isAgentModePath,
  isResourcesPath,
  navItems,
  resourcesNav,
} from "@/lib/nav-items";
import { useFeatureFlags, usePlaybookEnabled } from "@/hooks/use-feature-flags";
import { filterNavByFlags } from "@/lib/feature-gates";
import { useUIStore } from "@/stores";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarOpen: sidebarOpenStored,
    toggleSidebar,
    compactMode: compactModeStored,
    _hasHydrated,
  } = useUIStore();
  // Match SSR defaults until persist rehydrates to avoid hydration mismatches.
  const sidebarOpen = _hasHydrated ? sidebarOpenStored : true;
  const compactMode = _hasHydrated ? compactModeStored : false;
  const { enabled: agentModeEnabled } = usePlaybookEnabled();
  const { data: flags } = useFeatureFlags();
  const expandedWidth = compactMode ? 224 : 256;
  const collapsedWidth = compactMode ? 56 : 64;
  const agentModeActive = isAgentModePath(pathname);
  const resourcesActive = isResourcesPath(pathname);
  const visibleNavItems = filterNavByFlags(navItems, flags);

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

      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-2">
          {visibleNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "app-nav-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
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

              <div className={cn("flex flex-col gap-0.5", sidebarOpen && "ml-3 border-l border-border/80 pl-1")}>
                {agentModeCoreItems.map((item) => {
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
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}

                <div
                  className={cn(
                    "my-2",
                    sidebarOpen ? "mx-3 border-t border-dashed border-border/80" : "mx-auto h-px w-6 bg-border/80",
                  )}
                  aria-hidden
                />

                <Link
                  href={agentModeWorkflowItem.href}
                  title={agentModeWorkflowItem.label}
                  className={cn(
                    "app-nav-link flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
                    sidebarOpen ? "px-3" : "justify-center px-2",
                    pathname.startsWith(agentModeWorkflowItem.href)
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <agentModeWorkflowItem.icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{agentModeWorkflowItem.label}</span>
                      {agentModeWorkflowItem.comingSoon ? (
                        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Coming soon
                        </span>
                      ) : null}
                    </>
                  )}
                </Link>
              </div>
            </div>
          )}

          <div className={cn("mt-3 pt-3", sidebarOpen ? "border-t border-border" : "border-t border-border/60")}>
            {sidebarOpen ? (
              <p
                className={cn(
                  "mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider",
                  resourcesActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {resourcesNav.label}
              </p>
            ) : (
              <div className="mx-auto mb-1.5 h-px w-6 bg-border" aria-hidden />
            )}

            <div className={cn("flex flex-col gap-0.5", sidebarOpen && "ml-3 border-l border-border/80 pl-1")}>
              {resourcesNav.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
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
