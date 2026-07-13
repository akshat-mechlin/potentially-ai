import { fetchGoogleContacts } from "@/lib/integrations/google-contacts";
import { fetchOutlookContacts } from "@/lib/integrations/outlook-contacts";
import {
  isUnauthorizedProviderResponse,
  refreshAzureAccessToken,
  refreshGoogleAccessToken,
} from "@/lib/integrations/oauth-refresh";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { importContactsFromSource } from "@/lib/data/contacts";
import type { SyncSource } from "@/types";

type ConnectorAccountRow = {
  id: string;
  access_token: string | null;
  refresh_token?: string | null;
  connector_key: string;
};

type TokenUpdater = (tokens: {
  accessToken: string;
  refreshToken: string | null;
}) => Promise<void>;

async function withFreshAccessToken(
  account: ConnectorAccountRow,
  fetchContacts: (accessToken: string) => Promise<Awaited<ReturnType<typeof fetchGoogleContacts>>>,
  onTokensUpdated?: TokenUpdater,
) {
  if (!account.access_token) {
    throw new Error("This account is missing an access token. Reconnect it.");
  }

  try {
    return await fetchContacts(account.access_token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusMatch = message.match(/:\s*(\d{3})\b/) ?? message.match(/\b(401|403)\b/);
    const status = statusMatch ? Number(statusMatch[1]) : 0;
    const needsRefresh =
      isUnauthorizedProviderResponse(status || 401, message) ||
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("invalid_token") ||
      message.toLowerCase().includes("expired");

    if (!needsRefresh || !account.refresh_token) {
      throw error instanceof Error
        ? error
        : new Error("Provider request failed. Reconnect this account from Connectors.");
    }

    const def = getConnectorDefinition(account.connector_key as "google_contacts" | "outlook");
    const provider = def?.oauth?.supabaseProvider;

    const refreshed =
      provider === "azure"
        ? await refreshAzureAccessToken(
            account.refresh_token,
            def?.oauth?.scopes ?? "openid profile email offline_access Contacts.Read",
          )
        : await refreshGoogleAccessToken(account.refresh_token);

    if (onTokensUpdated) {
      await onTokensUpdated(refreshed);
    }

    return fetchContacts(refreshed.accessToken);
  }
}

export async function syncConnectorAccount(
  account: ConnectorAccountRow,
  source: SyncSource,
  onTokensUpdated?: TokenUpdater,
) {
  if (!account.access_token) {
    throw new Error("This account is missing an access token. Reconnect it.");
  }

  const rows = await withFreshAccessToken(
    account,
    source === "outlook" ? fetchOutlookContacts : fetchGoogleContacts,
    onTokensUpdated,
  );

  const result = await importContactsFromSource(rows, source);

  return {
    imported: result.imported,
    updated: "updated" in result ? result.updated : 0,
    total_fetched: rows.length,
  };
}
