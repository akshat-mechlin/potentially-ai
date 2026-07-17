"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Compact info icon with tooltip — use next to a label when the title needs explanation. */
export function InfoHint({
  label,
  hint,
  className,
  contentClassName,
  side = "top",
}: {
  label: string;
  hint: string;
  className?: string;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
              className,
            )}
            aria-label={`About ${label}`}
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className={cn("max-w-[280px] leading-relaxed", contentClassName)}
        >
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function FieldHint({
  label,
  hint,
  className,
}: {
  label: string;
  hint: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="text-sm font-medium leading-none">{label}</span>
      <InfoHint label={label} hint={hint} />
    </div>
  );
}
