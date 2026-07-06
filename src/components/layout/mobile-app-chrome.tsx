"use client";

import { useMobileApp } from "@/hooks/use-mobile-app";
import { MobileScreen } from "@/components/mobile/native-ui";
import { cn } from "@/lib/utils";

/** Wraps authenticated pages in a native-style scroll scaffold on mobile. */
export function MobileAppChrome({
  children,
  className,
  immersive,
}: {
  children: React.ReactNode;
  className?: string;
  immersive?: boolean;
}) {
  const { isMobile } = useMobileApp();

  if (!isMobile) {
    return <>{children}</>;
  }

  if (immersive) {
    return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
  }

  return (
    <MobileScreen className={cn("space-y-1", className)} padded={false}>
      <div className="px-4 pb-28 pt-1">{children}</div>
    </MobileScreen>
  );
}
