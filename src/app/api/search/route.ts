import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSearchIntent, rankAndExplain } from "@/lib/ai/openai";
import { saveSearchHistory, searchContactsForQuery } from "@/lib/data/contacts";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  workspace_id: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = searchSchema.parse(body);

    await parseSearchIntent(query);

    const contacts = await searchContactsForQuery(query);
    const results = await rankAndExplain(query, contacts);

    await saveSearchHistory(query, results);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
