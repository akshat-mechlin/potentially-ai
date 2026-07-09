"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  FIRST_VISIT_TIPS,
  FIRST_VISIT_TOUR_STORAGE_KEY,
} from "@/lib/onboarding/first-visit-tips";

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(FIRST_VISIT_TOUR_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(FIRST_VISIT_TOUR_STORAGE_KEY, "1");
  } catch {
    // localStorage may be unavailable in embedded browsers
  }
}

export function FirstVisitTour() {
  const [open, setOpen] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    if (hasSeenTour()) return;

    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    markTourSeen();
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) markTourSeen();
  };

  const handleNext = () => {
    if (currentTip < FIRST_VISIT_TIPS.length - 1) {
      setCurrentTip((tip) => tip + 1);
      return;
    }
    dismiss();
  };

  const handlePrev = () => {
    if (currentTip > 0) setCurrentTip((tip) => tip - 1);
  };

  const tip = FIRST_VISIT_TIPS[currentTip];
  const isFirstTip = currentTip === 0;
  const isLastTip = currentTip === FIRST_VISIT_TIPS.length - 1;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          onClick={() => setOpen(true)}
          aria-label="Open product tour"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Quick tour
        </button>
      </PopoverAnchor>
      <PopoverContent
        className="max-w-[300px] py-3 shadow-none"
        side="bottom"
        align="end"
        showArrow
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-[13px] font-medium">{tip.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{tip.description}</p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentTip + 1}/{FIRST_VISIT_TIPS.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={handlePrev}
                disabled={isFirstTip}
                aria-label="Previous tip"
              >
                <ArrowLeft size={14} strokeWidth={2} aria-hidden />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isLastTip ? "default" : "ghost"}
                className={isLastTip ? "h-7 px-3 text-xs" : "size-7 px-0"}
                onClick={handleNext}
                aria-label={isLastTip ? "Finish tour" : "Next tip"}
              >
                {isLastTip ? (
                  "Done"
                ) : (
                  <ArrowRight size={14} strokeWidth={2} aria-hidden />
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
