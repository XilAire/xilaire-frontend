import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import {
  getCurrentUserPreferences,
  updateCurrentUserPreferences,
  UserPreferenceServiceError,
  type UpdateCaseBudgetUserPreferencesInput,
} from "@/lib/preferences/user-preference-service";

import type {
  CaseBudgetUserPreferenceSidebarSection,
  CaseBudgetUserPreferenceTheme,
} from "@/types/database";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type PreferencesResponseData = {
  userId:
    string;

  theme:
    CaseBudgetUserPreferenceTheme;

  sidebarOpenSection:
    CaseBudgetUserPreferenceSidebarSection | null;

  createdAt:
    string | null;

  updatedAt:
    string | null;
};

type PreferencesSuccessResponse = {
  success:
    true;

  data:
    PreferencesResponseData;

  error:
    null;
};

type PreferencesErrorResponse = {
  success:
    false;

  data:
    null;

  error: {
    code:
      string;

    message:
      string;
  };
};

type PreferencesApiResponse =
  | PreferencesSuccessResponse
  | PreferencesErrorResponse;

type PreferencesPatchRequest = {
  theme?:
    CaseBudgetUserPreferenceTheme;

  sidebarOpenSection?:
    CaseBudgetUserPreferenceSidebarSection | null;
};

/**
 * GET /api/preferences
 *
 * Returns the authenticated CASE Budget user's persistent UI/application
 * preferences.
 *
 * Preferences are user-scoped rather than workspace-scoped, so this route
 * intentionally requires an authenticated user but does not require an active
 * workspace.
 */
export async function GET() {
  try {
    await requireCaseBudgetUser();

    const preferences =
      await getCurrentUserPreferences();

    return createSuccessResponse(
      preferences,
    );
  } catch (
    error
  ) {
    return createPreferencesErrorResponse(
      error,
    );
  }
}

/**
 * PATCH /api/preferences
 *
 * Updates one or more persistent CASE Budget user preferences.
 *
 * Supported request body fields:
 *
 * {
 *   "theme": "light" | "dark" | "system",
 *   "sidebarOpenSection":
 *     "home" |
 *     "budget" |
 *     "wealth" |
 *     "insights" |
 *     "household" |
 *     "settings" |
 *     null
 * }
 *
 * The browser never supplies a user ID. The authenticated user is resolved
 * server-side and ownership is additionally enforced by Supabase RLS.
 */
export async function PATCH(
  request:
    NextRequest,
) {
  try {
    await requireCaseBudgetUser();

    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      requestBody ===
      null
    ) {
      return createErrorResponse({
        status:
          400,

        code:
          "invalid-request",

        message:
          "A valid JSON preference request is required.",
      });
    }

    const validation =
      validatePatchRequest(
        requestBody,
      );

    if (
      !validation.success
    ) {
      return createErrorResponse({
        status:
          400,

        code:
          validation.code,

        message:
          validation.message,
      });
    }

    const preferences =
      await updateCurrentUserPreferences(
        validation.input,
      );

    return createSuccessResponse(
      preferences,
    );
  } catch (
    error
  ) {
    return createPreferencesErrorResponse(
      error,
    );
  }
}

function validatePatchRequest(
  value:
    unknown,
):
  | {
      success:
        true;

      input:
        UpdateCaseBudgetUserPreferencesInput;
    }
  | {
      success:
        false;

      code:
        string;

      message:
        string;
    } {
  if (
    !isRecord(
      value,
    )
  ) {
    return {
      success:
        false,

      code:
        "invalid-request",

      message:
        "The CASE Budget preference request is not valid.",
    };
  }

  const allowedKeys =
    new Set([
      "theme",
      "sidebarOpenSection",
    ]);

  const unknownKeys =
    Object.keys(
      value,
    ).filter(
      (
        key,
      ) =>
        !allowedKeys.has(
          key,
        ),
    );

  if (
    unknownKeys.length >
    0
  ) {
    return {
      success:
        false,

      code:
        "unsupported-preference",

      message:
        "The request contains an unsupported CASE Budget preference.",
    };
  }

  const hasTheme =
    Object.prototype.hasOwnProperty.call(
      value,
      "theme",
    );

  const hasSidebarOpenSection =
    Object.prototype.hasOwnProperty.call(
      value,
      "sidebarOpenSection",
    );

  if (
    !hasTheme &&
    !hasSidebarOpenSection
  ) {
    return {
      success:
        false,

      code:
        "empty-request",

      message:
        "At least one CASE Budget preference must be provided.",
    };
  }

  const input:
    PreferencesPatchRequest =
      {};

  if (
    hasTheme
  ) {
    if (
      !isTheme(
        value.theme,
      )
    ) {
      return {
        success:
          false,

        code:
          "invalid-theme",

        message:
          "Theme must be light, dark, or system.",
      };
    }

    input.theme =
      value.theme;
  }

  if (
    hasSidebarOpenSection
  ) {
    if (
      value.sidebarOpenSection !==
        null &&
      !isSidebarOpenSection(
        value.sidebarOpenSection,
      )
    ) {
      return {
        success:
          false,

        code:
          "invalid-sidebar-section",

        message:
          "The sidebar section is not valid.",
      };
    }

    input.sidebarOpenSection =
      value.sidebarOpenSection;
  }

  return {
    success:
      true,

    input,
  };
}

async function readJsonRequestBody(
  request:
    NextRequest,
): Promise<unknown | null> {
  const contentType =
    request.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .includes(
        "application/json",
      )
  ) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

function createSuccessResponse(
  data:
    PreferencesResponseData,
) {
  return NextResponse.json<
    PreferencesApiResponse
  >(
    {
      success:
        true,

      data,

      error:
        null,
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createPreferencesErrorResponse(
  error:
    unknown,
) {
  if (
    error instanceof
    CaseBudgetServerAuthError
  ) {
    const {
      status,
      body,
    } =
      getCaseBudgetServerAuthErrorResponse(
        error,
      );

    return createErrorResponse({
      status,

      code:
        body.error.code,

      message:
        body.error.message,
    });
  }

  if (
    error instanceof
    UserPreferenceServiceError
  ) {
    console.error(
      "[CASE Budget Preferences API] Preference service error.",
      {
        code:
          error.code,

        operation:
          error.operation,

        causeCode:
          error.causeCode,

        message:
          error.message,
      },
    );

    switch (
      error.code
    ) {
      case "invalid-input":
        return createErrorResponse({
          status:
            400,

          code:
            error.code,

          message:
            error.message,
        });

      case "database-error":
        return createErrorResponse({
          status:
            500,

          code:
            error.code,

          message:
            "CASE Budget could not save or load your preferences. Please try again.",
        });

      case "unknown":
        return createErrorResponse({
          status:
            500,

          code:
            error.code,

          message:
            "CASE Budget could not complete the preference request. Please try again.",
        });

      default:
        return assertNever(
          error.code,
        );
    }
  }

  console.error(
    "[CASE Budget Preferences API] Unexpected error.",
    serializeUnknownError(
      error,
    ),
  );

  return createErrorResponse({
    status:
      500,

    code:
      "unexpected-error",

    message:
      "CASE Budget could not complete the preference request. Please try again.",
  });
}

function createErrorResponse({
  status,
  code,
  message,
}: {
  status:
    number;

  code:
    string;

  message:
    string;
}) {
  return NextResponse.json<
    PreferencesErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code,
        message,
      },
    },
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function isTheme(
  value:
    unknown,
): value is CaseBudgetUserPreferenceTheme {
  return (
    value ===
      "light" ||
    value ===
      "dark" ||
    value ===
      "system"
  );
}

function isSidebarOpenSection(
  value:
    unknown,
): value is CaseBudgetUserPreferenceSidebarSection {
  return (
    value ===
      "home" ||
    value ===
      "budget" ||
    value ===
      "wealth" ||
    value ===
      "insights" ||
    value ===
      "household" ||
    value ===
      "settings"
  );
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function serializeUnknownError(
  error:
    unknown,
) {
  if (
    error instanceof
      Error
  ) {
    return {
      name:
        error.name,

      message:
        error.message,

      stack:
        process.env.NODE_ENV !==
          "production"
          ? error.stack ??
            null
          : null,
    };
  }

  if (
    typeof error ===
      "string"
  ) {
    return {
      message:
        error,
    };
  }

  return {
    message:
      "Unknown error",
  };
}

function assertNever(
  value:
    never,
): never {
  throw new Error(
    `Unhandled CASE Budget preference error code: ${String(
      value,
    )}`,
  );
}
