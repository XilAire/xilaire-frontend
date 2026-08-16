import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import type {
  CaseBudgetUserPreferenceDatabaseRow,
  CaseBudgetUserPreferenceSidebarSection,
  CaseBudgetUserPreferenceTheme,
} from "@/types/database";

export type CaseBudgetUserPreferences = {
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

export type UpdateCaseBudgetUserPreferencesInput = {
  theme?:
    CaseBudgetUserPreferenceTheme;

  sidebarOpenSection?:
    CaseBudgetUserPreferenceSidebarSection | null;
};

export type UserPreferenceServiceErrorCode =
  | "invalid-input"
  | "database-error"
  | "unknown";

export class UserPreferenceServiceError extends Error {
  readonly code:
    UserPreferenceServiceErrorCode;

  readonly operation:
    string;

  readonly causeCode:
    string | null;

  constructor({
    message,
    code,
    operation,
    causeCode,
    cause,
  }: {
    message:
      string;

    code:
      UserPreferenceServiceErrorCode;

    operation:
      string;

    causeCode?:
      string | null;

    cause?:
      unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "UserPreferenceServiceError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode ??
      null;
  }
}

const CASE_BUDGET_USER_PREFERENCES_TABLE =
  "case_budget_user_preferences";

const DEFAULT_THEME:
  CaseBudgetUserPreferenceTheme =
    "system";

const DEFAULT_SIDEBAR_OPEN_SECTION:
  CaseBudgetUserPreferenceSidebarSection | null =
    null;

/**
 * Loads the authenticated CASE Budget user's persistent UI/application
 * preferences.
 *
 * Preferences are user-scoped rather than workspace-scoped. Changing
 * workspaces therefore does not unexpectedly change theme or sidebar state.
 *
 * This intentionally uses the authenticated cookie-aware Supabase client
 * returned by requireCaseBudgetUser(). Database RLS remains part of the
 * authorization boundary.
 *
 * If the user has never persisted a preference row, a default in-memory
 * preference object is returned. No database write is required simply to
 * render a page.
 */
export async function getCurrentUserPreferences():
  Promise<CaseBudgetUserPreferences> {
  const operation =
    "getCurrentUserPreferences";

  try {
    const {
      userId,
      supabase,
    } =
      await requireCaseBudgetUser();

    return await loadUserPreferences({
      userId,
      supabase,
      operation,
    });
  } catch (
    error
  ) {
    throw normalizeServiceError({
      operation,
      error,

      fallbackMessage:
        "CASE Budget could not load your preferences.",
    });
  }
}

/**
 * Persists one or more preferences for the authenticated CASE Budget user.
 *
 * The service performs an UPSERT on user_id so first-time users do not need a
 * separate initialization operation. The database's CHECK constraints and RLS
 * policies remain authoritative even though values are also validated here.
 */
export async function updateCurrentUserPreferences(
  input:
    UpdateCaseBudgetUserPreferencesInput,
): Promise<CaseBudgetUserPreferences> {
  const operation =
    "updateCurrentUserPreferences";

  try {
    const updates =
      normalizePreferenceUpdates({
        input,
        operation,
      });

    if (
      !updates.hasChanges
    ) {
      return await getCurrentUserPreferences();
    }

    const {
      userId,
      supabase,
    } =
      await requireCaseBudgetUser();

    const currentPreferences =
      await loadUserPreferences({
        userId,
        supabase,
        operation,
      });

    const nextTheme =
      updates.theme ??
      currentPreferences.theme;

    const nextSidebarOpenSection =
      updates.sidebarOpenSection !==
      undefined
        ? updates.sidebarOpenSection
        : currentPreferences.sidebarOpenSection;

    const {
      data,
      error,
    } =
      await supabase
        .from(
          CASE_BUDGET_USER_PREFERENCES_TABLE,
        )
        .upsert(
          {
            user_id:
              userId,

            theme:
              nextTheme,

            sidebar_open_section:
              nextSidebarOpenSection,
          },
          {
            onConflict:
              "user_id",
          },
        )
        .select(
          "user_id,theme,sidebar_open_section,created_at,updated_at",
        )
        .single();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not save your preferences.",

        error,
      });
    }

    return mapPreferenceRow(
      data as
        CaseBudgetUserPreferenceDatabaseRow,
    );
  } catch (
    error
  ) {
    throw normalizeServiceError({
      operation,
      error,

      fallbackMessage:
        "CASE Budget could not save your preferences.",
    });
  }
}

/**
 * Persists only the authenticated user's appearance preference.
 */
export async function updateCurrentUserThemePreference(
  theme:
    CaseBudgetUserPreferenceTheme,
): Promise<CaseBudgetUserPreferences> {
  return updateCurrentUserPreferences({
    theme,
  });
}

/**
 * Persists only the authenticated user's most recently selected/open sidebar
 * navigation section.
 *
 * Passing null clears the stored sidebar section.
 */
export async function updateCurrentUserSidebarOpenSection(
  sidebarOpenSection:
    CaseBudgetUserPreferenceSidebarSection | null,
): Promise<CaseBudgetUserPreferences> {
  return updateCurrentUserPreferences({
    sidebarOpenSection,
  });
}

async function loadUserPreferences({
  userId,
  supabase,
  operation,
}: {
  userId:
    string;

  supabase:
    SupabaseClient;

  operation:
    string;
}): Promise<CaseBudgetUserPreferences> {
  const normalizedUserId =
    normalizeUserId({
      userId,
      operation,
    });

  const {
    data,
    error,
  } =
    await supabase
      .from(
        CASE_BUDGET_USER_PREFERENCES_TABLE,
      )
      .select(
        "user_id,theme,sidebar_open_section,created_at,updated_at",
      )
      .eq(
        "user_id",
        normalizedUserId,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load your preferences.",

      error,
    });
  }

  if (
    !data
  ) {
    return createDefaultPreferences(
      normalizedUserId,
    );
  }

  return mapPreferenceRow(
    data as
      CaseBudgetUserPreferenceDatabaseRow,
  );
}

function createDefaultPreferences(
  userId:
    string,
): CaseBudgetUserPreferences {
  return {
    userId,

    theme:
      DEFAULT_THEME,

    sidebarOpenSection:
      DEFAULT_SIDEBAR_OPEN_SECTION,

    createdAt:
      null,

    updatedAt:
      null,
  };
}

function mapPreferenceRow(
  row:
    CaseBudgetUserPreferenceDatabaseRow,
): CaseBudgetUserPreferences {
  return {
    userId:
      row.user_id,

    theme:
      normalizeTheme(
        row.theme,
      ),

    sidebarOpenSection:
      normalizeSidebarOpenSection(
        row.sidebar_open_section,
      ),

    createdAt:
      normalizeNullableTimestamp(
        row.created_at,
      ),

    updatedAt:
      normalizeNullableTimestamp(
        row.updated_at,
      ),
  };
}

function normalizePreferenceUpdates({
  input,
  operation,
}: {
  input:
    UpdateCaseBudgetUserPreferencesInput;

  operation:
    string;
}) {
  if (
    !input ||
    typeof input !==
      "object" ||
    Array.isArray(
      input,
    )
  ) {
    throw new UserPreferenceServiceError({
      message:
        "Valid CASE Budget preferences are required.",

      code:
        "invalid-input",

      operation,
    });
  }

  let theme:
    CaseBudgetUserPreferenceTheme | undefined;

  let sidebarOpenSection:
    CaseBudgetUserPreferenceSidebarSection | null | undefined;

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      "theme",
    )
  ) {
    if (
      !isTheme(
        input.theme,
      )
    ) {
      throw new UserPreferenceServiceError({
        message:
          "The CASE Budget theme must be light, dark, or system.",

        code:
          "invalid-input",

        operation,
      });
    }

    theme =
      input.theme;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      input,
      "sidebarOpenSection",
    )
  ) {
    if (
      input.sidebarOpenSection !==
        null &&
      !isSidebarOpenSection(
        input.sidebarOpenSection,
      )
    ) {
      throw new UserPreferenceServiceError({
        message:
          "The CASE Budget sidebar section is not valid.",

        code:
          "invalid-input",

        operation,
      });
    }

    sidebarOpenSection =
      input.sidebarOpenSection;
  }

  return {
    theme,

    sidebarOpenSection,

    hasChanges:
      theme !==
        undefined ||
      sidebarOpenSection !==
        undefined,
  };
}

function normalizeUserId({
  userId,
  operation,
}: {
  userId:
    string;

  operation:
    string;
}) {
  const normalizedUserId =
    userId.trim();

  if (
    !isUuid(
      normalizedUserId,
    )
  ) {
    throw new UserPreferenceServiceError({
      message:
        "A valid CASE Budget user ID is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  return normalizedUserId;
}

function normalizeTheme(
  value:
    unknown,
): CaseBudgetUserPreferenceTheme {
  return isTheme(
    value,
  )
    ? value
    : DEFAULT_THEME;
}

function normalizeSidebarOpenSection(
  value:
    unknown,
): CaseBudgetUserPreferenceSidebarSection | null {
  if (
    value ===
    null ||
    value ===
    undefined
  ) {
    return null;
  }

  return isSidebarOpenSection(
    value,
  )
    ? value
    : null;
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

function normalizeNullableTimestamp(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return null;
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function isUuid(
  value:
    string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function createDatabaseError({
  operation,
  message,
  error,
}: {
  operation:
    string;

  message:
    string;

  error:
    unknown;
}) {
  const detail =
    readErrorMessage(
      error,
    );

  return new UserPreferenceServiceError({
    message:
      detail
        ? `${message} ${detail}`
        : message,

    code:
      "database-error",

    operation,

    causeCode:
      readErrorCode(
        error,
      ),

    cause:
      error,
  });
}

function normalizeServiceError({
  operation,
  error,
  fallbackMessage,
}: {
  operation:
    string;

  error:
    unknown;

  fallbackMessage:
    string;
}) {
  if (
    error instanceof
    UserPreferenceServiceError
  ) {
    return error;
  }

  return new UserPreferenceServiceError({
    message:
      error instanceof
        Error &&
      error.message.trim()
        ? error.message
        : fallbackMessage,

    code:
      "unknown",

    operation,

    cause:
      error,
  });
}

function readErrorCode(
  error:
    unknown,
) {
  if (
    !isRecord(
      error,
    )
  ) {
    return null;
  }

  return typeof error.code ===
    "string"
    ? error.code
    : null;
}

function readErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return error.message.trim();
  }

  if (
    !isRecord(
      error,
    )
  ) {
    return "";
  }

  return typeof error.message ===
    "string"
    ? error.message.trim()
    : "";
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
