import type { ImportedContactRow } from "@/lib/integrations/google-contacts";

type GraphEmailAddress = {
  name?: string | null;
  address?: string | null;
};

type GraphRecipient = {
  emailAddress?: GraphEmailAddress;
};

type GraphMessage = {
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
};

function recipientPeople(recipients: GraphRecipient[] | GraphRecipient | undefined) {
  const list = Array.isArray(recipients) ? recipients : recipients ? [recipients] : [];
  const results: Array<{ name: string | null; email: string }> = [];

  for (const item of list) {
    const address = item.emailAddress?.address?.trim().toLowerCase();
    if (!address || !address.includes("@")) continue;
    const name = item.emailAddress?.name?.trim() || null;
    results.push({ name: name || null, email: address });
  }

  return results;
}

/**
 * Pull unique people from recent Outlook/Microsoft 365 From/To/Cc recipients (~180 days).
 */
export async function fetchOutlookMailContacts(
  accessToken: string,
): Promise<ImportedContactRow[]> {
  const people = new Map<string, ImportedContactRow>();
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    $top: "50",
    $select: "from,toRecipients,ccRecipients,receivedDateTime",
    $orderby: "receivedDateTime desc",
    $filter: `receivedDateTime ge ${since}`,
  });
  let url: string | null = `https://graph.microsoft.com/v1.0/me/messages?${params.toString()}`;
  let pages = 0;
  const maxPages = 5;

  while (url && pages < maxPages) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.body-content-type="text"',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Outlook mail fetch failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      value?: GraphMessage[];
      "@odata.nextLink"?: string;
    };

    for (const message of data.value ?? []) {
      const from = recipientPeople(message.from);
      const to = recipientPeople(message.toRecipients);
      const cc = recipientPeople(message.ccRecipients);

      for (const person of [...from, ...to, ...cc]) {
        if (people.has(person.email)) continue;
        people.set(person.email, {
          full_name: person.name || person.email.split("@")[0] || person.email,
          email: person.email,
          external_id: `outlook_mail:${person.email}`,
        });
      }
    }

    url = data["@odata.nextLink"] ?? null;
    pages += 1;
  }

  return [...people.values()];
}
