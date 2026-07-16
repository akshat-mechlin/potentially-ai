import type { SearchResult, SearchResultContact, OutreachResult } from "@/types";
import {
  type AIProvider,
  isAIConfigured,
  withProviderFallback,
} from "@/lib/ai/config";
import {
  buildFallbackContactSummary,
  finalizeContactSummary,
  shouldUseDeterministicSummary,
  type ContactSummaryInput,
} from "@/lib/ai/contact-summary";
import {
  geminiGenerateContactSummary,
  geminiGenerateEmbedding,
  geminiGenerateOutreach,
  geminiParseSearchIntent,
  geminiRankAndExplain,
} from "@/lib/ai/gemini-provider";
import {
  openaiGenerateContactSummary,
  openaiGenerateEmbedding,
  openaiGenerateOutreach,
  openaiParseSearchIntent,
  openaiRankAndExplain,
} from "@/lib/ai/openai-provider";

export { searchResultSchema } from "@/lib/ai/schemas";
export {
  isAIConfigured,
  isOpenAIConfigured,
  isGeminiConfigured,
  getAvailableProviders,
} from "@/lib/ai/config";

async function runChat<T>(
  label: string,
  handlers: Record<AIProvider, () => Promise<T>>,
): Promise<T> {
  return withProviderFallback(label, (provider) => handlers[provider]());
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await runChat("embedding", {
      openai: () => openaiGenerateEmbedding(text),
      gemini: () => geminiGenerateEmbedding(text),
    });
  } catch {
    return Array.from({ length: 1536 }, () => Math.random() * 0.01);
  }
}

export async function parseSearchIntent(query: string) {
  try {
    return await runChat("parseSearchIntent", {
      openai: () => openaiParseSearchIntent(query),
      gemini: () => geminiParseSearchIntent(query),
    });
  } catch {
    return {
      intent: "search",
      filters: { roles: [], industries: [], keywords: query.split(" ") },
    };
  }
}

export async function rankAndExplain(
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
  if (contacts.length === 0) {
    return generateMockSearchResult(query, contacts);
  }

  try {
    return await runChat("rankAndExplain", {
      openai: () => openaiRankAndExplain(query, contacts),
      gemini: () => geminiRankAndExplain(query, contacts),
    });
  } catch {
    return generateMockSearchResult(query, contacts);
  }
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
  try {
    return await runChat("generateOutreach", {
      openai: () => openaiGenerateOutreach(params),
      gemini: () => geminiGenerateOutreach(params),
    });
  } catch {
    return generateMockOutreach(params);
  }
}

export async function generateContactSummary(
  contact: ContactSummaryInput,
): Promise<string> {
  if (shouldUseDeterministicSummary(contact)) {
    return buildFallbackContactSummary(contact);
  }

  try {
    const raw = await runChat("generateContactSummary", {
      openai: () => openaiGenerateContactSummary(contact),
      gemini: () => geminiGenerateContactSummary(contact),
    });
    return finalizeContactSummary(raw, contact);
  } catch {
    return buildFallbackContactSummary(contact);
  }
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
    subject: `Introduction: ${params.goal}`,
    body: `Hi ${params.contactName.split(" ")[0]},\n\nI hope this message finds you well. I wanted to reach out regarding ${params.goal}.\n\nI'd love to connect and explore how we might collaborate.\n\nBest regards`,
    cta: "Would you be open to a brief 15-minute call this week?",
  };
}
