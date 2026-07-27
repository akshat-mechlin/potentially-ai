import type { ConnectorDefinition } from "./types";

/** Google Contacts/Calendar/Gmail + Outlook Contacts (+ CSV) are connectable; others coming_soon. */
export const CONNECTOR_REGISTRY: ConnectorDefinition[] = [
  {
    key: "google_contacts",
    name: "Google Contacts",
    description: "Import people from your Google address book.",
    category: "google",
    categoryLabel: "Google",
    brandColor: "#4285F4",
    brandInitial: "G",
    capabilities: ["contacts"],
    availability: "live",
    oauth: {
      provider: "google",
      supabaseProvider: "google",
      scopes:
        "https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email",
    },
    syncSource: "google_contacts",
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Import people from meetings you attend or organize.",
    category: "google",
    categoryLabel: "Google",
    brandColor: "#34A853",
    brandInitial: "G",
    capabilities: ["calendar"],
    availability: "live",
    oauth: {
      provider: "google",
      supabaseProvider: "google",
      scopes:
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email",
    },
    syncSource: "google_calendar",
  },
  {
    key: "gmail",
    name: "Gmail",
    description: "Import people from recent email From/To/Cc addresses.",
    category: "google",
    categoryLabel: "Google",
    brandColor: "#EA4335",
    brandInitial: "M",
    capabilities: ["email", "contacts"],
    availability: "live",
    oauth: {
      provider: "google",
      supabaseProvider: "google",
      scopes:
        "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email",
    },
    syncSource: "gmail",
  },
  {
    key: "google_drive",
    name: "Google Drive",
    description: "Attach shared files and documents to contact profiles.",
    category: "google",
    categoryLabel: "Google",
    brandColor: "#FBBC04",
    brandInitial: "D",
    capabilities: ["files"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "google",
      scopes: "https://www.googleapis.com/auth/drive.readonly",
    },
  },
  {
    key: "outlook",
    name: "Outlook Contacts",
    description: "Import contacts from Microsoft Outlook and Office 365.",
    category: "microsoft",
    categoryLabel: "Microsoft",
    brandColor: "#0078D4",
    brandInitial: "O",
    capabilities: ["contacts"],
    availability: "live",
    oauth: {
      provider: "azure",
      supabaseProvider: "azure",
      scopes: "openid profile email offline_access User.Read Contacts.Read",
    },
    syncSource: "outlook",
  },
  {
    key: "outlook_mail",
    name: "Outlook Email",
    description: "Import people from recent Outlook From/To/Cc addresses.",
    category: "microsoft",
    categoryLabel: "Microsoft",
    brandColor: "#0078D4",
    brandInitial: "M",
    capabilities: ["email", "contacts"],
    availability: "live",
    oauth: {
      provider: "azure",
      supabaseProvider: "azure",
      scopes: "openid profile email offline_access User.Read Mail.Read",
    },
    syncSource: "outlook_mail",
  },
  {
    key: "outlook_calendar",
    name: "Outlook Calendar",
    description: "Sync calendar events and meeting relationships.",
    category: "microsoft",
    categoryLabel: "Microsoft",
    brandColor: "#106EBE",
    brandInitial: "C",
    capabilities: ["calendar"],
    availability: "coming_soon",
    oauth: {
      provider: "azure",
      supabaseProvider: "azure",
      scopes: "openid profile email offline_access User.Read Calendars.Read",
    },
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    description: "Enrich profiles with professional network data.",
    category: "social",
    categoryLabel: "Social",
    brandColor: "#0A66C2",
    brandInitial: "in",
    capabilities: ["social", "contacts"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "linkedin_oidc",
      scopes: "openid profile email",
    },
  },
  {
    key: "facebook",
    name: "Facebook",
    description: "Connect your Facebook network for warm introductions.",
    category: "social",
    categoryLabel: "Social",
    brandColor: "#1877F2",
    brandInitial: "f",
    capabilities: ["social"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "facebook",
      scopes: "email public_profile",
    },
  },
  {
    key: "instagram",
    name: "Instagram",
    description: "Surface Instagram connections linked to your Meta account.",
    category: "social",
    categoryLabel: "Social",
    brandColor: "#E4405F",
    brandInitial: "Ig",
    capabilities: ["social"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "facebook",
      scopes: "instagram_basic",
    },
  },
  {
    key: "twitter",
    name: "X (Twitter)",
    description: "Track X relationships and public engagement signals.",
    category: "social",
    categoryLabel: "Social",
    brandColor: "#000000",
    brandInitial: "X",
    capabilities: ["social"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "twitter",
      scopes: "users.read tweet.read offline.access",
    },
  },
  {
    key: "github",
    name: "GitHub",
    description: "Map collaborators, contributors, and org relationships.",
    category: "developer",
    categoryLabel: "Developer",
    brandColor: "#24292F",
    brandInitial: "GH",
    capabilities: ["contacts", "social"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "github",
      scopes: "read:user user:email",
    },
  },
  {
    key: "apple_contacts",
    name: "Apple Contacts",
    description: "Import contacts from iCloud via CardDAV (setup required).",
    category: "personal",
    categoryLabel: "Personal",
    brandColor: "#555555",
    brandInitial: "",
    capabilities: ["contacts"],
    availability: "coming_soon",
    oauth: {
      provider: "google",
      supabaseProvider: "apple",
      scopes: "name email",
    },
  },
  {
    key: "telegram",
    name: "Telegram",
    description: "Connect Telegram groups and direct message networks.",
    category: "messaging",
    categoryLabel: "Messaging",
    brandColor: "#26A5E4",
    brandInitial: "T",
    capabilities: ["messages"],
    availability: "coming_soon",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Business API integration for WhatsApp relationship data.",
    category: "messaging",
    categoryLabel: "Messaging",
    brandColor: "#25D366",
    brandInitial: "W",
    capabilities: ["messages"],
    availability: "coming_soon",
  },
  {
    key: "apollo",
    name: "Apollo",
    description:
      "Search and enrich people and companies using your Apollo account and credits.",
    category: "sales_intelligence",
    categoryLabel: "Sales Intelligence",
    brandColor: "#EBF212",
    brandInitial: "A",
    capabilities: ["contacts", "search"],
    availability: "beta",
    oauth: {
      provider: "apollo",
      // Must match scopes registered in Apollo OAuth settings exactly.
      scopes:
        "read_user_profile organizations_search organization_read person_read contacts_search contact_read accounts_search account_read organizations_enrich mixed_people_api_search mixed_companies_search",
    },
  },
  {
    key: "custom_data",
    name: "Custom Data",
    description:
      "Upload one or more CSV/Excel files (multi-sheet supported). Download the template to keep the format.",
    category: "custom",
    categoryLabel: "Custom Data",
    brandColor: "#2D4739",
    brandInitial: "+",
    capabilities: ["contacts"],
    availability: "live",
    syncSource: "csv",
  },
];

export function getConnectorDefinition(key: string) {
  return CONNECTOR_REGISTRY.find((c) => c.key === key);
}

export function getConnectorsByCategory() {
  const grouped = new Map<string, ConnectorDefinition[]>();
  for (const connector of CONNECTOR_REGISTRY) {
    const list = grouped.get(connector.category) ?? [];
    list.push(connector);
    grouped.set(connector.category, list);
  }
  return grouped;
}
