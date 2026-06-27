"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 z-50 w-full bg-primary py-2 text-center text-xs text-primary-foreground sm:text-sm">
        <span className="inline-flex items-center gap-1.5 px-4">
          <BrandMark className="h-4 w-4 text-primary-foreground" variant="mono" />
          <span className="truncate">AI-powered relationship intelligence. Early access.</span>
        </span>
      </div>

      <header className="public-header fixed top-8 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-md supports-[padding:max(0px)]:pt-[env(safe-area-inset-top)] sm:top-9">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <BrandLogo href="/" size="md" className="min-w-0" />

          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden text-muted-foreground sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild className="hidden rounded-lg px-4 sm:inline-flex">
              <Link href="/signup">Get started</Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="mobile-more-sheet bottom-0 top-auto max-h-[80dvh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl border-b-0 p-0 sm:max-w-lg sm:left-[50%] sm:translate-x-[-50%]">
          <div className="pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
            <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4 text-left">
              <DialogTitle className="font-display text-lg">Menu</DialogTitle>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogHeader>

            <nav className="flex flex-col gap-1 p-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium hover:bg-secondary/60"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-2 border-t border-border p-4">
              <Button variant="outline" asChild className="h-11 rounded-xl">
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button asChild className="h-11 rounded-xl">
                <Link href="/signup" onClick={() => setMenuOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
