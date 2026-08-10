import type {
  AuthenticatorAssuranceLevels,
} from "@supabase/supabase-js";

/**
 * CASE Budget currently uses TOTP as the primary MFA method.
 *
 * Keep this as an application-level type instead of passing
 * arbitrary provider strings throughout the authentication UI.
 */
export type CaseBudgetMfaFactorType =
  "totp";

/**
 * Supabase factor lifecycle states.
 *
 * A factor is initially created as "unverified" and becomes
 * "verified" only after the user successfully completes the
 * enrollment challenge.
 */
export type CaseBudgetMfaFactorStatus =
  | "verified"
  | "unverified";

/**
 * Authentication Assurance Levels used by Supabase.
 *
 * - aal1:
 *   The user has authenticated with the primary factor,
 *   such as email/password.
 *
 * - aal2:
 *   The user has also successfully completed MFA.
 */
export type CaseBudgetMfaAssuranceLevel =
  AuthenticatorAssuranceLevels;

/**
 * Application-level description of an enrolled MFA factor.
 *
 * This deliberately exposes only the information CASE Budget
 * needs instead of coupling UI components directly to the
 * complete Supabase factor object.
 */
export type CaseBudgetMfaFactor = {
  id: string;

  type:
    CaseBudgetMfaFactorType;

  status:
    CaseBudgetMfaFactorStatus;

  friendlyName:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

/**
 * TOTP enrollment information returned after creating
 * a new authenticator factor.
 *
 * The secret and QR code are sensitive enrollment values.
 * They should only be displayed during enrollment and should
 * never be written to application logs or persisted by CASE Budget.
 */
export type CaseBudgetTotpEnrollment = {
  factorId: string;

  qrCode:
    string;

  secret:
    string;

  uri:
    string;
};

/**
 * Challenge information used while verifying an MFA factor.
 */
export type CaseBudgetMfaChallenge = {
  challengeId:
    string;

  factorId:
    string;

  expiresAt:
    number;
};

/**
 * Current MFA state for an authenticated CASE Budget user.
 *
 * This is useful for account-security screens and for deciding
 * whether sensitive functionality should:
 *
 * - request MFA enrollment;
 * - request an MFA challenge;
 * - proceed because the session is already AAL2.
 */
export type CaseBudgetMfaStatus = {
  currentLevel:
    CaseBudgetMfaAssuranceLevel | null;

  nextLevel:
    CaseBudgetMfaAssuranceLevel | null;

  requiresMfa:
    boolean;

  isAal2:
    boolean;

  hasVerifiedFactor:
    boolean;

  hasUnverifiedFactor:
    boolean;

  verifiedFactors:
    CaseBudgetMfaFactor[];

  unverifiedFactors:
    CaseBudgetMfaFactor[];
};

/**
 * Actions that may require an AAL2 session.
 *
 * We can expand this list as CASE Budget adds additional
 * sensitive financial or administrative operations.
 */
export type CaseBudgetMfaProtectedAction =
  | "connect-financial-account"
  | "manage-financial-account"
  | "view-sensitive-account-data"
  | "change-security-settings"
  | "disable-mfa";

/**
 * Result returned when checking whether the current session
 * has sufficient assurance for a protected action.
 */
export type CaseBudgetMfaAuthorizationResult = {
  allowed:
    boolean;

  action:
    CaseBudgetMfaProtectedAction;

  currentLevel:
    CaseBudgetMfaAssuranceLevel | null;

  requiredLevel:
    "aal2";

  reason:
    CaseBudgetMfaAuthorizationReason | null;
};

export type CaseBudgetMfaAuthorizationReason =
  | "not_authenticated"
  | "mfa_not_enrolled"
  | "mfa_challenge_required";

/**
 * Shared service error codes for MFA operations.
 */
export type CaseBudgetMfaErrorCode =
  | "invalid_input"
  | "not_authenticated"
  | "factor_not_found"
  | "factor_already_exists"
  | "factor_not_verified"
  | "invalid_verification_code"
  | "challenge_failed"
  | "enrollment_failed"
  | "verification_failed"
  | "unenrollment_failed"
  | "aal2_required"
  | "rate_limited"
  | "unexpected_error";

export type CaseBudgetMfaError = {
  code:
    CaseBudgetMfaErrorCode;

  message:
    string;

  status?:
    number;
};

/**
 * Standard result shape for MFA service functions.
 */
export type CaseBudgetMfaResult<
  Data,
> =
  | {
      success:
        true;

      data:
        Data;

      error:
        null;
    }
  | {
      success:
        false;

      data:
        null;

      error:
        CaseBudgetMfaError;
    };

/**
 * Input for creating a new TOTP factor.
 */
export type EnrollTotpInput = {
  friendlyName?:
    string;
};

/**
 * Result after beginning TOTP enrollment.
 */
export type EnrollTotpResult = {
  enrollment:
    CaseBudgetTotpEnrollment;
};

/**
 * Input used to create an MFA challenge for an existing factor.
 */
export type CreateMfaChallengeInput = {
  factorId:
    string;
};

/**
 * Result returned after an MFA challenge is created.
 */
export type CreateMfaChallengeResult = {
  challenge:
    CaseBudgetMfaChallenge;
};

/**
 * Input used to verify a challenge with a six-digit
 * authenticator application code.
 */
export type VerifyMfaChallengeInput = {
  factorId:
    string;

  challengeId:
    string;

  code:
    string;
};

/**
 * Result returned after successful MFA verification.
 */
export type VerifyMfaChallengeResult = {
  factorId:
    string;

  challengeId:
    string;

  assuranceLevel:
    "aal2";
};

/**
 * Input used when removing an existing MFA factor.
 */
export type UnenrollMfaFactorInput = {
  factorId:
    string;
};

/**
 * Result returned after an MFA factor is removed.
 */
export type UnenrollMfaFactorResult = {
  factorId:
    string;
};

/**
 * Enrollment form state used by useActionState().
 */
export type MfaEnrollmentActionFieldErrors = {
  friendlyName?:
    string;

  code?:
    string;
};

export type MfaEnrollmentActionState = {
  success:
    boolean;

  message:
    string;

  fieldErrors:
    MfaEnrollmentActionFieldErrors;

  enrollment:
    CaseBudgetTotpEnrollment | null;

  challenge:
    CaseBudgetMfaChallenge | null;

  verified:
    boolean;
};

export const initialMfaEnrollmentActionState:
  MfaEnrollmentActionState = {
    success:
      false,

    message:
      "",

    fieldErrors: {},

    enrollment:
      null,

    challenge:
      null,

    verified:
      false,
  };

/**
 * Challenge form state used when an already-enrolled user
 * must elevate an AAL1 session to AAL2.
 */
export type MfaChallengeActionFieldErrors = {
  code?:
    string;
};

export type MfaChallengeActionState = {
  success:
    boolean;

  message:
    string;

  fieldErrors:
    MfaChallengeActionFieldErrors;

  factorId:
    string | null;

  challengeId:
    string | null;

  verified:
    boolean;
};

export const initialMfaChallengeActionState:
  MfaChallengeActionState = {
    success:
      false,

    message:
      "",

    fieldErrors: {},

    factorId:
      null,

    challengeId:
      null,

    verified:
      false,
  };

/**
 * Normalize an authenticator code before submitting it to
 * Supabase.
 *
 * Authenticator applications commonly display codes as:
 *
 *     123 456
 *
 * or:
 *
 *     123-456
 *
 * CASE Budget accepts those user-friendly formats but sends
 * Supabase the normalized six-digit value.
 */
export function normalizeMfaVerificationCode(
  value:
    string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

/**
 * Basic client/server validation for a TOTP verification code.
 */
export function isValidMfaVerificationCode(
  value:
    string,
) {
  return /^\d{6}$/.test(
    normalizeMfaVerificationCode(
      value,
    ),
  );
}