import type { SupabaseClient } from "@supabase/supabase-js";

export async function confirmUserEmail(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) {
    throw new Error(error.message);
  }
}
