import { fetchGoogleContacts } from "@/lib/integrations/google-contacts";
import { fetchOutlookContacts } from "@/lib/integrations/outlook-contacts";
import { importContactsFromSource } from "@/lib/data/contacts";
import type { SyncSource } from "@/types";

type ConnectorAccountRow = {
  id: string;
  access_token: string | null;
  connector_key: string;
};

export async function syncConnectorAccount(
  account: ConnectorAccountRow,
  source: SyncSource,
) {
  if (!account.access_token) {
    throw new Error("This account is missing an access token. Reconnect it.");
  }

  const rows =
    source === "outlook"
      ? await fetchOutlookContacts(account.access_token)
      : await fetchGoogleContacts(account.access_token);

  const result = await importContactsFromSource(rows, source);

  return {
    imported: result.imported,
    updated: "updated" in result ? result.updated : 0,
    total_fetched: rows.length,
  };
}
