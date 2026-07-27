export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type OAuthProvider = "google" | "microsoft" | "outlook";
export type ConnectionStatus = "active" | "expired" | "revoked" | "pending";
export type IntroductionStatus = "draft" | "requested" | "accepted" | "declined" | "completed";
export type SyncJobStatus = "pending" | "running" | "completed" | "failed";
export type SyncSource =
  | "google_contacts"
  | "google_calendar"
  | "gmail"
  | "outlook"
  | "outlook_mail"
  | "csv"
  | "apollo";
export type RelationshipEventType =
  | "email"
  | "meeting"
  | "introduction"
  | "mutual_connection"
  | "linkedin";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  title: string | null;
  linkedin_url: string | null;
  company: string | null;
  location: string | null;
  website_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailSenderMode = "platform" | "custom";

export type SenderDomainStatus = "not_started" | "pending" | "verified" | "failed";

export interface WorkspaceEmailSettings {
  mode: EmailSenderMode;
  customSenderName: string | null;
  customSenderEmail: string | null;
  platformFromAddress: string;
  canEdit: boolean;
  senderDomain: string | null;
  senderDomainStatus: SenderDomainStatus;
  domainSetup: {
    records: Array<{
      type: string;
      name: string;
      value: string;
      status: string;
      record: string;
    }>;
    resendConfigured: boolean;
    domainManagementAvailable: boolean;
  };
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSummary extends Workspace {
  role: WorkspaceRole;
  member_count: number;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  owner_id: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  twitter_url?: string | null;
  company_id: string | null;
  company_name: string | null;
  location: string | null;
  bio: string | null;
  tags: string[];
  source: SyncSource | null;
  strength_score: number;
  last_interaction_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface RelationshipEvent {
  id: string;
  workspace_id: string;
  type: RelationshipEventType;
  source: string | null;
  contact_a: string | null;
  contact_b: string | null;
  user_id: string | null;
  score: number;
  title: string | null;
  description: string | null;
  occurred_at: string;
  created_at: string;
}

export interface Introduction {
  id: string;
  workspace_id: string;
  requester_id: string;
  connector_id: string | null;
  target_contact_id: string;
  status: IntroductionStatus;
  message: string | null;
  outreach_draft: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at?: string;
  target_contact?: Contact;
  connector_name?: string | null;
  /** Whether you sent this request or received it (target contact email matches yours). */
  direction?: "sent" | "received";
  requester_name?: string | null;
}

export interface SearchSourceStatus {
  success: boolean;
  count: number;
  error?: string;
}

export interface SearchSources {
  apollo: SearchSourceStatus;
  workspace: SearchSourceStatus;
}

export interface SearchResultContact {
  id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  company_name: string | null;
  score: number;
  reason: string;
  warm_intro_path: string[];
  recommended_action: string;
  network_owner_name?: string | null;
  group_name?: string | null;
  source?: "workspace" | "platform";
  platform_prospect_id?: string;
  apollo_id?: string;
  enrichment_status?: string;
  in_contacts?: boolean;
  raw_apollo?: Record<string, unknown>;
}

export interface SearchResult {
  contacts: SearchResultContact[];
  summary: string;
  suggested_actions: string[];
  source?: "workspace" | "apollo" | "merged";
  sources?: SearchSources;
  apollo_query?: string;
}

export interface OAuthConnection {
  id: string;
  user_id: string;
  workspace_id: string;
  provider: OAuthProvider;
  status: ConnectionStatus;
  last_synced_at: string | null;
  created_at: string;
}

export interface SyncJob {
  id: string;
  workspace_id: string;
  user_id: string;
  source: SyncSource;
  status: SyncJobStatus;
  progress: number;
  total: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  workspace_id: string;
  user_id: string | null;
  event: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: "user" | "contact" | "company";
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface OutreachRequest {
  contact_id: string;
  type: "cold_email" | "warm_intro" | "linkedin";
  tone: "professional" | "casual" | "friendly";
  goal: string;
  context?: string;
}

export interface OutreachResult {
  subject?: string;
  body: string;
  cta: string;
}

export interface DashboardStats {
  connected_accounts: number;
  contacts_indexed: number;
  recent_searches: number;
  introductions_success: number;
  ai_usage_tokens: number;
  activity?: Array<{ id: string; event: string; time: string; created_at: string }>;
}

export interface AnalyticsInsight {
  id: string;
  tone: "positive" | "warning" | "neutral";
  title: string;
  description: string;
  href: string;
  cta: string;
}

export interface AnalyticsData {
  summary: {
    contacts: number;
    contacts_delta: number | null;
    searches_7d: number;
    searches_delta: number | null;
    avg_strength: number;
    stale_contacts: number;
    pending_intros: number;
    outreach_sent: number;
    reply_rate: number | null;
    booked: number;
  };
  searches_per_day: { date: string; count: number }[];
  top_contacts: {
    id: string;
    name: string;
    interactions: number;
    strength: number;
    company: string | null;
  }[];
  workspace_growth: { date: string; contacts: number }[];
  engagement: { type: string; count: number }[];
  strength_distribution: {
    key: "cold" | "warm" | "strong" | "champion";
    label: string;
    count: number;
    color: string;
  }[];
  outreach_funnel: { stage: string; count: number }[];
  intro_pipeline: { status: string; count: number }[];
  insights: AnalyticsInsight[];
}

export * from "./playbooks";
