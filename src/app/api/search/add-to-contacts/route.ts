import { NextResponse } from "next/server";
import { z } from "zod";
import { addPlatformProspectsToContacts } from "@/lib/data/platform-prospects";
import { ensureApolloFeatureEnabled } from "@/lib/integrations/apollo/route-utils";

const schema = z.object({
  platform_prospect_ids: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  try {
    const disabled = await ensureApolloFeatureEnabled();
    if (disabled) return disabled;

    const body = schema.parse(await request.json());
    const result = await addPlatformProspectsToContacts(body.platform_prospect_ids);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[search.add-to-contacts]", error);
    return NextResponse.json({ error: "Failed to add to contacts" }, { status: 500 });
  }
}
