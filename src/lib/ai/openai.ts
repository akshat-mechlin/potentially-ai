import OpenAI from "openai";
import { z } from "zod";
import type { SearchResult, SearchResultContact, OutreachResult } from "@/types";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const searchResultSchema = z.object({
  contacts: z.array(
    z.object({
      id: z.string(),
      full_name: z.string(),
      title: z.string().nullable(),
      email: z.string().nullable(),
      company_name: z.string().nullable(),
      score: z.number(),
      reason: z.string(),
      warm_intro_path: z.array(z.string()),
      recommended_action: z.string(),
    }),
  ),
  summary: z.string(),
  suggested_actions: z.array(z.string()),
});

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    return Array.from({ length: 1536 }, () => Math.random() * 0.01);
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

export async function parseSearchIntent(query: string) {
  if (!openai) {
    return {
      intent: "search",
      filters: { roles: [], industries: [], keywords: query.split(" ") },
    };
  }

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

export async function rankAndExplain(
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
  if (!openai || contacts.length === 0) {
    return generateMockSearchResult(query, contacts);
  }

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
  return searchResultSchema.parse(parsed);
}

export async function generateOutreach(params: {
  contactName: string;
  contactTitle: string | null;
  companyName: string | null;
  type: "cold_email" | "warm_intro" | "linkedin";
  tone: string;
  goal: string;
  context?: string;
}): Promise<OutreachResult> {
  if (!openai) {
    return generateMockOutreach(params);
  }

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

export async function generateContactSummary(contact: {
  full_name: string;
  title: string | null;
  company_name: string | null;
  bio: string | null;
  tags: string[];
}): Promise<string> {
  if (!openai) {
    return `${contact.full_name} is ${contact.title || "a professional"}${contact.company_name ? ` at ${contact.company_name}` : ""}.`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Generate a brief 2-3 sentence professional summary of this contact.",
      },
      { role: "user", content: JSON.stringify(contact) },
    ],
    max_tokens: 150,
  });

  return response.choices[0].message.content || "";
}

function generateMockSearchResult(
  query: string,
  contacts: Array<{
    id: string;
    full_name: string;
    title: string | null;
    email: string | null;
    company_name: string | null;
    similarity?: number;
  }>,
): SearchResult {
  const results: SearchResultContact[] = contacts.slice(0, 10).map((c, i) => ({
    id: c.id,
    full_name: c.full_name,
    title: c.title,
    email: c.email,
    company_name: c.company_name,
    score: Math.round((c.similarity || 0.8 - i * 0.05) * 100),
    reason: `Relevant match for "${query}" based on title and company alignment.`,
    warm_intro_path: ["You"],
    recommended_action: "Reach out via warm introduction or direct email.",
  }));

  return {
    contacts: results,
    summary: `Found ${results.length} contacts matching "${query}".`,
    suggested_actions: [
      "Request warm introductions from mutual connections",
      "Filter by industry or role",
      "Save this search for future reference",
    ],
  };
}

function generateMockOutreach(params: {
  contactName: string;
  type: string;
  tone: string;
  goal: string;
}): OutreachResult {
  return {
    subject: `Introduction — ${params.goal}`,
    body: `Hi ${params.contactName.split(" ")[0]},\n\nI hope this message finds you well. I wanted to reach out regarding ${params.goal}.\n\nI'd love to connect and explore how we might collaborate.\n\nBest regards`,
    cta: "Would you be open to a brief 15-minute call this week?",
  };
}

export function isAIConfigured() {
  return !!process.env.OPENAI_API_KEY;
}
