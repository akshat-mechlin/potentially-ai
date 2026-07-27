"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { ApolloRecordCard } from "@/components/apollo/apollo-record-card";
import { ApolloEnrichDialog } from "@/components/apollo/apollo-enrich-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  flattenApolloRecordsPages,
  useApolloRecordsList,
} from "@/hooks/use-apollo-records-list";
import type { ApolloRecord } from "@/lib/data/apollo-records";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type SavedTab = "people" | "organizations";

export function ApolloSavedList() {
  const [tab, setTab] = useState<SavedTab>("people");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<"enrich" | "promote" | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setSelectedIds(new Set());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const changeTab = (value: SavedTab) => {
    setTab(value);
    setSelectedIds(new Set());
  };

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useApolloRecordsList({
    q: debouncedSearch,
    type: tab === "people" ? "person" : "organization",
  });

  const records = flattenApolloRecordsPages(data?.pages);
  const total = data?.pages[0]?.total ?? records.length;
  const selectedRecords = records.filter((record) => selectedIds.has(record.id));

  const toggleRecord = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleEnrichConfirm = async (args: { acknowledgeUnverified: boolean }) => {
    setBusy("enrich");
    try {
      const res = await fetch("/api/apollo/records/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedRecords.map((record) => record.id),
          acknowledge_unverified: args.acknowledgeUnverified,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrichment failed");

      const enriched = (data.results ?? []).filter(
        (result: { status: string }) => result.status === "enriched",
      ).length;
      const failedResults = (data.results ?? []).filter(
        (result: { status: string }) => result.status === "failed",
      ) as Array<{ reason?: string; error?: string }>;
      const skipped = (data.results ?? []).filter(
        (result: { status: string }) => result.status === "skipped",
      ).length;

      if (enriched > 0) toast.success(`Enriched ${enriched} record${enriched === 1 ? "" : "s"}`);
      if (failedResults.length > 0) {
        const firstError = failedResults.find((result) => result.error)?.error;
        if (firstError) {
          toast.error(firstError);
        } else {
          toast.error(
            `Apollo did not return a match for ${failedResults.length} record${failedResults.length === 1 ? "" : "s"}. Credits may still have been used.`,
          );
        }
      }
      if (skipped > 0) toast.message(`Skipped ${skipped} record${skipped === 1 ? "" : "s"}`);

      setEnrichOpen(false);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["apollo-records"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enrichment failed");
    } finally {
      setBusy(null);
    }
  };

  const promoteSelected = async () => {
    if (!selectedRecords.length) return;
    setBusy("promote");
    try {
      const res = await fetch("/api/apollo/records/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedRecords.map((record) => record.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add to Contacts failed");
      toast.success(`Added ${data.promoted ?? 0} record${data.promoted === 1 ? "" : "s"} to Contacts`);
      setSelectedIds(new Set());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["apollo-records"] }),
        queryClient.invalidateQueries({ queryKey: ["contacts"] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add to Contacts failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search saved records…"
          className="max-w-sm"
        />
        {selectedIds.size > 0 ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy !== null}
              onClick={() => setEnrichOpen(true)}
            >
              {busy === "enrich" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              )}
              Enrich {selectedIds.size} selected
            </Button>
            <Button size="sm" disabled={busy !== null} onClick={() => void promoteSelected()}>
              {busy === "promote" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Add to Contacts
            </Button>
          </>
        ) : null}
        <span className="text-xs text-muted-foreground">{total} saved</span>
      </div>

      <Tabs value={tab} onValueChange={(value) => changeTab(value as SavedTab)}>
        <TabsList>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading saved records…</p>
          ) : records.length ? (
            records.map((record: ApolloRecord) => (
              <ApolloRecordCard
                key={record.id}
                recordType={record.record_type}
                data={record}
                selectable
                selected={selectedIds.has(record.id)}
                onSelectChange={(selected) => toggleRecord(record.id, selected)}
                showEnrichHint
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No saved {tab} yet. Search Apollo and save records to see them here.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Load more
        </Button>
      ) : null}

      <ApolloEnrichDialog
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        records={selectedRecords}
        onConfirm={handleEnrichConfirm}
        busy={busy === "enrich"}
      />
    </div>
  );
}
