import { type NextRequest, NextResponse } from "next/server";
import { sanitizeRequestUrl } from "@/lib/supabase/sanitize-request-url";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const sanitized = sanitizeRequestUrl(request);
  if (sanitized) return sanitized;

  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
