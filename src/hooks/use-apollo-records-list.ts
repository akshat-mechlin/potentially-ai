import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { ApolloRecord } from "@/lib/data/apollo-records";

export const APOLLO_RECORDS_PAGE_SIZE = 50;

export type ApolloRecordsListResponse = {
  records: ApolloRecord[];
  total: number;
};

export function buildApolloRecordsUrl(options: {
  limit?: number;
  offset?: number;
  q?: string;
  type?: "person" | "organization";
  inContacts?: boolean;
}) {
  const params = new URLSearchParams();
  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.offset != null) params.set("offset", String(options.offset));
  if (options.q?.trim()) params.set("q", options.q.trim());
  if (options.type) params.set("type", options.type);
  if (options.inContacts != null) params.set("in_contacts", String(options.inContacts));
  const query = params.toString();
  return query ? `/api/apollo/records?${query}` : "/api/apollo/records";
}

export function useApolloRecordsList(options?: {
  q?: string;
  type?: "person" | "organization";
  enabled?: boolean;
}) {
  const search = options?.q?.trim() ?? "";
  const type = options?.type;

  return useInfiniteQuery<
    ApolloRecordsListResponse,
    Error,
    InfiniteData<ApolloRecordsListResponse>,
    string[],
    number
  >({
    queryKey: ["apollo-records", type ?? "all", search],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        buildApolloRecordsUrl({
          limit: APOLLO_RECORDS_PAGE_SIZE,
          offset: pageParam,
          q: search || undefined,
          type,
        }),
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load Apollo records");
      }
      return res.json() as Promise<ApolloRecordsListResponse>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((count, page) => count + page.records.length, 0);
      if (loaded >= lastPage.total) return undefined;
      return loaded;
    },
    enabled: options?.enabled ?? true,
  });
}

export function flattenApolloRecordsPages(
  pages: ApolloRecordsListResponse[] | undefined,
): ApolloRecord[] {
  if (!pages?.length) return [];
  const seen = new Set<string>();
  const records: ApolloRecord[] = [];
  for (const page of pages) {
    for (const record of page.records) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      records.push(record);
    }
  }
  return records;
}
