import { NextResponse } from "next/server";
import { ApolloApiError } from "@/lib/integrations/apollo/client";
import { getAllFeatureFlags } from "@/lib/data/feature-flags";

export async function ensureApolloFeatureEnabled() {
  const flags = await getAllFeatureFlags();
  if (!flags?.connector_apollo && !flags?.beta_connectors) {
    return NextResponse.json({ error: "Apollo connector is disabled" }, { status: 403 });
  }
  return null;
}

export function apolloErrorResponse(error: unknown) {
  if (error instanceof ApolloApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code ?? "APOLLO_ERROR" },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.error("[apollo.api]", error);
  return NextResponse.json({ error: "Apollo request failed" }, { status: 500 });
}
