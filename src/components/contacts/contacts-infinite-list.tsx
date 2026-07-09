"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ContactCard } from "@/components/contacts/contact-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact } from "@/types";

type ContactsInfiniteListProps = {
  contacts: Contact[];
  total: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  selectMode?: boolean;
  selectedIds?: string[];
  onToggle?: (contactId: string) => void;
  layout?: "grid" | "list";
};

function LoadMoreSentinel({
  hasNextPage,
  isFetchingNextPage,
  loaded,
  total,
  onLoadMore,
  onVisible,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loaded: number;
  total: number;
  onLoadMore: () => void;
  onVisible: (node: HTMLDivElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onVisible(ref.current);
    return () => onVisible(null);
  }, [onVisible]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 py-4">
      <p className="text-xs text-muted-foreground">
        Showing {loaded} of {total}
      </p>
      {hasNextPage ? (
        <Button variant="outline" size="sm" disabled={isFetchingNextPage} onClick={onLoadMore}>
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

export function ContactsInfiniteList({
  contacts,
  total,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  selectMode = false,
  selectedIds = [],
  onToggle,
  layout = "grid",
}: ContactsInfiniteListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: layout === "list" ? contacts.length : Math.ceil(contacts.length / 2),
    getScrollElement: () => parentRef.current,
    estimateSize: () => (layout === "list" ? 72 : 140),
    overscan: 8,
    enabled: layout === "list" && contacts.length > 0,
  });

  const handleSentinelVisible = (node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    observerRef.current = observer;
  };

  useEffect(() => () => observerRef.current?.disconnect(), []);

  if (isLoading) {
    return (
      <div className={layout === "list" ? "space-y-2" : "grid gap-4 sm:grid-cols-2"}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={layout === "list" ? "h-16 rounded-xl" : "h-32"} />
        ))}
      </div>
    );
  }

  if (!contacts.length) {
    return <p className="text-sm text-muted-foreground">No contacts found.</p>;
  }

  if (layout === "list") {
    return (
      <div ref={parentRef} className="max-h-[70vh] overflow-auto">
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const contact = contacts[virtualRow.index];
            if (!contact) return null;
            return (
              <div
                key={contact.id}
                className="absolute left-0 top-0 w-full pb-2"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <ContactCard
                  contact={contact}
                  selectable={selectMode}
                  selected={selectedIds.includes(contact.id)}
                  onToggle={onToggle}
                />
              </div>
            );
          })}
        </div>
        <LoadMoreSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loaded={contacts.length}
          total={total}
          onLoadMore={onLoadMore}
          onVisible={handleSentinelVisible}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            selectable={selectMode}
            selected={selectedIds.includes(contact.id)}
            onToggle={onToggle}
          />
        ))}
      </div>
      <LoadMoreSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loaded={contacts.length}
        total={total}
        onLoadMore={onLoadMore}
        onVisible={handleSentinelVisible}
      />
    </div>
  );
}
