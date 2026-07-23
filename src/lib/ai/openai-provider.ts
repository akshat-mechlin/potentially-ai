import OpenAI from "openai";
import type { SearchResult, OutreachResult } from "@/types";
import {
  CONTACT_SUMMARY_SYSTEM,
  type ContactSummaryInput,
} from "@/lib/ai/contact-summary";
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
    location?: string | null;
    strength_score?: number;
    enrichment_snippet?: string | null;
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
Use title, company, location, strength_score, and enrichment_snippet (seniority, industry, keywords, funding, etc.) when scoring.
Prefer stronger lead scores and better enrichment matches when relevance is otherwise similar.
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

import {
  buildOutreachSystemPrompt,
  buildOutreachUserPrompt,
  type OutreachPromptParams,
} from "@/lib/ai/outreach-prompt";

export async function openaiGenerateOutreach(
  params: OutreachPromptParams,
): Promise<OutreachResult> {
  if (!openai) throw new Error("OpenAI not configured");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: buildOutreachSystemPrompt(params),
      },
      {
        role: "user",
        content: buildOutreachUserPrompt(params),
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.55,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function openaiGenerateContactSummary(
  contact: ContactSummaryInput | Record<string, unknown>,
): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: CONTACT_SUMMARY_SYSTEM },
      {
        role: "user",
        content: `Write a complete summary from this JSON only. Every sentence must finish with punctuation. Never end mid-phrase.\n${JSON.stringify(contact)}`,
      },
    ],
    max_tokens: 1200,
    temperature: 0.2,
  });

  return response.choices[0].message.content?.trim() || "";
}
