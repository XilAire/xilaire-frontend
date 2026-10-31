import { getProfile } from "@/lib/getProfile";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BillingRole = "finance" | "master_admin";

/**
 * Server-only billing authorization.
 *
 * getProfile() validates the authenticated Supabase user.
 * The service-role query separately checks current profile state.
 *
 * This helper does not yet establish invoice ownership or
 * platform-organization membership.
 */
export async function requirePlatformBillingActor(
  allowedRoles: readonly BillingRole[]
) {
  const sessionProfile = await getProfile();

  if (
    !sessionProfile ||
    !sessionProfile.id ||
    !allowedRoles.includes(sessionProfile.role as BillingRole)
  ) {
    return null;
  }

  const { data: actor, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, status, org_id")
    .eq("id", sessionProfile.id)
    .maybeSingle();

  if (
    error ||
    !actor ||
    actor.id !== sessionProfile.id ||
    actor.status !== "active" ||
    !actor.org_id ||
    !allowedRoles.includes(actor.role as BillingRole)
  ) {
    return null;
  }

  return {
    id: actor.id,
    email: actor.email,
    role: actor.role,
    org_id: actor.org_id,
  };
}
