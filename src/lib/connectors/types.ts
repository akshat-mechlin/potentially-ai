export type ConnectorKey =
  | "google_contacts"
  | "google_calendar"
  | "gmail"
  | "google_drive"
  | "outlook"
  | "outlook_mail"
  | "outlook_calendar"
  | "linkedin"
  | "facebook"
  | "instagram"
  | "twitter"
  | "github"
  | "apple_contacts"
  | "telegram"
  | "whatsapp"
  | "custom_data";

export type ConnectorCategory =
  | "google"
  | "microsoft"
  | "social"
  | "developer"
  | "messaging"
  | "personal"
  | "custom";

export type ConnectorAvailability = "live" | "beta" | "coming_soon";

export type ConnectorCapability = "contacts" | "calendar" | "email" | "files" | "social" | "messages";

export type ConnectorStatus = "active" | "pending" | "expired" | "revoked" | "not_connected";

export interface ConnectorDefinition {
  key: ConnectorKey;
  name: string;
  description: string;
  category: ConnectorCategory;
  categoryLabel: string;
  brandColor: string;
  brandInitial: string;
  capabilities: ConnectorCapability[];
  availability: ConnectorAvailability;
  oauth?: {
    supabaseProvider: string;
    scopes: string;
  };
  syncSource?:
    | "google_contacts"
    | "google_calendar"
    | "gmail"
    | "outlook"
    | "outlook_mail"
    | "csv";
}

export interface ConnectorAccount {
  id: string;
  email: string | null;
  label: string;
  status: ConnectorStatus;
  recordsCount: number;
  lastSync: string;
  /** CSV import batch id for filtering contacts belonging to this account/file. */
  importBatchId?: string | null;
  /** User opted into daily automatic sync for this account. */
  autoSyncEnabled?: boolean;
}

export interface ConnectorState {
  key: ConnectorKey;
  name: string;
  description: string;
  category: ConnectorCategory;
  categoryLabel: string;
  brandColor: string;
  brandInitial: string;
  capabilities: ConnectorCapability[];
  availability: ConnectorAvailability;
  status: ConnectorStatus;
  connected: boolean;
  recordsCount: number;
  lastSync: string;
  accountCount: number;
  accounts: ConnectorAccount[];
  canConnect: boolean;
  canSync: boolean;
  supportsMultipleAccounts: boolean;
  /** True when every linked account has auto-sync enabled. */
  autoSyncEnabled: boolean;
}

export const CONNECTOR_CATEGORY_ORDER: ConnectorCategory[] = [
  "google",
  "microsoft",
  "social",
  "developer",
  "messaging",
  "personal",
  "custom",
];

export const CONNECTOR_CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  google: "Google",
  microsoft: "Microsoft",
  social: "Social Networks",
  developer: "Developer",
  messaging: "Messaging",
  personal: "Personal",
  custom: "Custom Data",
};
