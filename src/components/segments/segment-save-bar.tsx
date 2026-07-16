"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Segment } from "@/types/playbooks";
import { toast } from "sonner";

interface SegmentSaveBarProps {
  selectedIds: string[];
  onClear: () => void;
}

export function SegmentSaveBar({ selectedIds, onClear }: SegmentSaveBarProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery<{ segments: Segment[] }>({
    queryKey: ["segments"],
    queryFn: () => fetch("/api/segments").then((r) => r.json()),
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "new") {
        if (!name.trim()) throw new Error("Name required");
        const res = await fetch("/api/segments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, contact_ids: selectedIds }),
        });
        if (!res.ok) throw new Error("Failed to create segment");
        toast.success(`Segment created with ${selectedIds.length} contacts`);
      } else {
        if (!segmentId) throw new Error("Select a segment");
        const res = await fetch(`/api/segments/${segmentId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contact_ids: selectedIds }),
        });
        if (!res.ok) throw new Error("Failed to update segment");
        toast.success(`Added ${selectedIds.length} contacts to segment`);
      }
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      setOpen(false);
      onClear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save segment");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedIds.length) return null;

  return (
    <>
      <div className="sticky bottom-4 z-10 mx-auto flex max-w-lg items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-lg">
        <p className="text-sm font-medium">{selectedIds.length} selected</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            Save to segment
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to segment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={mode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("new")}
              >
                New segment
              </Button>
              <Button
                variant={mode === "existing" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("existing")}
              >
                Existing segment
              </Button>
            </div>
            {mode === "new" ? (
              <div className="space-y-2">
                <Label required>Segment name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label required>Segment</Label>
                <Select value={segmentId} onValueChange={setSegmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                (mode === "new" ? !name.trim() : !segmentId)
              }
              className="w-full"
            >
              {saving ? "Saving..." : `Save ${selectedIds.length} contacts`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
