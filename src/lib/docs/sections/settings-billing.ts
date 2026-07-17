import { page, type DocSection } from "@/lib/docs/types";

export const analyticsSettingsSection: DocSection = {
  id: "analytics-settings",
  title: "Analytics and settings",
  pages: [
    page(
      "analytics",
      "Analytics",
      "Analytics and settings",
      "Track searches, network growth, and engagement over time.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Analytics summarizes how your workspace uses Potentially: search volume, network growth, top contacts, and engagement style charts. Use it to see whether connectors and outreach are producing activity.",
        },
        {
          type: "steps",
          items: [
            "Open Analytics from the sidebar or More menu",
            "Review charts for searches and network trends",
            "Compare against connector sync health if growth is flat",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "connect-data", label: "Connect your data" },
            { slug: "search-network", label: "Search your network" },
          ],
        },
      ],
    ),
    page(
      "settings-profile",
      "Profile settings",
      "Analytics and settings",
      "Update the name, photo, and details teammates see.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "In Settings you can edit your profile photo, name, title, and related fields. Teammates see this information on group member lists and shared profiles.",
        },
        {
          type: "steps",
          items: [
            "Open Settings",
            "Update profile fields and photo (crop supported)",
            "Save when the form is dirty and required fields are valid",
          ],
        },
      ],
    ),
    page(
      "email-sender",
      "Email sender",
      "Analytics and settings",
      "Choose platform sending or a verified custom from-address.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Playbook and system email need a sender identity. Use the platform address, or switch to custom sender name and email after you verify your domain DNS records.",
        },
        {
          type: "steps",
          items: [
            "Open Settings → email sender controls",
            "Choose platform or custom mode",
            "For custom, enter sender name and email, then start domain setup",
            "Add the DNS records at your domain provider",
            "Wait for verification (status refreshes automatically) before sending",
          ],
        },
        {
          type: "callout",
          title: "Why this matters",
          body: "Unverified domains will fail or delay outreach. Confirm Domain verified before large playbook sends.",
        },
        {
          type: "links",
          items: [
            { slug: "playbook-runs", label: "Playbook runs" },
            { slug: "get-help", label: "Get help" },
          ],
        },
      ],
    ),
    page(
      "settings-notifications",
      "Notifications",
      "Analytics and settings",
      "Control email and in-app alerts for intros and sync events.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Notification toggles in Settings let you choose what you hear about: introductions, sync outcomes, and related workspace events. Adjust these if you want a quieter inbox.",
        },
        {
          type: "steps",
          items: [
            "Open Settings",
            "Find notification preferences",
            "Enable or disable the alerts you care about",
            "Save changes",
          ],
        },
      ],
    ),
    page(
      "settings-appearance",
      "Appearance",
      "Analytics and settings",
      "Theme and compact density for the app chrome.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Appearance settings control theme and compact mode. Compact mode tightens padding across the shell so more content fits on smaller laptops.",
        },
        {
          type: "steps",
          items: [
            "Open Settings",
            "Choose theme preference if available",
            "Toggle compact mode if you want denser layout",
          ],
        },
      ],
    ),
  ],
};

export const billingAdminSection: DocSection = {
  id: "billing-admin",
  title: "Billing and admin",
  pages: [
    page(
      "plans-limits",
      "Plans and limits",
      "Billing and admin",
      "Understand Free, Pro, and Enterprise capacity for contacts, searches, and accounts.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Each group has a plan that caps resources such as contacts, searches, and connected accounts. When you approach a cap, imports or searches may be blocked until you upgrade or free capacity.",
        },
        {
          type: "steps",
          items: [
            "Check your group plan badge on Groups",
            "Review limits on Pricing if you need more capacity",
            "Upgrade with checkout when Pro fits, or contact sales for Enterprise",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "upgrade-billing", label: "Upgrade and billing" },
            { slug: "usage-limits", label: "When you hit a limit" },
            { slug: "manage-group", label: "Manage a group" },
          ],
        },
      ],
    ),
    page(
      "upgrade-billing",
      "Upgrade and billing",
      "Billing and admin",
      "Move a group to Pro with Stripe checkout or contact Enterprise.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Pricing explains Free, Pro, and Enterprise. Pro upgrades use Stripe Checkout. After payment completes, the group plan updates. Enterprise deals are handled by contacting the team.",
        },
        {
          type: "steps",
          items: [
            "Open Pricing from the marketing site or an upgrade prompt",
            "Choose Pro checkout for self-serve upgrade",
            "Complete Stripe payment",
            "Return to Groups and confirm the plan badge updated",
          ],
        },
        {
          type: "tip",
          text: "If checkout succeeds but the badge lags, refresh Groups. Billing webhooks update the plan after payment.",
        },
      ],
    ),
    page(
      "usage-limits",
      "When you hit a limit",
      "Billing and admin",
      "What to do when search, import, or account caps block an action.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Limit errors usually appear when a free or lower plan is full. Free capacity by removing unused connector accounts or contacts where appropriate, or upgrade the group plan.",
        },
        {
          type: "steps",
          items: [
            "Read the error toast or banner carefully",
            "Check Groups for plan and connected account counts",
            "Disconnect unused accounts or finish pending imports later",
            "Upgrade if you need sustained higher limits",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "plans-limits", label: "Plans and limits" },
            { slug: "upgrade-billing", label: "Upgrade and billing" },
            { slug: "connector-accounts", label: "Manage connector accounts" },
          ],
        },
      ],
    ),
    page(
      "feature-flags",
      "Feature flags",
      "Billing and admin",
      "Admin controls that enable Agent Mode, graph, chat, billing enforcement, and more.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Workspace admins can toggle feature flags in Admin. Flags gate major surfaces such as AI search, network graph, outreach engine, playbook mode, platform chat, beta connectors, team collaboration, and billing enforcement.",
        },
        {
          type: "steps",
          items: [
            "Open Admin (admin users only)",
            "Review the feature flag catalog",
            "Enable the capabilities your team needs",
            "Ask members to refresh if a sidebar item does not appear yet",
          ],
        },
        {
          type: "callout",
          title: "If Agent Mode is missing",
          body: "Playbooks, Segments, and Chats depend on playbook-related flags. Confirm those flags before troubleshooting missing nav items.",
        },
      ],
    ),
    page(
      "privacy-data",
      "Data and privacy basics",
      "Billing and admin",
      "What Potentially stores from connectors and how unsubscribe works.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Synced contacts, enrichment metadata, search history, and outreach artifacts are stored so the product can search, score, and message. Disconnect a connector when you want to stop syncing that source. Recipients can use unsubscribe links on outbound email where provided.",
        },
        {
          type: "steps",
          items: [
            "Only connect accounts you are allowed to sync",
            "Disconnect sources you no longer need",
            "Respect unsubscribe and do-not-contact signals in enrichment",
            "Ask an admin before exporting or sharing contact lists outside the team",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "connector-accounts", label: "Manage connector accounts" },
            { slug: "get-help", label: "Get help" },
          ],
        },
      ],
    ),
  ],
};
