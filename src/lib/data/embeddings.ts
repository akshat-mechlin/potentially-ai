import { generateEmbedding } from "@/lib/ai/openai";
import { contactEnrichmentBlob } from "@/lib/contacts/enrichment";

export function contactEmbeddingText(contact: {
  full_name: string;
  title?: string | null;
  company_name?: string | null;
  email?: string | null;
  bio?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  extras?: Record<string, string> | null;
}) {
  return [
    contact.full_name,
    contact.title,
    contact.company_name,
    contact.email,
    contact.location,
    contact.linkedin_url,
    contact.bio,
    contact.tags?.join(" "),
    contactEnrichmentBlob(contact),
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
  location?: string | null;
  linkedin_url?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  extras?: Record<string, string> | null;
}) {
  const text = contactEmbeddingText(contact);
  const embedding = await generateEmbedding(text);
  return embedding;
}
