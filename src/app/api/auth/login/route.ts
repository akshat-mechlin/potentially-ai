import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isDemoMode } from "@/lib/app-config";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  invite: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true });
    }

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const response = NextResponse.json({ success: true });
    const supabase = createRouteHandlerClient(request, response);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      try {
        const { linkConversationThreadsForEmail } = await import("@/lib/data/platform-users");
        await linkConversationThreadsForEmail(user.id, user.email);
      } catch (linkError) {
        console.warn("Chat thread linking on auth failed:", linkError);
      }
    }

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }
    console.error("Login failed:", error);
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
