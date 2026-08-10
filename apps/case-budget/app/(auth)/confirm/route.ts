import type {
  EmailOtpType,
} from "@supabase/supabase-js";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  provisionUser,
  synchronizeProfileFromAuth,
} from "@/lib/auth/auth-service";

import {
  sendWelcomeEmail,
} from "@/lib/email";

import {
  createClient,
} from "@/lib/supabase/server";

const DEFAULT_SUCCESS_PATH =
  "/dashboard";

const DEFAULT_ERROR_PATH =
  "/sign-in";

export async function GET(
  request:
    NextRequest,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const tokenHash =
    requestUrl.searchParams.get(
      "token_hash",
    );

  const verificationType =
    getEmailOtpType(
      requestUrl.searchParams.get(
        "type",
      ),
    );

  const nextPath =
    getSafeNextPath(
      requestUrl.searchParams.get(
        "next",
      ),
    );

  const errorCode =
    requestUrl.searchParams.get(
      "error_code",
    );

  const errorDescription =
    requestUrl.searchParams.get(
      "error_description",
    );

  if (
    errorCode ||
    errorDescription
  ) {
    return createErrorRedirect({
      request,

      errorCode:
        errorCode ??
        "email_confirmation_failed",

      errorDescription:
        errorDescription ??
        "The email confirmation link could not be completed.",
    });
  }

  if (
    !tokenHash ||
    !verificationType
  ) {
    return createErrorRedirect({
      request,

      errorCode:
        "invalid_confirmation_link",

      errorDescription:
        "The email confirmation link is missing required information.",
    });
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth.verifyOtp({
      token_hash:
        tokenHash,

      type:
        verificationType,
    });

  if (
    error
  ) {
    return createErrorRedirect({
      request,

      errorCode:
        error.code ??
        "email_confirmation_failed",

      errorDescription:
        getConfirmationErrorMessage(
          error.message,
        ),
    });
  }

  const authenticatedUser =
    data.user;

  if (
    shouldProvisionUser(
      verificationType,
    )
  ) {
    if (
      !authenticatedUser
    ) {
      await supabase.auth.signOut();

      return createErrorRedirect({
        request,

        errorCode:
          "account_setup_failed",

        errorDescription:
          "Your email was confirmed, but CASE Budget could not complete your account setup. Please sign in and try again.",
      });
    }

    const provisioningResult =
      await provisionUser(
        authenticatedUser.id,
      );

    if (
      !provisioningResult.success
    ) {
      logConfirmationError(
        "CASE Budget user provisioning failed after email confirmation.",
        {
          userId:
            authenticatedUser.id,

          verificationType,

          errorCode:
            provisioningResult.error.code,

          errorMessage:
            provisioningResult.error.message,

          errorStatus:
            provisioningResult.error.status ??
            null,
        },
      );

      await supabase.auth.signOut();

      return createErrorRedirect({
        request,

        errorCode:
          "account_setup_failed",

        errorDescription:
          "Your email was confirmed, but CASE Budget could not finish setting up your account. Please sign in and try again.",
      });
    }

    const profileSyncResult =
      await synchronizeProfileFromAuth(
        authenticatedUser.id,
      );

    if (
      !profileSyncResult.success
    ) {
      logConfirmationError(
        "CASE Budget profile synchronization failed after email confirmation.",
        {
          userId:
            authenticatedUser.id,

          verificationType,

          errorCode:
            profileSyncResult.error.code,

          errorMessage:
            profileSyncResult.error.message,

          errorStatus:
            profileSyncResult.error.status ??
            null,
        },
      );

      await supabase.auth.signOut();

      return createErrorRedirect({
        request,

        errorCode:
          "account_setup_failed",

        errorDescription:
          "Your email was confirmed, but CASE Budget could not finish synchronizing your profile. Please sign in and try again.",
      });
    }

    if (
      shouldSendWelcomeEmail(
        provisioningResult.data,
      )
    ) {
      const welcomeEmailResult =
        await sendWelcomeEmail({
          to:
            normalizeEmail(
              authenticatedUser.email ??
              "",
            ),

          firstName:
            getUserMetadataString(
              authenticatedUser.user_metadata,
              "first_name",
            ),

          workspaceName:
            getUserMetadataString(
              authenticatedUser.user_metadata,
              "workspace_name",
            ),

          dashboardUrl:
            createApplicationUrl({
              request,

              pathname:
                DEFAULT_SUCCESS_PATH,
            }).toString(),
        });

      if (
        !welcomeEmailResult.success
      ) {
        logConfirmationError(
          "CASE Budget account provisioning succeeded, but the welcome email could not be sent.",
          {
            userId:
              authenticatedUser.id,

            workspaceId:
              provisioningResult.data
                .workspaceId,

            emailErrorCode:
              welcomeEmailResult.error.code,

            emailErrorMessage:
              welcomeEmailResult.error.message,

            emailStatusCode:
              welcomeEmailResult.error.statusCode,
          },
        );
      }
    }
  }

  const redirectUrl =
    createApplicationUrl({
      request,

      pathname:
        nextPath ??
        getSuccessPath(
          verificationType,
        ),
    });

  redirectUrl.searchParams.set(
    "confirmed",
    "true",
  );

  redirectUrl.searchParams.set(
    "message",
    getSuccessMessage(
      verificationType,
    ),
  );

  return NextResponse.redirect(
    redirectUrl,
  );
}

type CreateErrorRedirectInput = {
  request:
    NextRequest;

  errorCode:
    string;

  errorDescription:
    string;
};

function createErrorRedirect({
  request,
  errorCode,
  errorDescription,
}: CreateErrorRedirectInput) {
  const redirectUrl =
    createApplicationUrl({
      request,

      pathname:
        DEFAULT_ERROR_PATH,
    });

  redirectUrl.searchParams.set(
    "error",
    sanitizeQueryValue(
      errorCode,
    ),
  );

  redirectUrl.searchParams.set(
    "message",
    sanitizeQueryValue(
      errorDescription,
    ),
  );

  return NextResponse.redirect(
    redirectUrl,
  );
}

type CreateApplicationUrlInput = {
  request:
    NextRequest;

  pathname:
    string;
};

function createApplicationUrl({
  request,
  pathname,
}: CreateApplicationUrlInput) {
  const configuredAppUrl =
    process.env
      .NEXT_PUBLIC_CASE_BUDGET_APP_URL
      ?.trim();

  const applicationOrigin =
    configuredAppUrl
      ? configuredAppUrl.replace(
          /\/+$/,
          "",
        )
      : request.nextUrl.origin;

  return new URL(
    pathname,
    applicationOrigin,
  );
}

function getEmailOtpType(
  value:
    string | null,
): EmailOtpType | null {
  if (
    !value
  ) {
    return null;
  }

  const allowedTypes:
    EmailOtpType[] = [
      "signup",
      "invite",
      "magiclink",
      "recovery",
      "email_change",
      "email",
    ];

  return allowedTypes.includes(
    value as EmailOtpType,
  )
    ? (
        value as EmailOtpType
      )
    : null;
}

function shouldProvisionUser(
  verificationType:
    EmailOtpType,
) {
  return (
    verificationType ===
      "signup" ||
    verificationType ===
      "invite"
  );
}

function shouldSendWelcomeEmail(
  provisioning:
    {
      profileCreated:
        boolean;

      workspaceCreated:
        boolean;

      membershipCreated:
        boolean;
    },
) {
  return (
    provisioning.profileCreated ||
    provisioning.workspaceCreated ||
    provisioning.membershipCreated
  );
}

function getSuccessPath(
  verificationType:
    EmailOtpType,
) {
  if (
    verificationType ===
    "recovery"
  ) {
    return "/update-password";
  }

  return DEFAULT_SUCCESS_PATH;
}

function getSuccessMessage(
  verificationType:
    EmailOtpType,
) {
  if (
    verificationType ===
    "recovery"
  ) {
    return "Your recovery link was verified. Create your new password.";
  }

  if (
    verificationType ===
    "invite"
  ) {
    return "Your invitation was accepted successfully.";
  }

  if (
    verificationType ===
    "email_change"
  ) {
    return "Your email address was updated successfully.";
  }

  return "Your email address was confirmed successfully.";
}

function getConfirmationErrorMessage(
  errorMessage:
    string,
) {
  const normalizedMessage =
    errorMessage
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "expired",
    )
  ) {
    return "This confirmation link has expired. Request a new link and try again.";
  }

  if (
    normalizedMessage.includes(
      "invalid",
    ) ||
    normalizedMessage.includes(
      "token",
    )
  ) {
    return "This confirmation link is invalid or has already been used.";
  }

  return (
    errorMessage.trim() ||
    "The email confirmation link could not be completed."
  );
}

function getSafeNextPath(
  requestedPath:
    | string
    | null,
) {
  if (
    !requestedPath
  ) {
    return null;
  }

  const normalizedPath =
    requestedPath.trim();

  if (
    !normalizedPath ||
    !normalizedPath.startsWith(
      "/",
    ) ||
    normalizedPath.startsWith(
      "//",
    ) ||
    normalizedPath.includes(
      "\\",
    )
  ) {
    return null;
  }

  return normalizedPath;
}

function getUserMetadataString(
  metadata:
    Record<
      string,
      unknown
    > | undefined,
  key:
    string,
) {
  const value =
    metadata?.[
      key
    ];

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

function normalizeEmail(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase();
}

function sanitizeQueryValue(
  value:
    string,
) {
  return value
    .replace(
      /[\r\n\t]+/g,
      " ",
    )
    .trim()
    .slice(
      0,
      500,
    );
}

function logConfirmationError(
  message:
    string,
  context:
    Record<
      string,
      unknown
    >,
) {
  if (
    process.env.NODE_ENV ===
      "production"
  ) {
    console.error(
      `[CASE Budget Confirmation] ${message}`,
    );

    return;
  }

  console.error(
    `[CASE Budget Confirmation] ${message}`,
    context,
  );
}