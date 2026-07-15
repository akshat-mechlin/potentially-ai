"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2 } from "lucide-react";
import { getCroppedAvatarFile } from "@/lib/media/crop-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export type ImageCropVariant = "avatar" | "logo";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => Promise<void> | void;
  /** Circular crop for profile photos; square corners for group logos. */
  variant?: ImageCropVariant;
}

const COPY: Record<
  ImageCropVariant,
  { title: string; description: string; previewLabel: string; fileName: string }
> = {
  avatar: {
    title: "Crop profile photo",
    description:
      "Drag and zoom so your face fits the circle. The fixed border matches your avatar frame.",
    previewLabel: "Preview",
    fileName: "avatar.jpg",
  },
  logo: {
    title: "Crop group logo",
    description:
      "Drag and zoom so the logo fits the square. The fixed border matches your group logo frame.",
    previewLabel: "Preview",
    fileName: "logo.jpg",
  },
};

export function AvatarCropDialog({
  open,
  imageSrc,
  onOpenChange,
  onCropped,
  variant = "avatar",
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[variant];
  const isRound = variant === "avatar";

  const resetCropState = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setBusy(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetCropState();
    onOpenChange(next);
  };

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    if (!imageSrc || !croppedAreaPixels) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const file = await getCroppedAvatarFile(imageSrc, croppedAreaPixels, "preview.jpg");
        if (cancelled) return;
        objectUrl = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch {
        // Preview is best-effort while dragging.
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageSrc, croppedAreaPixels]);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setBusy(true);
    try {
      const file = await getCroppedAvatarFile(imageSrc, croppedAreaPixels, copy.fileName);
      await onCropped(file);
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not crop photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape={isRound ? "round" : "rect"}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
                style={{
                  containerStyle: { borderRadius: "0.75rem" },
                  cropAreaStyle: {
                    border: "2px solid hsl(var(--primary))",
                    borderRadius: isRound ? undefined : "0.75rem",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
                  },
                }}
              />
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-2 sm:w-28">
            <p className="text-xs font-medium text-muted-foreground">{copy.previewLabel}</p>
            <div
              className={
                isRound
                  ? "h-24 w-24 overflow-hidden rounded-full border-2 border-primary bg-muted shadow-sm"
                  : "h-24 w-24 overflow-hidden rounded-xl border-2 border-primary bg-muted shadow-sm"
              }
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={isRound ? "Avatar preview" : "Logo preview"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                  …
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Zoom</span>
            <span>{zoom.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !croppedAreaPixels} onClick={() => void handleSave()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Use photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
