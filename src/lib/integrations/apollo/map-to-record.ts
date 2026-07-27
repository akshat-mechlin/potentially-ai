import {
  getApolloOrganizationDisplayName,
  getApolloPersonDisplayName,
  joinLocationParts,
} from "@/lib/integrations/apollo/present-record";
import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";

export type ApolloRecordUpsert = {
  record_type: "person" | "organization";
  apollo_id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  primary_domain?: string | null;
  raw_apollo: Record<string, unknown>;
};

function personPhone(person: ApolloPerson): string | null {
  const phone =
    person.phone_numbers?.find((entry) => entry.sanitized_number || entry.raw_number)
      ?.sanitized_number ??
    person.phone_numbers?.find((entry) => entry.raw_number)?.raw_number ??
    null;
  return phone?.trim() || null;
}

export function resolveApolloPersonId(person: ApolloPerson): string | null {
  if (person.id?.trim()) return person.id.trim();
  const email = person.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const linkedin = person.linkedin_url?.trim();
  if (linkedin) return `linkedin:${linkedin}`;
  return null;
}

export function resolveApolloOrganizationId(org: ApolloOrganization): string | null {
  if (org.id?.trim()) return org.id.trim();
  const domain = org.primary_domain?.trim().toLowerCase();
  if (domain) return `domain:${domain}`;
  const name = org.name?.trim().toLowerCase();
  if (name) return `name:${name}`;
  return null;
}

export function mapApolloPersonToRecord(person: ApolloPerson): ApolloRecordUpsert | null {
  const apolloId = resolveApolloPersonId(person);
  const name = getApolloPersonDisplayName(person);
  if (!apolloId || name === "Unknown") return null;

  return {
    record_type: "person",
    apollo_id: apolloId,
    name,
    title: person.title?.trim() || null,
    email: person.email?.trim() || null,
    phone: personPhone(person),
    company_name: person.organization?.name?.trim() || null,
    location: joinLocationParts([person.city, person.state, person.country]),
    linkedin_url: person.linkedin_url?.trim() || null,
    primary_domain: person.organization?.primary_domain?.trim() || null,
    raw_apollo: person as Record<string, unknown>,
  };
}

export function mapApolloOrganizationToRecord(org: ApolloOrganization): ApolloRecordUpsert | null {
  const apolloId = resolveApolloOrganizationId(org);
  const name = getApolloOrganizationDisplayName(org);
  if (!apolloId || name === "Unknown company") return null;

  return {
    record_type: "organization",
    apollo_id: apolloId,
    name,
    company_name: name,
    location: joinLocationParts([org.city, org.state, org.country]),
    linkedin_url: org.linkedin_url?.trim() || null,
    primary_domain: org.primary_domain?.trim() || null,
    raw_apollo: org as Record<string, unknown>,
  };
}

export function mapContactToApolloRecordStub(contact: {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  title?: string | null;
  company_name?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
}): ApolloRecordUpsert {
  const apolloId = contact.email?.trim()
    ? `email:${contact.email.trim().toLowerCase()}`
    : `contact:${contact.id}`;

  return {
    record_type: "person",
    apollo_id: apolloId,
    name: contact.full_name,
    title: contact.title?.trim() || null,
    email: contact.email?.trim() || null,
    phone: contact.phone?.trim() || null,
    company_name: contact.company_name?.trim() || null,
    location: contact.location?.trim() || null,
    linkedin_url: contact.linkedin_url?.trim() || null,
    raw_apollo: {
      stub: true,
      contact_id: contact.id,
      full_name: contact.full_name,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      title: contact.title,
      company_name: contact.company_name,
    },
  };
}

export function mapApolloPeopleToRecords(people: ApolloPerson[]): ApolloRecordUpsert[] {
  return people
    .map((person) => mapApolloPersonToRecord(person))
    .filter((row): row is ApolloRecordUpsert => row != null);
}

export function mapApolloOrganizationsToRecords(
  organizations: ApolloOrganization[],
): ApolloRecordUpsert[] {
  return organizations
    .map((org) => mapApolloOrganizationToRecord(org))
    .filter((row): row is ApolloRecordUpsert => row != null);
}
