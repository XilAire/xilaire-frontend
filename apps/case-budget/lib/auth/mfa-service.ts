import "server-only";

import type {
  AuthError,
  Factor,
} from "@supabase/supabase-js";

import {
  createCaseBudgetSupabaseServerClient,
} from "@/lib/auth/server-auth";

import type {
  CaseBudgetMfaAssuranceLevel,
  CaseBudgetMfaAuthorizationResult,
  CaseBudgetMfaError,
  CaseBudgetMfaFactor,
  CaseBudgetMfaProtectedAction,
  CaseBudgetMfaResult,
  CaseBudgetMfaStatus,
  CreateMfaChallengeInput,
  CreateMfaChallengeResult,
  EnrollTotpInput,
  EnrollTotpResult,
  UnenrollMfaFactorInput,
  UnenrollMfaFactorResult,
  VerifyMfaChallengeInput,
  VerifyMfaChallengeResult,
} from "@/types/auth/mfa";

const REQUIRED_MFA_LEVEL =
  "aal2";

export async function getMfaStatus(): Promise<
  CaseBudgetMfaResult<CaseBudgetMfaStatus>
> {
  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const {
      data: userData,
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !userData.user
    ) {
      return failure(
        userError
          ? mapAuthError(
              userError,
            )
          : {
              code:
                "not_authenticated",

              message:
                "You must be signed in to manage multi-factor authentication.",
            },
      );
    }

    const [
      factorResult,
      assuranceResult,
    ] =
      await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

    if (
      factorResult.error
    ) {
      return failure(
        mapAuthError(
          factorResult.error,
        ),
      );
    }

    if (
      assuranceResult.error
    ) {
      return failure(
        mapAuthError(
          assuranceResult.error,
        ),
      );
    }

    const verifiedFactors =
      mapFactors(
        factorResult.data?.totp ??
          [],
        "verified",
      );

    const unverifiedFactors =
      mapFactors(
        factorResult.data?.all ??
          [],
        "unverified",
      ).filter(
        (
          factor,
        ) =>
          !verifiedFactors.some(
            (
              verifiedFactor,
            ) =>
              verifiedFactor.id ===
              factor.id,
          ),
      );

    const currentLevel =
      normalizeAssuranceLevel(
        assuranceResult.data
          ?.currentLevel,
      );

    const nextLevel =
      normalizeAssuranceLevel(
        assuranceResult.data
          ?.nextLevel,
      );

    return success({
      currentLevel,

      nextLevel,

      requiresMfa:
        nextLevel ===
          REQUIRED_MFA_LEVEL &&
        currentLevel !==
          REQUIRED_MFA_LEVEL,

      isAal2:
        currentLevel ===
        REQUIRED_MFA_LEVEL,

      hasVerifiedFactor:
        verifiedFactors.length >
        0,

      hasUnverifiedFactor:
        unverifiedFactors.length >
        0,

      verifiedFactors,

      unverifiedFactors,
    });
  } catch (
    error
  ) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function enrollTotp(
  input:
    EnrollTotpInput = {},
): Promise<
  CaseBudgetMfaResult<EnrollTotpResult>
> {
  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const authenticationResult =
      await ensureAuthenticated(
        supabase,
      );

    if (
      !authenticationResult.success
    ) {
      return authenticationResult;
    }

    const friendlyName =
      normalizeFriendlyName(
        input.friendlyName,
      );

    const {
      data,
      error,
    } =
      await supabase.auth.mfa.enroll({
        factorType:
          "totp",

        friendlyName:
          friendlyName ??
          "CASE Budget Authenticator",
      });

    if (
      error
    ) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    if (
      !data?.id ||
      !data.totp?.qr_code ||
      !data.totp.secret ||
      !data.totp.uri
    ) {
      return failure({
        code:
          "enrollment_failed",

        message:
          "CASE Budget could not start authenticator enrollment.",
      });
    }

    return success({
      enrollment: {
        factorId:
          data.id,

        qrCode:
          data.totp.qr_code,

        secret:
          data.totp.secret,

        uri:
          data.totp.uri,
      },
    });
  } catch (
    error
  ) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function createMfaChallenge(
  input:
    CreateMfaChallengeInput,
): Promise<
  CaseBudgetMfaResult<CreateMfaChallengeResult>
> {
  const factorId =
    input.factorId.trim();

  if (
    !factorId
  ) {
    return failure({
      code:
        "invalid_input",

      message:
        "A valid MFA factor is required.",
    });
  }

  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const authenticationResult =
      await ensureAuthenticated(
        supabase,
      );

    if (
      !authenticationResult.success
    ) {
      return authenticationResult;
    }

    const {
      data,
      error,
    } =
      await supabase.auth.mfa.challenge({
        factorId,
      });

    if (
      error
    ) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    if (
      !data?.id
    ) {
      return failure({
        code:
          "challenge_failed",

        message:
          "CASE Budget could not create an MFA challenge.",
      });
    }

    return success({
      challenge: {
        challengeId:
          data.id,

        factorId,

        expiresAt:
          data.expires_at ??
          0,
      },
    });
  } catch (
    error
  ) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function verifyMfaChallenge(
  input:
    VerifyMfaChallengeInput,
): Promise<
  CaseBudgetMfaResult<VerifyMfaChallengeResult>
> {
  const factorId =
    input.factorId.trim();

  const challengeId =
    input.challengeId.trim();

  const code =
    normalizeVerificationCode(
      input.code,
    );

  if (
    !factorId ||
    !challengeId ||
    !isValidVerificationCode(
      code,
    )
  ) {
    return failure({
      code:
        "invalid_input",

      message:
        "Enter a valid six-digit authenticator code.",
    });
  }

  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const authenticationResult =
      await ensureAuthenticated(
        supabase,
      );

    if (
      !authenticationResult.success
    ) {
      return authenticationResult;
    }

    const {
      error,
    } =
      await supabase.auth.mfa.verify({
        factorId,

        challengeId,

        code,
      });

    if (
      error
    ) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    const assuranceResult =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      assuranceResult.error
    ) {
      return failure(
        mapAuthError(
          assuranceResult.error,
        ),
      );
    }

    const currentLevel =
      normalizeAssuranceLevel(
        assuranceResult.data
          ?.currentLevel,
      );

    if (
      currentLevel !==
      REQUIRED_MFA_LEVEL
    ) {
      return failure({
        code:
          "verification_failed",

        message:
          "The authenticator code was accepted, but the session did not reach the required security level.",
      });
    }

    return success({
      factorId,

      challengeId,

      assuranceLevel:
        "aal2",
    });
  } catch (
    error
  ) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function unenrollMfaFactor(
  input:
    UnenrollMfaFactorInput,
): Promise<
  CaseBudgetMfaResult<UnenrollMfaFactorResult>
> {
  const factorId =
    input.factorId.trim();

  if (
    !factorId
  ) {
    return failure({
      code:
        "invalid_input",

      message:
        "A valid MFA factor is required.",
    });
  }

  try {
    const supabase =
      await createCaseBudgetSupabaseServerClient();

    const authenticationResult =
      await ensureAuthenticated(
        supabase,
      );

    if (
      !authenticationResult.success
    ) {
      return authenticationResult;
    }

    const {
      error,
    } =
      await supabase.auth.mfa.unenroll({
        factorId,
      });

    if (
      error
    ) {
      return failure(
        mapAuthError(
          error,
        ),
      );
    }

    return success({
      factorId,
    });
  } catch (
    error
  ) {
    return failure(
      mapUnknownError(
        error,
      ),
    );
  }
}

export async function authorizeMfaProtectedAction(
  action:
    CaseBudgetMfaProtectedAction,
): Promise<
  CaseBudgetMfaResult<CaseBudgetMfaAuthorizationResult>
> {
  const statusResult =
    await getMfaStatus();

  if (
    !statusResult.success
  ) {
    if (
      statusResult.error.code ===
      "not_authenticated"
    ) {
      return success({
        allowed:
          false,

        action,

        currentLevel:
          null,

        requiredLevel:
          "aal2",

        reason:
          "not_authenticated",
      });
    }

    return failure(
      statusResult.error,
    );
  }

  const status =
    statusResult.data;

  if (
    status.isAal2
  ) {
    return success({
      allowed:
        true,

      action,

      currentLevel:
        status.currentLevel,

      requiredLevel:
        "aal2",

      reason:
        null,
    });
  }

  if (
    !status.hasVerifiedFactor
  ) {
    return success({
      allowed:
        false,

      action,

      currentLevel:
        status.currentLevel,

      requiredLevel:
        "aal2",

      reason:
        "mfa_not_enrolled",
    });
  }

  return success({
    allowed:
      false,

    action,

    currentLevel:
      status.currentLevel,

    requiredLevel:
      "aal2",

    reason:
      "mfa_challenge_required",
  });
}

async function ensureAuthenticated(
  supabase:
    Awaited<
      ReturnType<
        typeof createCaseBudgetSupabaseServerClient
      >
    >,
): Promise<
  CaseBudgetMfaResult<null>
> {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (
    error
  ) {
    return failure(
      mapAuthError(
        error,
      ),
    );
  }

  if (
    !data.user
  ) {
    return failure({
      code:
        "not_authenticated",

      message:
        "You must be signed in to manage multi-factor authentication.",
    });
  }

  return success(
    null,
  );
}

function mapFactors(
  factors:
    Factor[],
  expectedStatus:
    "verified" | "unverified",
) {
  return factors
    .filter(
      (
        factor,
      ) =>
        factor.factor_type ===
        "totp",
    )
    .filter(
      (
        factor,
      ) => {
        if (
          expectedStatus ===
          "verified"
        ) {
          return factor.status ===
            "verified";
        }

        return factor.status !==
          "verified";
      },
    )
    .map(
      mapFactor,
    );
}

function mapFactor(
  factor:
    Factor,
): CaseBudgetMfaFactor {
  return {
    id:
      factor.id,

    type:
      "totp",

    status:
      factor.status ===
        "verified"
        ? "verified"
        : "unverified",

    friendlyName:
      normalizeOptionalText(
        factor.friendly_name,
      ) ??
      null,

    createdAt:
      factor.created_at ??
      "",

    updatedAt:
      factor.updated_at ??
      factor.created_at ??
      "",
  };
}

function normalizeAssuranceLevel(
  level:
    string | null | undefined,
): CaseBudgetMfaAssuranceLevel | null {
  if (
    level ===
      "aal1" ||
    level ===
      "aal2"
  ) {
    return level;
  }

  return null;
}

function normalizeFriendlyName(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  if (
    !normalizedValue
  ) {
    return null;
  }

  return normalizedValue.slice(
    0,
    100,
  );
}

function normalizeVerificationCode(
  value:
    string,
) {
  return value.replace(
    /\D/g,
    "",
  );
}

function isValidVerificationCode(
  value:
    string,
) {
  return /^\d{6}$/.test(
    value,
  );
}

function normalizeOptionalText(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function mapAuthError(
  error:
    AuthError,
): CaseBudgetMfaError {
  const message =
    error.message
      .trim();

  const normalizedMessage =
    message.toLowerCase();

  const status =
    error.status;

  if (
    status ===
      429 ||
    normalizedMessage.includes(
      "rate limit",
    ) ||
    normalizedMessage.includes(
      "too many requests",
    )
  ) {
    return {
      code:
        "rate_limited",

      message:
        "Too many MFA attempts were made. Wait a moment and try again.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "not found",
    ) &&
    normalizedMessage.includes(
      "factor",
    )
  ) {
    return {
      code:
        "factor_not_found",

      message:
        "The requested authenticator could not be found.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "already",
    ) &&
    normalizedMessage.includes(
      "factor",
    )
  ) {
    return {
      code:
        "factor_already_exists",

      message:
        "An authenticator is already enrolled for this account.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "not verified",
    )
  ) {
    return {
      code:
        "factor_not_verified",

      message:
        "This authenticator has not been verified yet.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "invalid",
    ) &&
    (
      normalizedMessage.includes(
        "code",
      ) ||
      normalizedMessage.includes(
        "totp",
      )
    )
  ) {
    return {
      code:
        "invalid_verification_code",

      message:
        "The authenticator code is invalid or has expired. Enter the current six-digit code and try again.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "challenge",
    )
  ) {
    return {
      code:
        "challenge_failed",

      message:
        message ||
        "The MFA challenge could not be completed.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "enroll",
    )
  ) {
    return {
      code:
        "enrollment_failed",

      message:
        message ||
        "Authenticator enrollment could not be completed.",

      status,
    };
  }

  if (
    normalizedMessage.includes(
      "session",
    ) ||
    normalizedMessage.includes(
      "jwt",
    ) ||
    status ===
      401
  ) {
    return {
      code:
        "not_authenticated",

      message:
        "Your authentication session is no longer valid. Sign in again.",

      status,
    };
  }

  return {
    code:
      "unexpected_error",

    message:
      message ||
      "An unexpected multi-factor authentication error occurred.",

    status,
  };
}

function mapUnknownError(
  error:
    unknown,
): CaseBudgetMfaError {
  if (
    error instanceof Error
  ) {
    return {
      code:
        "unexpected_error",

      message:
        error.message,
    };
  }

  return {
    code:
      "unexpected_error",

    message:
      "An unexpected multi-factor authentication error occurred.",
  };
}

function success<
  Data,
>(
  data:
    Data,
): CaseBudgetMfaResult<Data> {
  return {
    success:
      true,

    data,

    error:
      null,
  };
}

function failure<
  Data = never,
>(
  error:
    CaseBudgetMfaError,
): CaseBudgetMfaResult<Data> {
  return {
    success:
      false,

    data:
      null,

    error,
  };
}