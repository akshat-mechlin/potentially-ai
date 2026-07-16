"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandMenu } from "./command-menu";
import { DemoModeBanner } from "./demo-mode-banner";
import { MobileTabBar } from "./mobile-tab-bar";
import { MobileMoreSheet } from "./mobile-more-sheet";
import { MobilePageTransition } from "./mobile-page-transition";
import { MobileAppChrome } from "./mobile-app-chrome";
import { InstallBanner } from "@/components/pwa/install-banner";
import { MobileAppSync } from "./mobile-app-sync";
import { useUIStore } from "@/stores";
import { usePathname } from "next/navigation";
import { isImmersiveMobileRoute, shouldHideAppHeader } from "@/lib/mobile-nav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  userName?: string;
  userAvatar?: string | null;
}

export function AppLayout({ children, title, userName, userAvatar }: AppLayoutProps) {
  const pathname = usePathname();
  const {
    sidebarOpen: sidebarOpenStored,
    compactMode: compactModeStored,
    _hasHydrated,
  } = useUIStore();
  const sidebarOpen = _hasHydrated ? sidebarOpenStored : true;
  const compactMode = _hasHydrated ? compactModeStored : false;
  const immersiveMobile = isImmersiveMobileRoute(pathname);
  const hideAppHeader = shouldHideAppHeader(pathname);
  const isWorkflowRoute = pathname.startsWith("/workflows");
  const expandedWidth = compactMode ? 224 : 256;
  const collapsedWidth = compactMode ? 56 : 64;
  const sidebarWidth = sidebarOpen ? expandedWidth : collapsedWidth;

  return (
    <div className={cn("app-shell min-h-[100dvh] bg-background", immersiveMobile && "app-shell-immersive")}>
      <MobileAppSync />
      <Sidebar />
      <div
        className="app-shell-main flex min-h-[100dvh] flex-col transition-[margin] duration-200"
        style={{ ["--sidebar-width" as string]: `${sidebarWidth}px` }}
      >
        {!hideAppHeader && (
          <Header title={title} userName={userName} userAvatar={userAvatar} immersiveMobile={immersiveMobile} />
        )}
        <main
          className={cn(
            "app-main flex-1",
            immersiveMobile && "app-main-immersive",
            hideAppHeader && "app-main-fullscreen",
            isWorkflowRoute && "app-main-workflow",
          )}
        >
          <DemoModeBanner />
          <MobilePageTransition>
            <MobileAppChrome immersive={immersiveMobile || hideAppHeader}>
              <div
                className={cn(
                  "app-page",
                  immersiveMobile || hideAppHeader ? "app-page-immersive" : "space-y-6 sm:space-y-8",
                  isWorkflowRoute && "app-page-workflow",
                )}
              >
                {children}
              </div>
            </MobileAppChrome>
          </MobilePageTransition>
        </main>
      </div>
      <MobileTabBar hidden={immersiveMobile} />
      <MobileMoreSheet />
      <InstallBanner />
      <CommandMenu />
    </div>
  );
}
