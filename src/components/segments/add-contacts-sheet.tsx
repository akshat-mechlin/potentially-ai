"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MOBILE_BOTTOM_SHEET,
  MobileEmpty,
} from "@/components/mobile/primitives";
import { MobileSearchBar } from "@/components/mobile/native-ui";
import { flattenContactsPages, useContactsList } from "@/hooks/use-contacts-list";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInitials } from "@/lib/utils";
import { toast } from "sonner";

interface AddContactsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentId: string;
  excludedIds: string[];
  onAdded: () => void;
}

export function AddContactsSheet({
  open,
  onOpenChange,
  segmentId,
  excludedIds,
  onAdded,
}: AddContactsSheetProps) {
  const { isMobile } = useMobileApp();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useContactsList({
    q: debouncedSearch,
    enabled: open,
  });

  const contacts = flattenContactsPages(data?.pages);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearch("");
      setPickIds([]);
    }
    onOpenChange(nextOpen);
  };

  const excluded = useMemo(() => new Set(excludedIds), [excludedIds]);

  const availableContacts = useMemo(() => {
    const list = contacts.filter((c) => !excluded.has(c.id));
    return list;
  }, [contacts, excluded]);

  const togglePick = (contactId: string) => {
    setPickIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  const handleAdd = async () => {
    if (!pickIds.length) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/segments/${segmentId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_ids: pickIds }),
      });
      if (!res.ok) throw new Error("Failed to add");
      toast.success(`Added ${pickIds.length} contact${pickIds.length === 1 ? "" : "s"}`);
      onOpenChange(false);
      onAdded();
    } catch {
      toast.error("Failed to add contacts");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          isMobile
            ? `${MOBILE_BOTTOM_SHEET} gap-0 p-0 shadow-2xl`
            : "flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl"
        }
      >
        {isMobile && (
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
        )}
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold">Add contacts</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-4 pt-3">
          <MobileSearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, company, or title"
            loading={isLoading}
          />
          {pickIds.length > 0 && (
            <p className="text-xs font-medium text-primary">{pickIds.length} selected</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading contacts...</p>
          ) : availableContacts.length === 0 ? (
            <MobileEmpty>
              {search.trim()
                ? "No contacts match your search"
                : "All contacts are already in this segment"}
            </MobileEmpty>
          ) : (
            <div className="mobile-grouped-list">
              {availableContacts.map((contact) => {
                const selected = pickIds.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => togglePick(contact.id)}
                    className={`mobile-list-tile text-left ${selected ? "bg-primary/5" : ""}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="mobile-avatar-tile">{getInitials(contact.full_name)}</span>
                    <span className="mobile-tile-body">
                      <span className="mobile-tile-title">{contact.full_name}</span>
                      <span className="mobile-tile-subtitle">
                        {[contact.title, contact.company_name].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {hasNextPage ? (
            <div className="py-3 text-center">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            onClick={handleAdd}
            disabled={adding || !pickIds.length}
            className="h-11 w-full rounded-xl text-sm font-semibold"
          >
            {adding
              ? "Adding..."
              : pickIds.length
                ? `Add ${pickIds.length} contact${pickIds.length === 1 ? "" : "s"}`
                : "Select contacts"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
