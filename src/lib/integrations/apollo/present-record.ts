import type { ApolloOrganization, ApolloPerson } from "@/lib/integrations/apollo/types";

export type ApolloAvailabilityFlag = {
  key: string;
  label: string;
};

function truthyFlag(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "yes" || normalized === "true" || normalized === "1";
  }
  return false;
}

export function getApolloPersonDisplayName(person: ApolloPerson): string {
  const name = person.name?.trim();
  if (name) return name;

  const first = person.first_name?.trim();
  const last = person.last_name?.trim();
  if (first && last) return `${first} ${last}`;

  const obfuscated = (person as { last_name_obfuscated?: string }).last_name_obfuscated?.trim();
  if (first && obfuscated) return `${first} ${obfuscated}`;

  if (first) return first;
  if (last) return last;

  return "Unknown";
}

export function getApolloOrganizationDisplayName(org: ApolloOrganization): string {
  return org.name?.trim() || "Unknown company";
}

function personAvailabilityFlags(person: ApolloPerson): ApolloAvailabilityFlag[] {
  const flags: ApolloAvailabilityFlag[] = [];
  const add = (key: string, label: string, value: unknown) => {
    if (truthyFlag(value)) flags.push({ key, label });
  };

  add("has_email", "Email available", person.has_email);
  add("has_direct_phone", "Direct phone available", person.has_direct_phone);
  add("has_city", "City available", person.has_city);
  add("has_state", "State available", person.has_state);
  add("has_country", "Country available", person.has_country);

  const org = person.organization;
  if (org) {
    add("org_has_industry", "Industry available", org.has_industry);
    add("org_has_phone", "Company phone available", org.has_phone);
    add("org_has_employee_count", "Employee count available", org.has_employee_count);
    add("org_has_revenue", "Revenue available", org.has_revenue);
  }

  return flags;
}

function organizationAvailabilityFlags(org: ApolloOrganization): ApolloAvailabilityFlag[] {
  const flags: ApolloAvailabilityFlag[] = [];
  const add = (key: string, label: string, value: unknown) => {
    if (truthyFlag(value)) flags.push({ key, label });
  };

  add("has_industry", "Industry available", org.has_industry);
  add("has_phone", "Phone available", org.has_phone);
  add("has_city", "City available", org.has_city);
  add("has_state", "State available", org.has_state);
  add("has_country", "Country available", org.has_country);
  add("has_zip_code", "Zip available", org.has_zip_code);
  add("has_revenue", "Revenue available", org.has_revenue);
  add("has_employee_count", "Employee count available", org.has_employee_count);

  return flags;
}

export function getApolloAvailabilityFlags(
  record: ApolloPerson | ApolloOrganization,
  recordType: "person" | "organization",
): ApolloAvailabilityFlag[] {
  if (recordType === "person") {
    return personAvailabilityFlags(record as ApolloPerson);
  }
  return organizationAvailabilityFlags(record as ApolloOrganization);
}

export function formatApolloLastRefreshed(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Last refreshed ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function isApolloSearchPreview(record: ApolloPerson | ApolloOrganization): boolean {
  const person = record as ApolloPerson;
  if (person.email?.trim()) return false;
  if (person.phone_numbers?.length) return false;
  if (person.city?.trim() || person.state?.trim() || person.country?.trim()) return false;

  const hasPreviewFlags =
    person.has_email != null ||
    person.has_direct_phone != null ||
    (person as { last_name_obfuscated?: string }).last_name_obfuscated != null;

  return hasPreviewFlags;
}

export function isUnverifiedApolloStub(apolloId: string): boolean {
  return (
    apolloId.startsWith("contact:") ||
    apolloId.startsWith("stub:") ||
    apolloId.startsWith("email:") ||
    apolloId.startsWith("linkedin:") ||
    apolloId.startsWith("domain:") ||
    apolloId.startsWith("name:")
  );
}

export function isObfuscatedDisplayName(name: string | null | undefined): boolean {
  return Boolean(name?.includes("*"));
}

export function joinLocationParts(parts: Array<string | null | undefined>): string | null {
  const value = parts.map((part) => part?.trim()).filter(Boolean).join(", ");
  return value || null;
}
