import type { ApolloPeopleSearchFilters } from "@/lib/integrations/apollo/types";
import type { IcpProfile } from "@/types/playbooks";

const SENIORITY_HINTS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\b(c[- ]?suite|c level|ceo|cto|cfo|cmo|chief)\b/i, value: "c_suite" },
  { pattern: /\b(vp|vice president)\b/i, value: "vp" },
  { pattern: /\bdirector\b/i, value: "director" },
  { pattern: /\bmanager\b/i, value: "manager" },
  { pattern: /\bfounder\b/i, value: "founder" },
  { pattern: /\bowner\b/i, value: "owner" },
];

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

function inferSeniorities(icp: IcpProfile) {
  const titles = [...(icp.title_include ?? []), ...(icp.keywords_must ?? []), ...(icp.keywords_nice ?? [])];
  return inferSenioritiesFromTerms(titles);
}

export function inferSenioritiesFromTerms(terms: string[]) {
  const blob = terms.join(" ").toLowerCase();
  const matches = SENIORITY_HINTS.filter((hint) => hint.pattern.test(blob)).map((hint) => hint.value);
  return dedupe(matches);
}

export function icpToApolloPeopleFilters(icp: IcpProfile): ApolloPeopleSearchFilters {
  const keywordTags = dedupe([
    ...(icp.keywords_must ?? []),
    ...(icp.keywords_nice ?? []),
    ...(icp.industries_include ?? []),
  ]);

  return {
    person_titles: dedupe(icp.title_include),
    person_seniorities: inferSeniorities(icp),
    person_locations: dedupe(icp.geographies),
    organization_locations: dedupe(icp.geographies),
    q_organization_keyword_tags: keywordTags,
    q_keywords: dedupe(icp.keywords_must),
    page: 1,
    per_page: 25,
  };
}

export function icpToApolloFilterSummary(icp: IcpProfile) {
  const filters = icpToApolloPeopleFilters(icp);
  const parts: string[] = [];
  if (filters.person_titles?.length) {
    parts.push(`titles: ${filters.person_titles.join(", ")}`);
  }
  if (filters.person_locations?.length) {
    parts.push(`locations: ${filters.person_locations.join(", ")}`);
  }
  if (filters.q_organization_keyword_tags?.length) {
    parts.push(`keywords: ${filters.q_organization_keyword_tags.join(", ")}`);
  }
  if (filters.person_seniorities?.length) {
    parts.push(`seniority: ${filters.person_seniorities.join(", ")}`);
  }
  return parts.join(" · ") || "Broad Apollo search from your playbook ICP";
}

export type ApolloPeopleFilterForm = {
  person_titles: string;
  person_seniorities: string;
  person_locations: string;
  organization_locations: string;
  q_organization_keyword_tags: string;
  q_keywords: string;
};

export type ApolloOrganizationFilterForm = {
  q_organization_keyword_tags: string;
  organization_locations: string;
  q_organization_domains_list: string;
  organization_num_employees_ranges: string;
};

export const APOLLO_SENIORITY_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
  { value: "intern", label: "Intern" },
] as const;

export function splitApolloFilterInput(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinApolloFilterInput(values: string[] | undefined): string {
  return (values ?? []).join(", ");
}

export function peopleFiltersToForm(filters: ApolloPeopleSearchFilters): ApolloPeopleFilterForm {
  return {
    person_titles: joinApolloFilterInput(filters.person_titles),
    person_seniorities: joinApolloFilterInput(filters.person_seniorities),
    person_locations: joinApolloFilterInput(filters.person_locations),
    organization_locations: joinApolloFilterInput(filters.organization_locations),
    q_organization_keyword_tags: joinApolloFilterInput(filters.q_organization_keyword_tags),
    q_keywords: joinApolloFilterInput(filters.q_keywords),
  };
}

export function peopleFormToFilters(
  form: ApolloPeopleFilterForm,
  page = 1,
  perPage = 25,
): ApolloPeopleSearchFilters {
  return {
    person_titles: dedupe(splitApolloFilterInput(form.person_titles)),
    person_seniorities: dedupe(splitApolloFilterInput(form.person_seniorities)),
    person_locations: dedupe(splitApolloFilterInput(form.person_locations)),
    organization_locations: dedupe(splitApolloFilterInput(form.organization_locations)),
    q_organization_keyword_tags: dedupe(splitApolloFilterInput(form.q_organization_keyword_tags)),
    q_keywords: dedupe(splitApolloFilterInput(form.q_keywords)),
    page,
    per_page: perPage,
  };
}

export function icpToApolloPeopleFilterForm(icp: IcpProfile): ApolloPeopleFilterForm {
  return peopleFiltersToForm(icpToApolloPeopleFilters(icp));
}

export function organizationFormToFilters(
  form: ApolloOrganizationFilterForm,
  page = 1,
  perPage = 25,
): import("@/lib/integrations/apollo/types").ApolloOrganizationSearchFilters {
  return {
    q_organization_keyword_tags: dedupe(splitApolloFilterInput(form.q_organization_keyword_tags)),
    organization_locations: dedupe(splitApolloFilterInput(form.organization_locations)),
    q_organization_domains_list: dedupe(splitApolloFilterInput(form.q_organization_domains_list)),
    organization_num_employees_ranges: dedupe(
      splitApolloFilterInput(form.organization_num_employees_ranges),
    ),
    page,
    per_page: perPage,
  };
}

export function icpToApolloOrganizationFilterForm(icp: IcpProfile): ApolloOrganizationFilterForm {
  return {
    q_organization_keyword_tags: joinApolloFilterInput([
      ...(icp.industries_include ?? []),
      ...(icp.keywords_must ?? []),
      ...(icp.keywords_nice ?? []),
    ]),
    organization_locations: joinApolloFilterInput(icp.geographies),
    q_organization_domains_list: "",
    organization_num_employees_ranges: "",
  };
}
