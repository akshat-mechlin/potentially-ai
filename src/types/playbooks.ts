export type PlaybookStatus = "draft" | "active" | "paused" | "archived";
export type AutomationLevel = "assist" | "supervised" | "autonomous";
export type OutreachMode = "warm_preferred" | "warm_required" | "cold_allowed";
export type PlaybookRunStatus =
  | "pending"
  | "matching"
  | "review"
  | "finalized"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";
export type PlaybookProspectStatus =
  | "matched"
  | "selected"
  | "queued"
  | "pending_approval"
  | "sent"
  | "replied"
  | "booked"
  | "opted_out"
  | "failed"
  | "skipped";

export interface IcpProfile {
  title_include?: string[];
  title_exclude?: string[];
  industries_include?: string[];
  industries_exclude?: string[];
  keywords_must?: string[];
  keywords_nice?: string[];
  keywords_exclude?: string[];
  min_strength_score?: number;
  geographies?: string[];
  custom_prompt?: string;
}

export interface MatchingConfig {
  min_score?: number;
  warm_path_weight?: number;
  title_weight?: number;
  keyword_weight?: number;
  dedupe_across_playbooks?: boolean;
  cooldown_days?: number;
}

export interface SendConfig {
  daily_cap?: number;
  send_window_start?: string;
  send_window_end?: string;
  skip_weekends?: boolean;
  include_unsubscribe?: boolean;
}

export interface Segment {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  source: string;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  subject: string;
  preheader: string | null;
  body_html: string;
  body_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Playbook {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  status: PlaybookStatus;
  automation_level: AutomationLevel;
  outreach_mode: OutreachMode;
  goal: string | null;
  tone: string;
  icp_profile: IcpProfile;
  matching_config: MatchingConfig;
  send_config: SendConfig;
  template_id: string | null;
  calendly_url?: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlaybookRun {
  id: string;
  playbook_id: string;
  workspace_id: string;
  triggered_by: string;
  segment_id: string | null;
  status: PlaybookRunStatus;
  icp_snapshot: IcpProfile;
  stats: Record<string, number>;
  dry_run: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  /** Count of prospects waiting for approval (sequence follow-ups or drafts). */
  pending_approval_count?: number;
}

export interface PendingPlaybookApproval {
  id: string;
  run_id: string;
  contact_id: string;
  draft_subject: string | null;
  draft_body: string | null;
  current_sequence_step: number;
  last_action_at: string | null;
  created_at: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_company: string | null;
}

export interface PlaybookProspect {
  id: string;
  run_id: string;
  contact_id: string;
  match_score: number;
  match_reason: string | null;
  matched_signals: string[];
  warm_path: string[];
  status: PlaybookProspectStatus;
  draft_subject: string | null;
  draft_body: string | null;
  skip_reason: string | null;
  last_action_at: string | null;
  created_at: string;
  current_sequence_step?: number;
  next_action_at?: string | null;
  contact?: {
    id: string;
    full_name: string;
    title: string | null;
    email: string | null;
    company_name: string | null;
    location?: string | null;
    bio?: string | null;
    linkedin_url?: string | null;
    tags?: string[] | null;
    strength_score: number;
  };
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  body: string;
  message_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SequenceStep {
  id: string;
  playbook_id: string;
  step_order: number;
  delay_days: number;
  /** Days of week (0=Sunday … 6=Saturday) when this step may fire. */
  allowed_weekdays: number[];
  tone: string;
  goal_override: string | null;
  subject_hint: string | null;
  created_at: string;
}

export interface PlaybookProspectDetail extends PlaybookProspect {
  current_sequence_step?: number;
  next_action_at?: string | null;
  calendly_booked_at?: string | null;
}
