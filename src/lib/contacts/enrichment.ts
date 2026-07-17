import type { Contact } from "@/types";

type EnrichmentSource = {
  title?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  location?: string | null;
  bio?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  extras?: Record<string, string> | null;
};

/** Metadata keys that help search, scoring, and ICP matching. */
export const ENRICHMENT_SEARCH_KEYS = [
  "seniority",
  "departments",
  "sub_departments",
  "industry",
  "keywords",
  "employees",
  "technologies",
  "annual_revenue",
  "total_funding",
  "latest_funding",
  "latest_funding_amount",
  "stage",
  "lists",
  "city",
  "state",
  "country",
  "company_city",
  "company_state",
  "company_country",
] as const;

function metaRecord(source: EnrichmentSource): Record<string, unknown> {
  return {
    ...(source.metadata ?? {}),
    ...(source.extras ?? {}),
  };
}

export function metaValue(
  source: EnrichmentSource,
  key: string,
): string | null {
  const raw = metaRecord(source)[key];
  if (raw == null) return null;
  const value = String(raw).trim();
  return value || null;
}

/** Flat text blob used for embeddings, keyword matching, and rank context. */
export function contactEnrichmentBlob(source: EnrichmentSource): string {
  const meta = metaRecord(source);
  const parts: string[] = [];

  for (const key of ENRICHMENT_SEARCH_KEYS) {
    const value = meta[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) parts.push(`${key.replace(/_/g, " ")}: ${text}`);
  }

  return parts.join(" · ");
}

/** Short snippet passed into search ranking LLM. */
export function contactSearchSnippet(source: EnrichmentSource): string | null {
  const bits = [
    metaValue(source, "seniority"),
    metaValue(source, "departments"),
    metaValue(source, "industry"),
    metaValue(source, "keywords"),
    source.location?.trim() ||
      [metaValue(source, "city"), metaValue(source, "state"), metaValue(source, "country")]
        .filter(Boolean)
        .join(", ") ||
      null,
    metaValue(source, "employees")
      ? `${metaValue(source, "employees")} employees`
      : null,
    metaValue(source, "total_funding")
      ? `funding ${metaValue(source, "total_funding")}`
      : metaValue(source, "latest_funding_amount")
        ? `raised ${metaValue(source, "latest_funding_amount")}`
        : null,
  ].filter(Boolean);

  if (!bits.length) return null;
  return bits.join(" · ");
}

const SENIORITY_HIGH =
  /\b(c[- ]?level|founder|co[- ]?founder|owner|partner|vp|vice president|director|head|chief|ceo|cto|cfo|coo|president)\b/i;
const SENIORITY_MID = /\b(manager|lead|senior|principal)\b/i;

/**
 * Lead / profile-completeness score (0–100) from CSV enrichment + core fields.
 * Used as contacts.strength_score for CSV/custom-data imports so ranking & playbooks
 * can prefer richer, more senior leads.
 */
export const STRENGTH_SCORE_HINT =
  "Score from 0 to 100 based on profile completeness and seniority, not how often you’ve interacted. Points for email, title, company, LinkedIn, phone, and location, plus enrichment like seniority, industry, funding, and verified email. Senior roles (VP, director, founder, C-level) score higher.";

export function computeLeadScore(source: EnrichmentSource): number {
  let score = 8;
  const title = source.title?.trim() ?? "";
  const seniority = metaValue(source, "seniority") ?? "";
  const seniorityBlob = `${seniority} ${title}`;

  if (source.email?.trim()) score += 12;
  if (title) score += 10;
  if (source.company_name?.trim()) score += 8;
  if (source.linkedin_url?.trim()) score += 10;
  if (source.phone?.trim()) score += 6;
  if (source.location?.trim() || metaValue(source, "city")) score += 5;
  if (source.bio?.trim()) score += 4;

  if (SENIORITY_HIGH.test(seniorityBlob)) score += 16;
  else if (SENIORITY_MID.test(seniorityBlob)) score += 8;

  if (metaValue(source, "industry")) score += 6;
  if (metaValue(source, "departments") || metaValue(source, "sub_departments")) score += 4;
  if (metaValue(source, "keywords")) score += 4;
  if (metaValue(source, "employees")) score += 3;
  if (metaValue(source, "technologies")) score += 3;
  if (
    metaValue(source, "total_funding") ||
    metaValue(source, "latest_funding") ||
    metaValue(source, "latest_funding_amount")
  ) {
    score += 5;
  }
  if (metaValue(source, "annual_revenue")) score += 3;
  if (metaValue(source, "stage")) score += 2;

  const emailStatus = metaValue(source, "email_status") ?? "";
  if (/verified|valid|ok/i.test(emailStatus)) score += 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function contactCardHighlights(contact: Contact): string[] {
  const chips: string[] = [];
  const seniority = metaValue(contact, "seniority");
  const industry = metaValue(contact, "industry");
  const department = metaValue(contact, "departments");
  if (seniority) chips.push(seniority);
  if (industry) chips.push(industry);
  if (department && chips.length < 3) chips.push(department);
  if (contact.location && chips.length < 3) chips.push(contact.location);
  return chips.slice(0, 3);
}
