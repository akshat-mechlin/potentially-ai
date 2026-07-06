"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, Trash2, UserMinus } from "lucide-react";
import { MobileHeaderTitle } from "@/components/layout/mobile-header-title";
import { DesktopOnly, MobileEmpty, MobileOnly } from "@/components/mobile/primitives";
import { MobileListSection } from "@/components/mobile/native-ui";
import { AddContactsSheet } from "@/components/segments/add-contacts-sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import type { Contact } from "@/types";
import type { Segment } from "@/types/playbooks";
import { toast } from "sonner";

type SegmentDetailResponse = {
  segment: Segment;
  contacts: Contact[];
};

export function SegmentDetailView({ segmentId }: { segmentId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, error } = useQuery<SegmentDetailResponse>({
    queryKey: ["segment", segmentId],
    queryFn: async () => {
      const res = await fetch(`/api/segments/${segmentId}`);
      if (!res.ok) throw new Error("Segment not found");
      return res.json();
    },
  });

  useEffect(() => {
    if (!data?.segment) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- form draft mirrors fetched segment
    setName(data.segment.name);
    setDescription(data.segment.description ?? "");
  }, [data?.segment]);

  const segment = data?.segment;
  const contacts = data?.contacts ?? [];

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => {
      return (
        contact.full_name.toLowerCase().includes(q) ||
        contact.email?.toLowerCase().includes(q) ||
        contact.company_name?.toLowerCase().includes(q) ||
        contact.title?.toLowerCase().includes(q)
      );
    });
  }, [contactSearch, contacts]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["segment", segmentId] });
    queryClient.invalidateQueries({ queryKey: ["segments"] });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/segments/${segmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Segment updated");
      invalidate();
    } catch {
      toast.error("Failed to save segment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this segment? Contacts stay in your network.")) return;
    try {
      const res = await fetch(`/api/segments/${segmentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Segment deleted");
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      router.push("/segments");
    } catch {
      toast.error("Failed to delete segment");
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      const res = await fetch(`/api/segments/${segmentId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_ids: [contactId] }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      toast.success("Removed from segment");
      invalidate();
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  const addSheet = (
    <AddContactsSheet
      open={addOpen}
      onOpenChange={setAddOpen}
      segmentId={segmentId}
      excludedIds={contacts.map((c) => c.id)}
      onAdded={invalidate}
    />
  );

  if (isLoading) {
    return (
      <>
        <MobileOnly className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </MobileOnly>
        <DesktopOnly className="space-y-6">
          <Skeleton className="h-10 w-72" />
          <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-[32rem] rounded-xl" />
          </div>
        </DesktopOnly>
      </>
    );
  }

  if (error || !segment) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Segment not found</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/segments">Back to segments</Link>
        </Button>
      </div>
    );
  }

  const contactsTable = (rows: Contact[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Title</th>
            <th className="hidden px-4 py-3 font-medium lg:table-cell">Company</th>
            <th className="hidden px-4 py-3 font-medium xl:table-cell">Email</th>
            <th className="px-4 py-3 font-medium text-right">Strength</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((contact) => (
            <tr
              key={contact.id}
              className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{getInitials(contact.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contact.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {contact.title}
                    </p>
                  </div>
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {contact.title ?? "—"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {contact.company_name ?? "—"}
              </td>
              <td className="hidden max-w-[14rem] truncate px-4 py-3 text-muted-foreground xl:table-cell">
                {contact.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium text-primary">
                {contact.strength_score}%
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${contact.full_name}`}
                  onClick={() => handleRemoveContact(contact.id)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <MobileOnly>
        <MobileHeaderTitle title={segment.name} />
        <div className="space-y-5">
          <MobileListSection title="Details">
            <div className="space-y-3 p-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-muted/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional"
                  className="min-h-[4.5rem] resize-none rounded-xl border-0 bg-muted/60"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="h-11 w-full rounded-xl font-semibold"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </MobileListSection>

          <MobileListSection
            title={`Contacts · ${contacts.length}`}
            footer="Tap a contact to open their profile."
          >
            {contacts.length === 0 ? (
              <MobileEmpty>No contacts yet</MobileEmpty>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="mobile-list-tile">
                  <Link href={`/contacts/${contact.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="mobile-avatar-tile">{getInitials(contact.full_name)}</span>
                    <span className="mobile-tile-body">
                      <span className="mobile-tile-title">{contact.full_name}</span>
                      <span className="mobile-tile-subtitle">
                        {[contact.title, contact.company_name].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${contact.full_name}`}
                    onClick={() => handleRemoveContact(contact.id)}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <button
              type="button"
              className="mobile-list-tile w-full text-left"
              onClick={() => setAddOpen(true)}
            >
              <span className="mobile-tile-icon">
                <Plus className="h-4 w-4" />
              </span>
              <span className="mobile-tile-body">
                <span className="mobile-tile-title text-primary">Add contacts</span>
                <span className="mobile-tile-subtitle">Search and pick from your network</span>
              </span>
            </button>
          </MobileListSection>

          <MobileListSection>
            <button
              type="button"
              className="mobile-list-tile w-full text-left"
              onClick={handleDelete}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Trash2 className="h-4 w-4" />
              </span>
              <span className="mobile-tile-body">
                <span className="mobile-tile-title text-destructive">Delete segment</span>
              </span>
            </button>
          </MobileListSection>
        </div>
      </MobileOnly>

      <DesktopOnly className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
          <div className="min-w-0 space-y-3">
            <Button variant="ghost" size="sm" className="-ml-2 h-8 px-2" asChild>
              <Link href="/segments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All segments
              </Link>
            </Button>
            <div>
              <h1 className="font-display text-3xl tracking-tight">{segment.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Playbook targeting list · Updated {formatRelativeTime(segment.updated_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{contacts.length} contacts</Badge>
              <Badge variant="outline">{segment.source}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add contacts
            </Button>
            <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base">Segment details</CardTitle>
              <CardDescription>Name and notes for this targeting list</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="segment-name">Name</Label>
                <Input id="segment-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment-description">Description</Label>
                <Textarea
                  id="segment-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Who is in this segment and why?"
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex min-h-[32rem] flex-col">
            <CardHeader className="space-y-4 border-b border-border/60 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Contacts in segment</CardTitle>
                  <CardDescription className="mt-1">
                    {contacts.length === 0
                      ? "Add contacts to use this segment in Playbook runs"
                      : `${filteredContacts.length} shown · click a row to open profile`}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
              {contacts.length > 0 && (
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder="Search contacts in this segment..."
                    className="pl-9"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                  <p className="text-sm font-medium">No contacts yet</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Add contacts from your network or select them on the Contacts page and save to
                    this segment.
                  </p>
                  <Button className="mt-4" size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add contacts
                  </Button>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                  No contacts match &ldquo;{contactSearch}&rdquo;
                </div>
              ) : (
                contactsTable(filteredContacts)
              )}
            </CardContent>
          </Card>
        </div>
      </DesktopOnly>

      {addSheet}
    </>
  );
}
