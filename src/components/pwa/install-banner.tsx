"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useIsClient } from "@/hooks/use-is-client";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const isClient = useIsClient();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!isClient) return null;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone);
  const wasDismissed = dismissed || !!localStorage.getItem("pwa-install-dismissed");

  if (isStandalone || wasDismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="install-banner fixed inset-x-4 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
        <BrandMark className="h-10 w-10 shrink-0 rounded-xl" variant="tile" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold">Install Potentially</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add to your home screen for a native app experience.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="h-8 rounded-lg" onClick={handleInstall}>
              Install
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
