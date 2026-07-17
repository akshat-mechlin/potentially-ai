/** Shared contact AI-summary prompt, sanitizer, and deterministic fallback. */

export type ContactSummaryInput = {
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  title: string | null;
  company_name: string | null;
  location?: string | null;
  bio: string | null;
  tags: string[];
  enrichment?: Record<string, string>;
};

export const CONTACT_SUMMARY_SYSTEM = `You write a finished third-person professional summary of a person for a relationship CRM.

STRICT output rules:
- Return ONLY the final summary the user should read. Nothing else.
- Every sentence MUST be complete and end with a period, question mark, or exclamation point.
- Never stop mid-phrase (bad: "with more than" / "based in" / "known for"). Finish the thought or omit it.
- Target 2 to 4 short sentences, or one short paragraph plus up to 4 "• " bullets for extra facts.
- Never write "Draft:", "Note:", "Summary:", self-critique, or commentary about missing data.
- Do not wrap the whole summary in quotes.
- Do not invent employers, titles, industries, biography, funding, or metrics.
- Use only facts present in the JSON. Plain text only. No markdown headings.

Style when facts exist:
- Open with name + role + company when known, e.g. "Sarah Chen is the CTO of Stripe."
- Weave location and bio into complete sentences.
- Add bullets only for concrete enrichment (industry, seniority, funding, departments).
- Write like a sharp human researcher. Do not use em dashes. Avoid stacked hyphenated buzzwords.
- Never write "this briefing", "this profile", "CRM", "relationship intelligence", "was added", "tagged", or "imported".
- Do NOT mention email, phone, LinkedIn, Twitter, websites, or that contact channels "are on file".
- Do NOT mention tags, import source, or how the record was created.

When facts are limited:
- Write one short factual sentence from available fields (name, title, company, location).
- Example: "Tommy Diehl is in your network." or "Alex Morgan is a Product Manager at Acme."
- Do not apologize or comment that information is missing.`;

const META_LINE =
  /\b(draft|sparse|zero[- ]?data|not enough|too little|limited data|insufficient|self[- ]?critique|data quality|accurate to)\b/i;

/** Words that signal a cut-off trailing clause. */
const TRAILING_STUB =
  /^(a|an|the|and|or|but|with|of|to|for|from|in|on|at|by|as|than|more|less|over|under|about|into|like|such|including|plus|via|per|vs|versus|who|whose|which|that|their|his|her|its|been|being|have|has|had|will|would|could|should|may|might|also|still|very|highly|known|based)$/i;

const C_SUITE =
  /^(ceo|cto|cfo|coo|cmo|cio|cpo|chief\b.*|founder|co-founder|cofounder|president|owner)$/i;

function ensureSentence(text: string): string {
  let next = text.replace(/\s+/g, " ").trim();
  if (!next) return "";
  next = next.charAt(0).toUpperCase() + next.slice(1);
  if (!/[.!?]$/.test(next)) next += ".";
  return next;
}

function roleLead(name: string, title: string | null, company: string | null): string {
  const role = title?.trim() || null;
  const org = company?.trim() || null;

  if (role && org) {
    if (C_SUITE.test(role)) {
      return `${name} is the ${role} of ${org}.`;
    }
    if (/^(a|an|the)\s/i.test(role)) {
      return `${name} is ${role} at ${org}.`;
    }
    return `${name} is ${role} at ${org}.`;
  }
  if (role) return ensureSentence(`${name} is ${role}`);
  if (org) return `${name} works at ${org}.`;
  return `${name} is in your network.`;
}

/** True when the model cut off mid-sentence or left a stub ending. */
export function isIncompleteSummary(text: string): boolean {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return true;

  const last = lines[lines.length - 1];
  if (/^[-•*]/.test(last) && /:\s*\S+/.test(last)) return false;

  const prose = last.replace(/^[-•*]\s*/u, "").trim();
  if (!prose) return true;

  if (/[.!?]"?$/.test(prose)) return false;

  const lastWord = (prose.split(/\s+/).pop() ?? "").replace(/[^a-zA-Z-]/g, "");
  if (TRAILING_STUB.test(lastWord)) return true;

  if (prose.split(/\s+/).length >= 4) return true;
  if (/\b(with|than|and|or|of|to|for|from|in|on|at|by|as)\s+\S+$/i.test(prose)) return true;

  return false;
}

/** Keep only fully finished sentences / bullet lines. */
export function keepCompleteSentences(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const kept: string[] = [];
  for (const line of lines) {
    if (/^[-•*]/.test(line)) {
      if (/:\s*\S+/.test(line) || /[.!?]$/.test(line)) kept.push(line);
      continue;
    }

    const sentences = line.match(/[^.!?]+[.!?]+/g);
    if (sentences?.length) {
      kept.push(sentences.map((s) => s.trim()).join(" "));
    }
  }

  return kept.join("\n").trim();
}

/** Strip model leakage (draft notes, quote wrappers, quality asides). */
export function sanitizeContactSummary(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const cleanedLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutBullet = line.replace(/^[-•*]\s*/u, "");
      const wasDraft = /^Draft:/i.test(withoutBullet);
      const next = withoutBullet
        .replace(/^Draft:\s*/i, "")
        .replace(
          /\s*\((?:[^)]*(?:sparse|zero[- ]?data|too sparse|accurate to|not enough|limited data)[^)]*)\)?\s*$/i,
          "",
        )
        .replace(/\s*\([^)]*$/g, "")
        .replace(/^["'`]+|["'`]+$/g, "")
        .trim();

      if (!next || /^[."'`…]+$/.test(next)) return "";
      if (META_LINE.test(next) && next.length < 80) return "";
      if (/^[-•*]/.test(line) && !wasDraft) return `• ${next}`;
      return next;
    })
    .filter(Boolean);

  text = cleanedLines.join("\n").trim();
  if (!text || (META_LINE.test(text) && text.length < 80)) return "";
  return text;
}

const PRIORITY_ENRICHMENT = [
  "Seniority",
  "Industry",
  "Departments",
  "Sub departments",
  "# Employees",
  "Total funding",
  "Latest funding",
  "Latest funding amount",
  "Keywords",
  "Stage",
];

export function buildFallbackContactSummary(contact: ContactSummaryInput): string {
  const name = contact.full_name?.trim() || "This contact";
  const title = contact.title?.trim() || null;
  const company = contact.company_name?.trim() || null;
  const location = contact.location?.trim() || null;
  const bio = contact.bio?.trim() || null;

  const parts: string[] = [roleLead(name, title, company)];

  if (location) {
    parts.push(ensureSentence(`Based in ${location}`));
  }

  if (bio) {
    const normalized = ensureSentence(bio);
    const lower = normalized.toLowerCase();
    const restatesRole =
      Boolean(title && lower.includes(title.toLowerCase())) &&
      Boolean(company && lower.includes(company.toLowerCase())) &&
      normalized.split(/\s+/).length <= 12;
    if (!restatesRole) {
      parts.push(normalized);
    }
  }

  const enrichment = contact.enrichment ?? {};
  const bullets: string[] = [];
  const used = new Set<string>();

  for (const key of PRIORITY_ENRICHMENT) {
    const value = enrichment[key]?.trim();
    if (!value || used.has(key)) continue;
    used.add(key);
    bullets.push(`• ${key}: ${value}`);
    if (bullets.length >= 4) break;
  }

  if (bullets.length < 4) {
    for (const [key, value] of Object.entries(enrichment)) {
      if (used.has(key) || !value?.trim()) continue;
      bullets.push(`• ${key}: ${value.trim()}`);
      if (bullets.length >= 4) break;
    }
  }

  const usefulTags = (contact.tags ?? []).filter(Boolean).slice(0, 4);
  if (usefulTags.length && !bio && bullets.length < 2) {
    parts.push(ensureSentence(`Focus areas include ${usefulTags.join(", ")}`));
  }

  return [...parts, ...bullets].filter(Boolean).join("\n");
}

/** Prefer a deterministic line when the model has almost nothing to work with. */
export function shouldUseDeterministicSummary(contact: ContactSummaryInput): boolean {
  const hasRole = Boolean(contact.title?.trim() || contact.company_name?.trim());
  const hasBio = Boolean(contact.bio?.trim());
  const hasLocation = Boolean(contact.location?.trim());
  const enrichmentCount = Object.keys(contact.enrichment ?? {}).length;
  const usefulTags = (contact.tags ?? []).filter(Boolean).length;
  return !hasRole && !hasBio && !hasLocation && enrichmentCount === 0 && usefulTags === 0;
}

function isUsefulSummary(text: string, contact: ContactSummaryInput): boolean {
  if (!text || text.length < 16) return false;
  if (isIncompleteSummary(text)) return false;
  const nameToken = (contact.first_name || contact.full_name || "").trim().split(/\s+/)[0];
  if (nameToken && nameToken.length >= 2) {
    const escaped = nameToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hasName = new RegExp(`\\b${escaped}\\b`, "i").test(text);
    if (!hasName && !/\b(is|works|serves|leads|founded|based)\b/i.test(text)) return false;
  }
  return true;
}

export function finalizeContactSummary(
  raw: string | null | undefined,
  contact: ContactSummaryInput,
): string {
  const cleaned = sanitizeContactSummary(raw ?? "");
  if (cleaned && isUsefulSummary(cleaned, contact)) {
    return cleaned;
  }

  const repaired = keepCompleteSentences(cleaned);
  if (repaired && isUsefulSummary(repaired, contact) && repaired.length >= 40) {
    const fallback = buildFallbackContactSummary(contact);
    if (fallback.length > repaired.length + 20) return fallback;
    return repaired;
  }

  return buildFallbackContactSummary(contact);
}
