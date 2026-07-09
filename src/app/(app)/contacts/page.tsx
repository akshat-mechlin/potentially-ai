"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ContactsInfiniteList } from "@/components/contacts/contacts-infinite-list";
import { CsvImportButton } from "@/components/contacts/csv-import-button";
import { SegmentSaveBar } from "@/components/segments/segment-save-bar";
import { DesktopOnly, MobileListSection } from "@/components/mobile/primitives";
import { MobileLargeTitle, MobileSearchBar } from "@/components/mobile/native-ui";
import { flattenContactsPages, useContactsList } from "@/hooks/use-contacts-list";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useContactsList({
    q: debouncedSearch,
    enabled: mounted,
  });

  const contacts = flattenContactsPages(data?.pages);
  const total = data?.pages[0]?.total ?? contacts.length;

  const toggleContact = (contactId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <div className={isMobileApp ? "space-y-4" : "space-y-6 pb-24"}>
      {isMobileApp && (
        <MobileLargeTitle
          title="Contacts"
          subtitle={`${mounted ? total : 0} in your network`}
        />
      )}
      <DesktopOnly>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sub text-muted-foreground" suppressHydrationWarning>
            {mounted ? total : 0} contacts across your groups
          </p>
          <div className="flex gap-2">
            <Button
              variant={selectMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedIds([]);
              }}
            >
              {selectMode ? "Done selecting" : "Select for segment"}
            </Button>
            <CsvImportButton onImported={handleImportComplete} />
          </div>
        </div>
      </DesktopOnly>

      {isMobileApp && (
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            className="h-9 rounded-full px-3 text-xs"
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds([]);
            }}
          >
            {selectMode ? "Done" : "Select"}
          </Button>
          <CsvImportButton onImported={handleImportComplete} />
        </div>
      )}

      {isMobileApp ? (
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search contacts..."
        />
      ) : (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {isMobileApp ? (
        <MobileListSection>
          <ContactsInfiniteList
            contacts={contacts}
            total={total}
            isLoading={!mounted || isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={!!hasNextPage}
            onLoadMore={() => void fetchNextPage()}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggle={toggleContact}
            layout="list"
          />
        </MobileListSection>
      ) : (
        <ContactsInfiniteList
          contacts={contacts}
          total={total}
          isLoading={!mounted || isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={!!hasNextPage}
          onLoadMore={() => void fetchNextPage()}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggle={toggleContact}
          layout="grid"
        />
      )}

      <SegmentSaveBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
    </div>
  );
}
