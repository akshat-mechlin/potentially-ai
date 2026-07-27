export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
}

/** Exact product feature names — single source of truth for admin + app. */
export const FEATURE_FLAG_CATALOG: Record<string, FeatureFlagDefinition> = {
  ai_search: {
    key: "ai_search",
    label: "AI Search",
    description: "Natural language search across your network",
  },
  graph_view: {
    key: "graph_view",
    label: "Network Graph",
    description: "Interactive relationship visualization",
  },
  outreach_engine: {
    key: "outreach_engine",
    label: "Outreach Engine",
    description: "AI emails, LinkedIn messages, and intro requests",
  },
  team_collaboration: {
    key: "team_collaboration",
    label: "Team Collaboration",
    description: "Groups, invites, and member roles",
  },
  connector_apollo: {
    key: "connector_apollo",
    label: "Apollo Connector",
    description: "Connect Apollo accounts for search and enrichment",
  },
  beta_connectors: {
    key: "beta_connectors",
    label: "Beta Connectors",
    description: "Early-access connector integrations",
  },
  billing_enforcement: {
    key: "billing_enforcement",
    label: "Billing Enforcement",
    description: "Plan limits on search, imports, and usage",
  },
  playbook_mode: {
    key: "playbook_mode",
    label: "Playbooks (Agent Mode)",
    description: "Playbooks, runs, sequences, and segments",
  },
  platform_chat: {
    key: "platform_chat",
    label: "Platform Chat",
    description: "Realtime prospect conversation UI",
  },
  analytics: {
    key: "analytics",
    label: "Analytics",
    description: "Workspace analytics dashboard and insights",
  },
  csv_import: {
    key: "csv_import",
    label: "CSV Import",
    description: "Upload contacts from CSV / spreadsheets",
  },
  google_sync: {
    key: "google_sync",
    label: "Google Sync",
    description: "Google Contacts, Calendar, and Gmail",
  },
  outlook_sync: {
    key: "outlook_sync",
    label: "Outlook Sync",
    description: "Outlook contacts and mail",
  },
  support_ticketing: {
    key: "support_ticketing",
    label: "Support Ticketing",
    description: "In-app support tickets under Resources",
  },
};

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_CATALOG;

export const FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAG_CATALOG) as FeatureFlagKey[];

/** Connector-related flags — Google / Outlook / CSV / beta connectors. */
export const CONNECTOR_FEATURE_FLAG_KEYS = [
  "google_sync",
  "outlook_sync",
  "csv_import",
  "connector_apollo",
  "beta_connectors",
] as const satisfies readonly FeatureFlagKey[];

export type ConnectorFeatureFlagKey = (typeof CONNECTOR_FEATURE_FLAG_KEYS)[number];

export type FeatureFlagsMap = Record<FeatureFlagKey, boolean>;

export function formatFeatureFlagLabel(key: string): string {
  return FEATURE_FLAG_CATALOG[key]?.label ?? key;
}

export function getFeatureFlagDescription(key: string, dbDescription?: string | null): string {
  return dbDescription ?? FEATURE_FLAG_CATALOG[key]?.description ?? "Platform feature toggle";
}
