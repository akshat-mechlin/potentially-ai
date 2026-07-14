import { fetchGoogleContacts } from "@/lib/integrations/google-contacts";
import { fetchGoogleCalendarContacts } from "@/lib/integrations/google-calendar";
import { fetchGmailContacts } from "@/lib/integrations/gmail";
import { fetchOutlookContacts } from "@/lib/integrations/outlook-contacts";
import {
  isUnauthorizedProviderResponse,
  refreshAzureAccessToken,
  refreshGoogleAccessToken,
} from "@/lib/integrations/oauth-refresh";
import { getConnectorDefinition } from "@/lib/connectors/registry";
import { importContactsFromSource } from "@/lib/data/contacts";
import type { SyncSource } from "@/types";
import type { ImportedContactRow } from "@/lib/integrations/google-contacts";

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

type AdminSyncContext = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  workspaceId: string;
};

function fetcherForSource(
  source: SyncSource,
): (accessToken: string) => Promise<ImportedContactRow[]> {
  switch (source) {
    case "outlook":
      return fetchOutlookContacts;
    case "google_calendar":
      return fetchGoogleCalendarContacts;
    case "gmail":
      return fetchGmailContacts;
    case "google_contacts":
    default:
      return fetchGoogleContacts;
  }
}

async function withFreshAccessToken(
  account: ConnectorAccountRow,
  fetchContacts: (accessToken: string) => Promise<ImportedContactRow[]>,
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

    const def = getConnectorDefinition(account.connector_key);
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
  asAdmin?: AdminSyncContext,
) {
  if (!account.access_token) {
    throw new Error("This account is missing an access token. Reconnect it.");
  }

  if (source === "csv") {
    throw new Error("Use the Import button for CSV files.");
  }

  const rows = await withFreshAccessToken(account, fetcherForSource(source), onTokensUpdated);
  const result = await importContactsFromSource(
    rows,
    source,
    asAdmin
      ? {
          asAdmin: {
            supabase: asAdmin.supabase,
            userId: asAdmin.userId,
            workspaceId: asAdmin.workspaceId,
          },
        }
      : undefined,
  );

  return {
    imported: result.imported,
    updated: "updated" in result ? result.updated : 0,
    total_fetched: rows.length,
  };
}
