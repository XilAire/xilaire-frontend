import "server-only";

import {
  createClient,
} from "@supabase/supabase-js";

type PasswordRecoveryResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

function normalizeEmail(
  email: string,
) {
  return email
    .trim()
    .toLowerCase();
}

function createAdminClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_UNIVERSITY;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY_CASE_UNIVERSITY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "CASE University Supabase admin configuration is missing.",
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

function isUserNotFoundError(
  message: string,
) {
  const normalized =
    message.toLowerCase();

  return (
    normalized.includes(
      "user not found",
    ) ||
    normalized.includes(
      "email not found",
    ) ||
    normalized.includes(
      "no user",
    )
  );
}

export async function requestCaseUniversityPasswordReset(
  emailInput: string,
): Promise<PasswordRecoveryResult> {
  const email =
    normalizeEmail(
      emailInput,
    );

  if (
    !email ||
    !email.includes("@")
  ) {
    return {
      success:
        false,

      message:
        "A valid email address is required.",
    };
  }

  try {
    const supabase =
      createAdminClient();

    const baseUrl =
      process.env
        .NEXT_PUBLIC_CASE_UNIVERSITY_APP_URL?.replace(
          /\/$/,
          "",
        );

    if (!baseUrl) {
      throw new Error(
        "CASE University application URL is missing.",
      );
    }

    const redirectTo =
      `${baseUrl}/auth/callback?next=/auth/update-password`;

    const {
      data,
      error,
    } =
      await supabase.auth.admin.generateLink({
        type:
          "recovery",

        email,

        options: {
          redirectTo,
        },
      });

    if (error) {
      /*
       * SECURITY:
       *
       * Do not expose whether the email exists.
       *
       * Supabase will return a user-not-found style
       * error when a recovery link cannot be
       * generated for a nonexistent account.
       *
       * In that case we deliberately return the same
       * outward success result as a real account.
       */
      if (
        isUserNotFoundError(
          error.message,
        )
      ) {
        return {
          success:
            true,
        };
      }

      console.error(
        "Unable to generate CASE University recovery link",
        error,
      );

      return {
        success:
          false,

        message:
          "Unable to process the password reset request right now.",
      };
    }

    /*
     * If no authenticated user was returned,
     * do not attempt to send anything.
     *
     * The caller still receives a neutral success
     * response so account existence is not leaked.
     */
    if (
      !data.user
    ) {
      return {
        success:
          true,
      };
    }

    const actionLink =
      data.properties
        ?.action_link;

    if (
      !actionLink
    ) {
      console.error(
        "Supabase did not return a CASE University recovery action link.",
      );

      return {
        success:
          false,

        message:
          "Unable to process the password reset request right now.",
      };
    }

    /*
     * IMPORTANT:
     *
     * At this stage the account definitely exists.
     *
     * We have intentionally NOT sent the email yet.
     * The next file will connect this generated
     * secure recovery URL to the CASE University
     * email sender / Resend infrastructure.
     */

    console.info(
      "CASE University password recovery link generated for an existing account.",
    );

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    console.error(
      "CASE University password recovery failed",
      error,
    );

    return {
      success:
        false,

      message:
        "Unable to process the password reset request right now.",
    };
  }
}