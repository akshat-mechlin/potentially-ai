import OpenAI from "openai";
import type { SearchResult, OutreachResult } from "@/types";
import { searchResultSchema } from "@/lib/ai/schemas";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function openaiGenerateEmbedding(text: string): Promise<number[]> {
  if (!openai) throw new Error("OpenAI not configured");

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

export async function openaiParseSearchIntent(query: string) {
  if (!openai) throw new Error("OpenAI not configured");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Parse the user's network search query. Extract intent, roles, industries, companies, and keywords.
Return JSON: { "intent": string, "filters": { "roles": string[], "industries": string[], "companies": string[], "keywords": string[] } }`,
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function openaiRankAndExplain(
  query: string,
  contacts: Array<{
    id: string;
    full_name: string;
    title: string | null;
    email: string | null;
    company_name: string | null;
    similarity?: number;
  }>,
): Promise<SearchResult> {
  if (!openai) throw new Error("OpenAI not configured");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a relationship intelligence assistant. Rank contacts by relevance to the query.
For each contact provide: score (0-100), reason, warm_intro_path (array of names), recommended_action.
Return JSON matching: { contacts: [...], summary: string, suggested_actions: string[] }`,
      },
      {
        role: "user",
        content: `Query: "${query}"\n\nContacts:\n${JSON.stringify(contacts, null, 2)}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const hydrate = (rows: SearchResult["contacts"] | undefined) =>
    (rows ?? [])
      .map((row) => {
        const source = byId.get(row.id);
        if (!source && !row.full_name) return null;
        return {
          ...row,
          full_name: row.full_name || source?.full_name || "Unknown",
          title: row.title ?? source?.title ?? null,
          email: row.email ?? source?.email ?? null,
          company_name: row.company_name ?? source?.company_name ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const validated = searchResultSchema.safeParse({
    ...parsed,
    contacts: hydrate(parsed.contacts),
  });

  if (validated.success) {
    return validated.data;
  }

  return {
    contacts: hydrate(parsed.contacts),
    summary: parsed.summary ?? `Found contacts matching "${query}".`,
    suggested_actions: parsed.suggested_actions ?? [],
  };
}

export async function openaiGenerateOutreach(params: {
  contactName: string;
  contactTitle: string | null;
  companyName: string | null;
  type: "cold_email" | "warm_intro" | "linkedin";
  tone: string;
  goal: string;
  context?: string;
}): Promise<OutreachResult> {
  if (!openai) throw new Error("OpenAI not configured");

  const typeLabels = {
    cold_email: "cold email",
    warm_intro: "warm introduction request",
    linkedin: "LinkedIn message",
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate a ${typeLabels[params.type]} with a ${params.tone} tone.
Return JSON: { "subject": string (for emails), "body": string, "cta": string }`,
      },
      {
        role: "user",
        content: `Contact: ${params.contactName}, ${params.contactTitle || "Professional"} at ${params.companyName || "their company"}
Goal: ${params.goal}
${params.context ? `Context: ${params.context}` : ""}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

const CONTACT_SUMMARY_SYSTEM = `You write a straightforward third-person professional summary of a person.

Style:
- Start with the person's name, then who they are (role + company), like: "CJ is the Co-Founder and CEO of Diamond Kinetics."
- Continue in natural third-person prose. Never write "this briefing", "this profile", "CRM", "relationship intelligence", "was added", "tagged", or "imported".
- Use ONLY facts in the JSON. Do not invent details.
- Prefer 2–4 short paragraphs, or one short paragraph plus a few "• " bullets for extra professional facts (industry, location, funding, seniority, etc.).
- Cover useful career/company enrichment only.
- Do NOT mention email, phone, LinkedIn, Twitter, websites, or that contact channels "are on file". Those appear elsewhere on the page.
- Do NOT mention tags, import source, or how the record was created.
- Plain text only. No markdown headings.`;

export async function openaiGenerateContactSummary(contact: Record<string, unknown>): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: CONTACT_SUMMARY_SYSTEM },
      { role: "user", content: JSON.stringify(contact) },
    ],
    max_tokens: 700,
    temperature: 0.3,
  });

  return response.choices[0].message.content?.trim() || "";
}
