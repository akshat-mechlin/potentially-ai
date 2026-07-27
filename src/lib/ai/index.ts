import type { SearchResult, SearchResultContact, OutreachResult } from "@/types";
import {
  type AIProvider,
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
  geminiParseApolloSearchIntent,
  geminiRankAndExplain,
} from "@/lib/ai/gemini-provider";
import {
  openaiGenerateContactSummary,
  openaiGenerateEmbedding,
  openaiGenerateOutreach,
  openaiParseSearchIntent,
  openaiParseApolloSearchIntent,
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
      filters: { roles: [], industries: [], companies: [], keywords: query.split(" "), locations: [] },
    };
  }
}

export async function parseApolloSearchIntent(query: string) {
  try {
    return await runChat("parseApolloSearchIntent", {
      openai: () => openaiParseApolloSearchIntent(query),
      gemini: () => geminiParseApolloSearchIntent(query),
    });
  } catch {
    return {
      intent: "search",
      apollo_keywords: query.trim(),
      filters: { roles: [], industries: [], companies: [], keywords: [], locations: [] },
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
  recipientFacts?: string[];
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
  contactTitle?: string | null;
  companyName?: string | null;
  type: string;
  tone: string;
  goal: string;
}): OutreachResult {
  const first = params.contactName.trim().split(/\s+/)[0] || params.contactName;
  const roleBit = params.contactTitle
    ? `your work as ${params.contactTitle}`
    : "the work you lead";
  const companyBit = params.companyName ? ` at ${params.companyName}` : "";
  return {
    subject: `${first}, quick thought on ${params.goal.toLowerCase().replace(/\.$/, "")}`,
    body: `Hi ${first},\n\nI've been following ${roleBit}${companyBit} and wanted to reach out about ${params.goal}.\n\nIf useful, I can share a few concrete ideas tailored to your team.\n\nBest regards`,
    cta: "Would you be open to a brief 15-minute call this week?",
  };
}
