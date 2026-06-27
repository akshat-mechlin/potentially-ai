"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Command, LogOut, Moon, Search, Sun, User } from "lucide-react";
import { useUIStore } from "@/stores";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { getPageTitle } from "@/lib/nav-items";
import { BrandLogo } from "@/components/brand-logo";
import { NotificationBell } from "./notification-bell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  userName?: string;
  userAvatar?: string | null;
}

export function Header({ title, userName = "Alex Morgan", userAvatar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setCommandMenuOpen } = useUIStore();
  const { resolvedTheme, setTheme } = useTheme();
  const pageTitle = title ?? getPageTitle(pathname);

  const handleLogout = async () => {
    if (!isDemoMode()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  return (
    <header className="app-header sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-lg supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/dashboard" className="shrink-0 lg:hidden">
          <BrandLogo showText={false} size="sm" />
        </Link>
        <h1 className="font-display truncate text-xl sm:text-2xl">{pageTitle}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 lg:hidden"
          onClick={() => router.push("/search")}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 text-muted-foreground lg:flex"
          onClick={() => setCommandMenuOpen(true)}
        >
          <Command className="h-3.5 w-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar || undefined} />
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={userAvatar || undefined} />
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
