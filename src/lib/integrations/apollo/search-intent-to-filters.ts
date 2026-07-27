import type { ApolloPeopleSearchFilters } from "@/lib/integrations/apollo/types";
import { inferSenioritiesFromTerms } from "@/lib/integrations/apollo/icp-to-filters";

export const APOLLO_SEARCH_INTENT_PROMPT = `You are parsing a people search query for Apollo.io. Extract structured filters from the query.

CRITICAL: You MUST extract job titles, company names, and locations into their respective arrays. Do NOT leave these arrays empty when the information is present in the query.

Return this exact JSON structure:
{
  "intent": "brief description",
  "filters": {
    "roles": ["array of job titles"],
    "industries": ["array of industries"],
    "companies": ["array of company names"],
    "keywords": ["array of other relevant keywords"],
    "locations": ["array of locations"]
  },
  "apollo_keywords": "optional fallback phrase"
}

EXTRACTION RULES (MUST FOLLOW):
1. Job titles → "roles" array (NOT keywords)
   - Examples: SWE, Software Engineer, VP, CEO, CTO, Engineer, Developer, Manager, Director
   - Expand abbreviations: "SWE" should produce ["SWE", "Software Engineer"]
   
2. Company names → "companies" array (NOT keywords)
   - Any company mentioned: Google, Apple, Microsoft, Stripe, etc.
   - Pattern "at [company]" or "working at [company]" → extract [company]
   
3. Locations → "locations" array (NOT keywords)
   - Cities, states, regions: NYC, San Francisco, California, USA
   - Pattern "in [location]" → extract [location]
   
4. Industries → "industries" array
   - Examples: fintech, SaaS, healthcare, technology
   
5. Other keywords → "keywords" array
   - Only non-title, non-company, non-location terms

6. "apollo_keywords" should be EMPTY if you extracted everything to structured fields

EXAMPLES (YOU MUST FOLLOW THIS PATTERN):

Input: "SWE at google"
Output: {"intent": "search", "filters": {"roles": ["SWE", "Software Engineer"], "companies": ["Google"], "industries": [], "keywords": [], "locations": []}, "apollo_keywords": ""}

Input: "Find people working as SWE at google"
Output: {"intent": "search", "filters": {"roles": ["SWE", "Software Engineer"], "companies": ["Google"], "industries": [], "keywords": [], "locations": []}, "apollo_keywords": ""}

Input: "VP Sales in NYC"
Output: {"intent": "search", "filters": {"roles": ["VP Sales", "Vice President of Sales"], "companies": [], "industries": [], "keywords": [], "locations": ["NYC", "New York City"]}, "apollo_keywords": ""}

Input: "Find VCs in fintech"
Output: {"intent": "search", "filters": {"roles": ["VC", "Venture Capitalist"], "companies": [], "industries": ["fintech"], "keywords": [], "locations": []}, "apollo_keywords": ""}

Input: "engineers at stripe working on payments"
Output: {"intent": "search", "filters": {"roles": ["Engineer", "Software Engineer"], "companies": ["Stripe"], "industries": [], "keywords": ["payments"], "locations": []}, "apollo_keywords": ""}

IMPORTANT: Remove filler words like "Find", "people", "working", "looking for" - these should NOT appear in any field.`;

export type ParsedSearchIntent = {
  intent?: string;
  apollo_keywords?: string;
  filters?: {
    roles?: string[];
    industries?: string[];
    companies?: string[];
    keywords?: string[];
    locations?: string[];
  };
};

function dedupe(values: string[] | undefined) {
  if (!values?.length) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.length ? out : undefined;
}

/**
 * Fallback parser using regex patterns when AI fails to extract structured filters
 */
function fallbackParseQuery(query: string): ParsedSearchIntent {
  const normalizedQuery = query.toLowerCase();
  const filters: ParsedSearchIntent["filters"] = {
    roles: [],
    industries: [],
    companies: [],
    keywords: [],
    locations: [],
  };

  // Extract "at [company]" or "working at [company]"
  const companyPatterns = [
    /\bat\s+([a-z][a-z0-9\s&.-]+?)(?:\s+(?:in|working|as|for|and)|$)/gi,
    /working\s+at\s+([a-z][a-z0-9\s&.-]+?)(?:\s+(?:in|as|for|and)|$)/gi,
  ];
  
  for (const pattern of companyPatterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      const company = match[1]?.trim();
      if (company && company.length > 1 && company.length < 30) {
        filters.companies!.push(
          company.charAt(0).toUpperCase() + company.slice(1)
        );
      }
    }
  }

  // Extract common job title abbreviations and terms
  const roleKeywords = [
    { pattern: /\bswe\b/i, roles: ["SWE", "Software Engineer"] },
    { pattern: /\bsoftware engineer/i, roles: ["Software Engineer"] },
    { pattern: /\bengineer/i, roles: ["Engineer", "Software Engineer"] },
    { pattern: /\bvp\s+(?:of\s+)?(\w+)/i, roles: ["VP"] },
    { pattern: /\bceo\b/i, roles: ["CEO"] },
    { pattern: /\bcto\b/i, roles: ["CTO"] },
    { pattern: /\bcfo\b/i, roles: ["CFO"] },
    { pattern: /\bvc\b/i, roles: ["VC", "Venture Capitalist"] },
    { pattern: /\bventure capitalist/i, roles: ["Venture Capitalist"] },
    { pattern: /\bfounder/i, roles: ["Founder"] },
    { pattern: /\bdeveloper/i, roles: ["Developer", "Software Developer"] },
  ];

  for (const { pattern, roles } of roleKeywords) {
    if (pattern.test(normalizedQuery)) {
      filters.roles!.push(...roles);
    }
  }

  // Extract "in [location]"
  const locationPattern = /\bin\s+([a-z][a-z\s]+?)(?:\s+(?:at|working|as|for|and)|$)/gi;
  const locationMatches = query.matchAll(locationPattern);
  for (const match of locationMatches) {
    const location = match[1]?.trim();
    if (location && location.length > 1 && location.length < 30) {
      filters.locations!.push(
        location.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      );
    }
  }

  return {
    intent: "search",
    filters: {
      roles: dedupe(filters.roles),
      industries: dedupe(filters.industries),
      companies: dedupe(filters.companies),
      keywords: dedupe(filters.keywords),
      locations: dedupe(filters.locations),
    },
  };
}

function buildApolloKeywordQuery(
  rawQuery: string | undefined,
  intent: ParsedSearchIntent,
  roles?: string[],
  industries?: string[],
  companies?: string[],
  keywords?: string[],
  locations?: string[],
): string | undefined {
  const fromModel = intent.apollo_keywords?.trim();
  
  // If we have structured filters, don't use raw query or apollo_keywords
  const hasStructuredFilters =
    Boolean(roles?.length) ||
    Boolean(industries?.length) ||
    Boolean(companies?.length) ||
    Boolean(locations?.length);
  
  if (hasStructuredFilters) {
    // Only use explicit keywords if provided
    return keywords?.length ? keywords.join(" ") : undefined;
  }
  
  // If model provided apollo_keywords and we have no structured filters, use it
  if (fromModel && fromModel.toLowerCase() !== rawQuery?.toLowerCase().trim()) {
    return fromModel;
  }

  // If we have explicit keywords, use those
  const parts = dedupe([
    ...(keywords ?? []),
    ...(industries ?? []),
    ...(companies ?? []),
    ...(locations ?? []),
  ]);
  if (parts?.length) return parts.join(" ");

  // Last resort: use raw query only if nothing else worked
  const trimmedQuery = rawQuery?.trim();
  if (trimmedQuery && !hasStructuredFilters) {
    return trimmedQuery;
  }

  return undefined;
}

/** Convert NLP-parsed search intent into Apollo people search filters. */
export function searchIntentToApolloFilters(
  intent: ParsedSearchIntent,
  rawQuery?: string,
  page = 1,
): ApolloPeopleSearchFilters {
  const filters = intent.filters ?? {};
  let roles = dedupe(filters.roles);
  let industries = dedupe(filters.industries);
  let companies = dedupe(filters.companies);
  let keywords = dedupe(filters.keywords);
  let locations = dedupe(filters.locations);

  // If AI failed to extract anything and we have a query, use fallback parser
  const hasAnyFilters = Boolean(
    roles?.length || industries?.length || companies?.length || keywords?.length || locations?.length
  );
  
  if (!hasAnyFilters && rawQuery) {
    console.log("[Apollo Search] AI extraction empty, using fallback parser");
    const fallback = fallbackParseQuery(rawQuery);
    roles = fallback.filters?.roles;
    industries = fallback.filters?.industries;
    companies = fallback.filters?.companies;
    keywords = fallback.filters?.keywords;
    locations = fallback.filters?.locations;
  }

  const orgKeywordTags = dedupe([...(industries ?? []), ...(companies ?? [])]);
  const keywordQuery = buildApolloKeywordQuery(
    rawQuery,
    intent,
    roles,
    industries,
    companies,
    keywords,
    locations,
  );

  return {
    person_titles: roles,
    person_seniorities: inferSenioritiesFromTerms([
      ...(roles ?? []),
      ...(keywords ?? []),
      ...(intent.apollo_keywords ? [intent.apollo_keywords] : []),
    ]),
    person_locations: locations,
    organization_locations: locations,
    q_organization_keyword_tags: orgKeywordTags,
    q_keywords: keywordQuery ? [keywordQuery] : undefined,
    page,
    per_page: 25,
  };
}

/** Human-readable summary of the Apollo query built from NLP intent. */
export function describeApolloSearchFilters(
  filters: ApolloPeopleSearchFilters,
): string {
  const parts: string[] = [];
  if (filters.person_titles?.length) {
    parts.push(`titles: ${filters.person_titles.join(", ")}`);
  }
  if (filters.person_locations?.length) {
    parts.push(`locations: ${filters.person_locations.join(", ")}`);
  }
  if (filters.q_organization_keyword_tags?.length) {
    parts.push(`companies/industries: ${filters.q_organization_keyword_tags.join(", ")}`);
  }
  if (filters.q_keywords?.length) {
    parts.push(`keywords: ${filters.q_keywords.join(", ")}`);
  }
  if (filters.person_seniorities?.length) {
    parts.push(`seniority: ${filters.person_seniorities.join(", ")}`);
  }
  return parts.join(" · ") || "Broad Apollo people search";
}
