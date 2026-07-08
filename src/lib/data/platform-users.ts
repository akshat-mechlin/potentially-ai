import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformUserMatch = {
  id: string;
  email: string;
  name: string | null;
};

export async function findPlatformUserByEmail(
  email: string | null | undefined,
): Promise<PlatformUserMatch | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, email, name")
      .ilike("email", normalized)
      .maybeSingle();

    if (!data?.id) return null;
    return {
      id: data.id as string,
      email: data.email as string,
      name: (data.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function linkConversationThreadsForEmail(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return 0;

  try {
    const supabase = createAdminClient();
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id")
      .ilike("email", normalized);

    const contactIds = (contacts ?? []).map((row) => row.id as string);
    if (!contactIds.length) return 0;

    const { data } = await supabase
      .from("conversation_threads")
      .update({ recipient_user_id: userId })
      .in("contact_id", contactIds)
      .is("recipient_user_id", null)
      .select("id");

    return data?.length ?? 0;
  } catch (error) {
    console.warn("linkConversationThreadsForEmail failed:", error);
    return 0;
  }
}
