import {
  hashContainsSessionSecrets,
  isAuthRoute,
  stripSensitiveSearchParams,
} from "@/lib/security/sensitive-url-params";
import { NextResponse, type NextRequest } from "next/server";

/** Strip credentials from the URL before they hit logs, history, or referrers. */
export function sanitizeRequestUrl(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone();
  const hadSensitiveQuery = stripSensitiveSearchParams(url);

  if (hadSensitiveQuery) {
    return NextResponse.redirect(url);
  }

  if (isAuthRoute(url.pathname) && hashContainsSessionSecrets(url.hash)) {
    url.hash = "";
    return NextResponse.redirect(url);
  }

  return null;
}
