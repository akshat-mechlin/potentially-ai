import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertAdminAccess,
  getAdminData,
  updateFeatureFlag,
  updateUserAdmin,
  updateWorkspacePlan,
} from "@/lib/data/admin";

const flagSchema = z.object({
  type: z.literal("feature_flag").optional(),
  key: z.string(),
  enabled: z.boolean(),
});

const userSchema = z.object({
  type: z.literal("user"),
  userId: z.string(),
  is_admin: z.boolean(),
});

const workspaceSchema = z.object({
  type: z.literal("workspace"),
  workspaceId: z.string(),
  plan: z.enum(["free", "pro", "enterprise"]),
});

const patchSchema = z.union([userSchema, workspaceSchema, flagSchema]);

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

export async function PATCH(request: Request) {
  try {
    const { userId: actorUserId } = await assertAdminAccess();
    const body = patchSchema.parse(await request.json());

    if ("userId" in body && body.type === "user") {
      const user = await updateUserAdmin(body.userId, body.is_admin, actorUserId);
      return NextResponse.json({ user });
    }

    if ("workspaceId" in body && body.type === "workspace") {
      const workspace = await updateWorkspacePlan(body.workspaceId, body.plan);
      return NextResponse.json({ workspace });
    }

    const flag = await updateFeatureFlag(body.key, body.enabled);
    return NextResponse.json({ flag });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update admin settings" }, { status: 500 });
  }
}
