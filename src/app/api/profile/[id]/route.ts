import { NextResponse } from "next/server";
import { getProfileById } from "@/lib/data/profile";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const profile = await getProfileById(id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Profile by id failed:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
