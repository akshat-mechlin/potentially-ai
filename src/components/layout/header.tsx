"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Command, LogOut, Moon, Sun, User } from "lucide-react";
import { useUIStore } from "@/stores";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-data";
import { getPageTitle } from "@/lib/nav-items";
import { getMobileBackLink } from "@/lib/mobile-nav";
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
import { getInitials, cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  userName?: string;
  userAvatar?: string | null;
  immersiveMobile?: boolean;
}

export function Header({ title, userName = "Alex Morgan", userAvatar, immersiveMobile }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setCommandMenuOpen, mobileHeaderTitle } = useUIStore();
  const { resolvedTheme, setTheme } = useTheme();
  const pageTitle = mobileHeaderTitle ?? title ?? getPageTitle(pathname);
  const backLink = getMobileBackLink(pathname);

  const handleLogout = async () => {
    if (!isDemoMode()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push("/login");
  };

  return (
    <header
      className={cn(
        "app-header sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border/60 bg-card/98 px-3 backdrop-blur-xl sm:px-6",
        immersiveMobile && "app-header-immersive",
        backLink && "app-header-stack",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {backLink ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-back-btn h-10 w-10 shrink-0 rounded-full lg:hidden"
              asChild
            >
              <Link href={backLink.href} aria-label="Go back">
                <ChevronLeft className="h-6 w-6" />
              </Link>
            </Button>
            <Link href="/dashboard" className="hidden shrink-0 lg:block">
              <BrandLogo showText={false} size="sm" />
            </Link>
          </>
        ) : (
          <Link href="/dashboard" className="shrink-0 lg:hidden">
            <BrandLogo showText={false} size="sm" />
          </Link>
        )}
        <h1
          className={cn(
            "min-w-0 truncate font-semibold text-foreground text-page-title max-lg:text-base",
            backLink && "flex-1 text-center lg:flex-none lg:text-left",
          )}
        >
          {pageTitle}
        </h1>
        {backLink && <div className="w-10 shrink-0 lg:hidden" aria-hidden />}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
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

        <div className={cn(backLink && "max-lg:hidden")}>
          <NotificationBell />
        </div>

        <div className={cn(backLink && "max-lg:hidden")}>
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
      </div>
    </header>
  );
}
