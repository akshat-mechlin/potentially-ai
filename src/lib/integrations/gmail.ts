import type { ImportedContactRow } from "@/lib/integrations/google-contacts";

type GmailHeader = { name?: string; value?: string };
type GmailMessageListItem = { id?: string };
type GmailMessage = {
  id?: string;
  payload?: { headers?: GmailHeader[] };
};

function parseAddressList(raw: string | undefined) {
  if (!raw?.trim()) return [] as Array<{ name: string | null; email: string }>;

  // Split on commas that separate addresses (rough but good enough for sync).
  const parts = raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const results: Array<{ name: string | null; email: string }> = [];

  for (const part of parts) {
    const match = part.trim().match(/^(?:"?([^"<]*)"?\s*)?<?([^\s<>]+@[^\s<>]+)>?$/);
    const email = (match?.[2] ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) continue;
    const name = match?.[1]?.trim() || null;
    results.push({ name: name || null, email });
  }

  return results;
}

function headerValue(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

/**
 * Pull unique people from recent Gmail From/To/Cc headers.
 */
export async function fetchGmailContacts(accessToken: string): Promise<ImportedContactRow[]> {
  const people = new Map<string, ImportedContactRow>();
  let pageToken: string | undefined;
  let pages = 0;
  const maxPages = 5;

  do {
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    listUrl.searchParams.set("maxResults", "50");
    listUrl.searchParams.set("q", "newer_than:180d");
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const listRes = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const body = await listRes.text();
      if (listRes.status === 401 || listRes.status === 403) {
        throw new Error(`Gmail fetch failed: ${listRes.status} ${body.slice(0, 200)}`);
      }
      throw new Error(
        body.includes("Gmail API") || body.toLowerCase().includes("access not configured")
          ? "Enable Gmail API in Google Cloud Console for your OAuth client."
          : `Gmail fetch failed: ${listRes.status} ${body.slice(0, 200)}`,
      );
    }

    const listData = (await listRes.json()) as {
      messages?: GmailMessageListItem[];
      nextPageToken?: string;
    };

    for (const item of listData.messages ?? []) {
      if (!item.id) continue;

      const msgUrl = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}`,
      );
      msgUrl.searchParams.set("format", "metadata");
      msgUrl.searchParams.set("metadataHeaders", "From");
      msgUrl.searchParams.append("metadataHeaders", "To");
      msgUrl.searchParams.append("metadataHeaders", "Cc");

      const msgRes = await fetch(msgUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!msgRes.ok) continue;

      const message = (await msgRes.json()) as GmailMessage;
      const headers = message.payload?.headers;
      const from = parseAddressList(headerValue(headers, "From"));
      const to = parseAddressList(headerValue(headers, "To"));
      const cc = parseAddressList(headerValue(headers, "Cc"));

      for (const person of [...from, ...to, ...cc]) {
        const existing = people.get(person.email);
        if (existing) continue;
        people.set(person.email, {
          full_name: person.name || person.email.split("@")[0] || person.email,
          email: person.email,
          external_id: `gmail:${person.email}`,
        });
      }
    }

    pageToken = listData.nextPageToken;
    pages += 1;
  } while (pageToken && pages < maxPages);

  return [...people.values()];
}
