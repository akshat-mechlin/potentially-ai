import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchGoogleContacts } from "@/lib/integrations/google-contacts";
import { fetchOutlookContacts } from "@/lib/integrations/outlook-contacts";
import type { ConnectorKey } from "@/lib/connectors/types";
import { importContactsFromSource } from "@/lib/data/contacts";
import { getUserWorkspaceContext } from "@/lib/data/workspace";
import type { OAuthProvider, SyncSource } from "@/types";

type ServerSupabase = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

function toDbProvider(provider: ConnectorKey): OAuthProvider {
  if (provider === "outlook" || provider === "outlook_mail" || provider === "outlook_calendar") {
    return "outlook";
  }
  return "google";
}

function toContactSource(provider: ConnectorKey): SyncSource {
  return provider === "outlook" ? "outlook" : "google_contacts";
}

export async function saveConnectionFromSession(
  supabase: ServerSupabase,
  connectProvider: ConnectorKey,
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("No active session after OAuth");
  }

  const accessToken = session.provider_token;
  if (!accessToken) {
    throw new Error(
      "No provider access token received. Reconnect and approve contacts permissions.",
    );
  }

  const { workspaceId } = await getUserWorkspaceContext();
  if (!workspaceId) {
    throw new Error("No workspace found for your account");
  }

  const identity = session.user.identities?.find((item) =>
    connectProvider === "outlook" ||
    connectProvider === "outlook_mail" ||
    connectProvider === "outlook_calendar"
      ? item.provider === "azure"
      : item.provider === "google",
  );

  const dbProvider = toDbProvider(connectProvider);

  const { data, error } = await supabase
    .from("oauth_connections")
    .upsert(
      {
        user_id: session.user.id,
        workspace_id: workspaceId,
        provider: dbProvider,
        provider_account_id: identity?.id ?? session.user.email ?? null,
        access_token: accessToken,
        refresh_token: session.provider_refresh_token ?? null,
        status: "active",
        metadata: { connected_via: "oauth" },
      },
      { onConflict: "user_id,workspace_id,provider" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function syncProviderContacts(source: SyncSource) {
  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) throw new Error("Unauthorized");

  const provider: ConnectorKey = source === "outlook" ? "outlook" : "google_contacts";
  const dbProvider = toDbProvider(provider);

  const { data: connection, error } = await supabase
    .from("oauth_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("provider", dbProvider)
    .maybeSingle();

  if (error) throw error;
  if (!connection || connection.status !== "active" || !connection.access_token) {
    throw new Error(`Connect ${provider === "outlook" ? "Outlook" : "Google"} before syncing.`);
  }

  const rows =
    provider === "outlook"
      ? await fetchOutlookContacts(connection.access_token)
      : await fetchGoogleContacts(connection.access_token);

  const result = await importContactsFromSource(rows, toContactSource(provider));

  await supabase
    .from("oauth_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      status: "active",
    })
    .eq("id", connection.id);

  return {
    imported: result.imported,
    updated: "updated" in result ? result.updated : 0,
    total_fetched: rows.length,
    provider,
  };
}

export async function getConnectionContactCount(
  supabase: SupabaseClient,
  workspaceId: string,
  source: SyncSource,
) {
  const { count, error } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("source", source);

  if (error) throw error;
  return count ?? 0;
}

export function formatLastSync(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}
