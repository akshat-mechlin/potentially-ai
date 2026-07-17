import type { Contact } from "@/types";

export type ContactDetailPoint = {
  key: string;
  label: string;
  value: string;
  href?: string;
  kind: "email" | "phone" | "link" | "text";
  /** Plain-English explanation for complex field titles (shown via info icon). */
  hint?: string;
};

const META_LABELS: Record<string, string> = {
  company_name_for_emails: "Email company name",
  email_status: "Email status",
  primary_email_source: "Email source",
  primary_email_verification_source: "Email verified via",
  email_confidence: "Email confidence",
  primary_email_catch_all_status: "Catch-all status",
  primary_email_last_verified_at: "Email last verified",
  seniority: "Seniority",
  departments: "Departments",
  sub_departments: "Sub departments",
  contact_owner: "Contact owner",
  work_direct_phone: "Work direct phone",
  home_phone: "Home phone",
  mobile_phone: "Mobile phone",
  corporate_phone: "Corporate phone",
  other_phone: "Other phone",
  do_not_call: "Do not call",
  stage: "Stage",
  lists: "Lists",
  last_contacted: "Last contacted",
  account_owner: "Account owner",
  employees: "# Employees",
  industry: "Industry",
  keywords: "Keywords",
  website: "Website",
  company_linkedin_url: "Company LinkedIn",
  facebook_url: "Facebook",
  company_address: "Company address",
  company_city: "Company city",
  company_state: "Company state",
  company_country: "Company country",
  company_phone: "Company phone",
  technologies: "Technologies",
  annual_revenue: "Annual revenue",
  total_funding: "Total funding",
  latest_funding: "Latest funding",
  latest_funding_amount: "Latest funding $",
  last_raised_at: "Last raised at",
  subsidiary_of: "Subsidiary of",
  subsidiary_of_organization_id: "Subsidiary org ID",
  city: "City",
  state: "State",
  country: "Country",
  naics_code: "NAICS code",
  sic_code: "SIC code",
};

/** Hints for fields whose titles are jargon-heavy or easy to misread. */
const DETAIL_HINTS: Record<string, string> = {
  company_name_for_emails:
    "Company name used when guessing or formatting email addresses (e.g. first@company.com).",
  email_status:
    "Whether the email looks valid, invalid, or unverified based on enrichment checks.",
  primary_email_source:
    "Where the primary email was found, for example a data provider, CRM, or public web.",
  primary_email_verification_source:
    "The service or method used to verify that this email address works.",
  email_confidence:
    "How likely the email is correct, usually shown as a percentage or score.",
  primary_email_catch_all_status:
    "Catch-all domains accept mail to any address, so individual emails can’t be fully verified.",
  primary_email_last_verified_at: "When this email was last checked for validity.",
  seniority: "Job level, for example entry, manager, director, VP, or C-level.",
  departments: "Business function this person works in, such as Sales or Engineering.",
  sub_departments: "More specific team within the broader department.",
  contact_owner: "Teammate responsible for this contact in your CRM or source system.",
  account_owner: "Teammate responsible for the company account.",
  work_direct_phone: "This person’s direct desk line, not the main company switchboard.",
  corporate_phone: "Main company phone number (reception / switchboard).",
  company_phone: "Main phone number listed for the company.",
  do_not_call: "Flag that this person should not be called.",
  stage: "Where this contact sits in your sales or outreach pipeline.",
  lists: "Named lists or segments this contact belongs to in the source system.",
  last_contacted: "Date of the most recent outreach or conversation.",
  employees: "Approximate number of people who work at the company.",
  keywords: "Topics and themes associated with this person or their company.",
  technologies: "Software and tools the company appears to use.",
  annual_revenue: "Estimated yearly company revenue.",
  total_funding: "All venture or private funding raised to date.",
  latest_funding: "Most recent funding round type (Seed, Series A, and so on).",
  latest_funding_amount: "Dollar size of the most recent funding round.",
  last_raised_at: "Date of the most recent funding round.",
  subsidiary_of: "Parent company this organization belongs to.",
  subsidiary_of_organization_id: "Internal ID of the parent company in the data source.",
  naics_code:
    "North American Industry Classification System code. A standard code for the company’s industry.",
  sic_code:
    "Standard Industrial Classification code. An older industry code still used in some datasets.",
};

function hintForKey(key: string): string | undefined {
  const raw = key.startsWith("meta_") ? key.slice(5) : key;
  if (DETAIL_HINTS[raw]) return DETAIL_HINTS[raw];
  const snake = raw
    .replace(/[#]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return DETAIL_HINTS[snake];
}

const SKIP_META = new Set([
  "import_batch_id",
  "file_name",
  "sheet_name",
  "source",
]);

const SKIP_ENRICHMENT_FOR_SUMMARY = new Set([
  "email_status",
  "primary_email_source",
  "primary_email_verification_source",
  "email_confidence",
  "primary_email_catch_all_status",
  "primary_email_last_verified_at",
  "company_name_for_emails",
  "work_direct_phone",
  "home_phone",
  "mobile_phone",
  "corporate_phone",
  "other_phone",
  "company_phone",
  "do_not_call",
  "website",
  "company_linkedin_url",
  "facebook_url",
]);

const NOISE_TAGS = new Set(["imported", "csv", "import"]);

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function phoneHref(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

function linkHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[\w.-]+/.test(value)) return `https://${value}`;
  return undefined;
}

function pushUnique(
  points: ContactDetailPoint[],
  seen: Set<string>,
  point: ContactDetailPoint,
) {
  const fingerprint = `${point.kind}:${point.value.toLowerCase()}`;
  if (seen.has(fingerprint)) return;
  seen.add(fingerprint);
  points.push(point);
}

/** Deterministic contact channels + enrichment fields for the profile details list. */
export function buildContactDetailPoints(contact: Contact): ContactDetailPoint[] {
  const points: ContactDetailPoint[] = [];
  const seen = new Set<string>();
  const meta = (contact.metadata ?? {}) as Record<string, unknown>;

  if (contact.email) {
    pushUnique(points, seen, {
      key: "email",
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
      kind: "email",
    });
  }

  if (contact.phone) {
    pushUnique(points, seen, {
      key: "phone",
      label: "Phone",
      value: contact.phone,
      href: phoneHref(contact.phone),
      kind: "phone",
    });
  }

  const phoneMeta: Array<[string, string]> = [
    ["work_direct_phone", "Work direct phone"],
    ["mobile_phone", "Mobile phone"],
    ["corporate_phone", "Corporate phone"],
    ["home_phone", "Home phone"],
    ["other_phone", "Other phone"],
    ["company_phone", "Company phone"],
  ];
  for (const [key, label] of phoneMeta) {
    const value = asString(meta[key]);
    if (!value) continue;
    pushUnique(points, seen, {
      key,
      label,
      value,
      href: phoneHref(value),
      kind: "phone",
      hint: hintForKey(key),
    });
  }

  if (contact.linkedin_url) {
    pushUnique(points, seen, {
      key: "linkedin_url",
      label: "LinkedIn",
      value: contact.linkedin_url,
      href: linkHref(contact.linkedin_url),
      kind: "link",
    });
  }

  if (contact.twitter_url) {
    pushUnique(points, seen, {
      key: "twitter_url",
      label: "Twitter / X",
      value: contact.twitter_url,
      href: linkHref(contact.twitter_url),
      kind: "link",
    });
  }

  const linkMeta: Array<[string, string]> = [
    ["website", "Website"],
    ["company_linkedin_url", "Company LinkedIn"],
    ["facebook_url", "Facebook"],
  ];
  for (const [key, label] of linkMeta) {
    const value = asString(meta[key]);
    if (!value) continue;
    pushUnique(points, seen, {
      key,
      label,
      value,
      href: linkHref(value),
      kind: "link",
    });
  }

  if (contact.location) {
    pushUnique(points, seen, {
      key: "location",
      label: "Location",
      value: contact.location,
      kind: "text",
    });
  }

  for (const [key, raw] of Object.entries(meta)) {
    if (SKIP_META.has(key)) continue;
    if (
      key.includes("phone") ||
      key === "website" ||
      key === "company_linkedin_url" ||
      key === "facebook_url" ||
      key === "city" ||
      key === "state" ||
      key === "country"
    ) {
      // phones/links handled above; city/state/country covered by location when present
      if (contact.location && (key === "city" || key === "state" || key === "country")) {
        continue;
      }
      if (key.includes("phone") || key === "website" || key === "company_linkedin_url" || key === "facebook_url") {
        continue;
      }
    }
    const value = asString(raw);
    if (!value) continue;
    const label =
      META_LABELS[key] ??
      key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    pushUnique(points, seen, {
      key: `meta_${key}`,
      label,
      value,
      kind: "text",
      hint: hintForKey(key),
    });
  }

  return points;
}

/** Payload sent to the LLM — career/company facts only (no channels, import noise). */
export function buildContactSummaryContext(contact: Contact) {
  const meta = (contact.metadata ?? {}) as Record<string, unknown>;
  const enrichment: Record<string, string> = {};
  for (const [key, raw] of Object.entries(meta)) {
    if (SKIP_META.has(key) || SKIP_ENRICHMENT_FOR_SUMMARY.has(key)) continue;
    if (key.includes("phone") || key.includes("email") || key.includes("url")) continue;
    const value = asString(raw);
    if (value) enrichment[META_LABELS[key] ?? key] = value;
  }

  const tags = (contact.tags ?? []).filter(
    (tag) => !NOISE_TAGS.has(tag.trim().toLowerCase()),
  );

  return {
    full_name: contact.full_name,
    first_name: contact.first_name,
    last_name: contact.last_name,
    title: contact.title,
    company_name: contact.company_name,
    location: contact.location,
    bio: contact.bio,
    tags,
    enrichment,
  };
}
