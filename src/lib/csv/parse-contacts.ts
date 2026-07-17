export type ContactImportRow = {
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
  /** Extra CSV fields stored on contacts.metadata */
  extras?: Record<string, string>;
};

/** Canonical template headers (order matches downloadable dummy CSV). */
export const CONTACT_CSV_TEMPLATE_HEADERS = [
  "First Name",
  "Last Name",
  "Title",
  "Company Name",
  "Company Name for Emails",
  "Email",
  "Email Status",
  "Primary Email Source",
  "Primary Email Verification Source",
  "Email Confidence",
  "Primary Email Catch-all Status",
  "Primary Email Last Verified At",
  "Seniority",
  "Departments",
  "Sub Departments",
  "Contact Owner",
  "Work Direct Phone",
  "Home Phone",
  "Mobile Phone",
  "Corporate Phone",
  "Other Phone",
  "Do Not Call",
  "Stage",
  "Lists",
  "Last Contacted",
  "Account Owner",
  "# Employees",
  "Industry",
  "Keywords",
  "Person Linkedin Url",
  "Website",
  "Company Linkedin Url",
  "Facebook Url",
  "Twitter Url",
  "City",
  "State",
  "Country",
  "Company Address",
  "Company City",
  "Company State",
  "Company Country",
  "Company Phone",
  "Technologies",
  "Annual Revenue",
  "Total Funding",
  "Latest Funding",
  "Latest Funding Amount",
  "Last Raised At",
  "Subsidiary of",
  "Subsidiary of (Organization ID)",
] as const;

/** Short chips shown in the import dialog (all others are optional in the template). */
export const CONTACT_CSV_COLUMNS = [
  "First Name",
  "Last Name",
  "Email",
  "Title",
  "Company Name",
] as const;

type FieldKind =
  | "first_name"
  | "last_name"
  | "full_name"
  | "email"
  | "title"
  | "company_name"
  | "phone"
  | "linkedin_url"
  | "twitter_url"
  | "city"
  | "state"
  | "country"
  | "extra";

type FieldDef = {
  kind: FieldKind;
  /** metadata key when kind === "extra" */
  metaKey?: string;
  aliases: string[];
};

function alias(...values: string[]) {
  return values.map((v) => normalizeHeader(v));
}

const FIELD_DEFS: FieldDef[] = [
  { kind: "first_name", aliases: alias("First Name", "first_name", "firstname", "given name") },
  { kind: "last_name", aliases: alias("Last Name", "last_name", "lastname", "surname", "family name") },
  { kind: "full_name", aliases: alias("name", "full_name", "full name", "fullname") },
  { kind: "email", aliases: alias("Email", "e-mail", "email address", "primary email") },
  { kind: "title", aliases: alias("Title", "job_title", "job title", "role", "position") },
  {
    kind: "company_name",
    aliases: alias("Company Name", "company", "company_name", "organization", "org"),
  },
  {
    kind: "phone",
    aliases: alias(
      "Work Direct Phone",
      "Mobile Phone",
      "Corporate Phone",
      "phone",
      "work phone",
      "direct phone",
    ),
  },
  {
    kind: "linkedin_url",
    aliases: alias("Person Linkedin Url", "linkedin", "linkedin url", "linkedin_url"),
  },
  {
    kind: "twitter_url",
    aliases: alias("Twitter Url", "twitter", "twitter url", "x url", "twitter_url"),
  },
  { kind: "city", aliases: alias("City") },
  { kind: "state", aliases: alias("State") },
  { kind: "country", aliases: alias("Country") },
  {
    kind: "extra",
    metaKey: "company_name_for_emails",
    aliases: alias("Company Name for Emails"),
  },
  { kind: "extra", metaKey: "email_status", aliases: alias("Email Status") },
  {
    kind: "extra",
    metaKey: "primary_email_source",
    aliases: alias("Primary Email Source"),
  },
  {
    kind: "extra",
    metaKey: "primary_email_verification_source",
    aliases: alias("Primary Email Verification Source"),
  },
  { kind: "extra", metaKey: "email_confidence", aliases: alias("Email Confidence") },
  {
    kind: "extra",
    metaKey: "primary_email_catch_all_status",
    aliases: alias("Primary Email Catch-all Status"),
  },
  {
    kind: "extra",
    metaKey: "primary_email_last_verified_at",
    aliases: alias("Primary Email Last Verified At"),
  },
  { kind: "extra", metaKey: "seniority", aliases: alias("Seniority") },
  { kind: "extra", metaKey: "departments", aliases: alias("Departments") },
  { kind: "extra", metaKey: "sub_departments", aliases: alias("Sub Departments") },
  { kind: "extra", metaKey: "contact_owner", aliases: alias("Contact Owner") },
  { kind: "extra", metaKey: "work_direct_phone", aliases: alias("Work Direct Phone") },
  { kind: "extra", metaKey: "home_phone", aliases: alias("Home Phone") },
  { kind: "extra", metaKey: "mobile_phone", aliases: alias("Mobile Phone") },
  { kind: "extra", metaKey: "corporate_phone", aliases: alias("Corporate Phone") },
  { kind: "extra", metaKey: "other_phone", aliases: alias("Other Phone") },
  { kind: "extra", metaKey: "do_not_call", aliases: alias("Do Not Call") },
  { kind: "extra", metaKey: "stage", aliases: alias("Stage") },
  { kind: "extra", metaKey: "lists", aliases: alias("Lists") },
  { kind: "extra", metaKey: "last_contacted", aliases: alias("Last Contacted") },
  { kind: "extra", metaKey: "account_owner", aliases: alias("Account Owner") },
  { kind: "extra", metaKey: "employees", aliases: alias("# Employees", "Employees", "Employee Count") },
  { kind: "extra", metaKey: "industry", aliases: alias("Industry") },
  { kind: "extra", metaKey: "keywords", aliases: alias("Keywords") },
  { kind: "extra", metaKey: "website", aliases: alias("Website", "Company Website") },
  {
    kind: "extra",
    metaKey: "company_linkedin_url",
    aliases: alias("Company Linkedin Url"),
  },
  { kind: "extra", metaKey: "facebook_url", aliases: alias("Facebook Url") },
  { kind: "extra", metaKey: "company_address", aliases: alias("Company Address") },
  { kind: "extra", metaKey: "company_city", aliases: alias("Company City") },
  { kind: "extra", metaKey: "company_state", aliases: alias("Company State") },
  { kind: "extra", metaKey: "company_country", aliases: alias("Company Country") },
  { kind: "extra", metaKey: "company_phone", aliases: alias("Company Phone") },
  { kind: "extra", metaKey: "technologies", aliases: alias("Technologies") },
  { kind: "extra", metaKey: "annual_revenue", aliases: alias("Annual Revenue") },
  { kind: "extra", metaKey: "total_funding", aliases: alias("Total Funding") },
  { kind: "extra", metaKey: "latest_funding", aliases: alias("Latest Funding") },
  {
    kind: "extra",
    metaKey: "latest_funding_amount",
    aliases: alias("Latest Funding Amount"),
  },
  { kind: "extra", metaKey: "last_raised_at", aliases: alias("Last Raised At") },
  { kind: "extra", metaKey: "subsidiary_of", aliases: alias("Subsidiary of") },
  {
    kind: "extra",
    metaKey: "subsidiary_of_organization_id",
    aliases: alias("Subsidiary of (Organization ID)"),
  },
];

/** Split a CSV line respecting double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cols.push(current.trim());
  return cols.map((c) => c.replace(/^"|"$/g, "").trim());
}

export function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function findColumnIndex(headers: string[], aliases: string[]) {
  const aliasSet = new Set(aliases);
  return headers.findIndex((h) => aliasSet.has(h));
}

function pickPhone(
  get: (kind: FieldKind, metaKey?: string) => string | undefined,
): string | undefined {
  return (
    get("phone") ||
    get("extra", "work_direct_phone") ||
    get("extra", "mobile_phone") ||
    get("extra", "corporate_phone") ||
    get("extra", "other_phone") ||
    get("extra", "home_phone") ||
    get("extra", "company_phone")
  );
}

function buildLocation(city?: string, state?: string, country?: string) {
  const parts = [city, state, country].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

function mapRowsFromMatrix(matrix: string[][]): ContactImportRow[] {
  if (matrix.length === 0) return [];

  const headers = matrix[0].map(normalizeHeader);
  const columnMap = new Map<string, number>();

  for (const def of FIELD_DEFS) {
    const idx = findColumnIndex(headers, def.aliases);
    if (idx < 0) continue;
    const key = def.kind === "extra" ? `extra:${def.metaKey}` : def.kind;
    // Prefer first match for core fields; for phone aliases allow later extras still via extra map
    if (!columnMap.has(key)) columnMap.set(key, idx);
  }

  const hasIdentity =
    columnMap.has("full_name") ||
    columnMap.has("first_name") ||
    columnMap.has("last_name") ||
    columnMap.has("email");
  if (!hasIdentity) return [];

  return matrix.slice(1).flatMap((cols) => {
    const get = (kind: FieldKind, metaKey?: string) => {
      const key = kind === "extra" ? `extra:${metaKey}` : kind;
      const idx = columnMap.get(key);
      if (idx == null) return undefined;
      const value = (cols[idx] ?? "").trim();
      return value || undefined;
    };

    const first_name = get("first_name");
    const last_name = get("last_name");
    const fullFromParts = [first_name, last_name].filter(Boolean).join(" ").trim();
    const full_name = get("full_name") || fullFromParts;
    const email = get("email");

    if (!full_name && !email) return [];

    const extras: Record<string, string> = {};
    for (const def of FIELD_DEFS) {
      if (def.kind !== "extra" || !def.metaKey) continue;
      const value = get("extra", def.metaKey);
      if (value) extras[def.metaKey] = value;
    }

    const city = get("city");
    const state = get("state");
    const country = get("country");
    if (city) extras.city = city;
    if (state) extras.state = state;
    if (country) extras.country = country;

    // Preserve any unrecognized columns so nothing from the CSV is dropped
    const usedIndices = new Set(columnMap.values());
    headers.forEach((header, idx) => {
      if (usedIndices.has(idx) || !header) return;
      const value = (cols[idx] ?? "").trim();
      if (!value) return;
      const key = header
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 64);
      if (!key || extras[key]) return;
      extras[key] = value;
    });

    return [
      {
        full_name: full_name || email || "Unknown",
        first_name,
        last_name,
        email,
        title: get("title"),
        company_name: get("company_name"),
        phone: pickPhone(get),
        linkedin_url: get("linkedin_url"),
        twitter_url: get("twitter_url"),
        location: buildLocation(city, state, country),
        extras: Object.keys(extras).length ? extras : undefined,
      },
    ];
  });
}

export function parseContactsCsv(text: string): ContactImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const matrix = lines.map(splitCsvLine);
  return mapRowsFromMatrix(matrix);
}

export function sheetHasContactHeaders(headers: string[]): boolean {
  const normalized = headers.map(normalizeHeader);
  const aliasPool = new Set(FIELD_DEFS.flatMap((d) => d.aliases));
  const identityAliases = new Set(
    FIELD_DEFS.filter((d) =>
      ["full_name", "first_name", "last_name", "email"].includes(d.kind),
    ).flatMap((d) => d.aliases),
  );

  const hasIdentity = normalized.some((h) => identityAliases.has(h));
  const hasAnyKnown = normalized.some((h) => aliasPool.has(h));
  return hasIdentity || hasAnyKnown;
}

export function parseContactsMatrix(matrix: unknown[][]): ContactImportRow[] {
  const asStrings = matrix.map((row) =>
    row.map((cell) => (cell == null ? "" : String(cell).trim())),
  );
  return mapRowsFromMatrix(asStrings);
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function buildContactsTemplateCsv(): string {
  return `${CONTACT_CSV_TEMPLATE_HEADERS.join(",")}\n`;
}
