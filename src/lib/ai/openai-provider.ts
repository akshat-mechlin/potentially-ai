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
  const validated = searchResultSchema.safeParse(parsed);

  if (validated.success) {
    return validated.data;
  }

  return {
    contacts: parsed.contacts ?? [],
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

export async function openaiGenerateContactSummary(contact: {
  full_name: string;
  title: string | null;
  company_name: string | null;
  bio: string | null;
  tags: string[];
}): Promise<string> {
  if (!openai) throw new Error("OpenAI not configured");

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
