"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, ArrowRight, Loader2, Users } from "lucide-react";
import { useSearchStore } from "@/stores";
import { SUGGESTED_PROMPTS } from "@/lib/demo-data";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { MobileChip, MobileChipRow, MobileLargeTitle, MobileSearchBar } from "@/components/mobile/native-ui";
import { SegmentSaveBar } from "@/components/segments/segment-save-bar";
import { SearchApolloStrip } from "@/components/search/search-apollo-strip";
import { SearchPlatformActionsBar } from "@/components/search/search-platform-actions-bar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SearchResultCard } from "./search-result-card";
import type { SearchResultContact, SearchSources } from "@/types";

interface SearchInterfaceProps {
  initialQuery?: string;
  initialGroupId?: string;
}

function contactSelectionKey(contact: SearchResultContact) {
  return contact.platform_prospect_id ?? contact.id;
}

function segmentEligibleContactIds(contacts: SearchResultContact[], selectedKeys: string[]) {
  const selected = new Set(selectedKeys);
  return contacts
    .filter((contact) => {
      const key = contactSelectionKey(contact);
      if (!selected.has(key)) return false;
      return contact.source !== "platform" || contact.in_contacts;
    })
    .map((contact) => (contact.in_contacts ? contact.id : contact.id));
}

export function SearchInterface({ initialQuery = "", initialGroupId }: SearchInterfaceProps) {
  const { query, setQuery, results, isSearching, setIsSearching, setResults, addToHistory } =
    useSearchStore();
  const { workspaces } = useWorkspaces();
  const { isMobileApp } = useMobileApp();
  const [localQuery, setLocalQuery] = useState(query || initialQuery);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchSources, setSearchSources] = useState<SearchSources | null>(null);
  const initialSearchRan = useRef(false);

  const filteredGroup = initialGroupId
    ? workspaces.find((workspace) => workspace.id === initialGroupId)
    : null;

  const resultContacts = results?.contacts ?? [];
  const allSelected =
    resultContacts.length > 0 &&
    resultContacts.every((contact) => selectedKeys.includes(contactSelectionKey(contact)));

  const selectedContacts = resultContacts.filter((contact) =>
    selectedKeys.includes(contactSelectionKey(contact)),
  );
  const segmentContactIds = segmentEligibleContactIds(resultContacts, selectedKeys);

  const toggleContact = (contact: SearchResultContact) => {
    const key = contactSelectionKey(contact);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys([]);
      return;
    }
    setSelectedKeys(resultContacts.map((contact) => contactSelectionKey(contact)));
  };

  const handleSearch = useCallback(
    async (searchQuery?: string) => {
      const q = searchQuery || localQuery;
      if (!q.trim()) return;

      setQuery(q);
      setIsSearching(true);
      addToHistory(q);
      setSelectMode(false);
      setSelectedKeys([]);

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            ...(initialGroupId ? { workspace_id: initialGroupId } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Search failed");
        }
        setSearchSources(data.sources ?? null);
        setResults({
          contacts: data.contacts ?? [],
          summary: data.summary ?? "No summary available.",
          suggested_actions: data.suggested_actions ?? [],
          source: data.source,
          sources: data.sources,
          apollo_query: data.apollo_query,
        });
      } catch (error) {
        setResults(null);
        setSearchSources(null);
        toast.error(error instanceof Error ? error.message : "Search failed");
      } finally {
        setIsSearching(false);
      }
    },
    [addToHistory, initialGroupId, localQuery, setIsSearching, setQuery, setResults],
  );

  useEffect(() => {
    if (!initialQuery || initialSearchRan.current) return;
    initialSearchRan.current = true;
    void handleSearch(initialQuery);
  }, [handleSearch, initialQuery]);

  const groupCount = workspaces.length;
  const apolloFailedWithError =
    searchSources?.apollo.success === false && Boolean(searchSources.apollo.error);
  const hasApolloResults = (searchSources?.apollo.count ?? 0) > 0;
  const hasWorkspaceResults = (searchSources?.workspace.count ?? 0) > 0;

  return (
    <div className={isMobileApp ? "space-y-4 pb-24" : "mx-auto max-w-3xl space-y-8 pb-24"}>
      {isMobileApp && (
        <MobileLargeTitle
          title="Search"
          subtitle={
            hasApolloResults || hasWorkspaceResults
              ? "Results from Apollo and your network"
              : "Ask anything about your network"
          }
        />
      )}

      <SearchApolloStrip />

      {!isMobileApp && groupCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            {filteredGroup ? (
              <>
                Searching Apollo and{" "}
                <strong className="font-medium text-foreground">{filteredGroup.name}</strong>
              </>
            ) : (
              <>
                Searching Apollo and your contacts across{" "}
                <strong className="font-medium text-foreground">
                  {groupCount} {groupCount === 1 ? "group" : "groups"}
                </strong>
              </>
            )}
          </span>
        </div>
      )}

      {!isMobileApp && apolloFailedWithError && (
        <p className="text-sm text-muted-foreground">
          Apollo search is unavailable right now. Showing your network results when available.
        </p>
      )}

      {!isMobileApp && results?.apollo_query && (
        <p className="text-xs text-muted-foreground">Apollo query: {results.apollo_query}</p>
      )}

      <div className="space-y-3">
        {isMobileApp ? (
          <>
            <MobileSearchBar
              value={localQuery}
              onChange={setLocalQuery}
              onSubmit={() => handleSearch()}
              placeholder="Search your network..."
              loading={isSearching}
            />
            <MobileChipRow>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <MobileChip
                  key={prompt}
                  label={prompt}
                  onClick={() => {
                    setLocalQuery(prompt);
                    handleSearch(prompt);
                  }}
                />
              ))}
            </MobileChipRow>
          </>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ask anything about your network across all groups..."
                className="h-14 pl-12 pr-24 text-base"
              />
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                size="sm"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="mr-1 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setLocalQuery(prompt);
                    handleSearch(prompt);
                  }}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-secondary hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {isSearching && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 p-6" />
            </Card>
          ))}
        </div>
      )}

      {results && !isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className={isMobileApp ? "mobile-card-flat p-3 text-sm leading-relaxed" : "rounded-xl border border-border bg-secondary/60 p-4"}>
            <p className="text-sm leading-relaxed">{results.summary}</p>
            {!isMobileApp && (results.suggested_actions ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(results.suggested_actions ?? []).map((action) => (
                  <span
                    key={action}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                  >
                    <ArrowRight className="h-3 w-3" />
                    {action}
                  </span>
                ))}
              </div>
            )}
          </div>

          {resultContacts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {resultContacts.length} result{resultContacts.length === 1 ? "" : "s"}
                {searchSources
                  ? ` · ${searchSources.workspace.count} from your network · ${searchSources.apollo.count} from Apollo`
                  : ""}
                {selectMode && selectedKeys.length > 0
                  ? ` · ${selectedKeys.length} selected`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectMode && (
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {allSelected ? "Clear all" : "Select all"}
                  </Button>
                )}
                <Button
                  variant={selectMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectMode((v) => !v);
                    setSelectedKeys([]);
                  }}
                >
                  {selectMode
                    ? isMobileApp
                      ? "Done"
                      : "Done selecting"
                    : isMobileApp
                      ? "Select"
                      : "Select results"}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {resultContacts.map((contact, i) => (
              <SearchResultCard
                key={contactSelectionKey(contact)}
                contact={contact}
                index={i}
                selectable={selectMode}
                selected={selectedKeys.includes(contactSelectionKey(contact))}
                onToggle={() => toggleContact(contact)}
              />
            ))}
          </div>
        </motion.div>
      )}

      <SearchPlatformActionsBar
        selectedContacts={selectedContacts}
        onClear={() => setSelectedKeys([])}
        onRefresh={() => void handleSearch()}
      />
      <SegmentSaveBar selectedIds={segmentContactIds} onClear={() => setSelectedKeys([])} />
    </div>
  );
}
