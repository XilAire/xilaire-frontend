import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUniversityAccountSuspended } from "@/lib/university/account-suspension";

/**
 * Enforces CASE University authentication and app-specific suspension.
 * Does not modify or ban the shared Supabase Auth account.
 * Database lookup errors propagate and fail closed.
 */
export async function requireActiveUniversityUser(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("CASE University authentication required.");
  }

  if (await isUniversityAccountSuspended(user.id)) {
    throw new Error("CASE University account access is suspended.");
  }

  return user.id;
}
