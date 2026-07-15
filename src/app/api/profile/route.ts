import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, updateProfile } from "@/lib/data/profile";

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    });

const profileSchema = z.object({
  name: optionalText(120),
  title: optionalText(200),
  bio: optionalText(1000),
  linkedin_url: optionalText(300),
  company: optionalText(200),
  location: optionalText(200),
  website_url: optionalText(300),
  avatar_url: optionalText(2000),
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
