"use client";

import { Building2 } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface GroupLogoProps {
  name?: string | null;
  src?: string | null;
  className?: string;
  iconClassName?: string;
}

/** Group/workspace logo with building/initials placeholder when none is set. */
export function GroupLogo({ name, src, className, iconClassName }: GroupLogoProps) {
  const label = name?.trim() || "Group";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary",
        className,
      )}
      aria-hidden={!src}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- public storage URL
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : name?.trim() ? (
        <span className={cn("text-sm font-semibold", iconClassName)}>{getInitials(label)}</span>
      ) : (
        <Building2 className={cn("h-5 w-5", iconClassName)} />
      )}
    </div>
  );
}
