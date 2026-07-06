import { NextResponse } from "next/server";
import { z } from "zod";
import { inviteWorkspaceMember, inviteWorkspaceMembers } from "@/lib/data/workspace-team";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).optional(),
  workspace_id: z.string().uuid().optional(),
});

const batchInviteSchema = z.object({
  emails: z.union([z.string(), z.array(z.string().email())]),
  role: z.enum(["admin", "member", "viewer"]).optional(),
  workspace_id: z.string().uuid().optional(),
});

function parseEmails(value: string | string[]) {
  if (Array.isArray(value)) return value;
  return value
    .split(/[,;\n]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if ("emails" in body) {
      const { emails, role, workspace_id: workspaceId } = batchInviteSchema.parse(body);
      const parsedEmails = parseEmails(emails).filter((email) => z.string().email().safeParse(email).success);
      if (!parsedEmails.length) {
        return NextResponse.json({ error: "No valid email addresses provided" }, { status: 400 });
      }
      const result = await inviteWorkspaceMembers(parsedEmails, workspaceId, role ?? "member");
      return NextResponse.json(result);
    }

    const { email, role, workspace_id: workspaceId } = inviteSchema.parse(body);
    const result = await inviteWorkspaceMember(email, role ?? "member", workspaceId);
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
