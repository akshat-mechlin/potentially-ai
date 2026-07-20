"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNodeDefinition } from "@/lib/workflows/catalog";
import type { WorkflowNodeData, WorkflowNodeKind } from "@/types/workflows";

interface NodeConfigPanelProps {
  nodeId: string;
  data: WorkflowNodeData;
  onChange: (nodeId: string, next: WorkflowNodeData) => void;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function listToCsv(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.join(", ");
}

export function NodeConfigPanel({
  nodeId,
  data,
  onChange,
  onClose,
  onDelete,
}: NodeConfigPanelProps) {
  const kind = data.kind as WorkflowNodeKind;
  const def = getNodeDefinition(kind);
  const config = data.config ?? {};

  const patchConfig = (patch: Record<string, unknown>) => {
    onChange(nodeId, {
      ...data,
      config: { ...config, ...patch },
    });
  };

  const patchMeta = (patch: Partial<WorkflowNodeData>) => {
    onChange(nodeId, { ...data, ...patch });
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-card text-foreground">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configure</p>
          <p className="mt-0.5 truncate text-sm font-medium">{def?.label ?? kind}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={onClose}
          aria-label="Close config"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Label</Label>
          <Input
            value={data.label}
            onChange={(e) => patchMeta({ label: e.target.value })}
           
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Description</Label>
          <Textarea
            value={data.description ?? ""}
            onChange={(e) => patchMeta({ description: e.target.value })}
            className="min-h-[70px]"
          />
        </div>

        {kind === "trigger" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">When to start</Label>
              <Select
                value={String(config.mode ?? "manual")}
                onValueChange={(value) => patchConfig({ mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual run</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="new_contact">New contact added</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {String(config.mode ?? "manual") === "schedule" ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">How often</Label>
                <Select
                  value={String(config.interval ?? "daily")}
                  onValueChange={(value) => patchConfig({ interval: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every hour</SelectItem>
                    <SelectItem value="every_6_hours">Every 6 hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </>
        )}

        {kind === "icp" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Titles include</Label>
              <Input
                value={listToCsv(config.title_include)}
                onChange={(e) => patchConfig({ title_include: csvToList(e.target.value) })}
                placeholder="CTO, Founder, VP"
               
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Keywords (nice to have)</Label>
              <Input
                value={listToCsv(config.keywords_nice)}
                onChange={(e) => patchConfig({ keywords_nice: csvToList(e.target.value) })}
                placeholder="fintech, SaaS"
               
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Must-have keywords</Label>
              <Input
                value={listToCsv(config.keywords_must)}
                onChange={(e) => patchConfig({ keywords_must: csvToList(e.target.value) })}
               
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Min strength</Label>
                <Input
                  type="number"
                  value={Number(config.min_strength_score ?? 0)}
                  onChange={(e) => patchConfig({ min_strength_score: Number(e.target.value) })}
                 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Min match</Label>
                <Input
                  type="number"
                  value={Number(config.min_match_score ?? 35)}
                  onChange={(e) => patchConfig({ min_match_score: Number(e.target.value) })}
                 
                />
              </div>
            </div>
          </>
        )}

        {kind === "segment" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Mode</Label>
              <Select
                value={String(config.mode ?? "create")}
                onValueChange={(value) => patchConfig({ mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create new segment</SelectItem>
                  <SelectItem value="link">Link existing segment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Segment name</Label>
              <Input
                value={String(config.name ?? "")}
                onChange={(e) => patchConfig({ name: e.target.value })}
               
              />
            </div>
          </>
        )}

        {kind === "playbook" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Playbook name</Label>
              <Input
                value={String(config.name ?? "")}
                onChange={(e) => patchConfig({ name: e.target.value })}
               
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Automation</Label>
              <Select
                value={String(config.automation_level ?? "assist")}
                onValueChange={(value) => patchConfig({ automation_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assist">Assist</SelectItem>
                  <SelectItem value="supervised">Supervised</SelectItem>
                  <SelectItem value="autonomous">Autonomous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Outreach mode</Label>
              <Select
                value={String(config.outreach_mode ?? "warm_preferred")}
                onValueChange={(value) => patchConfig({ outreach_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm_preferred">Warm preferred</SelectItem>
                  <SelectItem value="warm_required">Warm required</SelectItem>
                  <SelectItem value="cold_allowed">Cold allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Goal</Label>
              <Textarea
                value={String(config.goal ?? "")}
                onChange={(e) => patchConfig({ goal: e.target.value })}
                className="min-h-[70px]"
              />
            </div>
          </>
        )}

        {kind === "condition" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Field</Label>
              <Select
                value={String(config.field ?? "match_score")}
                onValueChange={(value) => patchConfig({ field: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_score">Match score</SelectItem>
                  <SelectItem value="strength_score">Strength score</SelectItem>
                  <SelectItem value="title_contains">Title contains</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Operator</Label>
                <Select
                  value={String(config.operator ?? "gte")}
                  onValueChange={(value) => patchConfig({ operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">≥</SelectItem>
                    <SelectItem value="lte">≤</SelectItem>
                    <SelectItem value="eq">=</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Value</Label>
                <Input
                  value={String(config.value ?? "")}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const asNum = Number(raw);
                    patchConfig({ value: Number.isFinite(asNum) && raw !== "" ? asNum : raw });
                  }}
                 
                />
              </div>
            </div>
          </>
        )}

        {kind === "delay" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Amount</Label>
              <Input
                type="number"
                value={Number(config.amount ?? 1)}
                onChange={(e) => patchConfig({ amount: Number(e.target.value) })}
               
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Unit</Label>
              <Select
                value={String(config.unit ?? "days")}
                onValueChange={(value) => patchConfig({ unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {kind === "approve" && (
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Review prompt</Label>
            <Textarea
              value={String(config.message ?? "")}
              onChange={(e) => patchConfig({ message: e.target.value })}
              className="min-h-[80px]"
            />
          </div>
        )}

        {kind === "action_email" && (
          <>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Channel</Label>
              <Select
                value={String(config.channel ?? "email")}
                onValueChange={(value) => patchConfig({ channel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="in_app">In-app</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Require approval</Label>
              <Select
                value={config.require_approval === false ? "no" : "yes"}
                onValueChange={(value) => patchConfig({ require_approval: value === "yes" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {kind === "action_notify" && (
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Message</Label>
            <Textarea
              value={String(config.message ?? "")}
              onChange={(e) => patchConfig({ message: e.target.value })}
              className="min-h-[70px]"
            />
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <Button
          variant="outline"
          className="w-full border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(nodeId)}
        >
          Remove node
        </Button>
      </div>
    </aside>
  );
}
