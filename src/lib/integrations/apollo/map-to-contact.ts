import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";

export type ApolloImportRow = {
  full_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  company_name?: string;
  phone?: string;
  linkedin_url?: string;
  twitter_url?: string;
  location?: string;
  external_id?: string;
  extras?: Record<string, string>;
};

function joinLocation(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function orgExtras(org: ApolloOrganization | null | undefined): Record<string, string> {
  if (!org) return {};
  const extras: Record<string, string> = {};
  const assign = (key: string, value: unknown) => {
    if (value == null) return;
    const text = Array.isArray(value) ? value.join(", ") : String(value).trim();
    if (text) extras[key] = text;
  };

  assign("industry", org.industry);
  assign("keywords", org.keywords);
  assign("employees", org.estimated_num_employees);
  assign("website", org.website_url ?? org.primary_domain);
  assign("company_linkedin_url", org.linkedin_url);
  assign("company_city", org.city);
  assign("company_state", org.state);
  assign("company_country", org.country);
  assign("company_phone", org.phone);
  assign("annual_revenue", org.annual_revenue);
  assign("total_funding", org.total_funding);
  assign("latest_funding", org.latest_funding_stage);
  assign("latest_funding_amount", org.latest_funding_round_amount);
  assign("last_raised_at", org.latest_funding_round_date);
  assign("technologies", org.technologies);
  return extras;
}

function personExtras(person: ApolloPerson): Record<string, string> {
  const extras: Record<string, string> = orgExtras(person.organization);
  const assign = (key: string, value: unknown) => {
    if (value == null) return;
    const text = Array.isArray(value) ? value.join(", ") : String(value).trim();
    if (text) extras[key] = text;
  };

  assign("seniority", person.seniority);
  assign("departments", person.departments);
  assign("city", person.city);
  assign("state", person.state);
  assign("country", person.country);
  assign("apollo_person_id", person.id);
  assign("apollo_organization_id", person.organization_id ?? person.organization?.id);
  return extras;
}

export function mapApolloPersonToImportRow(person: ApolloPerson): ApolloImportRow | null {
  const fullName =
    person.name?.trim() ||
    [person.first_name, person.last_name].filter(Boolean).join(" ").trim();
  if (!fullName) return null;

  const phone =
    person.phone_numbers?.find((entry) => entry.sanitized_number || entry.raw_number)
      ?.sanitized_number ??
    person.phone_numbers?.find((entry) => entry.raw_number)?.raw_number ??
    undefined;

  return {
    full_name: fullName,
    first_name: person.first_name?.trim() || undefined,
    last_name: person.last_name?.trim() || undefined,
    email: person.email?.trim() || undefined,
    title: person.title?.trim() || undefined,
    company_name: person.organization?.name?.trim() || undefined,
    phone: phone?.trim() || undefined,
    linkedin_url: person.linkedin_url?.trim() || undefined,
    twitter_url: person.twitter_url?.trim() || undefined,
    location: joinLocation([person.city, person.state, person.country]) || undefined,
    external_id: person.id ? `apollo:${person.id}` : undefined,
    extras: personExtras(person),
  };
}

export function mapApolloOrganizationToImportRow(org: ApolloOrganization): ApolloImportRow | null {
  const name = org.name?.trim();
  if (!name) return null;

  return {
    full_name: name,
    company_name: name,
    location: joinLocation([org.city, org.state, org.country]) || undefined,
    external_id: org.id ? `apollo:org:${org.id}` : undefined,
    extras: orgExtras(org),
  };
}

export function mapApolloPeopleToImportRows(people: ApolloPerson[]): ApolloImportRow[] {
  return people
    .map((person) => mapApolloPersonToImportRow(person))
    .filter((row): row is ApolloImportRow => row != null);
}
