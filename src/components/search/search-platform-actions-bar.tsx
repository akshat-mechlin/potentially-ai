"use client";

import { useState } from "react";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApolloEnrichDialog } from "@/components/apollo/apollo-enrich-dialog";
import type { ApolloRecord } from "@/lib/data/apollo-records";
import type { SearchResultContact } from "@/types";
import { toast } from "sonner";

type SearchPlatformActionsBarProps = {
  selectedContacts: SearchResultContact[];
  onClear: () => void;
  onRefresh: () => void;
};

function platformProspectIds(contacts: SearchResultContact[]) {
  return contacts
    .filter((contact) => contact.source === "platform" && contact.platform_prospect_id)
    .map((contact) => contact.platform_prospect_id as string);
}

function enrichableProspects(contacts: SearchResultContact[]) {
  return contacts.filter(
    (contact) =>
      contact.source === "platform" &&
      contact.platform_prospect_id &&
      contact.enrichment_status !== "enriched",
  );
}

function addableProspects(contacts: SearchResultContact[]) {
  return contacts.filter(
    (contact) => contact.source === "platform" && contact.platform_prospect_id && !contact.in_contacts,
  );
}

export function SearchPlatformActionsBar({
  selectedContacts,
  onClear,
  onRefresh,
}: SearchPlatformActionsBarProps) {
  const [adding, setAdding] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const toAdd = addableProspects(selectedContacts);
  const toEnrich = enrichableProspects(selectedContacts);

  if (!toAdd.length && !toEnrich.length) return null;

  const enrichRecords: ApolloRecord[] = toEnrich.map((contact) => ({
    id: contact.platform_prospect_id as string,
    apollo_id: contact.apollo_id ?? "",
    record_type: "person",
    name: contact.full_name,
    title: contact.title,
    email: contact.email,
    phone: null,
    company_name: contact.company_name,
    location: null,
    linkedin_url: null,
    primary_domain: null,
    enrichment_status: contact.enrichment_status ?? "none",
    enriched_at: null,
    raw_apollo: contact.raw_apollo ?? {},
    metadata: {},
    first_seen_at: "",
    last_seen_at: "",
    search_hit_count: 1,
    created_at: "",
    updated_at: "",
  }));

  const handleAddToContacts = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/search/add-to-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_prospect_ids: platformProspectIds(toAdd),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add to contacts");
      toast.success(`Added ${data.added ?? toAdd.length} to contacts`);
      onClear();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add to contacts");
    } finally {
      setAdding(false);
    }
  };

  const handleEnrich = async (args: { acknowledgeUnverified: boolean }) => {
    setEnriching(true);
    try {
      const res = await fetch("/api/search/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform_prospect_ids: platformProspectIds(toEnrich),
          acknowledge_unverified: args.acknowledgeUnverified,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrichment failed");

      const results = (data.results ?? []) as Array<{
        status: string;
        reason?: string;
        error?: string;
      }>;
      const enriched = results.filter((result) => result.status === "enriched").length;
      const failed = results.filter((result) => result.status === "failed");
      if (enriched > 0) {
        toast.success(`Enriched ${enriched} prospect${enriched === 1 ? "" : "s"}`);
      }
      if (failed.length > 0) {
        const firstError = failed.find((result) => result.error)?.error;
        toast.error(firstError ?? `${failed.length} enrichment request(s) failed`);
      }
      setEnrichOpen(false);
      onClear();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enrichment failed");
    } finally {
      setEnriching(false);
    }
  };

  return (
    <>
      <div className="sticky bottom-4 z-10 mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-lg">
        <p className="text-sm font-medium">
          {toAdd.length > 0 && toEnrich.length > 0
            ? `${toAdd.length} to add · ${toEnrich.length} to enrich`
            : toAdd.length > 0
              ? `${toAdd.length} to add`
              : `${toEnrich.length} to enrich`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
          {toAdd.length > 0 ? (
            <Button size="sm" disabled={adding} onClick={() => void handleAddToContacts()}>
              {adding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Add {toAdd.length} to contacts
            </Button>
          ) : null}
          {toEnrich.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setEnrichOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Enrich {toEnrich.length}
            </Button>
          ) : null}
        </div>
      </div>

      <ApolloEnrichDialog
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        records={enrichRecords}
        busy={enriching}
        onConfirm={handleEnrich}
      />
    </>
  );
}
