import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/app-config";
import { safeGetSessionUser } from "@/lib/supabase/auth";

function redirectWithAuthCookies(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}

export async function updateSession(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { user, networkError } = await safeGetSessionUser(supabase);

  const protectedPaths = [
    "/dashboard",
    "/search",
    "/network",
    "/intros",
    "/contacts",
    "/groups",
    "/workspace",
    "/connectors",
    "/analytics",
    "/settings",
    "/admin",
    "/playbooks",
    "/segments",
    "/chats",
    "/workflows",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !user && !networkError) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return redirectWithAuthCookies(url, supabaseResponse);
  }

  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (isAuthPath && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithAuthCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}
