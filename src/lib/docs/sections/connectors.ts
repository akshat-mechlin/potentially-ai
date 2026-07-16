import { page, type DocSection } from "@/lib/docs/types";

export const connectorsSection: DocSection = {
  id: "connectors",
  title: "Connectors and data",
  pages: [
    page(
      "connect-data",
      "Connect your data",
      "Connectors and data",
      "Link Google, Microsoft, or Custom Data so contacts sync into your groups.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Connectors bring people from your tools into Potentially. Each linked account syncs into a group so teammates can search the shared network. Open Connectors from the sidebar or More menu.",
        },
        {
          type: "screenshot",
          src: "/docs/connect-data.png",
          alt: "Connectors page",
          caption: "Open a connector card to manage accounts, sync, or disconnect.",
        },
        {
          type: "heading",
          id: "steps",
          text: "How to connect",
        },
        {
          type: "steps",
          items: [
            "Go to Connectors",
            "Choose Google Contacts, Calendar, Gmail, Outlook Contacts, Outlook Email, or Custom Data",
            "Complete OAuth or upload files when prompted",
            "Wait for the first sync, then open the account to review records",
            "Optional: enable Auto-sync on a card to refresh about every 24 hours",
          ],
        },
        {
          type: "callout",
          title: "Why this matters",
          body: "Search, mutual connections, and playbook matching all depend on synced contacts. Connect at least one active source before outreach.",
        },
        {
          type: "links",
          items: [
            { slug: "google-connectors", label: "Google connectors" },
            { slug: "microsoft-connectors", label: "Microsoft connectors" },
            { slug: "import-csv", label: "Import CSV" },
            { slug: "connector-accounts", label: "Manage connector accounts" },
          ],
        },
      ],
    ),
    page(
      "google-connectors",
      "Google connectors",
      "Connectors and data",
      "Sync people from Google Contacts, Calendar attendees, and Gmail headers.",
      [
        {
          type: "heading",
          id: "overview",
          text: "What each Google source does",
        },
        {
          type: "paragraph",
          text: "Google Contacts imports your address book. Google Calendar pulls people from meeting guests. Gmail derives contacts from email headers you already interact with. You can connect more than one Google account.",
        },
        {
          type: "steps",
          items: [
            "Open Connectors and choose the Google product you need",
            "Sign in with Google and approve the requested scopes",
            "Confirm the account appears as Connected",
            "Run Sync if records do not appear yet",
          ],
        },
        {
          type: "tip",
          text: "Admins must configure Google OAuth client IDs and redirect URIs in environment settings before Connect works in production.",
        },
        {
          type: "links",
          items: [
            { slug: "connect-data", label: "Connect your data" },
            { slug: "connector-accounts", label: "Manage connector accounts" },
          ],
        },
      ],
    ),
    page(
      "microsoft-connectors",
      "Microsoft connectors",
      "Connectors and data",
      "Sync Outlook contacts and Outlook email participants from Microsoft 365.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Outlook Contacts imports your Microsoft people list. Outlook Email surfaces participants from mail. Some tenants need admin consent for the requested Microsoft Graph permissions.",
        },
        {
          type: "steps",
          items: [
            "Open Connectors and pick Outlook Contacts or Outlook Email",
            "Sign in with Microsoft and approve access",
            "If consent is blocked, ask your Microsoft admin to approve the app",
            "Sync and open the account records table to verify imports",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "connect-data", label: "Connect your data" },
            { slug: "connector-accounts", label: "Manage connector accounts" },
          ],
        },
      ],
    ),
    page(
      "import-csv",
      "Import contacts from CSV",
      "Connectors and data",
      "Upload enriched CSV or Excel files so seniority, funding, and company fields power search and scoring.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Custom Data accepts CSV and Excel (including multi-sheet). Mapped columns such as seniority, industry, funding, and email confidence are stored on each contact and used for lead scoring, search, embeddings, and AI summaries.",
        },
        {
          type: "screenshot",
          src: "/docs/import-csv.png",
          alt: "CSV import",
          caption: "Download the template, fill enrichment columns, then upload under Custom Data.",
        },
        {
          type: "heading",
          id: "steps",
          text: "Import steps",
        },
        {
          type: "steps",
          items: [
            "Open Connectors → Custom Data",
            "Download the contact template if you need the column layout",
            "Upload your CSV or Excel file",
            "Review records in the account table and open a contact profile",
            "Unmapped headers are kept in extras so no column is silently dropped",
          ],
        },
        {
          type: "tip",
          text: "Empty cells are fine. Each row needs a name (or first and last) or an email. Contacts are deduped by email across imports and connectors.",
        },
        {
          type: "links",
          items: [
            { slug: "relationship-strength", label: "Relationship strength" },
            { slug: "contact-profile", label: "Contact profile" },
            { slug: "connector-accounts", label: "Manage connector accounts" },
          ],
        },
      ],
    ),
    page(
      "connector-accounts",
      "Manage connector accounts",
      "Connectors and data",
      "Open an account to review records, re-sync, toggle columns, or disconnect.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Each connected account has a records view. You can scroll the table, show or hide enrichment columns, select rows, and trigger another sync. Disconnect removes the link when you no longer want that source.",
        },
        {
          type: "steps",
          items: [
            "Open Connectors and click into a platform",
            "Select the account you want to manage",
            "Use Columns to show enrichment fields such as seniority or funding",
            "Click Sync when you need fresh data",
            "Disconnect only when you intend to remove that source",
          ],
        },
        {
          type: "callout",
          title: "Coming soon connectors",
          body: "Some cards such as LinkedIn or Drive may show Coming soon. Those are reserved for future sync and are not available to connect yet.",
        },
      ],
    ),
  ],
};
