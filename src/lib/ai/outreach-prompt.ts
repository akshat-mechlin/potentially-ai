export type OutreachMessageType = "cold_email" | "warm_intro" | "linkedin";

export type OutreachPromptParams = {
  contactName: string;
  contactTitle: string | null;
  companyName: string | null;
  type: OutreachMessageType;
  tone: string;
  goal: string;
  context?: string;
  /** Extra recipient facts (location, bio, industry, etc.) when available */
  recipientFacts?: string[];
};

const TYPE_LABELS: Record<OutreachMessageType, string> = {
  cold_email: "cold email",
  warm_intro: "warm introduction request",
  linkedin: "LinkedIn message",
};

/**
 * Shared system prompt for AI outreach drafts.
 * Forbids meta/process language and requires personalization from recipient facts.
 */
export function buildOutreachSystemPrompt(params: OutreachPromptParams): string {
  const kind = TYPE_LABELS[params.type];
  return `You write a ${kind} with a ${params.tone} tone.

Write like a sharp, credible human. Keep it concise (about 80-140 words for email body).
Do not use em dashes. Avoid stacked hyphenated buzzwords and hollow flattery.

Personalization rules (required):
- Ground the message in the recipient's real details provided (name, title, company, and any extra facts).
- Reference something specific and plausible about their role, company, or domain.
- If details are thin, write a clean, role-aware note without inventing biography.

Never mention any of the following (strict):
- Outreach lists, CRM, pipelines, playbooks, sequences, campaigns, or "initial run"
- That a profile was skipped, missed, filtered, queued, batched, or re-added
- Internal tooling, automation, scoring, match reasons, or that this was AI-generated
- Apologies for delayed/missed outreach caused by your process

Subject (emails only): short, personal, no spammy hype.
Return JSON only: { "subject": string (for emails; omit or empty for LinkedIn), "body": string, "cta": string }`;
}

export function buildOutreachUserPrompt(params: OutreachPromptParams): string {
  const firstName = params.contactName.trim().split(/\s+/)[0] || params.contactName;
  const lines = [
    `Recipient full name: ${params.contactName}`,
    `Recipient first name: ${firstName}`,
    `Title: ${params.contactTitle?.trim() || "Unknown"}`,
    `Company: ${params.companyName?.trim() || "Unknown"}`,
    `Goal: ${params.goal.trim()}`,
  ];

  const facts = (params.recipientFacts ?? []).map((f) => f.trim()).filter(Boolean);
  if (facts.length > 0) {
    lines.push(`Known facts about recipient:\n- ${facts.join("\n- ")}`);
  }

  const context = sanitizeOutreachContext(params.context);
  if (context) {
    lines.push(`Helpful background (use only as substance for personalization; never quote process language):\n${context}`);
  }

  lines.push(
    "Write the message as if you researched this person yourself. Do not invent employers, titles, or achievements not listed above.",
  );

  return lines.join("\n");
}

/** Extra recipient facts for the model — only include known values. */
export function buildRecipientFacts(contact: {
  location?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  tags?: string[] | null;
  company?: { industry?: string | null; name?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}): string[] {
  const facts: string[] = [];
  if (contact.location?.trim()) facts.push(`Location: ${contact.location.trim()}`);
  if (contact.company?.industry?.trim()) {
    facts.push(`Industry: ${contact.company.industry.trim()}`);
  }
  if (contact.bio?.trim()) {
    const bio = contact.bio.trim().replace(/\s+/g, " ");
    facts.push(`Bio: ${bio.length > 280 ? `${bio.slice(0, 277)}...` : bio}`);
  }
  if (contact.tags?.length) {
    facts.push(`Tags: ${contact.tags.filter(Boolean).slice(0, 8).join(", ")}`);
  }
  if (contact.linkedin_url?.trim()) facts.push("Has LinkedIn profile on file");

  const meta = contact.metadata ?? {};
  for (const key of ["industry", "seniority", "department", "headline"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) {
      facts.push(`${key[0].toUpperCase()}${key.slice(1)}: ${value.trim()}`);
    }
  }

  return facts;
}

/** Strip internal ops phrasing that models otherwise echo into the email. */
export function sanitizeOutreachContext(context?: string | null): string | undefined {
  if (!context?.trim()) return undefined;
  const blocked =
    /\b(outreach list|skipped|initial run|playbook|sequence|crm|pipeline|queued|batch|match score|automation|draft)\b/i;
  const cleaned = context
    .split(/[\n.;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !blocked.test(part))
    .join(". ")
    .trim();
  return cleaned || undefined;
}
