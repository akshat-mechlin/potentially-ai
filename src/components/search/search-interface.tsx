"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useSearchStore } from "@/stores";
import { SUGGESTED_PROMPTS } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SearchResultCard } from "./search-result-card";

export function SearchInterface() {
  const { query, setQuery, results, isSearching, setIsSearching, setResults, addToHistory } =
    useSearchStore();
  const [localQuery, setLocalQuery] = useState(query);

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
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Ask anything about your network..."
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
          <div className="rounded-xl border border-border bg-secondary/60 p-4">
            <p className="text-sm leading-relaxed">{results.summary}</p>
            {results.suggested_actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {results.suggested_actions.map((action) => (
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
            {results.contacts.map((contact, i) => (
              <SearchResultCard key={contact.id} contact={contact} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
