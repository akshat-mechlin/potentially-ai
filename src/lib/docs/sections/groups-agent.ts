import { page, type DocSection } from "@/lib/docs/types";

export const groupsSection: DocSection = {
  id: "groups",
  title: "Groups",
  pages: [
    page(
      "groups",
      "Groups overview",
      "Groups",
      "Organize connectors by group and share a searchable network with teammates.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Groups are shared workspaces. Contacts synced by any member become searchable to the group. That is how Potentially surfaces teammate warm paths in Search.",
        },
        {
          type: "screenshot",
          src: "/docs/groups.png",
          alt: "Group detail",
          caption: "Open a group to see members, contact counts, playbooks, and actions.",
        },
        {
          type: "steps",
          items: [
            "Open Groups and create or select a group",
            "Invite teammates with the right role",
            "Ask each person to connect their accounts",
            "Use Search across all groups to include teammate networks",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "invite-teammates", label: "Invite teammates" },
            { slug: "manage-group", label: "Manage a group" },
            { slug: "search-network", label: "Search your network" },
          ],
        },
      ],
    ),
    page(
      "invite-teammates",
      "Invite teammates",
      "Groups",
      "Add people to a group with invites and role-aware access.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "From a group, use Invite member to send an email invite or share an invite link. Recipients land on the invite flow, join the group, and can then sync their own connectors into the shared network.",
        },
        {
          type: "steps",
          items: [
            "Open the group detail page",
            "Click Invite member",
            "Choose email invite or copy the invite link",
            "Assign an appropriate role (owner, admin, member, or viewer)",
            "Confirm the new person appears under Team members",
          ],
        },
        {
          type: "tip",
          text: "Owners cannot leave while other members remain. Transfer ownership or delete the group first.",
        },
      ],
    ),
    page(
      "manage-group",
      "Manage a group",
      "Groups",
      "Update branding, review stats, leave, or delete a group.",
      [
        {
          type: "heading",
          id: "overview",
          text: "What you can manage",
        },
        {
          type: "paragraph",
          text: "Group detail shows members, contact volume, playbooks, and connected accounts. Owners and admins can invite people, manage connectors for the group context, update the group logo, and delete the group when appropriate.",
        },
        {
          type: "steps",
          items: [
            "Open Groups and select a group",
            "Review KPI cards for members, contacts, playbooks, and accounts",
            "Use Actions to search this group, manage connectors, or invite",
            "Edit the logo with the pencil control on the group avatar",
            "Delete only when you are sure the shared data should be removed",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "groups", label: "Groups overview" },
            { slug: "connect-data", label: "Connect your data" },
            { slug: "plans-limits", label: "Plans and limits" },
          ],
        },
      ],
    ),
  ],
};

export const agentModeSection: DocSection = {
  id: "agent-mode",
  title: "Agent Mode",
  pages: [
    page(
      "segments",
      "Segments",
      "Agent Mode",
      "Save reusable contact lists for playbook runs and campaigns.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Segments are named lists of contacts. Create them from Search or Contacts with select mode, or manage them under Segments in Agent Mode.",
        },
        {
          type: "steps",
          items: [
            "Open Segments to see saved lists",
            "Create a segment and give it a clear name",
            "Add contacts from Search or Contacts select mode",
            "Open a segment to review or remove people",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "search-filters", label: "Search filters and segments" },
            { slug: "playbooks", label: "Playbooks" },
            { slug: "playbook-runs", label: "Playbook runs" },
          ],
        },
      ],
    ),
    page(
      "playbooks",
      "Playbooks",
      "Agent Mode",
      "Configure ICP, sequences, and automation for warm-path-first outreach.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Playbooks define who you target, how you write, when follow ups fire, and how much automation you allow. Create a playbook, then open it to edit settings, templates, sequence, runs, and audit history.",
        },
        {
          type: "screenshot",
          src: "/docs/segments-playbooks.png",
          alt: "Playbooks list",
          caption: "Create a playbook, then open it to configure settings and start a run.",
        },
        {
          type: "links",
          items: [
            { slug: "playbook-settings", label: "Playbook settings" },
            { slug: "playbook-sequence", label: "Sequences" },
            { slug: "playbook-templates", label: "Email templates" },
            { slug: "playbook-runs", label: "Playbook runs" },
            { slug: "calendly-booking", label: "Calendly booking" },
          ],
        },
      ],
    ),
    page(
      "playbook-settings",
      "Playbook settings",
      "Agent Mode",
      "ICP filters, dedupe, cooldown, daily cap, Calendly, and automation level.",
      [
        {
          type: "heading",
          id: "overview",
          text: "What you can configure",
        },
        {
          type: "paragraph",
          text: "Settings control who matches a run and how sending behaves. Use info icons next to fields for short explanations inside the form.",
        },
        {
          type: "steps",
          items: [
            "Set ICP titles, keywords, and minimum strength if needed",
            "Configure dedupe and cooldown so people are not over-contacted",
            "Optional: set a daily email cap",
            "Add a Calendly URL so outbound mail can include a tracked booking link",
            "Choose Assist, Supervised, or Autonomous automation",
          ],
        },
        {
          type: "callout",
          title: "Automation levels",
          body: "Assist means you approve every send. Supervised queues drafts for review. Autonomous sends after drafts are generated without manual approval.",
        },
      ],
    ),
    page(
      "playbook-sequence",
      "Sequences",
      "Agent Mode",
      "Define follow-up timing, allowed weekdays, tone, and goals.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "A sequence is the series of follow ups after the first touch. Each step waits a number of days, only fires on allowed weekdays, and can use a preset or custom tone and goal.",
        },
        {
          type: "steps",
          items: [
            "Open a playbook → Sequence",
            "Add or edit steps with delay in days",
            "Select weekdays when the step may send",
            "Pick tone and goal (or Custom)",
            "Save the sequence before starting a run",
          ],
        },
        {
          type: "tip",
          text: "After the delay passes, the job waits until the next allowed weekday before sending.",
        },
      ],
    ),
    page(
      "playbook-templates",
      "Email templates",
      "Agent Mode",
      "Reusable subjects and bodies with merge fields for playbook outreach.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Templates store subject and body text you can reuse. Merge fields such as name and company keep messages personal. You can still generate AI drafts during a run when a template is not enough.",
        },
        {
          type: "steps",
          items: [
            "Open a playbook → Templates",
            "Create a template with a clear name",
            "Write subject and body with merge fields where useful",
            "Save, then select the template when drafting in a run",
          ],
        },
      ],
    ),
    page(
      "playbook-runs",
      "Playbook runs",
      "Agent Mode",
      "Match a segment, generate drafts, approve, and send outreach.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "A run applies a playbook to contacts (usually from a segment). You review matches, include skipped people if needed, generate drafts, approve sends, and track progress on the run screen.",
        },
        {
          type: "steps",
          items: [
            "Open a playbook and start a new run",
            "Choose a segment or all groups as the source",
            "Review matches and finalize selection",
            "Generate drafts, then approve or send based on automation level",
            "Open a prospect for per-person draft edits, booking, or chat",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "playbook-prospect", label: "Prospect detail" },
            { slug: "playbook-audit", label: "Audit log" },
            { slug: "chats", label: "Chats" },
            { slug: "email-sender", label: "Email sender" },
          ],
        },
      ],
    ),
    page(
      "playbook-prospect",
      "Prospect detail",
      "Agent Mode",
      "Edit drafts, send, book meetings, and follow a single prospect in a run.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Prospect pages show match reason, draft subject and body, send controls, and booking state. Use them when a contact needs a personal tweak before send.",
        },
        {
          type: "steps",
          items: [
            "Open a run and select a prospect",
            "Edit the draft if needed",
            "Send or approve according to automation level",
            "Mark booked when a meeting is scheduled so follow ups stop",
          ],
        },
        {
          type: "links",
          items: [
            { slug: "calendly-booking", label: "Calendly booking" },
            { slug: "chat-thread", label: "Chat thread" },
          ],
        },
      ],
    ),
    page(
      "playbook-audit",
      "Audit log",
      "Agent Mode",
      "Review actions taken on a playbook for accountability.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "The audit view lists meaningful playbook actions so owners can see what changed and when. Use it when debugging sends, approvals, or configuration updates.",
        },
        {
          type: "steps",
          items: [
            "Open a playbook → Audit",
            "Scan recent events",
            "Cross-check a run or prospect if something looks off",
          ],
        },
      ],
    ),
    page(
      "calendly-booking",
      "Calendly booking",
      "Agent Mode",
      "Add a scheduling link so prospects can book and follow ups stop automatically.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Paste your Calendly URL in playbook settings. Outbound emails can include a tracked booking link. When someone books (embed or webhook), the prospect is marked booked and follow ups stop.",
        },
        {
          type: "steps",
          items: [
            "Copy your Calendly event link",
            "Paste it into playbook settings",
            "Generate and send outreach that includes the link",
            "Confirm booking detection on the prospect when a meeting lands",
          ],
        },
        {
          type: "tip",
          text: "Workspace admins may also configure Calendly webhooks for reliable booking events.",
        },
      ],
    ),
    page(
      "chats",
      "Chats",
      "Agent Mode",
      "Inbox for prospect conversations when platform chat is enabled.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "Chats lists conversations tied to playbook prospects. Open a thread to message in-app when the other person is on Potentially, or fall back to emailed invites when they are not.",
        },
        {
          type: "steps",
          items: [
            "Open Chats under Agent Mode",
            "Select a conversation",
            "Read the thread and activity timeline",
            "Reply from the composer",
          ],
        },
        {
          type: "callout",
          title: "Feature flag",
          body: "Platform chat may require the platform_chat feature flag. Ask an admin if Chats is missing.",
        },
        {
          type: "links",
          items: [
            { slug: "chat-thread", label: "Chat thread" },
            { slug: "feature-flags", label: "Feature flags" },
          ],
        },
      ],
    ),
    page(
      "chat-thread",
      "Chat thread",
      "Agent Mode",
      "Message a prospect and review activity on the shared thread.",
      [
        {
          type: "heading",
          id: "overview",
          text: "Overview",
        },
        {
          type: "paragraph",
          text: "A thread shows messages and related activity. If the person is on Potentially, messages deliver in their inbox. If not, Potentially emails the message with an invite to join and reply.",
        },
        {
          type: "steps",
          items: [
            "Open a chat from Chats or a prospect",
            "Read prior messages and activity",
            "Send a reply",
            "Delete your own message if you need to correct a mistake",
          ],
        },
      ],
    ),
  ],
};
