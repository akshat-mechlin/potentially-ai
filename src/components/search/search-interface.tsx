"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, ArrowRight, Loader2, Users } from "lucide-react";
import { useSearchStore } from "@/stores";
import { SUGGESTED_PROMPTS } from "@/lib/demo-data";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { MobileChip, MobileChipRow, MobileLargeTitle, MobileSearchBar } from "@/components/mobile/native-ui";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SearchResultCard } from "./search-result-card";

interface SearchInterfaceProps {
  initialQuery?: string;
  initialGroupId?: string;
}

export function SearchInterface({ initialQuery = "", initialGroupId }: SearchInterfaceProps) {
  const { query, setQuery, results, isSearching, setIsSearching, setResults, addToHistory } =
    useSearchStore();
  const { workspaces } = useWorkspaces();
  const { isMobileApp } = useMobileApp();
  const [localQuery, setLocalQuery] = useState(query || initialQuery);
  const initialSearchRan = useRef(false);

  const filteredGroup = initialGroupId
    ? workspaces.find((workspace) => workspace.id === initialGroupId)
    : null;

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || localQuery;
    if (!q.trim()) return;

    setQuery(q);
    setIsSearching(true);
    addToHistory(q);

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
      setResults({
        contacts: data.contacts ?? [],
        summary: data.summary ?? "No summary available.",
        suggested_actions: data.suggested_actions ?? [],
      });
    } catch (error) {
      setResults(null);
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!initialQuery || initialSearchRan.current) return;
    initialSearchRan.current = true;
    void handleSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for URL-provided query
  }, [initialQuery]);

  const groupCount = workspaces.length;

  return (
    <div className={isMobileApp ? "space-y-4" : "mx-auto max-w-3xl space-y-8"}>
      {isMobileApp && (
        <MobileLargeTitle title="Search" subtitle="Ask anything about your network" />
      )}

      {!isMobileApp && groupCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 shrink-0" />
          <span>
            {filteredGroup ? (
              <>
                Searching in{" "}
                <strong className="font-medium text-foreground">{filteredGroup.name}</strong> only
              </>
            ) : (
              <>
                Searching across{" "}
                <strong className="font-medium text-foreground">
                  {groupCount} {groupCount === 1 ? "group" : "groups"}
                </strong>{" "}
                — your connections plus every teammate&apos;s synced contacts
              </>
            )}
          </span>
        </div>
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

          <div className="space-y-3">
            {(results.contacts ?? []).map((contact, i) => (
              <SearchResultCard key={contact.id} contact={contact} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}