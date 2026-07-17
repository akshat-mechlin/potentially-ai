import { NextResponse } from "next/server";
import { listMutualConnections } from "@/lib/data/mutual-connections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const mutuals = await listMutualConnections(id, 8);
    return NextResponse.json({ mutuals });
  } catch (error) {
    console.error("Failed to load mutual connections:", error);
    return NextResponse.json(
      { error: "Failed to load mutual connections" },
      { status: 500 },
    );
  }
}
