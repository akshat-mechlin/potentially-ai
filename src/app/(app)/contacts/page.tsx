"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { ContactCard } from "@/components/contacts/contact-card";
import { CsvImportButton } from "@/components/contacts/csv-import-button";
import { useIsClient } from "@/hooks/use-is-client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const mounted = useIsClient();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sub text-muted-foreground" suppressHydrationWarning>
          {mounted ? (contacts?.length ?? 0) : 0} contacts in your network
        </p>
        <CsvImportButton />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {(!mounted || isLoading) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contacts?.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
