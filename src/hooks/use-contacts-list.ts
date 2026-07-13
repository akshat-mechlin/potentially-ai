import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { Contact } from "@/types";

export const CONTACTS_PAGE_SIZE = 50;

export type ContactsListResponse = {
  contacts: Contact[];
  total: number;
};

export function buildContactsUrl(options: {
  limit?: number;
  offset?: number;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.offset != null) params.set("offset", String(options.offset));
  if (options.q?.trim()) params.set("q", options.q.trim());
  const query = params.toString();
  return query ? `/api/contacts?${query}` : "/api/contacts";
}

export function useContactsList(options?: { q?: string; enabled?: boolean }) {
  const search = options?.q?.trim() ?? "";

  return useInfiniteQuery<
    ContactsListResponse,
    Error,
    InfiniteData<ContactsListResponse>,
    string[],
    number
  >({
    queryKey: ["contacts", search],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        buildContactsUrl({
          limit: CONTACTS_PAGE_SIZE,
          offset: pageParam,
          q: search || undefined,
        }),
      );
      if (!res.ok) throw new Error("Failed to load contacts");
      return res.json() as Promise<ContactsListResponse>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.contacts.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: options?.enabled ?? true,
  });
}

export function flattenContactsPages(
  pages: ContactsListResponse[] | undefined,
): Contact[] {
  if (!pages?.length) return [];
  const seen = new Set<string>();
  const contacts: Contact[] = [];
  for (const page of pages) {
    for (const contact of page.contacts) {
      if (seen.has(contact.id)) continue;
      seen.add(contact.id);
      contacts.push(contact);
    }
  }
  return contacts;
}
