import { page, type DocSection } from "@/lib/docs/types";

export const searchNetworkSection: DocSection = {
  id: "search",
  title: "Search and network",
  pages: [
    page(
      "search-network",
      "Search your network",
      "Search and network",
      "Ask natural language questions across your groups and teammate synced contacts.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Search looks across all your groups by default: your connectors plus every teammate’s synced contacts. Results are ranked with AI using title, company, location, strength, and enrichment snippets.",
        },
        {
          type: "screenshot",
          src: "/docs/search-network.png",
          alt: "Search page",
          caption: "Try prompts like “Find CTOs in fintech” or “Who can introduce me to Stripe?”",
        },
        {
          type: "heading",
          id: "steps",
          text: "How to search",
        },
        {
          type: "steps",
          items: [
            "Open Search",
            "Type a natural language query or pick a suggested prompt",
            "Review ranked results, warm intro paths, and enrichment chips",
            "Optional: enter select mode, choose contacts, and save them to a segment",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "search-filters", label: "Search filters and segments" },
            { slug: "network-graph", label: "Network graph" },
            { slug: "contact-profile", label: "Contact profile" },
          ],
        },
      ],
    ),
    page(
      "search-filters",
      "Search filters and segments",
      "Search and network",
      "Narrow search to one group and save result sets for playbooks.",
      [
        {
          type: "heading",
          id: "group-scope",
          text: "Group scope",
        },
        {
          type: "paragraph",
          text: "By default search spans every group you belong to. When you need a tighter set, filter to a single group so results only include that shared network.",
        },
        {
          type: "heading",
          id: "save-to-segment",
          text: "Save to a segment",
        },
        {
          type: "steps",
          items: [
            "Run a search",
            "Turn on select mode on the results",
            "Select individual contacts or select all",
            "Use the segment save bar to create or update a segment",
          ],
        },
        {
          type: "tip",
          text: "The same save bar appears on Contacts. Segments are the input lists used by playbook runs.",
        },
        {
          type: "links",
          items: [
            { slug: "segments", label: "Segments" },
            { slug: "playbook-runs", label: "Playbook runs" },
          ],
        },
      ],
    ),
    page(
      "network-graph",
      "Network graph",
      "Search and network",
      "Visualize contacts, companies, and relationship edges in your network.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Network opens an interactive graph of you, your contacts, companies, and known relationship edges such as mutual connections or introductions. Use it to spot clusters and intro paths that lists alone can hide.",
        },
        {
          type: "steps",
          items: [
            "Open Network from the sidebar",
            "Pan and zoom to explore clusters",
            "Select a node to focus related links",
            "Return to Search or Contacts when you find someone to act on",
          ],
        },
        {
          type: "callout",
          title: "Feature flag",
          body: "Graph view may be controlled by the graph_view feature flag. If Network looks empty or unavailable, ask an admin to confirm flags in Admin.",
        },
        {
          type: "links",
          items: [
            { slug: "mutual-connections", label: "Mutual connections" },
            { slug: "feature-flags", label: "Feature flags" },
          ],
        },
      ],
    ),
  ],
};

export const contactsSection: DocSection = {
  id: "contacts",
  title: "Contacts",
  pages: [
    page(
      "contacts-list",
      "Contacts list",
      "Contacts",
      "Browse, search, and select contacts across your groups.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Contacts shows everyone in your network with title, company, location chips, and relationship strength. Use the list search box to filter locally, Import CSV for Custom Data, or Select for segment to build lists for playbooks.",
        },
        {
          type: "steps",
          items: [
            "Open Contacts",
            "Scan strength percentages to prioritize richer profiles",
            "Click a card to open the full profile",
            "Use Select for segment when you want a reusable list",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "contact-profile", label: "Contact profile" },
            { slug: "import-csv", label: "Import CSV" },
            { slug: "segments", label: "Segments" },
          ],
        },
      ],
    ),
    page(
      "contact-profile",
      "Contact profile",
      "Contacts",
      "Read AI summaries, enrichment details, outreach tools, and intro actions on one page.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Each profile includes header actions (Email, LinkedIn, Request intro), relationship strength, Overview / Timeline / Outreach tabs, an AI summary, grouped contact details, mutual connections, and tags.",
        },
        {
          type: "screenshot",
          src: "/docs/contact-profile.png",
          alt: "Contact profile",
          caption: "Overview shows AI summary and Reach / Company / Role details.",
        },
        {
          type: "heading",
          id: "details",
          text: "Contact details",
        },
        {
          type: "paragraph",
          text: "Details are grouped into Reach, Company, Role and status, and Keywords and tech. Complex labels include an info icon with a short explanation. Keywords and technologies appear as chips.",
        },
        {
          type: "links",
          items: [
            { slug: "relationship-strength", label: "Relationship strength" },
            { slug: "mutual-connections", label: "Mutual connections" },
            { slug: "contact-outreach", label: "Contact outreach" },
            { slug: "introductions", label: "Introductions" },
          ],
        },
      ],
    ),
    page(
      "relationship-strength",
      "Relationship strength",
      "Contacts",
      "How the 0 to 100 strength score is calculated and how to use it.",
      [
        {
          type: "heading",
          id: "overview",
          text: "What the score means",
        },
        {
          type: "paragraph",
          text: "Relationship strength is a lead quality score from 0 to 100 based on profile completeness and seniority. It is not a measure of how often you have interacted. Hover the info icon next to the score on a contact for the same explanation.",
        },
        {
          type: "heading",
          id: "what-adds-points",
          text: "What adds points",
        },
        {
          type: "steps",
          items: [
            "Core fields: email, title, company, LinkedIn, phone, location, bio",
            "Seniority signals in title or enrichment (manager through C-level and founders score higher)",
            "Enrichment: industry, departments, keywords, employees, technologies, funding, revenue, stage",
            "Verified or valid email status when present",
          ],
        },
        {
          type: "tip",
          text: "CSV imports recompute strength from enrichment. When merging duplicates, Potentially keeps the higher score.",
        },
        {
          type: "links",
          items: [
            { slug: "import-csv", label: "Import CSV" },
            { slug: "contact-profile", label: "Contact profile" },
          ],
        },
      ],
    ),
    page(
      "mutual-connections",
      "Mutual connections",
      "Contacts",
      "See people who can bridge you to a contact through company, domain, or linked events.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Mutual connections are other contacts who share a useful bridge to the person you are viewing. Potentially ranks linked relationship events first, then same company, then shared work email domains (personal inboxes like Gmail are skipped).",
        },
        {
          type: "screenshot",
          src: "/docs/mutual-connections.png",
          alt: "Mutual connections on a contact",
          caption: "Each row shows why someone matched, such as Linked in your network.",
        },
        {
          type: "heading",
          id: "how-it-works",
          text: "How matches are found",
        },
        {
          type: "steps",
          items: [
            "Linked relationship events (known connection or introduction)",
            "Same company ID or company name",
            "Shared work email domain",
          ],
        },
        {
          type: "tip",
          text: "If the list is empty, sync more coworkers or enrich company fields so same company matching has something to find.",
        },
      ],
    ),
    page(
      "contact-outreach",
      "Contact outreach",
      "Contacts",
      "Generate cold email, warm intro, or LinkedIn drafts from a contact profile.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "On a contact, open the Outreach tab. Choose type (cold email, warm intro, LinkedIn), tone, and goal, then generate a draft. Edit the subject, body, and CTA as needed. Send from your mail app, or send with Potentially when workspace email is configured.",
        },
        {
          type: "steps",
          items: [
            "Open a contact → Outreach",
            "Pick type, tone, and goal",
            "Click generate and review the draft",
            "Use Request intro to email the contact that you would like an introduction",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "introductions", label: "Introductions" },
            { slug: "playbook-runs", label: "Playbook runs" },
            { slug: "email-sender", label: "Email sender" },
          ],
        },
      ],
    ),
    page(
      "introductions",
      "Introductions",
      "Contacts",
      "Request and track warm introductions through your team.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Introductions live under Introductions in the sidebar and can be started from a contact with Request intro. That emails the contact that you would like an introduction, via your mail app or Potentially when workspace email is configured. The tab shows Sent requests and Received requests when someone else emailed a contact whose address matches yours. Statuses move through draft, requested, accepted, declined, and completed.",
        },
        {
          type: "steps",
          items: [
            "Open a contact or go to Introductions",
            "Request an intro. Email goes to the contact",
            "Watch status updates as the request progresses",
            "Mark completed when the introduction is done",
          ],
        },
        {
          type: "tip",
          text: "Warm paths in search results highlight who might introduce you. Pair that signal with a formal intro request when you are ready.",
        },
      ],
    ),
  ],
};
