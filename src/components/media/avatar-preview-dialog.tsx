"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/media/user-avatar";

interface AvatarPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null | undefined;
  name?: string | null;
  email?: string | null;
}

export function AvatarPreviewDialog({
  open,
  onOpenChange,
  src,
  name,
  email,
}: AvatarPreviewDialogProps) {
  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 bg-transparent p-0 shadow-none sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Profile photo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-background p-6 shadow-lg">
          <UserAvatar
            name={name}
            email={email}
            src={src}
            className="h-56 w-56 text-4xl ring-2 ring-border"
            fallbackClassName="text-4xl"
          />
          <p className="text-sm text-muted-foreground">{name || email || "Profile photo"}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
