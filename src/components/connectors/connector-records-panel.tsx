"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronRight, Loader2, Search, Undo2 } from "lucide-react";
import { isContactExcluded } from "@/lib/contacts/exclude";
import type { ContactExcludedStatus } from "@/lib/contacts/exclude";
import { contactHref } from "@/lib/routes/contacts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

type ContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  title: string | null;
  company_name: string | null;
  metadata?: Record<string, unknown> | null;
};

interface ConnectorRecordsPanelProps {
  connectorKey: string;
  accountId: string;
  syncSource?: string | null;
  isCustom?: boolean;
  importBatchId?: string | null;
}

export function ConnectorRecordsPanel({
  connectorKey,
  accountId,
  syncSource,
  isCustom,
  importBatchId,
}: ConnectorRecordsPanelProps) {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [excludedStatus, setExcludedStatus] = useState<ContactExcludedStatus>("active");
  const [busy, setBusy] = useState(false);
  const selectionKey = `${accountId}|${excludedStatus}|${debouncedSearch}`;
  const [selection, setSelection] = useState<{ key: string; ids: string[] }>({
    key: selectionKey,
    ids: [],
  });
  const selectedIds = useMemo(
    () => (selection.key === selectionKey ? selection.ids : []),
    [selection.key, selection.ids, selectionKey],
  );
  const setSelectedIds = (next: string[] | ((prev: string[]) => string[])) => {
    setSelection((prev) => {
      const current = prev.key === selectionKey ? prev.ids : [];
      const ids = typeof next === "function" ? next(current) : next;
      return { key: selectionKey, ids };
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const recordsQuery = useQuery({
    queryKey: [
      "connector-records",
      connectorKey,
      accountId,
      syncSource,
      importBatchId,
      debouncedSearch,
      excludedStatus,
    ],
    enabled: Boolean(syncSource || isCustom),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "500",
        excluded: excludedStatus,
      });
      if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
      if (isCustom) {
        params.set("source", "csv");
        if (importBatchId) params.set("import_batch_id", importBatchId);
      } else if (syncSource) {
        params.set("source", syncSource);
      }
      const res = await fetch(`/api/contacts?${params}`);
      if (!res.ok) throw new Error("Failed to load records");
      return res.json() as Promise<{ contacts: ContactRow[]; total: number }>;
    },
  });

  const contacts = useMemo(
    () => recordsQuery.data?.contacts ?? [],
    [recordsQuery.data?.contacts],
  );
  const total = recordsQuery.data?.total ?? 0;
  const allVisibleSelected =
    contacts.length > 0 && contacts.every((contact) => selectedIds.includes(contact.id));

  const selectionAction = useMemo(() => {
    if (!selectedIds.length) return null;
    if (excludedStatus === "excluded") return "include" as const;
    if (excludedStatus === "active") return "exclude" as const;
    const selected = contacts.filter((contact) => selectedIds.includes(contact.id));
    const allExcluded =
      selected.length > 0 && selected.every((contact) => isContactExcluded(contact));
    return allExcluded ? ("include" as const) : ("exclude" as const);
  }, [selectedIds, excludedStatus, contacts]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(contacts.map((contact) => contact.id));
  };

  const updateExcluded = async (ids: string[], excluded: boolean) => {
    if (!ids.length) return;

    if (excluded) {
      const confirmed = await confirm({
        title: ids.length === 1 ? "Exclude this contact?" : `Exclude ${ids.length} contacts?`,
        description:
          ids.length === 1
            ? "This contact will be hidden from your network. You can restore it later from Excluded."
            : "Selected contacts will be hidden from your network. You can restore them later from Excluded.",
        confirmLabel: "Exclude",
      });
      if (!confirmed) return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, excluded }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["connector-records"] }),
        queryClient.invalidateQueries({ queryKey: ["contacts"] }),
        queryClient.invalidateQueries({ queryKey: ["graph"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, title, company…"
              className="pl-9"
            />
          </div>

          <Select
            value={excludedStatus}
            onValueChange={(value) => setExcludedStatus(value as ContactExcludedStatus)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Included</SelectItem>
              <SelectItem value="excluded">Excluded</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{contacts.length.toLocaleString()}</span> of{" "}
            {total.toLocaleString()} records
            {selectedIds.length > 0 ? (
              <span className="ml-2 text-foreground">· {selectedIds.length} selected</span>
            ) : null}
          </p>

          {selectionAction ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={
                selectionAction === "exclude"
                  ? "text-destructive hover:text-destructive"
                  : undefined
              }
              disabled={busy}
              onClick={() =>
                updateExcluded(selectedIds, selectionAction === "exclude")
              }
            >
              {busy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : selectionAction === "exclude" ? (
                <Ban className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Undo2 className="mr-1 h-3.5 w-3.5" />
              )}
              {selectionAction === "exclude" ? "Exclude" : "Include"}
            </Button>
          ) : null}
        </div>

        {recordsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading records…
          </div>
        ) : recordsQuery.isError ? (
          <p className="py-16 text-center text-sm text-destructive">
            Could not load records for this account.
          </p>
        ) : contacts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No records match these filters.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/60 rounded-lg border border-border/70 md:hidden">
              {contacts.map((contact) => {
                const selected = selectedIds.includes(contact.id);
                return (
                  <li key={contact.id} className="flex items-stretch gap-0">
                    <label className="flex items-center px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleOne(contact.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>
                    <Link
                      href={contactHref(contact.id)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pr-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {contact.full_name || "Unnamed contact"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[contact.email, contact.title, contact.company_name]
                            .filter(Boolean)
                            .join(" · ") || "No details"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto rounded-lg border border-border/70 md:block">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        className="h-4 w-4 rounded border-border"
                        aria-label="Select all visible records"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => {
                    const selected = selectedIds.includes(contact.id);
                    return (
                      <tr
                        key={contact.id}
                        className={`border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20 ${
                          selected ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleOne(contact.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={contactHref(contact.id)}
                            className="font-medium hover:underline"
                          >
                            {contact.full_name || "Unnamed contact"}
                          </Link>
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">
                          {contact.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contact.title ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {contact.company_name ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
