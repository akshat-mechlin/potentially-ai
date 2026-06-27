import { generateEmbedding } from "@/lib/ai/openai";

export function contactEmbeddingText(contact: {
  full_name: string;
  title?: string | null;
  company_name?: string | null;
  email?: string | null;
  bio?: string | null;
  tags?: string[];
}) {
  return [
    contact.full_name,
    contact.title,
    contact.company_name,
    contact.email,
    contact.bio,
    contact.tags?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

export async function buildContactEmbedding(contact: {
  full_name: string;
  title?: string | null;
  company_name?: string | null;
  email?: string | null;
  bio?: string | null;
  tags?: string[];
}) {
  const text = contactEmbeddingText(contact);
  const embedding = await generateEmbedding(text);
  return embedding;
}
