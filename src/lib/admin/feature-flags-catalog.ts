export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
}

/** Human-readable catalog for admin UI and fallbacks when DB description is missing. */
export const FEATURE_FLAG_CATALOG: Record<string, FeatureFlagDefinition> = {
  ai_search: {
    key: "ai_search",
    label: "AI search",
    description: "Natural language search across your network",
  },
  graph_view: {
    key: "graph_view",
    label: "Network graph",
    description: "Interactive relationship graph visualization",
  },
  outreach_engine: {
    key: "outreach_engine",
    label: "Outreach engine",
    description: "AI-generated emails, LinkedIn messages, and intro requests",
  },
  team_collaboration: {
    key: "team_collaboration",
    label: "Team collaboration",
    description: "Group invites, shared workspaces, and member roles",
  },
  beta_connectors: {
    key: "beta_connectors",
    label: "Beta connectors",
    description: "Early-access connector integrations (Google, Outlook, etc.)",
  },
  billing_enforcement: {
    key: "billing_enforcement",
    label: "Billing enforcement",
    description: "Enforce plan limits on search, imports, and usage",
  },
  playbook_mode: {
    key: "playbook_mode",
    label: "Playbooks",
    description: "Outreach playbooks, runs, sequences, and segments",
  },
  platform_chat: {
    key: "platform_chat",
    label: "Platform chat",
    description: "Realtime conversation UI on prospect detail pages",
  },
};

export function formatFeatureFlagLabel(key: string): string {
  return (
    FEATURE_FLAG_CATALOG[key]?.label ??
    key
      .split("_")
      .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
      .join(" ")
  );
}

export function getFeatureFlagDescription(key: string, dbDescription?: string | null): string {
  return dbDescription ?? FEATURE_FLAG_CATALOG[key]?.description ?? "Platform feature toggle";
}
