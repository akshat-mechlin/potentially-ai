import { refreshApolloAccessToken, apolloTokenExpiresAt } from "@/lib/oauth/apollo-oauth";
import { getUserWorkspaceContext } from "@/lib/data/workspace";

const APOLLO_API_BASE = "https://api.apollo.io/api/v1";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type ConnectorRow = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
};

export class ApolloApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApolloApiError";
    this.status = status;
    this.code = code;
  }
}

function appendSearchParams(
  url: URL,
  params: Record<string, string | number | boolean | string[] | undefined | null>,
) {
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item.trim()) url.searchParams.append(`${key}[]`, item);
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

export async function resolveApolloConnectorAccount(accountId?: string) {
  const { supabase, user, workspaceId } = await getUserWorkspaceContext();
  if (!supabase || !user || !workspaceId) {
    throw new ApolloApiError("Unauthorized", 401);
  }

  let query = supabase
    .from("data_connectors")
    .select("id, access_token, refresh_token, metadata, status")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("connector_key", "apollo")
    .eq("status", "active");

  if (accountId) {
    query = query.eq("id", accountId);
  } else {
    query = query.order("updated_at", { ascending: false }).limit(1);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data?.access_token) {
    throw new ApolloApiError(
      "Connect your Apollo account from Connectors to use search and enrichment.",
      403,
      "NOT_CONNECTED",
    );
  }

  return {
    supabase,
    userId: user.id,
    workspaceId,
    account: data as ConnectorRow,
  };
}

async function persistRefreshedTokens(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  accountId: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; scope: string },
  metadata: Record<string, unknown> | null,
) {
  await supabase
    .from("data_connectors")
    .update({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      status: "active",
      metadata: {
        ...(metadata ?? {}),
        scopes: tokens.scope,
        token_expires_at: apolloTokenExpiresAt(tokens.expiresIn),
        last_token_refresh_at: new Date().toISOString(),
      },
    })
    .eq("id", accountId);
}

export async function getApolloAccessTokenForAccount(
  account: ConnectorRow,
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
): Promise<string> {
  if (!account.access_token) {
    throw new ApolloApiError("Apollo account is missing an access token. Reconnect it.", 403);
  }

  const expiresAtRaw = account.metadata?.token_expires_at;
  const expiresAt =
    typeof expiresAtRaw === "string" ? Date.parse(expiresAtRaw) : Number.NaN;
  const needsRefresh =
    Number.isFinite(expiresAt) && expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  if (!needsRefresh) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    await supabase.from("data_connectors").update({ status: "expired" }).eq("id", account.id);
    throw new ApolloApiError("Apollo session expired. Reconnect your account.", 401, "EXPIRED");
  }

  try {
    const refreshed = await refreshApolloAccessToken(account.refresh_token);
    await persistRefreshedTokens(supabase, account.id, refreshed, account.metadata);
    return refreshed.accessToken;
  } catch (error) {
    await supabase.from("data_connectors").update({ status: "expired" }).eq("id", account.id);
    const message = error instanceof Error ? error.message : "Apollo token refresh failed.";
    throw new ApolloApiError(message, 401, "EXPIRED");
  }
}

export async function touchApolloAccountUsage(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  accountId: string,
  metadata: Record<string, unknown> | null,
) {
  await supabase
    .from("data_connectors")
    .update({
      metadata: {
        ...(metadata ?? {}),
        last_used_at: new Date().toISOString(),
      },
    })
    .eq("id", accountId);
}

export async function apolloApiRequest<T>(
  path: string,
  options: {
    accessToken: string;
    method?: "GET" | "POST";
    params?: Record<string, string | number | boolean | string[] | undefined | null>;
    body?: Record<string, unknown>;
  },
): Promise<T> {
  const url = new URL(`${APOLLO_API_BASE}${path}`);
  if (options.params) {
    appendSearchParams(url, options.params);
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "POST",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = { error: text.slice(0, 400) };
    }
  }

  if (!res.ok) {
    const message =
      (typeof json.error === "string" && json.error) ||
      (typeof json.message === "string" && json.message) ||
      `Apollo API request failed (${res.status})`;
    const code = typeof json.error_code === "string" ? json.error_code : undefined;
    throw new ApolloApiError(message, res.status, code);
  }

  return json as T;
}

export async function withApolloAccount<T>(
  accountId: string | undefined,
  fn: (ctx: {
    accessToken: string;
    account: ConnectorRow;
    supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;
  }) => Promise<T>,
): Promise<T> {
  const ctx = await resolveApolloConnectorAccount(accountId);
  const accessToken = await getApolloAccessTokenForAccount(ctx.account, ctx.supabase);
  try {
    const result = await fn({
      accessToken,
      account: ctx.account,
      supabase: ctx.supabase,
    });
    await touchApolloAccountUsage(ctx.supabase, ctx.account.id, ctx.account.metadata);
    return result;
  } catch (error) {
    if (error instanceof ApolloApiError && (error.status === 401 || error.status === 403)) {
      await ctx.supabase
        .from("data_connectors")
        .update({ status: error.code === "EXPIRED" ? "expired" : "revoked" })
        .eq("id", ctx.account.id);
    }
    throw error;
  }
}
