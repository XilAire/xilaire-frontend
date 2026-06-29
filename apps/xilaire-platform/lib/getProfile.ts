// apps/xilaire-platform/lib/getProfile.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  org_id: string | null;
};

/**
 * getProfile
 *
 * GUARANTEES:
 * - Never throws for missing profile rows
 * - Never throws for missing roles
 * - Never mutates cookies
 * - Safe for use in layouts and shared loaders
 */
export async function getProfile(): Promise<Profile | null> {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  /* -------------------------------------------------
     AUTH — SESSION ONLY
  ------------------------------------------------- */
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  /* -------------------------------------------------
     PROFILE LOOKUP (NON-FATAL)
  ------------------------------------------------- */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, org_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("getProfile: profile query failed", profileError);
    return null;
  }

  // Profile row may not exist yet — return SAFE fallback
  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? null,
      role: "user",
      org_id: null,
    };
  }

  /* -------------------------------------------------
     SOFT ROLE VALIDATION (NO FAILURES)
  ------------------------------------------------- */
  const { data: roleRow, error: roleError } = await supabase
    .from("role_lookup")
    .select("role")
    .eq("role", profile.role)
    .maybeSingle();

  if (roleError) {
    console.warn("getProfile: role_lookup check failed", roleError);
  } else if (!roleRow) {
    console.warn(
      `⚠ Role '${profile.role}' not found in role_lookup — continuing`
    );
  }

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role ?? "user",
    org_id: profile.org_id,
  };
}
