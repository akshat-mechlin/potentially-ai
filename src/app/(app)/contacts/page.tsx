"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { ContactCard } from "@/components/contacts/contact-card";
import { CsvImportButton } from "@/components/contacts/csv-import-button";
import { SegmentSaveBar } from "@/components/segments/segment-save-bar";
import { DesktopOnly, MobileListSection } from "@/components/mobile/primitives";
import { MobileLargeTitle, MobileSearchBar } from "@/components/mobile/native-ui";
import { useIsClient } from "@/hooks/use-is-client";
import { useMobileApp } from "@/hooks/use-mobile-app";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const mounted = useIsClient();
  const { isMobileApp } = useMobileApp();

  const { data, isLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
    enabled: mounted,
  });

  const contacts = data?.contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company_name?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q)
    );
  });

  const toggleContact = (contactId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId],
    );
  };

  return (
    <div className={isMobileApp ? "space-y-4" : "space-y-6 pb-24"}>
      {isMobileApp && (
        <MobileLargeTitle
          title="Contacts"
          subtitle={`${mounted ? (contacts?.length ?? 0) : 0} in your network`}
        />
      )}
      <DesktopOnly>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sub text-muted-foreground" suppressHydrationWarning>
            {mounted ? (contacts?.length ?? 0) : 0} contacts across your groups
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
            <CsvImportButton />
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
          <CsvImportButton />
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

      {!mounted || isLoading ? (
        <div className={isMobileApp ? "space-y-2" : "grid gap-4 sm:grid-cols-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={isMobileApp ? "h-16 rounded-xl" : "h-32"} />
          ))}
        </div>
      ) : isMobileApp ? (
        <MobileListSection>
          {contacts?.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              selectable={selectMode}
              selected={selectedIds.includes(contact.id)}
              onToggle={toggleContact}
            />
          ))}
        </MobileListSection>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts?.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              selectable={selectMode}
              selected={selectedIds.includes(contact.id)}
              onToggle={toggleContact}
            />
          ))}
        </div>
      )}

      <SegmentSaveBar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
    </div>
  );
}
