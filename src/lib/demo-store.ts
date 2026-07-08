import { DEMO_CONTACTS, DEMO_WORKSPACE } from "@/lib/demo-data";
import type { Contact, Introduction, Workspace } from "@/types";

const extraContacts: Contact[] = [];
let workspaces: Workspace[] = [DEMO_WORKSPACE];
let introductions: Introduction[] = [
  {
    id: "intro-1",
    workspace_id: DEMO_WORKSPACE.id,
    requester_id: "demo-user-001",
    connector_id: null,
    target_contact_id: DEMO_CONTACTS[0].id,
    status: "requested",
    message: null,
    outreach_draft: null,
    notes: null,
    completed_at: null,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    target_contact: DEMO_CONTACTS[0],
    connector_name: "Emily Rodriguez",
  },
  {
    id: "intro-2",
    workspace_id: DEMO_WORKSPACE.id,
    requester_id: "demo-user-001",
    connector_id: "demo-user-001",
    target_contact_id: DEMO_CONTACTS[2].id,
    status: "completed",
    message: null,
    outreach_draft: null,
    notes: null,
    completed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    target_contact: DEMO_CONTACTS[2],
    connector_name: "You",
  },
];

let searchHistory: string[] = [
  "Find founders connected to me",
  "CTOs in fintech",
  "Who can introduce me to Stripe?",
];

let syncJobs: Array<{
  id: string;
  source: string;
  status: string;
  created_at: string;
}> = [];

export function getDemoContacts(): Contact[] {
  return [...DEMO_CONTACTS, ...extraContacts];
}

export function getDemoContactById(id: string): Contact | undefined {
  return getDemoContacts().find((c) => c.id === id);
}

export function importDemoContacts(
  rows: Array<{
    full_name: string;
    email?: string;
    title?: string;
    company_name?: string;
  }>,
): { imported: number; duplicates: number } {
  const existingEmails = new Set(
    getDemoContacts()
      .map((c) => c.email?.toLowerCase())
      .filter(Boolean),
  );

  let imported = 0;
  let duplicates = 0;

  for (const row of rows) {
    if (row.email && existingEmails.has(row.email.toLowerCase())) {
      duplicates++;
      continue;
    }

    const contact: Contact = {
      id: `import-${Date.now()}-${imported}`,
      workspace_id: DEMO_WORKSPACE.id,
      owner_id: "demo-user-001",
      full_name: row.full_name,
      first_name: row.full_name.split(" ")[0] ?? null,
      last_name: row.full_name.split(" ").slice(1).join(" ") || null,
      title: row.title ?? null,
      email: row.email ?? null,
      phone: null,
      linkedin_url: null,
      company_id: null,
      company_name: row.company_name ?? null,
      location: null,
      bio: null,
      tags: ["imported"],
      source: "csv",
      strength_score: 50,
      last_interaction_at: null,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    extraContacts.push(contact);
    if (row.email) existingEmails.add(row.email.toLowerCase());
    imported++;
  }

  return { imported, duplicates };
}

export function filterContactsByQuery(query: string, contacts: Contact[]) {
  const q = query.toLowerCase();

  const filtered = contacts.filter((c) => {
    const searchable = [c.full_name, c.title, c.company_name, c.email, ...(c.tags ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      q.split(" ").some((word) => word.length > 2 && searchable.includes(word)) ||
      (q.includes("founder") && c.title?.toLowerCase().includes("founder")) ||
      (q.includes("cto") && c.title?.toLowerCase().includes("cto")) ||
      (q.includes("fintech") &&
        (c.company_name?.toLowerCase().includes("stripe") ||
          c.company_name?.toLowerCase().includes("plaid") ||
          c.tags?.includes("fintech")))
    );
  });

  if (filtered.length > 0) return filtered;
  return contacts.slice(0, 5);
}

export function getDemoWorkspaces(): Workspace[] {
  return workspaces;
}

export function createDemoWorkspace(name: string): Workspace {
  const workspace: Workspace = {
    id: `ws-${Date.now()}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    logo_url: null,
    plan: "free",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  workspaces = [workspace, ...workspaces];
  return workspace;
}

export function deleteDemoWorkspace(workspaceId: string) {
  workspaces = workspaces.filter((workspace) => workspace.id !== workspaceId);
}

export function getDemoWorkspaceById(workspaceId: string) {
  return workspaces.find((workspace) => workspace.id === workspaceId);
}

export function getDemoIntroductions() {
  return introductions;
}

export function createDemoIntroduction(targetContactId: string) {
  const target = getDemoContactById(targetContactId);
  if (!target) return null;

  const intro: Introduction = {
    id: `intro-${Date.now()}`,
    workspace_id: DEMO_WORKSPACE.id,
    requester_id: "demo-user-001",
    connector_id: null,
    target_contact_id: targetContactId,
    status: "requested",
    message: null,
    outreach_draft: null,
    notes: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    target_contact: target,
    connector_name: null,
  };

  introductions = [intro, ...introductions];
  return intro;
}

export function addSearchHistory(query: string) {
  searchHistory = [query, ...searchHistory.filter((q) => q !== query)].slice(0, 10);
}

export function getSearchHistory() {
  return searchHistory;
}

export function startDemoSync(source: string) {
  const job = {
    id: `sync-${Date.now()}`,
    source,
    status: "completed",
    created_at: new Date().toISOString(),
  };
  syncJobs = [job, ...syncJobs].slice(0, 20);
  return job;
}

export function getDemoDashboardStats() {
  const contacts = getDemoContacts();
  return {
    connected_accounts: 2,
    contacts_indexed: contacts.length,
    recent_searches: searchHistory.length,
    introductions_success: introductions.filter((i) => i.status === "completed").length,
    ai_usage_tokens: 45200,
    activity: [
      { id: "1", event: "Synced 47 contacts from Google", time: "2h ago", created_at: new Date().toISOString() },
      { id: "2", event: "AI search: Find CTOs in fintech", time: "5h ago", created_at: new Date().toISOString() },
    ],
  };
}
