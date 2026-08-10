import "server-only";

import {
  redirect,
} from "next/navigation";

import {
  authorizeMfaProtectedAction,
} from "@/lib/auth/mfa-service";

import type {
  CaseBudgetMfaAuthorizationReason,
  CaseBudgetMfaProtectedAction,
} from "@/types/auth/mfa";

const DEFAULT_AUTHENTICATED_ROUTE =
  "/dashboard";

const MFA_ROUTE =
  "/mfa";

const SIGN_IN_ROUTE =
  "/sign-in";

export type RequireAal2Result =
  | {
      allowed:
        true;

      reason:
        null;
    }
  | {
      allowed:
        false;

      reason:
        CaseBudgetMfaAuthorizationReason;

      redirectTo:
        string;
    };

/**
 * Checks whether the current authenticated CASE Budget session
 * has reached AAL2 for the requested protected action.
 *
 * This function does not redirect automatically.
 *
 * It is useful for:
 *
 * - Route Handlers
 * - Server Actions
 * - API endpoints
 * - service-layer authorization checks
 *
 * Callers can inspect the result and decide whether to return
 * JSON, throw an application error, or redirect elsewhere.
 */
export async function requireAal2(
  action:
    CaseBudgetMfaProtectedAction,

  redirectTo:
    string =
      DEFAULT_AUTHENTICATED_ROUTE,
): Promise<RequireAal2Result> {
  const safeRedirectTo =
    getSafeRedirectPath(
      redirectTo,
    ) ??
    DEFAULT_AUTHENTICATED_ROUTE;

  const authorizationResult =
    await authorizeMfaProtectedAction(
      action,
    );

  if (
    !authorizationResult.success
  ) {
    /*
     * Authentication/session errors should be treated as
     * signed-out behavior rather than allowing the protected
     * operation to continue.
     */
    if (
      authorizationResult.error.code ===
        "not_authenticated"
    ) {
      return {
        allowed:
          false,

        reason:
          "not_authenticated",

        redirectTo:
          buildSignInRedirect(
            safeRedirectTo,
          ),
      };
    }

    /*
     * Fail closed.
     *
     * If CASE Budget cannot reliably determine the user's MFA
     * authorization state, the protected action must not proceed.
     */
    return {
      allowed:
        false,

      reason:
        "mfa_challenge_required",

      redirectTo:
        buildMfaRedirect(
          safeRedirectTo,
        ),
    };
  }

  const authorization =
    authorizationResult.data;

  if (
    authorization.allowed
  ) {
    return {
      allowed:
        true,

      reason:
        null,
    };
  }

  const reason =
    authorization.reason ??
    "mfa_challenge_required";

  if (
    reason ===
    "not_authenticated"
  ) {
    return {
      allowed:
        false,

      reason,

      redirectTo:
        buildSignInRedirect(
          safeRedirectTo,
        ),
    };
  }

  return {
    allowed:
      false,

    reason,

    redirectTo:
      buildMfaRedirect(
        safeRedirectTo,
      ),
  };
}

/**
 * Server Component / page helper.
 *
 * This version automatically redirects the user when AAL2
 * has not been satisfied.
 *
 * Example:
 *
 * await requireAal2OrRedirect(
 *   "connect-financial-account",
 *   "/dashboard/accounts",
 * );
 *
 * If the user is:
 *
 * - signed out:
 *     -> /sign-in
 *
 * - signed in without MFA:
 *     -> /mfa enrollment
 *
 * - signed in with MFA at AAL1:
 *     -> /mfa challenge
 *
 * - already AAL2:
 *     -> execution continues
 */
export async function requireAal2OrRedirect(
  action:
    CaseBudgetMfaProtectedAction,

  redirectTo:
    string =
      DEFAULT_AUTHENTICATED_ROUTE,
): Promise<void> {
  const result =
    await requireAal2(
      action,
      redirectTo,
    );

  if (
    result.allowed
  ) {
    return;
  }

  redirect(
    result.redirectTo,
  );
}

/**
 * Convenience helper specifically for financial-account
 * connection flows.
 *
 * This will later be used by the Plaid Link-token creation
 * endpoint.
 */
export async function requireFinancialAccountConnectionAal2(
  redirectTo:
    string =
      "/dashboard/accounts",
): Promise<RequireAal2Result> {
  return requireAal2(
    "connect-financial-account",
    redirectTo,
  );
}

/**
 * Redirecting version of the financial-account guard.
 *
 * Useful from Server Components before rendering a protected
 * account-connection experience.
 */
export async function requireFinancialAccountConnectionAal2OrRedirect(
  redirectTo:
    string =
      "/dashboard/accounts",
): Promise<void> {
  await requireAal2OrRedirect(
    "connect-financial-account",
    redirectTo,
  );
}

/**
 * Convenience helper for financial-account management actions.
 */
export async function requireFinancialAccountManagementAal2(
  redirectTo:
    string =
      "/dashboard/accounts",
): Promise<RequireAal2Result> {
  return requireAal2(
    "manage-financial-account",
    redirectTo,
  );
}

/**
 * Convenience helper for viewing especially sensitive financial
 * account information.
 */
export async function requireSensitiveAccountDataAal2(
  redirectTo:
    string =
      "/dashboard/accounts",
): Promise<RequireAal2Result> {
  return requireAal2(
    "view-sensitive-account-data",
    redirectTo,
  );
}

/**
 * Convenience helper for security-setting changes.
 */
export async function requireSecuritySettingsAal2(
  redirectTo:
    string =
      "/dashboard/settings/security",
): Promise<RequireAal2Result> {
  return requireAal2(
    "change-security-settings",
    redirectTo,
  );
}

/**
 * MFA removal is itself a sensitive security operation.
 *
 * A user should not be able to disable MFA using only an AAL1
 * session.
 */
export async function requireDisableMfaAal2(
  redirectTo:
    string =
      "/dashboard/settings/security",
): Promise<RequireAal2Result> {
  return requireAal2(
    "disable-mfa",
    redirectTo,
  );
}

function buildMfaRedirect(
  redirectTo:
    string,
) {
  const safeRedirectTo =
    getSafeRedirectPath(
      redirectTo,
    ) ??
    DEFAULT_AUTHENTICATED_ROUTE;

  if (
    safeRedirectTo ===
    DEFAULT_AUTHENTICATED_ROUTE
  ) {
    return MFA_ROUTE;
  }

  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "redirectTo",
    safeRedirectTo,
  );

  return `${MFA_ROUTE}?${searchParams.toString()}`;
}

function buildSignInRedirect(
  redirectTo:
    string,
) {
  const safeRedirectTo =
    getSafeRedirectPath(
      redirectTo,
    ) ??
    DEFAULT_AUTHENTICATED_ROUTE;

  const mfaRedirect =
    buildMfaRedirect(
      safeRedirectTo,
    );

  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "redirectTo",
    mfaRedirect,
  );

  return `${SIGN_IN_ROUTE}?${searchParams.toString()}`;
}

function getSafeRedirectPath(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue ||
    !normalizedValue.startsWith(
      "/",
    ) ||
    normalizedValue.startsWith(
      "//",
    ) ||
    normalizedValue.includes(
      "\\",
    )
  ) {
    return null;
  }

  try {
    const parsedUrl =
      new URL(
        normalizedValue,
        "http://case-budget.local",
      );

    if (
      parsedUrl.origin !==
      "http://case-budget.local"
    ) {
      return null;
    }

    /*
     * Prevent redirect loops back into authentication routes.
     */
    if (
      parsedUrl.pathname ===
        SIGN_IN_ROUTE ||
      parsedUrl.pathname ===
        "/sign-up" ||
      parsedUrl.pathname ===
        MFA_ROUTE ||
      parsedUrl.pathname.startsWith(
        `${MFA_ROUTE}/`,
      )
    ) {
      return DEFAULT_AUTHENTICATED_ROUTE;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
}