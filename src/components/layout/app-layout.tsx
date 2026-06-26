"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { CommandMenu } from "./command-menu";
import { useUIStore } from "@/stores";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  userName?: string;
  userAvatar?: string | null;
}

export function AppLayout({ children, title, userName, userAvatar }: AppLayoutProps) {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "transition-all duration-200",
          sidebarOpen ? "ml-64" : "ml-16",
        )}
      >
        <Header title={title} userName={userName} userAvatar={userAvatar} />
        <main className="p-6">{children}</main>
      </div>
      <CommandMenu />
    </div>
  );
}
