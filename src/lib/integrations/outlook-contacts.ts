import type { ImportedContactRow } from "@/lib/integrations/google-contacts";

type GraphContact = {
  id?: string;
  displayName?: string;
  emailAddresses?: Array<{ address?: string }>;
  jobTitle?: string;
  companyName?: string;
};

export async function fetchOutlookContacts(accessToken: string): Promise<ImportedContactRow[]> {
  const rows: ImportedContactRow[] = [];
  let url: string | null =
    "https://graph.microsoft.com/v1.0/me/contacts?$top=100&$select=id,displayName,emailAddresses,jobTitle,companyName";

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Outlook contacts fetch failed: ${res.status} ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      value?: GraphContact[];
      "@odata.nextLink"?: string;
    };

    for (const contact of data.value ?? []) {
      const full_name = contact.displayName?.trim();
      if (!full_name) continue;

      rows.push({
        full_name,
        email: contact.emailAddresses?.[0]?.address,
        title: contact.jobTitle ?? undefined,
        company_name: contact.companyName ?? undefined,
        external_id: contact.id,
      });
    }

    url = data["@odata.nextLink"] ?? null;
  }

  return rows;
}
