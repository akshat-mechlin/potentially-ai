import { NextResponse } from "next/server";
import { z } from "zod";
import { generateEmbedding, parseSearchIntent, rankAndExplain } from "@/lib/ai/openai";
import { DEMO_CONTACTS } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demo-data";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  workspace_id: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, filters } = searchSchema.parse(body);

    await parseSearchIntent(query);

    let contacts = DEMO_CONTACTS.map((c) => ({
      id: c.id,
      full_name: c.full_name,
      title: c.title,
      email: c.email,
      company_name: c.company_name,
      similarity: 0.9,
    }));

    if (!isDemoMode()) {
      const embedding = await generateEmbedding(query);
      // In production, call supabase rpc match_contacts
      void embedding;
      void filters;
    } else {
      const q = query.toLowerCase();
      const demoWithTags = DEMO_CONTACTS;
      contacts = demoWithTags
        .filter((c) => {
          const searchable = [c.full_name, c.title, c.company_name, c.email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return (
            q.split(" ").some((word) => word.length > 2 && searchable.includes(word)) ||
            (q.includes("founder") && c.title?.toLowerCase().includes("founder")) ||
            (q.includes("cto") && c.title?.toLowerCase().includes("cto")) ||
            (q.includes("fintech") &&
              (c.company_name?.toLowerCase().includes("stripe") ||
                c.company_name?.toLowerCase().includes("plaid") ||
                c.tags.includes("fintech")))
          );
        })
        .map((c) => ({
          id: c.id,
          full_name: c.full_name,
          title: c.title,
          email: c.email,
          company_name: c.company_name,
          similarity: 0.9,
        }))
        .map((c, i) => ({ ...c, similarity: 0.95 - i * 0.05 }));

      if (contacts.length === 0) {
        contacts = DEMO_CONTACTS.slice(0, 5).map((c, i) => ({
          id: c.id,
          full_name: c.full_name,
          title: c.title,
          email: c.email,
          company_name: c.company_name,
          similarity: 0.8 - i * 0.05,
        }));
      }
    }

    const results = await rankAndExplain(query, contacts);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
