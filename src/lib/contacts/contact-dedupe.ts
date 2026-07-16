import type { SyncSource } from "@/types";

export type ExistingContactMatch = {
  id: string;
  full_name: string;
  email: string | null;
  external_id: string | null;
  title: string | null;
  company_name: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  location: string | null;
  first_name: string | null;
  last_name: string | null;
  strength_score: number | null;
  metadata: Record<string, unknown> | null;
};

export function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value || null;
}

export function normalizePersonName(name: string | null | undefined): string | null {
  const value = name
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return value || null;
}

function nonEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Prefer incoming when present; otherwise keep existing (avoid wiping enrichment). */
export function preferIncoming(
  existing: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  return nonEmpty(incoming) ?? nonEmpty(existing);
}

export function mergeImportMetadata(args: {
  existing: Record<string, unknown> | null | undefined;
  incoming: Record<string, unknown>;
  source: SyncSource;
  externalId?: string | null;
}): Record<string, unknown> {
  const existing = args.existing ?? {};
  const priorSources = Array.isArray(existing.sources)
    ? existing.sources.filter((item): item is string => typeof item === "string")
    : typeof existing.source === "string"
      ? [existing.source]
      : [];
  const sources = [...new Set([...priorSources, args.source])];

  const priorExternalIds =
    existing.external_ids && typeof existing.external_ids === "object"
      ? { ...(existing.external_ids as Record<string, string>) }
      : {};
  if (args.externalId) {
    priorExternalIds[args.source] = args.externalId;
  }

  return {
    ...existing,
    ...args.incoming,
    sources,
    external_ids: priorExternalIds,
    ...(existing.excluded === true
      ? { excluded: true, excluded_at: existing.excluded_at ?? null }
      : {}),
  };
}

export function buildMergedContactUpdate(args: {
  existing: ExistingContactMatch;
  incoming: {
    full_name: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    title?: string | null;
    company_name?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    twitter_url?: string | null;
    location?: string | null;
    external_id?: string | null;
    strength_score?: number | null;
  };
  source: SyncSource;
  metadataIncoming: Record<string, unknown>;
}) {
  const { existing, incoming, source, metadataIncoming } = args;
  const email = normalizeEmail(incoming.email) ?? normalizeEmail(existing.email);

  return {
    full_name: preferIncoming(existing.full_name, incoming.full_name) ?? existing.full_name,
    first_name: preferIncoming(existing.first_name, incoming.first_name),
    last_name: preferIncoming(existing.last_name, incoming.last_name),
    email,
    title: preferIncoming(existing.title, incoming.title),
    company_name: preferIncoming(existing.company_name, incoming.company_name),
    phone: preferIncoming(existing.phone, incoming.phone),
    linkedin_url: preferIncoming(existing.linkedin_url, incoming.linkedin_url),
    twitter_url: preferIncoming(existing.twitter_url, incoming.twitter_url),
    location: preferIncoming(existing.location, incoming.location),
    // Keep first provider id; new ones live under metadata.external_ids
    external_id: existing.external_id ?? incoming.external_id ?? null,
    strength_score: Math.max(existing.strength_score ?? 0, incoming.strength_score ?? 0),
    source,
    metadata: mergeImportMetadata({
      existing: existing.metadata,
      incoming: metadataIncoming,
      source,
      externalId: incoming.external_id,
    }),
  };
}

type IndexMaps = {
  byExternalId: Map<string, ExistingContactMatch>;
  byEmail: Map<string, ExistingContactMatch>;
  byName: Map<string, ExistingContactMatch>;
};

export function indexExistingContacts(rows: ExistingContactMatch[]): IndexMaps {
  const byExternalId = new Map<string, ExistingContactMatch>();
  const byEmail = new Map<string, ExistingContactMatch>();
  const byName = new Map<string, ExistingContactMatch>();

  for (const row of rows) {
    if (row.external_id) byExternalId.set(row.external_id, row);
    const email = normalizeEmail(row.email);
    if (email) byEmail.set(email, row);
    const name = normalizePersonName(row.full_name);
    if (name) byName.set(name, row);
  }

  return { byExternalId, byEmail, byName };
}

/**
 * Match order: external_id → email (case-insensitive) → full name
 * (name only used when the incoming row has no email, to avoid merging different people).
 */
export function findExistingContact(
  indexes: IndexMaps,
  row: { external_id?: string | null; email?: string | null; full_name?: string | null },
): ExistingContactMatch | null {
  if (row.external_id) {
    const byId = indexes.byExternalId.get(row.external_id);
    if (byId) return byId;
  }

  const email = normalizeEmail(row.email);
  if (email) {
    const byEmail = indexes.byEmail.get(email);
    if (byEmail) return byEmail;
  }

  const name = normalizePersonName(row.full_name);
  if (!email && name) {
    return indexes.byName.get(name) ?? null;
  }

  return null;
}
