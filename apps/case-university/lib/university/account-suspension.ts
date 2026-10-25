import "server-only";

import { createSupabaseServerServiceClient } from "@/lib/supabase/serverService";

/**
 * Checks whether a user is suspended from CASE University.
 *
 * This is a University-specific suspension check.
 * It does not modify shared Supabase authentication.
 *
 * Database failures must not be treated as an active account.
 */
export async function isUniversityAccountSuspended(
  userId: string,
): Promise<boolean> {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    throw new Error(
      "A valid user ID is required to verify CASE University account access.",
    );
  }

  const service = createSupabaseServerServiceClient();

  const { data, error } = await service
    .from("case_university_account_suspensions")
    .select("is_suspended")
    .eq("user_id", normalizedUserId)
    .maybeSingle();

  if (error) {
    console.error(
      "[CASE University] Account suspension lookup failed",
      {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      },
    );

    throw new Error(
      "Unable to verify CASE University account access.",
    );
  }

  return data?.is_suspended === true;
}