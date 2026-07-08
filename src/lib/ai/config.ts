export type AIProvider = "openai" | "gemini";

const OPENAI_PLACEHOLDERS = ["sk-your", "your-openai"];
const GEMINI_PLACEHOLDERS = ["your-gemini", "AIza-your"];

function isRealKey(key: string | undefined, placeholders: string[]): boolean {
  if (!key?.trim()) return false;
  const normalized = key.trim().toLowerCase();
  return !placeholders.some(
    (placeholder) =>
      normalized.startsWith(placeholder.toLowerCase()) ||
      normalized.includes(placeholder.toLowerCase()),
  );
}

export function isOpenAIConfigured(): boolean {
  return isRealKey(process.env.OPENAI_API_KEY, OPENAI_PLACEHOLDERS);
}

export function isGeminiConfigured(): boolean {
  return isRealKey(process.env.GEMINI_API_KEY, GEMINI_PLACEHOLDERS);
}

export function isAIConfigured(): boolean {
  return isOpenAIConfigured() || isGeminiConfigured();
}

/** OpenAI first when both are set — better JSON mode + native 1536-dim embeddings. */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = [];
  if (isOpenAIConfigured()) providers.push("openai");
  if (isGeminiConfigured()) providers.push("gemini");
  return providers;
}

export async function withProviderFallback<T>(
  label: string,
  run: (provider: AIProvider) => Promise<T>,
): Promise<T> {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    throw new Error("No AI provider configured");
  }

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await run(provider);
    } catch (error) {
      lastError = error;
      console.warn(`[ai] ${label} failed via ${provider}`, error);
    }
  }

  throw lastError;
}
