import "server-only";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import { getUniversityStripeMode } from "@/lib/university/stripe-mode";

export type UniversityTier =
  | "free"
  | "plus"
  | "pro";

export type UniversityEntitlementKey =
  | "basic_progress_tracking"
  | "course_catalog"
  | "course_certificates"
  | "downloadable_resources"
  | "investing_foundations"
  | "learning_dashboard"
  | "options_trading"
  | "preview_lessons"
  | "public_certificate_verification"
  | "technical_analysis";

export type UniversityAccess = {
  tier: UniversityTier;
  entitlements: Record<
    UniversityEntitlementKey,
    boolean
  >;

  /**
   * True only when CASE University access is being elevated
   * through the trusted server-side administrator override.
   *
   * This value is informational for server-rendered UI and
   * diagnostics. It must never be accepted from the browser
   * as an authorization input.
   */
  isAdminOverride: boolean;
};

const UNIVERSITY_ENTITLEMENT_KEYS: UniversityEntitlementKey[] =
  [
    "basic_progress_tracking",
    "course_catalog",
    "course_certificates",
    "downloadable_resources",
    "investing_foundations",
    "learning_dashboard",
    "options_trading",
    "preview_lessons",
    "public_certificate_verification",
    "technical_analysis",
  ];

const FREE_FALLBACK: UniversityAccess = {
  tier: "free",

  entitlements: {
    basic_progress_tracking:
      true,

    course_catalog:
      true,

    course_certificates:
      false,

    downloadable_resources:
      false,

    investing_foundations:
      false,

    learning_dashboard:
      true,

    options_trading:
      false,

    preview_lessons:
      true,

    public_certificate_verification:
      true,

    technical_analysis:
      false,
  },

  isAdminOverride:
    false,
};

const MASTER_ADMIN_ACCESS: UniversityAccess = {
  tier: "pro",

  entitlements: {
    basic_progress_tracking:
      true,

    course_catalog:
      true,

    course_certificates:
      true,

    downloadable_resources:
      true,

    investing_foundations:
      true,

    learning_dashboard:
      true,

    options_trading:
      true,

    preview_lessons:
      true,

    public_certificate_verification:
      true,

    technical_analysis:
      true,
  },

  isAdminOverride:
    true,
};

/**
 * CASE University administrator testing override.
 *
 * IMPORTANT SECURITY DESIGN:
 *
 * This check is resolved only on the server through the trusted
 * CASE role resolver. No role, tier, entitlement, or override
 * flag supplied by the browser is trusted.
 *
 * master_admin is explicitly supported.
 *
 * role_rank >= 4 is also accepted because the existing CASE
 * University administration surfaces already use rank 4 as the
 * University administrator boundary.
 */
async function hasCurrentUniversityAdminOverride() {
  const role =
    await resolveCurrentUserRole();

  if (!role) {
    return false;
  }

  return (
    role.role_name ===
      "master_admin" ||
    Number(
      role.role_rank ??
        0,
    ) >= 4
  );
}

export async function getCurrentUniversityTier(): Promise<UniversityTier> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return "free";
  }

  /*
   * Explicit trusted administrator override.
   *
   * This makes master_admin testing independent of Stripe
   * subscription state while keeping the override entirely
   * server-side.
   */
  if (
    await hasCurrentUniversityAdminOverride()
  ) {
    return "pro";
  }

  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data,
    error,
  } =
    await serviceSupabase.rpc(
      "get_university_tier_for_user",
      {
        p_user_id:
          user.id,

        p_stripe_mode:
          stripeMode,
      },
    );

  if (error) {
    console.error(
      "[CASE University] Failed to resolve authoritative University tier.",
      error,
    );

    return "free";
  }

  return normalizeUniversityTier(
    data,
  );
}

export async function getCurrentUniversityAccess(): Promise<UniversityAccess> {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return cloneAccess(
      FREE_FALLBACK,
    );
  }

  /*
   * ==========================================================
   * MASTER ADMIN / UNIVERSITY ADMIN TESTING OVERRIDE
   * ==========================================================
   *
   * The authenticated session provides only the verified user.
   * The user's CASE role is resolved independently on the server.
   *
   * Administrators receive the complete CASE University Pro
   * entitlement set so they can exercise:
   *
   * - all production courses
   * - all lessons
   * - downloadable worksheets/resources
   * - progress and enrollment flows
   * - certificates
   * - learner dashboards
   * - preview functionality
   *
   * This does NOT expose a client-side "become Pro" mechanism.
   * Ordinary learners still resolve entirely through the
   * authoritative PostgreSQL subscription and entitlement RPCs.
   */
  if (
    await hasCurrentUniversityAdminOverride()
  ) {
    return cloneAccess(
      MASTER_ADMIN_ACCESS,
    );
  }

  /*
   * ==========================================================
   * NORMAL LEARNER AUTHORIZATION
   * ==========================================================
   *
   * University access is resolved only through trusted
   * server-side service-role RPCs.
   *
   * The authenticated browser/session determines only the
   * verified user.id.
   *
   * Stripe mode comes exclusively from the server environment
   * and cannot be selected by the browser.
   *
   * PostgreSQL remains authoritative for ordinary learner
   * subscription, tier, and entitlement resolution.
   */
  const stripeMode =
    getUniversityStripeMode();

  const serviceSupabase =
    createSupabaseServerServiceClient();

  const {
    data:
      tierData,

    error:
      tierError,
  } =
    await serviceSupabase.rpc(
      "get_university_tier_for_user",
      {
        p_user_id:
          user.id,

        p_stripe_mode:
          stripeMode,
      },
    );

  if (tierError) {
    console.error(
      "[CASE University] Failed to resolve authoritative University tier.",
      tierError,
    );

    return cloneAccess(
      FREE_FALLBACK,
    );
  }

  const tier =
    normalizeUniversityTier(
      tierData,
    );

  const entitlements =
    emptyEntitlements();

  for (
    const entitlementKey
    of UNIVERSITY_ENTITLEMENT_KEYS
  ) {
    const {
      data:
        enabled,

      error:
        entitlementError,
    } =
      await serviceSupabase.rpc(
        "case_university_user_has_entitlement",
        {
          p_user_id:
            user.id,

          p_entitlement_key:
            entitlementKey,

          p_stripe_mode:
            stripeMode,
        },
      );

    if (
      entitlementError
    ) {
      console.error(
        `[CASE University] Failed to resolve entitlement "${entitlementKey}".`,
        entitlementError,
      );

      return cloneAccess(
        FREE_FALLBACK,
      );
    }

    entitlements[
      entitlementKey
    ] =
      enabled === true;
  }

  return {
    tier,
    entitlements,
    isAdminOverride:
      false,
  };
}

export async function hasCurrentUniversityEntitlement(
  entitlementKey:
    UniversityEntitlementKey,
) {
  const access =
    await getCurrentUniversityAccess();

  return (
    access.entitlements[
      entitlementKey
    ] === true
  );
}

export function getUniversityCourseEntitlement(
  courseSlug: string,
): UniversityEntitlementKey | null {
  const normalizedSlug =
    courseSlug
      .trim()
      .toLowerCase();

  if (
    normalizedSlug ===
      "investing-foundations"
  ) {
    return "investing_foundations";
  }

  if (
    normalizedSlug ===
      "technical-analysis"
  ) {
    return "technical_analysis";
  }

  /*
   * Production Options Trading currently uses the slug:
   *
   *   /courses/options
   *
   * Keep "options-trading" as a backwards-compatible alias in
   * case an older route, seeded record, or administrative test
   * still references that slug.
   */
  if (
    normalizedSlug ===
      "options" ||
    normalizedSlug ===
      "options-trading"
  ) {
    return "options_trading";
  }

  /*
   * Admin-created / development courses do not map to one of the
   * named production curriculum entitlements.
   *
   * They are intentionally handled by canAccessUniversityCourse()
   * and canAccessUniversityLesson().
   */
  return null;
}

export async function canAccessUniversityCourse(
  courseSlug: string,
) {
  const access =
    await getCurrentUniversityAccess();

  /*
   * The explicit administrator override is checked first so
   * master_admin can exercise both mapped production curriculum
   * and unmapped development/test curriculum.
   */
  if (
    access.isAdminOverride
  ) {
    return true;
  }

  const entitlementKey =
    getUniversityCourseEntitlement(
      courseSlug,
    );

  if (
    entitlementKey
  ) {
    return (
      access.entitlements[
        entitlementKey
      ] === true
    );
  }

  /*
   * Do not grant unknown/unmapped courses merely because an
   * ordinary learner happens to be Pro.
   *
   * Production curriculum should always have an explicit
   * entitlement mapping.
   *
   * Unmapped development courses are available only through the
   * trusted administrator override above.
   */
  return false;
}

export async function canAccessUniversityLesson({
  courseSlug,
  isPreview,
}: {
  courseSlug: string;
  isPreview: boolean;
}) {
  const access =
    await getCurrentUniversityAccess();

  /*
   * Administrators can exercise the entire curriculum without
   * Stripe or subscription constraints.
   */
  if (
    access.isAdminOverride
  ) {
    return true;
  }

  /*
   * Preview lessons retain their normal learner behavior.
   */
  if (
    isPreview
  ) {
    return (
      access.entitlements
        .preview_lessons ===
      true
    );
  }

  const entitlementKey =
    getUniversityCourseEntitlement(
      courseSlug,
    );

  if (
    entitlementKey
  ) {
    return (
      access.entitlements[
        entitlementKey
      ] === true
    );
  }

  /*
   * Unknown/unmapped courses must never become accessible merely
   * because an ordinary learner has the Pro tier.
   */
  return false;
}

function normalizeUniversityTier(
  value: unknown,
): UniversityTier {
  if (
    value === "pro" ||
    value === "plus"
  ) {
    return value;
  }

  return "free";
}

function emptyEntitlements(): Record<
  UniversityEntitlementKey,
  boolean
> {
  return UNIVERSITY_ENTITLEMENT_KEYS.reduce(
    (
      result,
      key,
    ) => {
      result[
        key
      ] =
        false;

      return result;
    },
    {} as Record<
      UniversityEntitlementKey,
      boolean
    >,
  );
}

function cloneAccess(
  access: UniversityAccess,
): UniversityAccess {
  return {
    tier:
      access.tier,

    entitlements: {
      ...access.entitlements,
    },

    isAdminOverride:
      access.isAdminOverride,
  };
}