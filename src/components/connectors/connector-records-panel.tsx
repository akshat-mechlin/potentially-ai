"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ChevronRight, Columns3, Loader2, Search, Undo2 } from "lucide-react";
import { isContactExcluded } from "@/lib/contacts/exclude";
import type { ContactExcludedStatus } from "@/lib/contacts/exclude";
import { contactHref } from "@/lib/routes/contacts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

type ContactRow = {
  id: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string | null;
  title: string | null;
  company_name: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  location?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ColumnDef = {
  key: string;
  label: string;
  /** Locked on — cannot be hidden in the column picker. */
  locked?: boolean;
  getValue: (contact: ContactRow) => string | null;
};

function metaString(contact: ContactRow, key: string): string | null {
  const raw = contact.metadata?.[key];
  if (raw == null) return null;
  const value = String(raw).trim();
  return value || null;
}

function cell(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

const CORE_COLUMNS: ColumnDef[] = [
  {
    key: "full_name",
    label: "Name",
    locked: true,
    getValue: (c) => cell(c.full_name),
  },
  {
    key: "email",
    label: "Email",
    getValue: (c) => cell(c.email),
  },
  {
    key: "title",
    label: "Title",
    getValue: (c) => cell(c.title),
  },
  {
    key: "company_name",
    label: "Company",
    getValue: (c) => cell(c.company_name),
  },
];

/** Apollo / CSV enrichment columns — values live on contact fields or metadata. */
const CUSTOM_ENRICHMENT_COLUMNS: ColumnDef[] = [
  { key: "first_name", label: "First Name", getValue: (c) => cell(c.first_name) },
  { key: "last_name", label: "Last Name", getValue: (c) => cell(c.last_name) },
  {
    key: "company_name_for_emails",
    label: "Company Name for Emails",
    getValue: (c) => metaString(c, "company_name_for_emails"),
  },
  { key: "email_status", label: "Email Status", getValue: (c) => metaString(c, "email_status") },
  {
    key: "primary_email_source",
    label: "Primary Email Source",
    getValue: (c) => metaString(c, "primary_email_source"),
  },
  {
    key: "primary_email_verification_source",
    label: "Email Verification Source",
    getValue: (c) => metaString(c, "primary_email_verification_source"),
  },
  {
    key: "email_confidence",
    label: "Email Confidence",
    getValue: (c) => metaString(c, "email_confidence"),
  },
  {
    key: "primary_email_catch_all_status",
    label: "Catch-all Status",
    getValue: (c) => metaString(c, "primary_email_catch_all_status"),
  },
  {
    key: "primary_email_last_verified_at",
    label: "Email Last Verified",
    getValue: (c) => metaString(c, "primary_email_last_verified_at"),
  },
  { key: "seniority", label: "Seniority", getValue: (c) => metaString(c, "seniority") },
  { key: "departments", label: "Departments", getValue: (c) => metaString(c, "departments") },
  {
    key: "sub_departments",
    label: "Sub Departments",
    getValue: (c) => metaString(c, "sub_departments"),
  },
  { key: "contact_owner", label: "Contact Owner", getValue: (c) => metaString(c, "contact_owner") },
  {
    key: "work_direct_phone",
    label: "Work Direct Phone",
    getValue: (c) => metaString(c, "work_direct_phone") ?? cell(c.phone),
  },
  { key: "home_phone", label: "Home Phone", getValue: (c) => metaString(c, "home_phone") },
  { key: "mobile_phone", label: "Mobile Phone", getValue: (c) => metaString(c, "mobile_phone") },
  {
    key: "corporate_phone",
    label: "Corporate Phone",
    getValue: (c) => metaString(c, "corporate_phone"),
  },
  { key: "other_phone", label: "Other Phone", getValue: (c) => metaString(c, "other_phone") },
  { key: "do_not_call", label: "Do Not Call", getValue: (c) => metaString(c, "do_not_call") },
  { key: "stage", label: "Stage", getValue: (c) => metaString(c, "stage") },
  { key: "lists", label: "Lists", getValue: (c) => metaString(c, "lists") },
  { key: "last_contacted", label: "Last Contacted", getValue: (c) => metaString(c, "last_contacted") },
  { key: "account_owner", label: "Account Owner", getValue: (c) => metaString(c, "account_owner") },
  { key: "employees", label: "# Employees", getValue: (c) => metaString(c, "employees") },
  { key: "industry", label: "Industry", getValue: (c) => metaString(c, "industry") },
  { key: "keywords", label: "Keywords", getValue: (c) => metaString(c, "keywords") },
  {
    key: "linkedin_url",
    label: "Person LinkedIn",
    getValue: (c) => cell(c.linkedin_url),
  },
  { key: "website", label: "Website", getValue: (c) => metaString(c, "website") },
  {
    key: "company_linkedin_url",
    label: "Company LinkedIn",
    getValue: (c) => metaString(c, "company_linkedin_url"),
  },
  { key: "facebook_url", label: "Facebook", getValue: (c) => metaString(c, "facebook_url") },
  { key: "twitter_url", label: "Twitter", getValue: (c) => cell(c.twitter_url) },
  { key: "city", label: "City", getValue: (c) => metaString(c, "city") },
  { key: "state", label: "State", getValue: (c) => metaString(c, "state") },
  { key: "country", label: "Country", getValue: (c) => metaString(c, "country") },
  { key: "location", label: "Location", getValue: (c) => cell(c.location) },
  {
    key: "company_address",
    label: "Company Address",
    getValue: (c) => metaString(c, "company_address"),
  },
  { key: "company_city", label: "Company City", getValue: (c) => metaString(c, "company_city") },
  { key: "company_state", label: "Company State", getValue: (c) => metaString(c, "company_state") },
  {
    key: "company_country",
    label: "Company Country",
    getValue: (c) => metaString(c, "company_country"),
  },
  { key: "company_phone", label: "Company Phone", getValue: (c) => metaString(c, "company_phone") },
  { key: "technologies", label: "Technologies", getValue: (c) => metaString(c, "technologies") },
  {
    key: "annual_revenue",
    label: "Annual Revenue",
    getValue: (c) => metaString(c, "annual_revenue"),
  },
  { key: "total_funding", label: "Total Funding", getValue: (c) => metaString(c, "total_funding") },
  {
    key: "latest_funding",
    label: "Latest Funding",
    getValue: (c) => metaString(c, "latest_funding"),
  },
  {
    key: "latest_funding_amount",
    label: "Latest Funding Amount",
    getValue: (c) => metaString(c, "latest_funding_amount"),
  },
  { key: "last_raised_at", label: "Last Raised At", getValue: (c) => metaString(c, "last_raised_at") },
  { key: "subsidiary_of", label: "Subsidiary of", getValue: (c) => metaString(c, "subsidiary_of") },
  {
    key: "subsidiary_of_organization_id",
    label: "Subsidiary Org ID",
    getValue: (c) => metaString(c, "subsidiary_of_organization_id"),
  },
];

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
  const [columnPrefs, setColumnPrefs] = useState<string[] | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
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

  /** All headings available for this dataset (with data for enrichment fields). */
  const availableColumns = useMemo(() => {
    if (!isCustom) return CORE_COLUMNS;
    const enrichment = CUSTOM_ENRICHMENT_COLUMNS.filter((col) =>
      contacts.some((contact) => Boolean(col.getValue(contact))),
    );
    return [...CORE_COLUMNS, ...enrichment];
  }, [isCustom, contacts]);

  const availableKeySet = useMemo(
    () => new Set(availableColumns.map((col) => col.key)),
    [availableColumns],
  );

  const visibleKeys = useMemo(() => {
    if (!availableColumns.length) return [] as string[];
    if (!columnPrefs) return availableColumns.map((col) => col.key);
    const next = columnPrefs.filter((key) => availableKeySet.has(key));
    for (const col of availableColumns) {
      if (col.locked && !next.includes(col.key)) next.unshift(col.key);
    }
    return next.length ? next : availableColumns.map((col) => col.key);
  }, [availableColumns, availableKeySet, columnPrefs]);

  const columns = useMemo(() => {
    const selected = new Set(visibleKeys);
    return availableColumns.filter((col) => col.locked || selected.has(col.key));
  }, [availableColumns, visibleKeys]);

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

  const toggleColumn = (key: string, locked?: boolean) => {
    if (locked) return;
    setColumnPrefs((prev) => {
      const current = prev ?? availableColumns.map((col) => col.key);
      if (current.includes(key)) {
        const next = current.filter((item) => item !== key);
        return next.length ? next : current;
      }
      return [...current, key];
    });
  };

  const showAllColumns = () => {
    setColumnPrefs(availableColumns.map((col) => col.key));
  };

  const showCoreOnly = () => {
    setColumnPrefs(CORE_COLUMNS.map((col) => col.key));
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

  const stickyHeaderBg = "bg-muted";
  const stickyCellBg = (selected: boolean) => (selected ? "bg-primary/5" : "bg-card");

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="sticky top-0 z-20 -mx-4 space-y-3 border-b border-border/60 bg-card px-4 pb-3 sm:-mx-5 sm:px-5">
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

            <div className="flex flex-wrap items-center gap-2">
              {isCustom ? (
                <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5">
                      <Columns3 className="h-3.5 w-3.5" />
                      Columns
                      <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                        {columns.length}/{availableColumns.length}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-0">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                      <p className="text-sm font-medium">Visible columns</p>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={showCoreOnly}>
                          Core
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={showAllColumns}>
                          All
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-2">
                      {availableColumns.map((col) => {
                        const checked = columns.some((item) => item.key === col.key);
                        return (
                          <label
                            key={col.key}
                            className={cn(
                              "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                              col.locked && "opacity-70",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={col.locked}
                              onChange={() => toggleColumn(col.key, col.locked)}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className="min-w-0 flex-1 truncate">{col.label}</span>
                            {col.locked ? (
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                Required
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}

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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{contacts.length.toLocaleString()}</span>{" "}
              of {total.toLocaleString()} records
              {isCustom && availableColumns.length <= CORE_COLUMNS.length ? (
                <span className="ml-2 text-amber-700 dark:text-amber-400">
                  · No enrichment found. Re-import CSV to store all fields.
                </span>
              ) : null}
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
                onClick={() => updateExcluded(selectedIds, selectionAction === "exclude")}
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
                const extras = isCustom
                  ? [
                      metaString(contact, "seniority"),
                      metaString(contact, "industry"),
                      metaString(contact, "city") ?? cell(contact.location),
                      cell(contact.phone) ?? metaString(contact, "mobile_phone"),
                    ].filter(Boolean)
                  : [];
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
                        {extras.length > 0 ? (
                          <p className="mt-1 truncate text-[11px] text-muted-foreground/90">
                            {extras.join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="hidden md:block">
              <div className="max-h-[min(70vh,40rem)] overflow-auto rounded-lg border border-border/70">
                <table
                  className={cn(
                    "border-separate border-spacing-0 text-sm",
                    // Few columns: stretch to fill the panel. Many: grow and scroll horizontally.
                    columns.length <= 6 ? "w-full table-fixed" : "w-max min-w-full",
                  )}
                  style={
                    columns.length > 6
                      ? { minWidth: Math.max(960, columns.length * 148) }
                      : undefined
                  }
                >
                  <thead className="sticky top-0 z-30">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th
                        className={cn(
                          "sticky left-0 z-40 w-10 border-b border-border/60 px-4 py-3",
                          stickyHeaderBg,
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          className="h-4 w-4 rounded border-border"
                          aria-label="Select all visible records"
                        />
                      </th>
                      {columns.map((col, index) => (
                        <th
                          key={col.key}
                          className={cn(
                            "border-b border-border/60 px-4 py-3 font-medium",
                            stickyHeaderBg,
                            columns.length <= 6 ? "truncate" : "whitespace-nowrap",
                            col.key === "full_name" && columns.length <= 6 && "w-[24%]",
                            col.key === "email" && columns.length <= 6 && "w-[28%]",
                            col.key === "title" && columns.length <= 6 && "w-[22%]",
                            col.key === "company_name" && columns.length <= 6 && "w-[22%]",
                            index === 0 && "sticky left-10 z-40 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]",
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => {
                      const selected = selectedIds.includes(contact.id);
                      return (
                        <tr
                          key={contact.id}
                          className={cn(
                            "transition-colors hover:bg-muted/20",
                            selected && "bg-primary/5",
                          )}
                        >
                          <td
                            className={cn(
                              "sticky left-0 z-20 w-10 border-b border-border/40 px-4 py-3",
                              stickyCellBg(selected),
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleOne(contact.id)}
                              className="h-4 w-4 rounded border-border"
                            />
                          </td>
                          {columns.map((col, index) => {
                            const value = col.getValue(contact);
                            const isName = col.key === "full_name";
                            return (
                              <td
                                key={col.key}
                                className={cn(
                                  "truncate border-b border-border/40 px-4 py-3",
                                  isName ? "font-medium text-foreground" : "text-muted-foreground",
                                  index === 0 &&
                                    cn(
                                      "sticky left-10 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]",
                                      stickyCellBg(selected),
                                    ),
                                )}
                                title={value ?? undefined}
                              >
                                {isName ? (
                                  <Link href={contactHref(contact.id)} className="hover:underline">
                                    {value || "Unnamed contact"}
                                  </Link>
                                ) : (
                                  value ?? "—"
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
      {confirmDialog}
    </Card>
  );
}
