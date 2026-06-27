"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandMenu } from "./command-menu";
import { DemoModeBanner } from "./demo-mode-banner";
import { MobileTabBar } from "./mobile-tab-bar";
import { MobileMoreSheet } from "./mobile-more-sheet";
import { InstallBanner } from "@/components/pwa/install-banner";
import { useUIStore } from "@/stores";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  userName?: string;
  userAvatar?: string | null;
}

export function AppLayout({ children, title, userName, userAvatar }: AppLayoutProps) {
  const { sidebarOpen, compactMode } = useUIStore();
  const expandedWidth = compactMode ? 224 : 256;
  const collapsedWidth = compactMode ? 56 : 64;
  const sidebarWidth = sidebarOpen ? expandedWidth : collapsedWidth;

  return (
    <div className="app-shell min-h-[100dvh] bg-background">
      <Sidebar />
      <div
        className="app-shell-main flex min-h-[100dvh] flex-col transition-[margin] duration-200"
        style={{ ["--sidebar-width" as string]: `${sidebarWidth}px` }}
      >
        <Header title={title} userName={userName} userAvatar={userAvatar} />
        <main className="app-main flex-1 p-4 sm:p-6">
          <DemoModeBanner />
          <div className="app-page space-y-6 sm:space-y-8">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      <MobileMoreSheet />
      <InstallBanner />
      <CommandMenu />
    </div>
  );
}
