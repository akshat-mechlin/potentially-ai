import { page, type DocSection } from "@/lib/docs/types";

export const quickStartsSection: DocSection = {
  id: "quick-starts",
  title: "Quick starts",
  pages: [
    page(
      "overview",
      "Quick starts",
      "Quick starts",
      "Your map of Potentially: connect data, search the network, review contacts, and run outreach with full in-app guides.",
      [
        {
          type: "heading",
          id: "what-potentially-does",
          text: "What Potentially does",
        },
        {
          type: "paragraph",
          text: "Potentially turns your team’s synced contacts into searchable relationship intelligence. You connect sources, enrich profiles, find the right people, request warm introductions, and run playbook outreach when Agent Mode is enabled.",
        },
        {
          type: "callout",
          title: "Start here if you are new",
          body: "Follow this path once, then use the left guides anytime you need a deeper walkthrough.",
          items: [
            "Create or join a group and invite teammates",
            "Connect Google, Microsoft, or Custom Data",
            "Search across groups and open a contact profile",
            "Request an intro or save contacts into a segment",
            "Configure email sender settings before sending outreach",
          ],
        },
        {
          type: "screenshot",
          src: "/docs/overview.png",
          alt: "Potentially dashboard",
          caption: "The dashboard is your home base for network activity and next actions.",
        },
        {
          type: "heading",
          id: "guide-map",
          text: "Guide map",
        },
        {
          type: "links",
          title: "Core workflows",
          items: [
            { slug: "dashboard", label: "Dashboard", description: "KPIs, recent activity, and Quick tour" },
            { slug: "connect-data", label: "Connect your data", description: "OAuth connectors and sync" },
            { slug: "import-csv", label: "Import CSV", description: "Custom Data enrichment uploads" },
            { slug: "search-network", label: "Search", description: "Natural language network search" },
            { slug: "contact-profile", label: "Contact profile", description: "AI summary, details, strength" },
            { slug: "playbook-runs", label: "Playbook runs", description: "Match, draft, approve, and send" },
          ],
        },
        {
          type: "links",
          title: "Account and support",
          items: [
            { slug: "get-help", label: "Get help", description: "Where to look when something is unclear" },
            { slug: "email-sender", label: "Email sender", description: "Platform or custom sending domain" },
            { slug: "plans-limits", label: "Plans and limits", description: "Free, Pro, and usage caps" },
            { slug: "command-palette", label: "Command palette", description: "Jump anywhere with ⌘K / Ctrl+K" },
          ],
        },
        {
          type: "tip",
          text: "Every guide includes steps, callouts, and related links. Use On this page on the right to jump within a long guide.",
        },
      ],
    ),
    page(
      "dashboard",
      "Dashboard",
      "Quick starts",
      "Understand the home screen: accounts, contacts, searches, intros, and recent activity.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "The dashboard summarizes your workspace at a glance. KPI cards show connected accounts, contacts, searches, and introductions. Below that you will find recent searches and recent contacts so you can jump back into work quickly.",
        },
        {
          type: "screenshot",
          src: "/docs/overview.png",
          alt: "Dashboard with KPI cards and recent activity",
          caption: "Use Quick tour the first time you land here to learn the layout.",
        },
        {
          type: "heading",
          id: "steps",
          text: "What to do from here",
        },
        {
          type: "steps",
          items: [
            "Review KPI cards to confirm connectors and contacts are syncing",
            "Open a recent contact or start a new search",
            "Use Quick tour if you want a short product walkthrough",
            "Continue to Connectors if accounts show zero",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "connect-data", label: "Connect your data" },
            { slug: "search-network", label: "Search your network" },
            { slug: "command-palette", label: "Command palette" },
          ],
        },
      ],
    ),
    page(
      "command-palette",
      "Command palette",
      "Quick starts",
      "Jump to any major page without hunting through the sidebar.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Press ⌘K on Mac or Ctrl+K on Windows to open the command palette from almost anywhere in the app. Type a page name such as Search, Contacts, Connectors, or Docs and press Enter.",
        },
        {
          type: "steps",
          items: [
            "Press ⌘K or Ctrl+K",
            "Type part of the destination name",
            "Select the match and press Enter",
          ],
        },
        {
          type: "tip",
          text: "The header search control shows the same shortcut. It is the fastest way to open Documentation while you are mid-task.",
        },
      ],
    ),
    page(
      "mobile-app",
      "Mobile and PWA",
      "Quick starts",
      "Use Potentially on a phone with the bottom tabs, More menu, and installable PWA.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "On small screens the app switches to a mobile layout. Primary tabs cover Dashboard, Search, Contacts, and Network. Everything else lives under More, including Resources → Documentation, Connectors, Groups, Analytics, Settings, and Agent Mode when enabled.",
        },
        {
          type: "steps",
          items: [
            "Use the bottom tabs for day to day browsing",
            "Open More for Connectors, Groups, Settings, and Documentation",
            "On supported devices, install the PWA from your browser for a home-screen icon",
          ],
        },
        {
          type: "tip",
          text: "Some deep playbook flows use a full-screen immersive layout. Use the in-screen Back control to return.",
        },
      ],
    ),
    page(
      "get-help",
      "Get help",
      "Quick starts",
      "How to help yourself inside Potentially when a field, score, or workflow is unclear.",
      [
        {
          type: "heading",
          id: "in-product-help",
          text: "In product help",
        },
        {
          type: "paragraph",
          text: "Documentation under Resources is the primary support surface. Contact profiles also include info icons next to complex enrichment labels and Relationship strength. Hover or tap those icons for plain English explanations.",
        },
        {
          type: "heading",
          id: "common-issues",
          text: "Common issues",
        },
        {
          type: "steps",
          items: [
            "No search results: confirm Connectors synced and the group has contacts",
            "Empty mutual connections: enrich company fields or sync more coworkers",
            "Cannot send email: check Settings → email sender and domain verification",
            "Playbooks missing: Agent Mode may be disabled for the workspace",
            "Hit a limit: see Plans and limits, then upgrade if needed",
          ],
        },
        {
          type: "links",
          title: "Deep dives",
          items: [
            { slug: "connect-data", label: "Connect your data" },
            { slug: "relationship-strength", label: "Relationship strength" },
            { slug: "email-sender", label: "Email sender" },
            { slug: "plans-limits", label: "Plans and limits" },
            { slug: "feature-flags", label: "Feature flags (admin)" },
          ],
        },
        {
          type: "callout",
          title: "Still stuck?",
          body: "Ask a workspace owner or admin to check connectors, feature flags, and plan limits. Keep this Documentation section open while you work so you can jump between guides without leaving the app.",
        },
      ],
    ),
  ],
};
