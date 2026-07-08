import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import type { SearchResult, OutreachResult } from "@/types";
import { parseModelJson } from "@/lib/ai/parse-model-json";
import { outreachResultSchema, searchResultSchema } from "@/lib/ai/schemas";

const EMBEDDING_DIMENSION = 1536;
const GEMINI_CHAT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

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

export async function geminiGenerateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSION,
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
  return values;
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
    similarity?: number;
  }>,
): Promise<SearchResult> {
  const model = getChatModel(
    `You are a relationship intelligence assistant. Rank contacts by relevance to the query.
For each contact provide: score (0-100), reason, warm_intro_path (array of names), recommended_action.
Return JSON matching: { contacts: [...], summary: string, suggested_actions: string[] }`,
  );

  const result = await model.generateContent(
    `Query: "${query}"\n\nContacts:\n${JSON.stringify(contacts, null, 2)}`,
  );
  const parsed = parseModelJson<SearchResult>(result.response.text());
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

export async function geminiGenerateOutreach(params: {
  contactName: string;
  contactTitle: string | null;
  companyName: string | null;
  type: "cold_email" | "warm_intro" | "linkedin";
  tone: string;
  goal: string;
  context?: string;
}): Promise<OutreachResult> {
  const typeLabels = {
    cold_email: "cold email",
    warm_intro: "warm introduction request",
    linkedin: "LinkedIn message",
  };

  const model = getChatModel(
    `Generate a ${typeLabels[params.type]} with a ${params.tone} tone.
Return valid JSON only. Use \\n for line breaks inside the body string (no raw newlines inside JSON strings).
Return JSON: { "subject": string (for emails), "body": string, "cta": string }`,
    outreachResponseSchema,
  );

  const result = await model.generateContent(
    `Contact: ${params.contactName}, ${params.contactTitle || "Professional"} at ${params.companyName || "their company"}
Goal: ${params.goal}
${params.context ? `Context: ${params.context}` : ""}`,
  );

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

export async function geminiGenerateContactSummary(contact: {
  full_name: string;
  title: string | null;
  company_name: string | null;
  bio: string | null;
  tags: string[];
}): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction: "Generate a brief 2-3 sentence professional summary of this contact.",
    generationConfig: { maxOutputTokens: 150, temperature: 0.4 },
  });

  const result = await model.generateContent(JSON.stringify(contact));
  return result.response.text().trim();
}
