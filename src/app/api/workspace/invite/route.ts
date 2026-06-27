import { NextResponse } from "next/server";
import { z } from "zod";
import { inviteWorkspaceMember } from "@/lib/data/workspace-team";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role } = inviteSchema.parse(body);
    const result = await inviteWorkspaceMember(email, role ?? "member");
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
