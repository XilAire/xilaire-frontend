import {
  NextResponse,
  type NextRequest,
} from "next/server";

import type {
  EmailOtpType,
} from "@supabase/supabase-js";

import {
  finalizeAuthenticatedUser,
} from "@/lib/auth/auth-service";
import {
  createClient,
} from "@/lib/supabase/server";

const DEFAULT_AUTHENTICATED_PATH =
  "/dashboard";

const DEFAULT_ERROR_PATH =
  "/sign-in";

const UPDATE_PASSWORD_PATH =
  "/update-password";

const ALLOWED_OTP_TYPES =
  new Set<EmailOtpType>([
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
  ]);

export async function GET(
  request: NextRequest,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const code =
    normalizeOptionalValue(
      requestUrl.searchParams.get(
        "code",
      ),
    );

  const tokenHash =
    normalizeOptionalValue(
      requestUrl.searchParams.get(
        "token_hash",
      ),
    );

  const otpType =
    normalizeOtpType(
      requestUrl.searchParams.get(
        "type",
      ),
    );

  const nextPath =
    getSafeNextPath(
      requestUrl.searchParams.get(
        "redirectTo",
      ) ??
        requestUrl.searchParams.get(
          "next",
        ),
    );

  const errorCode =
    normalizeOptionalValue(
      requestUrl.searchParams.get(
        "error_code",
      ) ??
        requestUrl.searchParams.get(
          "error",
        ),
    );

  const errorDescription =
    normalizeOptionalValue(
      requestUrl.searchParams.get(
        "error_description",
      ),
    );

  if (
    errorCode ||
    errorDescription
  ) {
    return createErrorRedirect({
      request,
      errorCode,
      errorDescription,
    });
  }

  const supabase =
    await createClient();

  if (code) {
    const {
      data,
      error,
    } =
      await supabase.auth.exchangeCodeForSession(
        code,
      );

    if (error) {
      return createErrorRedirect({
        request,
        errorCode:
          error.code ??
          "auth_code_exchange_failed",
        errorDescription:
          error.message,
      });
    }

    const authenticatedUser =
      data.user ??
      data.session?.user ??
      null;

    const lifecycleResult =
      await finalizeCallbackLifecycle({
        user:
          authenticatedUser,
        otpType,
      });

    if (
      !lifecycleResult.success
    ) {
      return createErrorRedirect({
        request,
        errorCode:
          lifecycleResult.errorCode,
        errorDescription:
          lifecycleResult.errorDescription,
      });
    }

    return createSuccessRedirect({
      request,
      nextPath,
      otpType,
    });
  }

  if (
    tokenHash &&
    otpType
  ) {
    const {
      data,
      error,
    } =
      await supabase.auth.verifyOtp({
        token_hash:
          tokenHash,
        type:
          otpType,
      });

    if (error) {
      return createErrorRedirect({
        request,
        errorCode:
          error.code ??
          "otp_verification_failed",
        errorDescription:
          error.message,
      });
    }

    const authenticatedUser =
      data.user ??
      data.session?.user ??
      null;

    const lifecycleResult =
      await finalizeCallbackLifecycle({
        user:
          authenticatedUser,
        otpType,
      });

    if (
      !lifecycleResult.success
    ) {
      return createErrorRedirect({
        request,
        errorCode:
          lifecycleResult.errorCode,
        errorDescription:
          lifecycleResult.errorDescription,
      });
    }

    return createSuccessRedirect({
      request,
      nextPath,
      otpType,
    });
  }

  return createErrorRedirect({
    request,
    errorCode:
      "missing_auth_credentials",
    errorDescription:
      "The authentication link is missing the information required to complete authentication.",
  });
}

type FinalizeCallbackLifecycleInput = {
  user:
    Awaited<
      ReturnType<
        typeof getCallbackUserPlaceholder
      >
    >;

  otpType:
    EmailOtpType | null;
};

type FinalizeCallbackLifecycleResult =
  | {
      success:
        true;

      errorCode:
        null;

      errorDescription:
        null;
    }
  | {
      success:
        false;

      errorCode:
        string;

      errorDescription:
        string;
    };

async function finalizeCallbackLifecycle({
  user,
  otpType,
}: FinalizeCallbackLifecycleInput):
  Promise<FinalizeCallbackLifecycleResult> {
  if (
    otpType ===
    "recovery"
  ) {
    return {
      success:
        true,

      errorCode:
        null,

      errorDescription:
        null,
    };
  }

  if (
    !user
  ) {
    return {
      success:
        false,

      errorCode:
        "authenticated_user_missing",

      errorDescription:
        "Authentication completed, but CASE Budget could not determine the authenticated user.",
    };
  }

  const result =
    await finalizeAuthenticatedUser({
      user,
      sendWelcomeEmail:
        true,
    });

  if (
    !result.success
  ) {
    return {
      success:
        false,

      errorCode:
        result.error.code,

      errorDescription:
        result.error.message,
    };
  }

  return {
    success:
      true,

    errorCode:
      null,

    errorDescription:
      null,
  };
}

type SuccessRedirectInput = {
  request:
    NextRequest;

  nextPath:
    string | null;

  otpType:
    EmailOtpType | null;
};

function createSuccessRedirect({
  request,
  nextPath,
  otpType,
}: SuccessRedirectInput) {
  const destination =
    resolveSuccessDestination({
      nextPath,
      otpType,
    });

  const redirectUrl =
    createApplicationUrl({
      request,
      pathname:
        destination,
    });

  return NextResponse.redirect(
    redirectUrl,
  );
}

type ResolveSuccessDestinationInput = {
  nextPath:
    string | null;

  otpType:
    EmailOtpType | null;
};

function resolveSuccessDestination({
  nextPath,
  otpType,
}: ResolveSuccessDestinationInput) {
  if (nextPath) {
    return nextPath;
  }

  if (
    otpType ===
    "recovery"
  ) {
    return UPDATE_PASSWORD_PATH;
  }

  return DEFAULT_AUTHENTICATED_PATH;
}

type ErrorRedirectInput = {
  request:
    NextRequest;

  errorCode:
    string | null;

  errorDescription:
    string | null;
};

function createErrorRedirect({
  request,
  errorCode,
  errorDescription,
}: ErrorRedirectInput) {
  const redirectUrl =
    createApplicationUrl({
      request,
      pathname:
        DEFAULT_ERROR_PATH,
    });

  redirectUrl.searchParams.set(
    "error",
    sanitizeQueryValue(
      errorCode ??
        "authentication_failed",
    ),
  );

  redirectUrl.searchParams.set(
    "message",
    sanitizeQueryValue(
      errorDescription ??
        "The authentication link could not be completed. Request a new link and try again.",
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

  const requestOrigin =
    request.nextUrl.origin;

  const applicationOrigin =
    configuredAppUrl
      ? configuredAppUrl.replace(
          /\/+$/,
          "",
        )
      : requestOrigin;

  return new URL(
    pathname,
    applicationOrigin,
  );
}

function normalizeOtpType(
  value:
    string | null,
): EmailOtpType | null {
  const normalizedValue =
    normalizeOptionalValue(
      value,
    );

  if (!normalizedValue) {
    return null;
  }

  if (
    !ALLOWED_OTP_TYPES.has(
      normalizedValue as EmailOtpType,
    )
  ) {
    return null;
  }

  return normalizedValue as EmailOtpType;
}

function getSafeNextPath(
  requestedPath:
    string | null,
) {
  const normalizedPath =
    normalizeOptionalValue(
      requestedPath,
    );

  if (!normalizedPath) {
    return null;
  }

  if (
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

  try {
    const parsedUrl =
      new URL(
        normalizedPath,
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
        DEFAULT_ERROR_PATH ||
      parsedUrl.pathname ===
        "/sign-up" ||
      parsedUrl.pathname ===
        "/forgot-password" ||
      parsedUrl.pathname ===
        "/auth/callback"
    ) {
      return null;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
}

function normalizeOptionalValue(
  value:
    string | null,
) {
  if (!value) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue ||
    null;
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

async function getCallbackUserPlaceholder() {
  return null as import(
    "@supabase/supabase-js"
  ).User | null;
}