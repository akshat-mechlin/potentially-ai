"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { ApolloRecord } from "@/lib/data/apollo-records";
import { isUnverifiedApolloStub } from "@/lib/integrations/apollo/present-record";

type ApolloEnrichDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: ApolloRecord[];
  onConfirm: (args: { acknowledgeUnverified: boolean }) => Promise<void>;
  busy?: boolean;
};

export function ApolloEnrichDialog({
  open,
  onOpenChange,
  records,
  onConfirm,
  busy,
}: ApolloEnrichDialogProps) {
  const [acknowledgeUnverified, setAcknowledgeUnverified] = useState(false);
  const hasUnverified = records.some((record) => isUnverifiedApolloStub(record.apollo_id));

  const handleConfirm = async () => {
    await onConfirm({ acknowledgeUnverified });
    setAcknowledgeUnverified(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enrich selected records</DialogTitle>
          <DialogDescription>
            Enrichment uses your Apollo account credits. Apollo bills enrichment to your plan, not
            Potentially.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            You are about to enrich {records.length} record{records.length === 1 ? "" : "s"}.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {records.slice(0, 5).map((record) => (
              <li key={record.id}>
                {record.name}
                {record.email ? ` (${record.email})` : ""}
              </li>
            ))}
            {records.length > 5 ? <li>…and {records.length - 5} more</li> : null}
          </ul>

          {hasUnverified ? (
            <div className="flex items-start gap-2 rounded-lg border border-border/70 p-3">
              <input
                id="ack-unverified"
                type="checkbox"
                checked={acknowledgeUnverified}
                onChange={(event) => setAcknowledgeUnverified(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <Label htmlFor="ack-unverified" className="text-sm font-normal leading-snug">
                I understand some records are not verified in Apollo and enrichment may use credits
                without a match.
              </Label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={busy || (hasUnverified && !acknowledgeUnverified)}
          >
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Enrich
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
