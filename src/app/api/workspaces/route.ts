import { NextResponse } from "next/server";
import { z } from "zod";
import { slugify } from "@/lib/utils";

const workspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = workspaceSchema.parse(body);

    const workspace = {
      id: `ws-${Date.now()}`,
      name,
      slug: slugify(name),
      plan: "free",
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(workspace);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }
}
