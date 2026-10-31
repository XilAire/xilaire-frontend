"use server";

import { createRouteSupabaseClient } from "@/lib/supabaseRoute";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// SECURITY-HARDENING-02E — Review candidate. Do not deploy until
// the post-confirmation onboarding path and auth client are validated.
export type ProvisionProfileInput = {
  id: string;
  email: string;
  full_name: string;
  account_type: "individual" | "business" | "vendor";
  company_name?: string | null;
  trade_services?: string | null;
  phone?: string | null;
  website?: string | null;
  vendor_category?: string | null;
};

export async function provisionProfile(input: ProvisionProfileInput) {
  const supabase = createRouteSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email_confirmed_at || !user.email) {
    throw new Error("CONFIRM_EMAIL_AND_SIGN_IN_BEFORE_PROVISIONING");
  }

  const targetEmail = String(input.email || "").trim().toLowerCase();
  if (input.id !== user.id || targetEmail !== user.email.toLowerCase()) {
    throw new Error("PROFILE_OWNER_MISMATCH");
  }

  // A caller cannot overwrite an existing user's profile, including
  // role, status, organization, or account type.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) throw new Error("PROFILE_LOOKUP_FAILED");
  if (existing) return { status: "existing" as const };

  // Registration preferences are not authorization. Until a separately
  // approved onboarding flow validates business/vendor entitlement, use
  // a non-privileged individual profile with no organization membership.
  const fullName = String(user.user_metadata?.full_name ?? input.full_name ?? "")
    .trim()
    .slice(0, 200);

  const { error: insertError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email.toLowerCase(),
      full_name: fullName || null,
      role: "user",
      status: "active",
      account_type: "individual",
      org_id: null,
    });

  // Intentionally fail closed on an insert race; never replace a record.
  if (insertError) {
    console.error("SIGNUP_PROFILE_INSERT_FAILED", insertError.code);
    throw new Error("PROFILE_CREATION_REQUIRES_REVIEW");
  }

  return { status: "created" as const };
}
