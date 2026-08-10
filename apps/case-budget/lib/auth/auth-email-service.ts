import "server-only";

import type {
  User,
} from "@supabase/supabase-js";

import {
  sendChangeEmailEmail,
  sendConfirmEmail,
  sendInviteUserEmail,
  sendMagicLinkEmail,
  sendResetPasswordEmail,
} from "@/lib/email";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type AuthEmailServiceError = {
  code:
    string;

  message:
    string;

  statusCode:
    number | null;
};

export type AuthEmailServiceSuccess = {
  success:
    true;

  data: {
    user:
      User | null;

    userId:
      string | null;

    emailId:
      string | null;

    actionLink:
      string;
  };
};

export type AuthEmailServiceFailure = {
  success:
    false;

  error:
    AuthEmailServiceError;
};

export type AuthEmailServiceResult =
  | AuthEmailServiceSuccess
  | AuthEmailServiceFailure;

export type SendSignUpConfirmationEmailInput = {
  email:
    string;

  password:
    string;

  firstName?:
    string;

  lastName?:
    string;

  workspaceName?:
    string;

  redirectTo?:
    string;

  expiresInMinutes?:
    number;

  metadata?:
    Record<
      string,
      unknown
    >;
};

export type SendPasswordRecoveryEmailInput = {
  email:
    string;

  firstName?:
    string;

  redirectTo?:
    string;

  expiresInMinutes?:
    number;
};

export type SendPasswordlessMagicLinkEmailInput = {
  email:
    string;

  firstName?:
    string;

  redirectTo?:
    string;

  expiresInMinutes?:
    number;

  metadata?:
    Record<
      string,
      unknown
    >;
};

export type SendWorkspaceInvitationEmailInput = {
  email:
    string;

  recipientName?:
    string;

  inviterName?:
    string;

  workspaceName?:
    string;

  redirectTo?:
    string;

  expiresInHours?:
    number;

  metadata?:
    Record<
      string,
      unknown
    >;
};

export type SendEmailChangeConfirmationInput = {
  currentEmail:
    string;

  newEmail:
    string;

  firstName?:
    string;

  redirectTo?:
    string;

  expiresInMinutes?:
    number;

  sendCurrentEmailNotice?:
    boolean;

  sendNewEmailConfirmation?:
    boolean;
};

export type SendEmailChangeConfirmationResult = {
  success:
    boolean;

  currentEmail:
    AuthEmailServiceResult | null;

  newEmail:
    AuthEmailServiceResult | null;
};

type SupportedAuthEmailType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

type BuildCaseBudgetActionLinkInput = {
  generatedActionLink:
    string;

  redirectTo?:
    string;
};

const DEFAULT_APP_URL =
  "http://localhost:3004";

const AUTH_CALLBACK_PATH =
  "/auth/callback";

/**
 * Creates a Supabase signup user and secure confirmation token,
 * then delivers that token through the CASE Budget confirmation
 * email template.
 *
 * The user-facing URL points to CASE Budget's own callback route
 * rather than exposing the raw Supabase verification URL.
 *
 * IMPORTANT:
 * This function replaces the user-creation responsibility of
 * supabase.auth.signUp() for the custom confirmation-email flow.
 *
 * Do not call this after a successful supabase.auth.signUp() for
 * the same email address or the application may attempt to create
 * the same user twice.
 */
export async function sendSignUpConfirmationEmail({
  email,
  password,
  firstName,
  lastName,
  workspaceName,
  redirectTo,
  expiresInMinutes = 60,
  metadata = {},
}: SendSignUpConfirmationEmailInput):
  Promise<AuthEmailServiceResult> {
  const normalizedEmail =
    normalizeEmail(
      email,
    );

  const normalizedPassword =
    password.trim();

  if (
    !normalizedEmail
  ) {
    return failure(
      "invalid-email",
      "A valid email address is required.",
    );
  }

  if (
    !normalizedPassword
  ) {
    return failure(
      "password-required",
      "A password is required.",
    );
  }

  const userMetadata =
    removeUndefinedValues({
      ...metadata,

      first_name:
        normalizeOptionalText(
          firstName,
        ),

      last_name:
        normalizeOptionalText(
          lastName,
        ),

      workspace_name:
        normalizeOptionalText(
          workspaceName,
        ),
    });

  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase.auth.admin.generateLink({
        type:
          "signup",

        email:
          normalizedEmail,

        password:
          normalizedPassword,

        options: {
          ...(Object.keys(
            userMetadata,
          ).length >
          0
            ? {
                data:
                  userMetadata,
              }
            : {}),

          ...(normalizeOptionalText(
            redirectTo,
          )
            ? {
                redirectTo:
                  normalizeOptionalText(
                    redirectTo,
                  ),
              }
            : {}),
        },
      });

    if (
      error
    ) {
      return mapSupabaseFailure(
        error,
        "signup-link-generation-failed",
      );
    }

    const generatedActionLink =
      normalizeGeneratedActionLink(
        data.properties
          ?.action_link,
      );

    if (
      !generatedActionLink
    ) {
      return failure(
        "signup-link-missing",
        "Supabase did not return a signup confirmation link.",
      );
    }

    const actionLink =
      buildCaseBudgetActionLink({
        generatedActionLink,
        redirectTo,
      });

    if (
      !actionLink
    ) {
      return failure(
        "signup-link-invalid",
        "CASE Budget could not create a valid signup confirmation URL.",
      );
    }

    const emailResult =
      await sendConfirmEmail({
        to:
          normalizedEmail,

        confirmationUrl:
          actionLink,

        firstName:
          normalizeOptionalText(
            firstName,
          ),

        expiresInMinutes:
          normalizePositiveInteger(
            expiresInMinutes,
            60,
          ),
      });

    if (
      !emailResult.success
    ) {
      return mapEmailFailure(
        emailResult.error,
        "signup-email-send-failed",
      );
    }

    return success({
      user:
        data.user ??
        null,

      emailId:
        emailResult.data.id,

      actionLink,
    });
  } catch (
    error
  ) {
    return mapUnknownFailure(
      error,
      "signup-email-flow-failed",
    );
  }
}

/**
 * Generates a Supabase recovery token for an existing user and
 * sends it using the CASE Budget password-reset template.
 *
 * The email points directly to CASE Budget's callback route.
 * After verification, the callback forwards the authenticated
 * recovery session to /update-password.
 */
export async function sendPasswordRecoveryEmail({
  email,
  firstName,
  redirectTo,
  expiresInMinutes = 60,
}: SendPasswordRecoveryEmailInput):
  Promise<AuthEmailServiceResult> {
  const normalizedEmail =
    normalizeEmail(
      email,
    );

  if (
    !normalizedEmail
  ) {
    return failure(
      "invalid-email",
      "A valid email address is required.",
    );
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

        email:
          normalizedEmail,

        options: {
          ...(normalizeOptionalText(
            redirectTo,
          )
            ? {
                redirectTo:
                  normalizeOptionalText(
                    redirectTo,
                  ),
              }
            : {}),
        },
      });

    if (
      error
    ) {
      return mapSupabaseFailure(
        error,
        "recovery-link-generation-failed",
      );
    }

    const generatedActionLink =
      normalizeGeneratedActionLink(
        data.properties
          ?.action_link,
      );

    if (
      !generatedActionLink
    ) {
      return failure(
        "recovery-link-missing",
        "Supabase did not return a password recovery link.",
      );
    }

    const actionLink =
      buildCaseBudgetActionLink({
        generatedActionLink,
        redirectTo,
      });

    if (
      !actionLink
    ) {
      return failure(
        "recovery-link-invalid",
        "CASE Budget could not create a valid password recovery URL.",
      );
    }

    const emailResult =
      await sendResetPasswordEmail({
        to:
          normalizedEmail,

        resetUrl:
          actionLink,

        firstName:
          normalizeOptionalText(
            firstName,
          ),

        expiresInMinutes:
          normalizePositiveInteger(
            expiresInMinutes,
            60,
          ),
      });

    if (
      !emailResult.success
    ) {
      return mapEmailFailure(
        emailResult.error,
        "recovery-email-send-failed",
      );
    }

    return success({
      user:
        data.user ??
        null,

      emailId:
        emailResult.data.id,

      actionLink,
    });
  } catch (
    error
  ) {
    return mapUnknownFailure(
      error,
      "recovery-email-flow-failed",
    );
  }
}

/**
 * Generates and sends a Supabase passwordless magic-link email
 * through CASE Budget's custom Resend template.
 *
 * Supabase may create a user for the magic-link flow when the
 * account does not already exist, matching the behavior of
 * auth.admin.generateLink().
 */
export async function sendPasswordlessMagicLinkEmail({
  email,
  firstName,
  redirectTo,
  expiresInMinutes = 60,
  metadata = {},
}: SendPasswordlessMagicLinkEmailInput):
  Promise<AuthEmailServiceResult> {
  const normalizedEmail =
    normalizeEmail(
      email,
    );

  if (
    !normalizedEmail
  ) {
    return failure(
      "invalid-email",
      "A valid email address is required.",
    );
  }

  const userMetadata =
    removeUndefinedValues({
      ...metadata,

      first_name:
        normalizeOptionalText(
          firstName,
        ),
    });

  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase.auth.admin.generateLink({
        type:
          "magiclink",

        email:
          normalizedEmail,

        options: {
          ...(Object.keys(
            userMetadata,
          ).length >
          0
            ? {
                data:
                  userMetadata,
              }
            : {}),

          ...(normalizeOptionalText(
            redirectTo,
          )
            ? {
                redirectTo:
                  normalizeOptionalText(
                    redirectTo,
                  ),
              }
            : {}),
        },
      });

    if (
      error
    ) {
      return mapSupabaseFailure(
        error,
        "magic-link-generation-failed",
      );
    }

    const generatedActionLink =
      normalizeGeneratedActionLink(
        data.properties
          ?.action_link,
      );

    if (
      !generatedActionLink
    ) {
      return failure(
        "magic-link-missing",
        "Supabase did not return a magic sign-in link.",
      );
    }

    const actionLink =
      buildCaseBudgetActionLink({
        generatedActionLink,
        redirectTo,
      });

    if (
      !actionLink
    ) {
      return failure(
        "magic-link-invalid",
        "CASE Budget could not create a valid magic sign-in URL.",
      );
    }

    const emailResult =
      await sendMagicLinkEmail({
        to:
          normalizedEmail,

        magicLinkUrl:
          actionLink,

        firstName:
          normalizeOptionalText(
            firstName,
          ),

        expiresInMinutes:
          normalizePositiveInteger(
            expiresInMinutes,
            60,
          ),
      });

    if (
      !emailResult.success
    ) {
      return mapEmailFailure(
        emailResult.error,
        "magic-link-email-send-failed",
      );
    }

    return success({
      user:
        data.user ??
        null,

      emailId:
        emailResult.data.id,

      actionLink,
    });
  } catch (
    error
  ) {
    return mapUnknownFailure(
      error,
      "magic-link-email-flow-failed",
    );
  }
}

/**
 * Generates a secure Supabase workspace invitation token and
 * delivers it through the CASE Budget invitation template.
 */
export async function sendWorkspaceInvitationEmail({
  email,
  recipientName,
  inviterName,
  workspaceName,
  redirectTo,
  expiresInHours = 72,
  metadata = {},
}: SendWorkspaceInvitationEmailInput):
  Promise<AuthEmailServiceResult> {
  const normalizedEmail =
    normalizeEmail(
      email,
    );

  if (
    !normalizedEmail
  ) {
    return failure(
      "invalid-email",
      "A valid email address is required.",
    );
  }

  const userMetadata =
    removeUndefinedValues({
      ...metadata,

      recipient_name:
        normalizeOptionalText(
          recipientName,
        ),

      inviter_name:
        normalizeOptionalText(
          inviterName,
        ),

      workspace_name:
        normalizeOptionalText(
          workspaceName,
        ),
    });

  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase.auth.admin.generateLink({
        type:
          "invite",

        email:
          normalizedEmail,

        options: {
          ...(Object.keys(
            userMetadata,
          ).length >
          0
            ? {
                data:
                  userMetadata,
              }
            : {}),

          ...(normalizeOptionalText(
            redirectTo,
          )
            ? {
                redirectTo:
                  normalizeOptionalText(
                    redirectTo,
                  ),
              }
            : {}),
        },
      });

    if (
      error
    ) {
      return mapSupabaseFailure(
        error,
        "invite-link-generation-failed",
      );
    }

    const generatedActionLink =
      normalizeGeneratedActionLink(
        data.properties
          ?.action_link,
      );

    if (
      !generatedActionLink
    ) {
      return failure(
        "invite-link-missing",
        "Supabase did not return a workspace invitation link.",
      );
    }

    const actionLink =
      buildCaseBudgetActionLink({
        generatedActionLink,
        redirectTo,
      });

    if (
      !actionLink
    ) {
      return failure(
        "invite-link-invalid",
        "CASE Budget could not create a valid workspace invitation URL.",
      );
    }

    const emailResult =
      await sendInviteUserEmail({
        to:
          normalizedEmail,

        inviteUrl:
          actionLink,

        recipientName:
          normalizeOptionalText(
            recipientName,
          ),

        inviterName:
          normalizeOptionalText(
            inviterName,
          ),

        workspaceName:
          normalizeOptionalText(
            workspaceName,
          ),

        expiresInHours:
          normalizePositiveInteger(
            expiresInHours,
            72,
          ),
      });

    if (
      !emailResult.success
    ) {
      return mapEmailFailure(
        emailResult.error,
        "invite-email-send-failed",
      );
    }

    return success({
      user:
        data.user ??
        null,

      emailId:
        emailResult.data.id,

      actionLink,
    });
  } catch (
    error
  ) {
    return mapUnknownFailure(
      error,
      "invite-email-flow-failed",
    );
  }
}

/**
 * Generates Supabase secure-email-change tokens and sends CASE
 * Budget branded confirmation messages.
 *
 * Supabase can require confirmation from both the current and new
 * email addresses when Secure Email Change is enabled. The caller
 * can choose which messages should be sent.
 */
export async function sendEmailChangeConfirmation({
  currentEmail,
  newEmail,
  firstName,
  redirectTo,
  expiresInMinutes = 60,
  sendCurrentEmailNotice = true,
  sendNewEmailConfirmation = true,
}: SendEmailChangeConfirmationInput):
  Promise<SendEmailChangeConfirmationResult> {
  const normalizedCurrentEmail =
    normalizeEmail(
      currentEmail,
    );

  const normalizedNewEmail =
    normalizeEmail(
      newEmail,
    );

  if (
    !normalizedCurrentEmail ||
    !normalizedNewEmail
  ) {
    const invalidResult =
      failure(
        "invalid-email",
        "Both the current and new email addresses are required.",
      );

    return {
      success:
        false,

      currentEmail:
        sendCurrentEmailNotice
          ? invalidResult
          : null,

      newEmail:
        sendNewEmailConfirmation
          ? invalidResult
          : null,
    };
  }

  const currentResult =
    sendCurrentEmailNotice
      ? await generateAndSendEmailChangeLink({
          type:
            "email_change_current",

          recipient:
            normalizedCurrentEmail,

          currentEmail:
            normalizedCurrentEmail,

          newEmail:
            normalizedNewEmail,

          firstName,
          redirectTo,
          expiresInMinutes,
        })
      : null;

  const newResult =
    sendNewEmailConfirmation
      ? await generateAndSendEmailChangeLink({
          type:
            "email_change_new",

          recipient:
            normalizedNewEmail,

          currentEmail:
            normalizedCurrentEmail,

          newEmail:
            normalizedNewEmail,

          firstName,
          redirectTo,
          expiresInMinutes,
        })
      : null;

  return {
    success:
      (
        !currentResult ||
        currentResult.success
      ) &&
      (
        !newResult ||
        newResult.success
      ),

    currentEmail:
      currentResult,

    newEmail:
      newResult,
  };
}

async function generateAndSendEmailChangeLink({
  type,
  recipient,
  currentEmail,
  newEmail,
  firstName,
  redirectTo,
  expiresInMinutes,
}: {
  type:
    | "email_change_current"
    | "email_change_new";

  recipient:
    string;

  currentEmail:
    string;

  newEmail:
    string;

  firstName?:
    string;

  redirectTo?:
    string;

  expiresInMinutes:
    number;
}): Promise<AuthEmailServiceResult> {
  try {
    const supabase =
      createAdminClient();

    const {
      data,
      error,
    } =
      await supabase.auth.admin.generateLink({
        type,

        email:
          currentEmail,

        newEmail,

        options: {
          ...(normalizeOptionalText(
            redirectTo,
          )
            ? {
                redirectTo:
                  normalizeOptionalText(
                    redirectTo,
                  ),
              }
            : {}),
        },
      });

    if (
      error
    ) {
      return mapSupabaseFailure(
        error,
        "email-change-link-generation-failed",
      );
    }

    const generatedActionLink =
      normalizeGeneratedActionLink(
        data.properties
          ?.action_link,
      );

    if (
      !generatedActionLink
    ) {
      return failure(
        "email-change-link-missing",
        "Supabase did not return an email-change confirmation link.",
      );
    }

    const actionLink =
      buildCaseBudgetActionLink({
        generatedActionLink,
        redirectTo,
      });

    if (
      !actionLink
    ) {
      return failure(
        "email-change-link-invalid",
        "CASE Budget could not create a valid email-change confirmation URL.",
      );
    }

    const emailResult =
      await sendChangeEmailEmail({
        to:
          recipient,

        confirmationUrl:
          actionLink,

        firstName:
          normalizeOptionalText(
            firstName,
          ),

        currentEmail,

        newEmail,

        expiresInMinutes:
          normalizePositiveInteger(
            expiresInMinutes,
            60,
          ),
      });

    if (
      !emailResult.success
    ) {
      return mapEmailFailure(
        emailResult.error,
        "email-change-email-send-failed",
      );
    }

    return success({
      user:
        data.user ??
        null,

      emailId:
        emailResult.data.id,

      actionLink,
    });
  } catch (
    error
  ) {
    return mapUnknownFailure(
      error,
      "email-change-email-flow-failed",
    );
  }
}

/**
 * Converts Supabase's generated verification URL into a CASE
 * Budget callback URL.
 *
 * Supabase's generated action URL contains a one-time token hash
 * and verification type. CASE Budget extracts those values and
 * places them on /auth/callback.
 *
 * This keeps the authentication workflow server-side and ensures
 * that users see a CASE Budget URL when hovering over or opening
 * links in branded email.
 */
function buildCaseBudgetActionLink({
  generatedActionLink,
  redirectTo,
}: BuildCaseBudgetActionLinkInput) {
  try {
    const generatedUrl =
      new URL(
        generatedActionLink,
      );

    const tokenHash =
      normalizeOptionalText(
        generatedUrl.searchParams.get(
          "token",
        ) ??
          undefined,
      );

    const authType =
      normalizeAuthEmailType(
        generatedUrl.searchParams.get(
          "type",
        ),
      );

    if (
      !tokenHash ||
      !authType
    ) {
      return null;
    }

    const callbackUrl =
      new URL(
        AUTH_CALLBACK_PATH,
        resolveApplicationOrigin(
          redirectTo,
        ),
      );

    callbackUrl.searchParams.set(
      "token_hash",
      tokenHash,
    );

    callbackUrl.searchParams.set(
      "type",
      authType,
    );

    const nextPath =
      resolveCallbackNextPath(
        redirectTo,
      );

    if (
      nextPath
    ) {
      callbackUrl.searchParams.set(
        "next",
        nextPath,
      );
    }

    return callbackUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Determines the application origin used for branded auth URLs.
 *
 * Priority:
 *
 * 1. NEXT_PUBLIC_CASE_BUDGET_APP_URL
 * 2. Origin supplied by redirectTo
 * 3. localhost:3004 during local development
 */
function resolveApplicationOrigin(
  redirectTo?:
    string,
) {
  const configuredAppUrl =
    normalizeOptionalText(
      process.env
        .NEXT_PUBLIC_CASE_BUDGET_APP_URL,
    );

  if (
    configuredAppUrl
  ) {
    try {
      const configuredUrl =
        new URL(
          configuredAppUrl,
        );

      if (
        isAllowedHttpProtocol(
          configuredUrl,
        )
      ) {
        return configuredUrl.origin;
      }
    } catch {
      // Continue to redirectTo.
    }
  }

  const normalizedRedirectTo =
    normalizeOptionalText(
      redirectTo,
    );

  if (
    normalizedRedirectTo
  ) {
    try {
      const redirectUrl =
        new URL(
          normalizedRedirectTo,
        );

      if (
        isAllowedHttpProtocol(
          redirectUrl,
        )
      ) {
        return redirectUrl.origin;
      }
    } catch {
      // Continue to local fallback.
    }
  }

  return DEFAULT_APP_URL;
}

/**
 * Preserves the post-authentication destination requested by the
 * original caller.
 *
 * Examples:
 *
 * https://casebudgets.com/auth/callback
 *     -> no next parameter
 *
 * https://casebudgets.com/auth/callback?next=/update-password
 *     -> /update-password
 *
 * https://casebudgets.com/dashboard
 *     -> /dashboard
 */
function resolveCallbackNextPath(
  redirectTo?:
    string,
) {
  const normalizedRedirectTo =
    normalizeOptionalText(
      redirectTo,
    );

  if (
    !normalizedRedirectTo
  ) {
    return null;
  }

  try {
    const redirectUrl =
      new URL(
        normalizedRedirectTo,
        resolveApplicationOrigin(),
      );

    if (
      !isAllowedHttpProtocol(
        redirectUrl,
      )
    ) {
      return null;
    }

    if (
      redirectUrl.pathname ===
      AUTH_CALLBACK_PATH
    ) {
      return (
        getSafeRelativePath(
          redirectUrl.searchParams.get(
            "next",
          ),
        ) ??
        getSafeRelativePath(
          redirectUrl.searchParams.get(
            "redirectTo",
          ),
        )
      );
    }

    return getSafeRelativePath(
      `${redirectUrl.pathname}${redirectUrl.search}`,
    );
  } catch {
    return getSafeRelativePath(
      normalizedRedirectTo,
    );
  }
}

function getSafeRelativePath(
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

    if (
      parsedUrl.pathname ===
      AUTH_CALLBACK_PATH
    ) {
      return null;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
}

function normalizeAuthEmailType(
  value:
    string | null,
): SupportedAuthEmailType | null {
  if (
    value ===
      "signup" ||
    value ===
      "invite" ||
    value ===
      "magiclink" ||
    value ===
      "recovery" ||
    value ===
      "email_change" ||
    value ===
      "email"
  ) {
    return value;
  }

  if (
    value ===
      "email_change_current" ||
    value ===
      "email_change_new"
  ) {
    return "email_change";
  }

  return null;
}

function normalizeGeneratedActionLink(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    return null;
  }

  try {
    const url =
      new URL(
        normalizedValue,
      );

    if (
      !isAllowedHttpProtocol(
        url,
      )
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isAllowedHttpProtocol(
  url:
    URL,
) {
  return (
    url.protocol ===
      "https:" ||
    url.protocol ===
      "http:"
  );
}

function success({
  user,
  emailId,
  actionLink,
}: {
  user:
    User | null;

  emailId:
    string | null;

  actionLink:
    string;
}): AuthEmailServiceSuccess {
  return {
    success:
      true,

    data: {
      user,

      userId:
        user?.id ??
        null,

      emailId,

      actionLink,
    },
  };
}

function failure(
  code:
    string,
  message:
    string,
  statusCode:
    number | null =
      null,
): AuthEmailServiceFailure {
  return {
    success:
      false,

    error: {
      code,
      message,
      statusCode,
    },
  };
}

function mapSupabaseFailure(
  error:
    unknown,
  fallbackCode:
    string,
): AuthEmailServiceFailure {
  return failure(
    readErrorCode(
      error,
      fallbackCode,
    ),

    readErrorMessage(
      error,
      "Supabase could not generate the authentication link.",
    ),

    readStatusCode(
      error,
    ),
  );
}

function mapEmailFailure(
  error: {
    code:
      string;

    message:
      string;

    statusCode:
      number | null;
  },
  fallbackCode:
    string,
): AuthEmailServiceFailure {
  return failure(
    error.code ||
      fallbackCode,

    error.message,

    error.statusCode,
  );
}

function mapUnknownFailure(
  error:
    unknown,
  fallbackCode:
    string,
): AuthEmailServiceFailure {
  return failure(
    fallbackCode,

    error instanceof
      Error
      ? error.message
      : "CASE Budget could not complete the authentication email flow.",
  );
}

function normalizeEmail(
  value:
    string,
) {
  const normalizedValue =
    value
      .trim()
      .toLowerCase();

  if (
    !normalizedValue ||
    !normalizedValue.includes(
      "@",
    )
  ) {
    return null;
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizePositiveInteger(
  value:
    number | undefined,
  fallback:
    number,
) {
  if (
    value ===
      undefined ||
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(
      value,
    ),
  );
}

function removeUndefinedValues(
  value:
    Record<
      string,
      unknown
    >,
) {
  return Object.fromEntries(
    Object.entries(
      value,
    ).filter(
      (
        [
          _key,
          entryValue,
        ],
      ) =>
        entryValue !==
        undefined,
    ),
  );
}

function readErrorCode(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    typeof error ===
      "object" &&
    error !==
      null
  ) {
    const candidate =
      error as {
        code?:
          unknown;

        name?:
          unknown;
      };

    if (
      typeof candidate.code ===
        "string" &&
      candidate.code.trim()
    ) {
      return candidate.code.trim();
    }

    if (
      typeof candidate.name ===
        "string" &&
      candidate.name.trim()
    ) {
      return candidate.name.trim();
    }
  }

  return fallback;
}

function readErrorMessage(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    typeof error ===
      "object" &&
    error !==
      null
  ) {
    const message =
      (
        error as {
          message?:
            unknown;
        }
      ).message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  return fallback;
}

function readStatusCode(
  error:
    unknown,
) {
  if (
    typeof error !==
      "object" ||
    error ===
      null
  ) {
    return null;
  }

  const candidate =
    error as {
      status?:
        unknown;

      statusCode?:
        unknown;
    };

  if (
    typeof candidate.status ===
      "number"
  ) {
    return candidate.status;
  }

  if (
    typeof candidate.statusCode ===
      "number"
  ) {
    return candidate.statusCode;
  }

  return null;
}