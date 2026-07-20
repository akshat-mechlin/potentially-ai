import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSearchIntent, rankAndExplain } from "@/lib/ai/openai";
import { PlanLimitError, assertSearchAllowed } from "@/lib/billing/enforce";
import { saveSearchHistory, searchContactsForQuery } from "@/lib/data/contacts";
import { featureDisabledResponse, isFeatureEnabled } from "@/lib/data/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { safeGetSessionUser } from "@/lib/supabase/auth";

const searchSchema = z.object({
  query: z.string().min(1).max(500),
  workspace_id: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const disabled = await featureDisabledResponse("ai_search", "AI search");
    if (disabled) return disabled;

    const body = await request.json();
    const { query, workspace_id: workspaceId, filters } = searchSchema.parse(body);

    const supabase = await createClient();
    const { user } = await safeGetSessionUser(supabase);
    if (user && (await isFeatureEnabled("billing_enforcement"))) {
      await assertSearchAllowed(supabase, user.id);
    }

    const ownerId =
      typeof filters?.owner_id === "string" ? filters.owner_id : undefined;

    const [, contacts] = await Promise.all([
      parseSearchIntent(query),
      searchContactsForQuery(query, {
        workspaceId,
        ownerId,
      }),
    ]);
    const ownerById = new Map(
      contacts.map((contact) => [contact.id, contact.network_owner_name ?? null]),
    );
    const groupById = new Map(contacts.map((contact) => [contact.id, contact.group_name ?? null]));
    const results = await rankAndExplain(query, contacts);
    results.contacts = results.contacts.map((contact) => ({
      ...contact,
      network_owner_name: ownerById.get(contact.id) ?? contact.network_owner_name ?? null,
      group_name: groupById.get(contact.id) ?? contact.group_name ?? null,
    }));

    await saveSearchHistory(query, results, workspaceId);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 402 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
