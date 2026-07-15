"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadButtonProps {
  onPick: (file: File) => Promise<void>;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function ImageUploadButton({
  onPick,
  label = "Upload photo",
  disabled,
  className,
}: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          void onPick(file)
            .catch((error) => {
              toast.error(error instanceof Error ? error.message : "Upload failed");
            })
            .finally(() => setBusy(false));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
        {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}
