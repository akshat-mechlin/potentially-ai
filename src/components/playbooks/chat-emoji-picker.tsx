"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function ChatEmojiPicker({
  onSelect,
  disabled,
}: {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}) {
  const pickerHostRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const clearPickerHost = useCallback(() => {
    pickerHostRef.current?.replaceChildren();
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setLoading(false);
        clearPickerHost();
      }
      setOpen(next);
    },
    [clearPickerHost],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let picker: HTMLElement | null = null;
    let host = pickerHostRef.current;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ unicode: string }>).detail;
      onSelectRef.current(detail.unicode);
      handleOpenChange(false);
    };

    const mount = async () => {
      host = pickerHostRef.current;
      if (!host || cancelled || host.childElementCount > 0) return;

      setLoading(true);
      try {
        const { default: PickerElement } = await import("emoji-picker-element/picker.js");
        if (cancelled) return;

        host = pickerHostRef.current;
        if (!host || host.childElementCount > 0) return;

        picker = new PickerElement();
        picker.className = "light";
        picker.addEventListener("emoji-click", handler);
        host.appendChild(picker);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const frame = requestAnimationFrame(() => {
      void mount();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      picker?.removeEventListener("emoji-click", handler);
      host?.replaceChildren();
      picker = null;
    };
  }, [open, handleOpenChange]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled}
          aria-label="Add emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="z-[100] w-auto overflow-visible border-0 p-0 shadow-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative min-h-[420px] min-w-[320px]">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-popover">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          <div ref={pickerHostRef} className="min-h-[420px] min-w-[320px]" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
