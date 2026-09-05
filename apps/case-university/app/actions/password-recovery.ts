"use server";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";

import {
  sendResetPasswordEmail,
} from "@/lib/email/send-auth-email";

type RequestPasswordResetResult = {
  success:
    boolean;

  message:
    string;
};

type ContinuePasswordRecoveryResult = {
  success:
    boolean;

  message:
    string;
};

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email address, a password reset link has been sent.";

export async function requestPasswordResetAction(
  emailInput:
    string,
): Promise<RequestPasswordResetResult> {
  const email =
    normalizeEmail(
      emailInput,
    );

  if (
    !email
  ) {
    return {
      success:
        false,

      message:
        "Enter a valid email address.",
    };
  }

  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase.auth.admin.generateLink({
        type:
          "recovery",

        email,
      });

    if (
      error
    ) {
      if (
        isAccountNotFoundError(
          error.message,
        )
      ) {
        return {
          success:
            true,

          message:
            GENERIC_SUCCESS_MESSAGE,
        };
      }

      console.error(
        "[CASE University Password Recovery] Supabase recovery-link generation failed.",
        {
          message:
            error.message,

          status:
            error.status,
        },
      );

      return {
        success:
          false,

        message:
          "Unable to process the password reset request right now. Please try again.",
      };
    }

    const user =
      data.user;

    const tokenHash =
      data.properties
        ?.hashed_token;

    if (
      !user ||
      !tokenHash
    ) {
      return {
        success:
          true,

        message:
          GENERIC_SUCCESS_MESSAGE,
      };
    }

    const firstName =
      readFirstName(
        user.user_metadata,
      );

    const appUrl =
      getApplicationUrl();

    const recoveryUrl =
      `${appUrl}/auth/recovery/confirm?token_hash=${encodeURIComponent(
        tokenHash,
      )}`;

    const emailResult =
      await sendResetPasswordEmail({
        to:
          email,

        resetUrl:
          recoveryUrl,

        firstName,

        expiresInMinutes:
          60,
      });

    if (
      !emailResult.success
    ) {
      console.error(
        "[CASE University Password Recovery] Reset email delivery failed.",
        {
          code:
            emailResult.error.code,

          statusCode:
            emailResult.error.statusCode,

          message:
            emailResult.error.message,
        },
      );

      return {
        success:
          false,

        message:
          "Unable to send the password reset email right now. Please try again.",
      };
    }

    console.info(
      "[CASE University Password Recovery] Custom reset email sent.",
      {
        emailId:
          emailResult.id,
      },
    );

    return {
      success:
        true,

      message:
        GENERIC_SUCCESS_MESSAGE,
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE University Password Recovery] Unexpected failure.",
      error,
    );

    return {
      success:
        false,

      message:
        "Unable to process the password reset request right now. Please try again.",
    };
  }
}

export async function continuePasswordRecoveryAction(
  tokenHashInput:
    string,
): Promise<ContinuePasswordRecoveryResult> {
  const tokenHash =
    tokenHashInput
      .trim();

  if (
    !tokenHash
  ) {
    return {
      success:
        false,

      message:
        "This password reset link is invalid. Request a new reset link and try again.",
    };
  }

  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      error,
    } =
      await supabase.auth.verifyOtp({
        type:
          "recovery",

        token_hash:
          tokenHash,
      });

    if (
      error
    ) {
      console.error(
        "[CASE University Password Recovery] Recovery token verification failed.",
        {
          message:
            error.message,

          status:
            error.status,
        },
      );

      return {
        success:
          false,

        message:
          normalizeRecoveryVerificationError(
            error.message,
          ),
      };
    }
  } catch (
    error
  ) {
    console.error(
      "[CASE University Password Recovery] Unexpected recovery verification failure.",
      error,
    );

    return {
      success:
        false,

      message:
        "Unable to continue the password reset right now. Request a new reset link and try again.",
    };
  }

  redirect(
    "/auth/update-password",
  );
}

function createAdminClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY
      ?.trim();

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY
      ?.trim();

  if (
    !supabaseUrl
  ) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY.",
    );
  }

  if (
    !serviceRoleKey
  ) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken:
          false,

        persistSession:
          false,
      },
    },
  );
}

function getApplicationUrl() {
  const configuredUrl =
    process.env
      .NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL
      ?.trim();

  if (
    !configuredUrl
  ) {
    throw new Error(
      "Missing NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL.",
    );
  }

  return configuredUrl.replace(
    /\/+$/,
    "",
  );
}

function normalizeEmail(
  value:
    string,
) {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    !normalized
  ) {
    return null;
  }

  const atIndex =
    normalized.indexOf(
      "@",
    );

  if (
    atIndex <=
      0 ||
    atIndex ===
      normalized.length -
        1
  ) {
    return null;
  }

  const domain =
    normalized.slice(
      atIndex +
        1,
    );

  if (
    !domain.includes(
      ".",
    )
  ) {
    return null;
  }

  return normalized;
}

function isAccountNotFoundError(
  message:
    string,
) {
  const normalized =
    message
      .trim()
      .toLowerCase();

  return (
    normalized.includes(
      "user not found",
    ) ||
    normalized.includes(
      "email not found",
    ) ||
    normalized.includes(
      "no user found",
    ) ||
    normalized.includes(
      "unable to find user",
    )
  );
}

function normalizeRecoveryVerificationError(
  message:
    string,
) {
  const normalized =
    message
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "expired",
    ) ||
    normalized.includes(
      "invalid",
    ) ||
    normalized.includes(
      "token",
    ) ||
    normalized.includes(
      "otp",
    )
  ) {
    return "This password reset link is invalid, expired, or has already been used. Request a new reset link and try again.";
  }

  return "Unable to verify this password reset request. Request a new reset link and try again.";
}

function readFirstName(
  metadata:
    unknown,
) {
  if (
    typeof metadata !==
      "object" ||
    metadata ===
      null ||
    Array.isArray(
      metadata,
    )
  ) {
    return undefined;
  }

  const record =
    metadata as Record<
      string,
      unknown
    >;

  const candidates = [
    record.first_name,
    record.firstName,
    record.given_name,
    record.name,
    record.full_name,
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      typeof candidate !==
        "string"
    ) {
      continue;
    }

    const normalized =
      candidate.trim();

    if (
      !normalized
    ) {
      continue;
    }

    if (
      candidate ===
        record.name ||
      candidate ===
        record.full_name
    ) {
      return normalized.split(
        /\s+/,
      )[0];
    }

    return normalized;
  }

  return undefined;
}