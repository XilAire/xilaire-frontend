"use server";

import {
  createMfaChallenge,
  enrollTotp,
  getMfaStatus,
  unenrollMfaFactor,
  verifyMfaChallenge,
} from "@/lib/auth/mfa-service";

import {
  initialMfaChallengeActionState,
  initialMfaEnrollmentActionState,
  isValidMfaVerificationCode,
  normalizeMfaVerificationCode,
  type CaseBudgetMfaStatus,
  type MfaChallengeActionState,
  type MfaEnrollmentActionState,
} from "@/types/auth/mfa";

export type MfaStatusActionState = {
  success:
    boolean;

  message:
    string;

  status:
    CaseBudgetMfaStatus | null;
};

export type MfaUnenrollActionState = {
  success:
    boolean;

  message:
    string;

  factorId:
    string | null;
};

const initialMfaStatusActionState:
  MfaStatusActionState = {
    success:
      false,

    message:
      "",

    status:
      null,
  };

const initialMfaUnenrollActionState:
  MfaUnenrollActionState = {
    success:
      false,

    message:
      "",

    factorId:
      null,
  };

/**
 * Starts TOTP enrollment for the currently authenticated user.
 */
export async function enrollTotpAction(
  _previousState:
    MfaEnrollmentActionState =
      initialMfaEnrollmentActionState,

  formData:
    FormData,
): Promise<MfaEnrollmentActionState> {
  const friendlyName =
    getFormString(
      formData,
      "friendlyName",
    );

  if (
    friendlyName.length >
    100
  ) {
    return {
      success:
        false,

      message:
        "Review the highlighted fields and try again.",

      fieldErrors: {
        friendlyName:
          "Authenticator name must be 100 characters or fewer.",
      },

      enrollment:
        null,

      challenge:
        null,

      verified:
        false,
    };
  }

  const result =
    await enrollTotp({
      friendlyName:
        friendlyName ||
        undefined,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      fieldErrors: {},

      enrollment:
        null,

      challenge:
        null,

      verified:
        false,
    };
  }

  const challengeResult =
    await createMfaChallenge({
      factorId:
        result.data.enrollment.factorId,
    });

  if (
    !challengeResult.success
  ) {
    return {
      success:
        false,

      message:
        challengeResult.error.message,

      fieldErrors: {},

      enrollment:
        result.data.enrollment,

      challenge:
        null,

      verified:
        false,
    };
  }

  return {
    success:
      true,

    message:
      "Authenticator enrollment started. Scan the QR code and enter the current six-digit code to finish setup.",

    fieldErrors: {},

    enrollment:
      result.data.enrollment,

    challenge:
      challengeResult.data.challenge,

    verified:
      false,
  };
}

/**
 * Verifies the authenticator during enrollment.
 *
 * IMPORTANT:
 *
 * factorId and challengeId are read directly from FormData.
 *
 * They must not depend on previousState because useActionState()
 * captures its initial state independently from the enrollment
 * action. The enrollment form posts these values as hidden fields.
 */
export async function verifyTotpEnrollmentAction(
  _previousState:
    MfaEnrollmentActionState,

  formData:
    FormData,
): Promise<MfaEnrollmentActionState> {
  const factorId =
    getFormString(
      formData,
      "factorId",
    );

  let challengeId =
    getFormString(
      formData,
      "challengeId",
    );

  const code =
    normalizeMfaVerificationCode(
      getFormString(
        formData,
        "code",
        false,
      ),
    );

  if (
    !factorId
  ) {
    return {
      success:
        false,

      message:
        "Authenticator enrollment information is missing. Start the enrollment process again.",

      fieldErrors: {},

      enrollment:
        null,

      challenge:
        null,

      verified:
        false,
    };
  }

  if (
    !isValidMfaVerificationCode(
      code,
    )
  ) {
    return {
      success:
        false,

      message:
        "Review the highlighted fields and try again.",

      fieldErrors: {
        code:
          "Enter the current six-digit code from your authenticator app.",
      },

      enrollment:
        null,

      challenge:
        null,

      verified:
        false,
    };
  }

  /*
   * If the original enrollment challenge is unavailable,
   * create a fresh challenge for the same TOTP factor.
   */
  if (
    !challengeId
  ) {
    const challengeResult =
      await createMfaChallenge({
        factorId,
      });

    if (
      !challengeResult.success
    ) {
      return {
        success:
          false,

        message:
          challengeResult.error.message,

        fieldErrors: {},

        enrollment:
          null,

        challenge:
          null,

        verified:
          false,
      };
    }

    challengeId =
      challengeResult.data.challenge.challengeId;
  }

  const result =
    await verifyMfaChallenge({
      factorId,

      challengeId,

      code,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      fieldErrors:
        mapVerificationErrorToFields(
          result.error.code,
          result.error.message,
        ),

      enrollment:
        null,

      challenge:
        null,

      verified:
        false,
    };
  }

  return {
    success:
      true,

    message:
      "Multi-factor authentication is now enabled for your CASE Budget account.",

    fieldErrors: {},

    enrollment:
      null,

    challenge:
      null,

    verified:
      true,
  };
}

/**
 * Creates a new challenge for a previously verified factor.
 */
export async function createMfaChallengeAction(
  _previousState:
    MfaChallengeActionState =
      initialMfaChallengeActionState,

  formData:
    FormData,
): Promise<MfaChallengeActionState> {
  const factorId =
    getFormString(
      formData,
      "factorId",
    );

  if (
    !factorId
  ) {
    return {
      success:
        false,

      message:
        "A valid authenticator is required.",

      fieldErrors: {},

      factorId:
        null,

      challengeId:
        null,

      verified:
        false,
    };
  }

  const result =
    await createMfaChallenge({
      factorId,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      fieldErrors: {},

      factorId,

      challengeId:
        null,

      verified:
        false,
    };
  }

  return {
    success:
      true,

    message:
      "Enter the current six-digit code from your authenticator app.",

    fieldErrors: {},

    factorId,

    challengeId:
      result.data.challenge.challengeId,

    verified:
      false,
  };
}

/**
 * Verifies an MFA challenge for a previously enrolled factor.
 */
export async function verifyMfaChallengeAction(
  previousState:
    MfaChallengeActionState,

  formData:
    FormData,
): Promise<MfaChallengeActionState> {
  const factorId =
    getFormString(
      formData,
      "factorId",
    ) ||
    previousState.factorId ||
    "";

  let challengeId =
    getFormString(
      formData,
      "challengeId",
    ) ||
    previousState.challengeId ||
    "";

  const code =
    normalizeMfaVerificationCode(
      getFormString(
        formData,
        "code",
        false,
      ),
    );

  if (
    !factorId
  ) {
    return {
      success:
        false,

      message:
        "A valid authenticator is required.",

      fieldErrors: {},

      factorId:
        null,

      challengeId:
        null,

      verified:
        false,
    };
  }

  if (
    !isValidMfaVerificationCode(
      code,
    )
  ) {
    return {
      success:
        false,

      message:
        "Review the highlighted fields and try again.",

      fieldErrors: {
        code:
          "Enter the current six-digit code from your authenticator app.",
      },

      factorId,

      challengeId:
        challengeId ||
        null,

      verified:
        false,
    };
  }

  if (
    !challengeId
  ) {
    const challengeResult =
      await createMfaChallenge({
        factorId,
      });

    if (
      !challengeResult.success
    ) {
      return {
        success:
          false,

        message:
          challengeResult.error.message,

        fieldErrors: {},

        factorId,

        challengeId:
          null,

        verified:
          false,
      };
    }

    challengeId =
      challengeResult.data.challenge.challengeId;
  }

  const result =
    await verifyMfaChallenge({
      factorId,

      challengeId,

      code,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      fieldErrors:
        mapVerificationErrorToFields(
          result.error.code,
          result.error.message,
        ),

      factorId,

      challengeId,

      verified:
        false,
    };
  }

  return {
    success:
      true,

    message:
      "Your identity was verified successfully.",

    fieldErrors: {},

    factorId,

    challengeId,

    verified:
      true,
  };
}

/**
 * Removes an MFA factor from the currently authenticated account.
 */
export async function unenrollMfaFactorAction(
  _previousState:
    MfaUnenrollActionState =
      initialMfaUnenrollActionState,

  formData:
    FormData,
): Promise<MfaUnenrollActionState> {
  const factorId =
    getFormString(
      formData,
      "factorId",
    );

  if (
    !factorId
  ) {
    return {
      success:
        false,

      message:
        "A valid authenticator is required.",

      factorId:
        null,
    };
  }

  const result =
    await unenrollMfaFactor({
      factorId,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      factorId,
    };
  }

  return {
    success:
      true,

    message:
      "The authenticator was removed from your CASE Budget account.",

    factorId:
      result.data.factorId,
  };
}

/**
 * Returns the authenticated user's current MFA status.
 */
export async function getMfaStatusAction(): Promise<
  MfaStatusActionState
> {
  const result =
    await getMfaStatus();

  if (
    !result.success
  ) {
    return {
      success:
        false,

      message:
        result.error.message,

      status:
        null,
    };
  }

  return {
    success:
      true,

    message:
      "",

    status:
      result.data,
  };
}

function mapVerificationErrorToFields(
  code:
    string,

  message:
    string,
) {
  if (
    code ===
      "invalid_verification_code" ||
    code ===
      "verification_failed" ||
    code ===
      "challenge_failed"
  ) {
    return {
      code:
        message,
    };
  }

  return {};
}

function getFormString(
  formData:
    FormData,

  key:
    string,

  trimValue =
    true,
) {
  const value =
    formData.get(
      key,
    );

  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return trimValue
    ? value.trim()
    : value;
}