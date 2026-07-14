"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * Imperative confirmation modal with Cancel / Confirm.
 * Render `{confirmDialog}` once, then `await confirm({...})` before destructive actions.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(result);
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      title={pending?.title ?? ""}
      description={pending?.description ?? ""}
      confirmLabel={pending?.confirmLabel}
      cancelLabel={pending?.cancelLabel}
      variant={pending?.variant}
      onConfirm={() => close(true)}
    />
  );

  return { confirm, confirmDialog };
}
