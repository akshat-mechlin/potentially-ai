import type { SupabaseClient } from "@supabase/supabase-js";
import { isDataDemoMode } from "@/lib/app-config";
import { CONNECTOR_REGISTRY, getConnectorDefinition } from "@/lib/connectors/registry";
import {
  CONNECTOR_CATEGORY_LABELS,
  CONNECTOR_CATEGORY_ORDER,
  type ConnectorAccount,
  type ConnectorKey,
  type ConnectorState,
  type ConnectorStatus,
} from "@/lib/connectors/types";
import { formatLastSync, getConnectionContactCount } from "@/lib/data/connections";
import { syncConnectorAccount } from "@/lib/data/connector-sync";
import { getUserWorkspaceContext } from "@/lib/data/workspace";

type ServerSupabase = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

type ConnectorRow = {
  id: string;
  connector_key: string;
  status: string;
  last_synced_at: string | null;
  records_count: number | null;
  access_token: string | null;
  account_email: string | null;
  account_label: string | null;
  provider_account_id: string | null;
  metadata: Record<string, unknown> | null;
};

const DEMO_ACCOUNTS: Partial<Record<ConnectorKey, ConnectorAccount[]>> = {
  google_contacts: [
    {
      id: "demo-g1",
      email: "work@gmail.com",
      label: "work@gmail.com",
      status: "active",
      recordsCount: 214,
      lastSync: "2 hours ago",
    },
    {
      id: "demo-g2",
      email: "personal@gmail.com",
      label: "personal@gmail.com",
      status: "active",
      recordsCount: 128,
      lastSync: "1 day ago",
    },
  ],
  outlook: [
    {
      id: "demo-o1",
      email: "alex@acme.com",
      label: "alex@acme.com",
      status: "active",
      recordsCount: 156,
      lastSync: "1 day ago",
    },
  ],
  custom_data: [
    {
      id: "demo-c1",
      email: null,
      label: "founders-list.csv",
      status: "active",
      recordsCount: 89,
      lastSync: "3 days ago",
    },
  ],
};

function accountLabel(row: ConnectorRow): string {
  return (
    row.account_label ||
    row.account_email ||
    (row.metadata?.file_name as string | undefined) ||
    row.provider_account_id ||
    "Connected account"
  );
}

function rowToAccount(row: ConnectorRow): ConnectorAccount {
  return {
    id: row.id,
    email: row.account_email,
    label: accountLabel(row),
    status: (row.status as ConnectorStatus) || "active",
    recordsCount: row.records_count ?? 0,
    lastSync: row.last_synced_at ? formatLastSync(row.last_synced_at) : "Never",
  };
}

export async function listConnectorStates(): Promise<{
  connectors: ConnectorState[];
  stats: { total: number; connected: number; live: number; accounts: number };
  categories: Array<{ id: string; label: string; count: number }>;
}> {
  if (isDataDemoMode()) {
    const connectors = CONNECTOR_REGISTRY.map((def) => {
      const accounts = DEMO_ACCOUNTS[def.key] ?? [];
      return buildConnectorState(def, accounts);
    });
    return buildListResponse(connectors);
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !workspaceId || !user) {
    const connectors = CONNECTOR_REGISTRY.map((def) => buildConnectorState(def, []));
    return buildListResponse(connectors);
  }

  const [{ data: rows, error: rowsError }, googleCount, outlookCount, csvCount] = await Promise.all([
    supabase
      .from("data_connectors")
      .select(
        "id, connector_key, status, last_synced_at, records_count, access_token, account_email, account_label, provider_account_id, metadata",
      )
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    getConnectionContactCount(supabase, workspaceId, "google_contacts"),
    getConnectionContactCount(supabase, workspaceId, "outlook"),
    getConnectionContactCount(supabase, workspaceId, "csv"),
  ]);

  const accountsByKey = new Map<string, ConnectorAccount[]>();

  if (!rowsError && rows) {
    for (const row of rows as ConnectorRow[]) {
      if (row.status !== "active" && row.connector_key !== "custom_data") continue;
      const list = accountsByKey.get(row.connector_key) ?? [];
      list.push(rowToAccount(row));
      accountsByKey.set(row.connector_key, list);
    }
  }

  // Legacy single oauth_connections → synthetic account if no data_connectors rows
  const { data: legacy } = await supabase
    .from("oauth_connections")
    .select("id, provider, status, last_synced_at, provider_account_id, metadata")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id);

  for (const leg of legacy ?? []) {
    const key = leg.provider === "outlook" ? "outlook" : "google_contacts";
    if (accountsByKey.has(key)) continue;
    if (leg.status !== "active") continue;
    accountsByKey.set(key, [
      {
        id: leg.id,
        email: null,
        label: (leg.metadata as { email?: string })?.email ?? "Legacy account",
        status: "active",
        recordsCount: key === "outlook" ? outlookCount : googleCount,
        lastSync: leg.last_synced_at ? formatLastSync(leg.last_synced_at) : "Never",
      },
    ]);
  }

  if (csvCount > 0 && !accountsByKey.has("custom_data")) {
    accountsByKey.set("custom_data", [
      {
        id: "csv-aggregate",
        email: null,
        label: "Imported files",
        status: "active",
        recordsCount: csvCount,
        lastSync: "Recently",
      },
    ]);
  }

  const connectors = CONNECTOR_REGISTRY.map((def) =>
    buildConnectorState(def, accountsByKey.get(def.key) ?? []),
  );

  return buildListResponse(connectors);
}

function buildConnectorState(
  def: (typeof CONNECTOR_REGISTRY)[number],
  accounts: ConnectorAccount[],
): ConnectorState {
  const connected = accounts.length > 0;
  const recordsCount = accounts.reduce((sum, a) => sum + a.recordsCount, 0);
  const lastSync = accounts.reduce((latest, a) => {
    if (a.lastSync === "Never") return latest;
    if (latest === "Never") return a.lastSync;
    return a.lastSync;
  }, "Never" as string);

  const supportsMultipleAccounts = def.key !== "custom_data" && def.availability !== "coming_soon";
  const canConnect = def.availability !== "coming_soon" && def.key !== "custom_data";
  const canSync =
    connected &&
    def.availability !== "coming_soon" &&
    def.key !== "custom_data" &&
    def.syncSource !== undefined;

  return {
    key: def.key,
    name: def.name,
    description: def.description,
    category: def.category,
    categoryLabel: def.categoryLabel,
    brandColor: def.brandColor,
    brandInitial: def.brandInitial,
    capabilities: def.capabilities,
    availability: def.availability,
    status: connected ? "active" : "not_connected",
    connected,
    recordsCount,
    lastSync,
    accountCount: accounts.length,
    accounts,
    canConnect,
    canSync,
    supportsMultipleAccounts,
  };
}

function buildListResponse(connectors: ConnectorState[]) {
  const accountTotal = connectors.reduce((sum, c) => sum + c.accountCount, 0);
  const categories = CONNECTOR_CATEGORY_ORDER.map((id) => ({
    id,
    label: CONNECTOR_CATEGORY_LABELS[id],
    count: connectors.filter((c) => c.category === id).length,
  }));

  return {
    connectors,
    stats: {
      total: connectors.length,
      connected: connectors.filter((c) => c.connected).length,
      live: connectors.filter((c) => c.availability === "live").length,
      accounts: accountTotal,
    },
    categories,
  };
}

export async function saveConnectorFromSession(
  supabase: ServerSupabase,
  connectorKey: ConnectorKey,
) {
  const def = getConnectorDefinition(connectorKey);
  if (!def?.oauth) {
    throw new Error("This connector does not support OAuth yet.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("No active session after OAuth");
  }

  const accessToken = session.provider_token;
  if (!accessToken) {
    throw new Error("No provider access token received. Approve all requested permissions.");
  }

  const { workspaceId } = await getUserWorkspaceContext(supabase);
  if (!workspaceId) {
    throw new Error("Could not create or find a workspace for your account");
  }

  const providerIdentities =
    session.user.identities?.filter((item) => item.provider === def.oauth!.supabaseProvider) ?? [];
  const identity = providerIdentities[providerIdentities.length - 1];
  const accountEmail =
    (identity?.identity_data?.email as string | undefined) ||
    (identity?.identity_data?.preferred_username as string | undefined) ||
    session.user.email ||
    null;
  const providerAccountId = identity?.id ?? accountEmail ?? `oauth-${Date.now()}`;
  const accountLabel = accountEmail ?? providerAccountId;

  const { data, error } = await supabase
    .from("data_connectors")
    .upsert(
      {
        user_id: session.user.id,
        workspace_id: workspaceId,
        connector_key: connectorKey,
        provider_account_id: providerAccountId,
        account_email: accountEmail,
        account_label: accountLabel,
        access_token: accessToken,
        refresh_token: session.provider_refresh_token ?? null,
        status: "active",
        metadata: {
          connected_via: "oauth",
          supabase_provider: def.oauth.supabaseProvider,
          identity_id: identity?.id,
        },
      },
      { onConflict: "user_id,workspace_id,connector_key,provider_account_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function syncConnector(
  connectorKey: ConnectorKey,
  accountId?: string,
  existingSupabase?: ServerSupabase,
) {
  const def = getConnectorDefinition(connectorKey);
  if (!def) throw new Error("Unknown connector");

  if (def.availability === "coming_soon") {
    throw new Error(`${def.name} sync is coming soon.`);
  }

  if (connectorKey === "custom_data") {
    throw new Error("Use the Import button to upload custom data files.");
  }

  const { supabase, user, workspaceId } = await getUserWorkspaceContext(existingSupabase);
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  let query = supabase
    .from("data_connectors")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("connector_key", connectorKey)
    .eq("status", "active");

  if (accountId) {
    query = query.eq("id", accountId);
  }

  const { data: accounts, error } = await query;
  if (error) throw error;
  if (!accounts?.length) {
    throw new Error(`Connect ${def.name} before syncing.`);
  }

  let totalImported = 0;
  let totalUpdated = 0;
  let totalFetched = 0;

  for (const account of accounts) {
    if (def.syncSource === "google_contacts" || def.syncSource === "outlook") {
      const result = await syncConnectorAccount(account, def.syncSource);
      totalImported += result.imported;
      totalUpdated += result.updated;
      totalFetched += result.total_fetched;

      await supabase
        .from("data_connectors")
        .update({
          last_synced_at: new Date().toISOString(),
          records_count: result.imported + result.updated,
          status: "active",
        })
        .eq("id", account.id);
    } else {
      await supabase
        .from("data_connectors")
        .update({
          last_synced_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", account.id);
    }
  }

  const accountLabel = accountId
    ? accounts[0]?.account_label || accounts[0]?.account_email || "account"
    : `${accounts.length} account${accounts.length === 1 ? "" : "s"}`;

  if (def.syncSource === "google_contacts" || def.syncSource === "outlook") {
    return {
      message: `Synced ${totalImported} new and ${totalUpdated} updated records from ${accountLabel}.`,
      imported: totalImported,
      updated: totalUpdated,
      total_fetched: totalFetched,
    };
  }

  return {
    message: `${def.name} is connected for ${accountLabel}. Full data sync is rolling out soon.`,
    imported: 0,
    updated: 0,
  };
}

export async function disconnectConnectorAccount(accountId: string) {
  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const { data: row } = await supabase
    .from("data_connectors")
    .select("connector_key")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) {
    throw new Error("Account connection not found.");
  }

  if (row.connector_key === "custom_data") {
    throw new Error("Remove custom data imports from the Contacts page.");
  }

  const { error } = await supabase
    .from("data_connectors")
    .delete()
    .eq("id", accountId)
    .eq("user_id", user.id);

  if (error) throw error;
  return { success: true };
}

export async function markCustomDataImported(count: number, fileName?: string) {
  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) return;

  const label = fileName || `Import ${new Date().toLocaleDateString()}`;
  const importId = `csv-${Date.now()}`;

  await supabase.from("data_connectors").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    connector_key: "custom_data",
    provider_account_id: importId,
    account_label: label,
    status: "active",
    last_synced_at: new Date().toISOString(),
    records_count: count,
    metadata: { source: "csv_upload", file_name: fileName },
  });
}
