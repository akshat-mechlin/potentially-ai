import { isDataDemoMode } from "@/lib/app-config";
import { DEMO_CONTACTS } from "@/lib/demo-data";
import { getDemoContactById, getDemoContacts } from "@/lib/demo-store";
import { getUserWorkspaceContext, listUserWorkspaces } from "@/lib/data/workspace";
import { isContactExcluded } from "@/lib/contacts/exclude";
import type { Contact } from "@/types";

export type MutualReason =
  | "known_connection"
  | "introduction"
  | "same_company"
  | "shared_domain";

export type MutualConnection = {
  id: string;
  full_name: string;
  title: string | null;
  company_name: string | null;
  strength_score: number;
  reason: MutualReason;
  reason_label: string;
};

const REASON_PRIORITY: Record<MutualReason, number> = {
  known_connection: 0,
  introduction: 1,
  same_company: 2,
  shared_domain: 3,
};

const REASON_LABEL: Record<MutualReason, string> = {
  known_connection: "Linked in your network",
  introduction: "Prior introduction path",
  same_company: "Works at the same company",
  shared_domain: "Same company email domain",
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
  "yandex.com",
]);

/** Demo graph edges used by the network graph. */
const DEMO_MUTUAL_EDGES: Array<{ a: string; b: string; reason: MutualReason }> = [
  { a: "ct-001", b: "ct-005", reason: "known_connection" },
  { a: "ct-002", b: "ct-008", reason: "known_connection" },
  { a: "ct-003", b: "ct-006", reason: "introduction" },
];

function normalizeCompany(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

function toMutual(contact: Contact, reason: MutualReason): MutualConnection {
  return {
    id: contact.id,
    full_name: contact.full_name,
    title: contact.title,
    company_name: contact.company_name,
    strength_score: contact.strength_score ?? 0,
    reason,
    reason_label: REASON_LABEL[reason],
  };
}

function mergeMutual(
  map: Map<string, MutualConnection>,
  contact: Contact,
  reason: MutualReason,
) {
  if (isContactExcluded(contact)) return;
  const existing = map.get(contact.id);
  if (!existing || REASON_PRIORITY[reason] < REASON_PRIORITY[existing.reason]) {
    map.set(contact.id, toMutual(contact, reason));
  }
}

function rankMutuals(map: Map<string, MutualConnection>, limit: number) {
  return [...map.values()]
    .sort((a, b) => {
      const byReason = REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason];
      if (byReason !== 0) return byReason;
      return (b.strength_score ?? 0) - (a.strength_score ?? 0);
    })
    .slice(0, limit);
}

function listDemoMutualConnections(contactId: string, limit: number): MutualConnection[] {
  const target = getDemoContactById(contactId);
  if (!target) return [];

  const map = new Map<string, MutualConnection>();
  const contacts = getDemoContacts();

  for (const edge of DEMO_MUTUAL_EDGES) {
    const otherId = edge.a === contactId ? edge.b : edge.b === contactId ? edge.a : null;
    if (!otherId) continue;
    const other = getDemoContactById(otherId);
    if (other) mergeMutual(map, other, edge.reason);
  }

  const companyKey = normalizeCompany(target.company_name);
  const domain = emailDomain(target.email);

  for (const contact of contacts) {
    if (contact.id === contactId) continue;
    if (target.company_id && contact.company_id === target.company_id) {
      mergeMutual(map, contact, "same_company");
      continue;
    }
    if (companyKey && normalizeCompany(contact.company_name) === companyKey) {
      mergeMutual(map, contact, "same_company");
      continue;
    }
    if (domain && emailDomain(contact.email) === domain) {
      mergeMutual(map, contact, "shared_domain");
    }
  }

  // Ensure demo always has something sensible for graph-linked contacts
  if (map.size === 0 && DEMO_CONTACTS.length > 1) {
    // no-op — empty is correct when nothing overlaps
  }

  return rankMutuals(map, limit);
}

export async function listMutualConnections(
  contactId: string,
  limit = 8,
): Promise<MutualConnection[]> {
  if (isDataDemoMode()) {
    return listDemoMutualConnections(contactId, limit);
  }

  const { supabase, user } = await getUserWorkspaceContext();
  if (!supabase || !user) return [];

  const workspaceIds = (await listUserWorkspaces(supabase)).map((w) => w.id);
  if (!workspaceIds.length) return [];

  const { data: target, error: targetError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .in("workspace_id", workspaceIds)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) return [];

  const map = new Map<string, MutualConnection>();
  const contactById = new Map<string, Contact>();

  const remember = (rows: Contact[]) => {
    for (const row of rows) {
      contactById.set(row.id, row);
    }
  };

  const [{ data: events }, { data: companyPeers }, { data: namePeers }, { data: domainPeers }] =
    await Promise.all([
      supabase
        .from("relationship_events")
        .select("type, contact_a, contact_b")
        .in("workspace_id", workspaceIds)
        .in("type", ["mutual_connection", "introduction"])
        .or(`contact_a.eq.${contactId},contact_b.eq.${contactId}`)
        .limit(50),
      target.company_id
        ? supabase
            .from("contacts")
            .select("*")
            .in("workspace_id", workspaceIds)
            .eq("company_id", target.company_id)
            .neq("id", contactId)
            .order("strength_score", { ascending: false })
            .limit(24)
        : Promise.resolve({ data: [] as Contact[] }),
      target.company_name
        ? supabase
            .from("contacts")
            .select("*")
            .in("workspace_id", workspaceIds)
            .eq("company_name", target.company_name.trim())
            .neq("id", contactId)
            .order("strength_score", { ascending: false })
            .limit(24)
        : Promise.resolve({ data: [] as Contact[] }),
      emailDomain(target.email)
        ? supabase
            .from("contacts")
            .select("*")
            .in("workspace_id", workspaceIds)
            .ilike("email", `%@${emailDomain(target.email)}`)
            .neq("id", contactId)
            .order("strength_score", { ascending: false })
            .limit(24)
        : Promise.resolve({ data: [] as Contact[] }),
    ]);

  remember((companyPeers as Contact[] | null) ?? []);
  remember((namePeers as Contact[] | null) ?? []);
  remember((domainPeers as Contact[] | null) ?? []);

  const eventOtherIds = [
    ...new Set(
      (events ?? [])
        .map((e) => {
          if (e.contact_a === contactId) return e.contact_b as string | null;
          if (e.contact_b === contactId) return e.contact_a as string | null;
          return null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  ].filter((id) => !contactById.has(id));

  if (eventOtherIds.length) {
    const { data: eventContacts } = await supabase
      .from("contacts")
      .select("*")
      .in("id", eventOtherIds)
      .in("workspace_id", workspaceIds);
    remember((eventContacts as Contact[] | null) ?? []);
  }

  for (const event of events ?? []) {
    const otherId =
      event.contact_a === contactId
        ? (event.contact_b as string | null)
        : event.contact_b === contactId
          ? (event.contact_a as string | null)
          : null;
    if (!otherId) continue;
    const other = contactById.get(otherId);
    if (!other) continue;
    const reason: MutualReason =
      event.type === "introduction" ? "introduction" : "known_connection";
    mergeMutual(map, other, reason);
  }

  for (const peer of (companyPeers as Contact[] | null) ?? []) {
    mergeMutual(map, peer, "same_company");
  }
  for (const peer of (namePeers as Contact[] | null) ?? []) {
    mergeMutual(map, peer, "same_company");
  }

  const targetDomain = emailDomain(target.email);
  for (const peer of (domainPeers as Contact[] | null) ?? []) {
    if (targetDomain && emailDomain(peer.email) === targetDomain) {
      mergeMutual(map, peer, "shared_domain");
    }
  }

  return rankMutuals(map, limit);
}
