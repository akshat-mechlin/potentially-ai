import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, updateProfile } from "@/lib/data/profile";

const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  title: z.string().max(200).optional(),
  bio: z.string().max(1000).optional(),
});

export async function GET() {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile fetch failed:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updates = profileSchema.parse(body);
    const profile = await updateProfile(updates);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("Profile update failed:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
