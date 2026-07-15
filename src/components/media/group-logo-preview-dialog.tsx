"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupLogo } from "@/components/media/group-logo";

interface GroupLogoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | null | undefined;
  name?: string | null;
}

export function GroupLogoPreviewDialog({
  open,
  onOpenChange,
  src,
  name,
}: GroupLogoPreviewDialogProps) {
  if (!src) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 bg-transparent p-0 shadow-none sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Group logo</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-background p-6 shadow-lg">
          <GroupLogo
            name={name}
            src={src}
            className="h-56 w-56 rounded-2xl ring-2 ring-border"
            iconClassName="h-16 w-16"
          />
          <p className="text-sm text-muted-foreground">{name || "Group logo"}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
