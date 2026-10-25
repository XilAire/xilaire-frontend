"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Unable to sign out of CASE University", error);
    throw new Error("Unable to sign out. Please try again.");
  }

  return { success: true };
}
