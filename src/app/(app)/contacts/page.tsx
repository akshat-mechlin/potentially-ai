"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Upload } from "lucide-react";
import { ContactCard } from "@/components/contacts/contact-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact } from "@/types";
import { toast } from "sonner";

export default function ContactsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ contacts: Contact[] }>({
    queryKey: ["contacts"],
    queryFn: () => fetch("/api/contacts").then((r) => r.json()),
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

  const handleImport = () => {
    toast.success("CSV import dialog would open here");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            {contacts?.length ?? 0} contacts in your network
          </p>
        </div>
        <Button onClick={handleImport}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
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

      {isLoading ? (
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
