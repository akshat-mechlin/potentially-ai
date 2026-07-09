export interface FirstVisitTip {
  title: string;
  description: string;
}

export const FIRST_VISIT_TOUR_STORAGE_KEY = "potentially-first-visit-tour-v1";

export const FIRST_VISIT_TIPS: FirstVisitTip[] = [
  {
    title: "Welcome to Potentially",
    description:
      "This is your relationship intelligence home base. Track contacts, warm paths, and outreach from one workspace.",
  },
  {
    title: "Search your network",
    description:
      "Use AI search to ask natural-language questions like “Who do I know at fintech startups in NYC?”",
  },
  {
    title: "Groups & connectors",
    description:
      "Invite teammates under Groups, then connect Google or Outlook to import contacts into your shared network.",
  },
  {
    title: "Playbooks & outreach",
    description:
      "Build playbooks with sequences, match prospects to your ICP, and send personalized outreach at scale.",
  },
  {
    title: "You're ready",
    description:
      "Start with a search or import contacts. Open Chats after a playbook run to keep conversations in one thread per contact.",
  },
];
