export interface ImportedContactRow {
  full_name: string;
  email?: string;
  title?: string;
  company_name?: string;
  external_id?: string;
}

type GooglePerson = {
  resourceName?: string;
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  organizations?: Array<{ title?: string; name?: string }>;
};

export async function fetchGoogleContacts(accessToken: string): Promise<ImportedContactRow[]> {
  const rows: ImportedContactRow[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", "names,emailAddresses,organizations");
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        body.includes("People API")
          ? "Enable Google People API in Google Cloud Console for your OAuth client."
          : `Google contacts fetch failed: ${body.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      connections?: GooglePerson[];
      nextPageToken?: string;
    };

    for (const person of data.connections ?? []) {
      const full_name = person.names?.[0]?.displayName?.trim();
      if (!full_name) continue;

      rows.push({
        full_name,
        email: person.emailAddresses?.[0]?.value,
        title: person.organizations?.[0]?.title ?? undefined,
        company_name: person.organizations?.[0]?.name ?? undefined,
        external_id: person.resourceName,
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return rows;
}
