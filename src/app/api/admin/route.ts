import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminData, updateFeatureFlag } from "@/lib/data/admin";

export async function GET() {
  try {
    const data = await getAdminData();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Admin fetch failed:", error);
    return NextResponse.json({ error: "Failed to load admin data" }, { status: 500 });
  }
}

const flagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
});

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { key, enabled } = flagSchema.parse(body);
    const flag = await updateFeatureFlag(key, enabled);
    return NextResponse.json(flag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to update feature flag" }, { status: 500 });
  }
}
