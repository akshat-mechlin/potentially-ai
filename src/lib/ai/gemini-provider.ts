import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import type { SearchResult, OutreachResult } from "@/types";
import {
  CONTACT_SUMMARY_SYSTEM,
  type ContactSummaryInput,
} from "@/lib/ai/contact-summary";
import { parseModelJson } from "@/lib/ai/parse-model-json";
import {
  buildOutreachSystemPrompt,
  buildOutreachUserPrompt,
  type OutreachPromptParams,
} from "@/lib/ai/outreach-prompt";
import { outreachResultSchema, searchResultSchema } from "@/lib/ai/schemas";

const EMBEDDING_DIMENSION = 1536;
const GEMINI_CHAT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";

function getClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini not configured");
  return new GoogleGenerativeAI(apiKey);
}

function getChatModel(
  systemInstruction?: string,
  responseSchema?: ResponseSchema,
) {
  return getClient().getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
      ...(responseSchema ? { responseSchema } : {}),
    },
  });
}

const outreachResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
    cta: { type: SchemaType.STRING },
  },
  required: ["body", "cta"],
} satisfies ResponseSchema;

/** L2-normalize truncated Gemini embeddings (required for gemini-embedding-001 < 3072). */
function normalizeEmbedding(values: number[]): number[] {
  let sumSquares = 0;
  for (const v of values) sumSquares += v * v;
  const norm = Math.sqrt(sumSquares);
  if (!norm || !Number.isFinite(norm)) return values;
  return values.map((v) => v / norm);
}

export async function geminiGenerateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini not configured");

  const input = text.trim().slice(0, 8000) || " ";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text: input }] },
        outputDimensionality: EMBEDDING_DIMENSION,
        taskType: "RETRIEVAL_QUERY",
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini embedding failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!values?.length) {
    throw new Error("Gemini embedding returned empty");
  }
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Gemini embedding dimension ${values.length} != ${EMBEDDING_DIMENSION}`,
    );
  }
  return normalizeEmbedding(values);
}

export async function geminiParseSearchIntent(query: string) {
  const model = getChatModel(
    `Parse the user's network search query. Extract intent, roles, industries, companies, and keywords.
Return JSON: { "intent": string, "filters": { "roles": string[], "industries": string[], "companies": string[], "keywords": string[] } }`,
  );

  const result = await model.generateContent(query);
  return parseModelJson(result.response.text());
}

export async function geminiRankAndExplain(
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
  const model = getChatModel(
    `You are a relationship intelligence assistant. Rank contacts by relevance to the query.
Use title, company, location, strength_score, and enrichment_snippet (seniority, industry, keywords, funding, etc.) when scoring.
Prefer stronger lead scores and better enrichment matches when relevance is otherwise similar.
For each contact provide: score (0-100), reason, warm_intro_path (array of names), recommended_action.
Return JSON matching: { contacts: [...], summary: string, suggested_actions: string[] }`,
  );

  const result = await model.generateContent(
    `Query: "${query}"\n\nContacts:\n${JSON.stringify(contacts, null, 2)}`,
  );
  const parsed = parseModelJson<SearchResult>(result.response.text());
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

export async function geminiGenerateOutreach(
  params: OutreachPromptParams,
): Promise<OutreachResult> {
  const model = getChatModel(
    `${buildOutreachSystemPrompt(params)}
Return valid JSON only. Use \\n for line breaks inside the body string (no raw newlines inside JSON strings).`,
    outreachResponseSchema,
  );

  const result = await model.generateContent(buildOutreachUserPrompt(params));

  const parsed = parseModelJson<OutreachResult>(result.response.text());
  const validated = outreachResultSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  return {
    subject: typeof parsed.subject === "string" ? parsed.subject : undefined,
    body: typeof parsed.body === "string" ? parsed.body : "",
    cta: typeof parsed.cta === "string" ? parsed.cta : "Open to a quick chat?",
  };
}

export async function geminiGenerateContactSummary(
  contact: ContactSummaryInput | Record<string, unknown>,
): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction: CONTACT_SUMMARY_SYSTEM,
    generationConfig: { maxOutputTokens: 1200, temperature: 0.2 },
  });

  const result = await model.generateContent(
    `Write a complete summary from this JSON only. Every sentence must finish with punctuation. Never end mid-phrase.\n${JSON.stringify(contact)}`,
  );
  return result.response.text().trim();
}
