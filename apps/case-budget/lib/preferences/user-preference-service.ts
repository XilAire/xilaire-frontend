import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  getOptionalCaseBudgetUser,
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import type {
  CaseBudgetUserPreferenceDatabaseRow,
  CaseBudgetUserPreferenceSidebarSection,
  CaseBudgetUserPreferenceTheme,
} from "@/types/database";

export type CaseBudgetFloatingControlPosition = {
  x:
    number;

  y:
    number;
};

export type CaseBudgetUserPreferences = {
  userId:
    string;

  theme:
    CaseBudgetUserPreferenceTheme;

  sidebarOpenSection:
    CaseBudgetUserPreferenceSidebarSection | null;

  floatingControlX:
    number | null;

  floatingControlY:
    number | null;

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

  floatingControlX?:
    number | null;

  floatingControlY?:
    number | null;
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

const DEFAULT_FLOATING_CONTROL_X:
  number | null =
    null;

const DEFAULT_FLOATING_CONTROL_Y:
  number | null =
    null;

const MIN_NORMALIZED_FLOATING_CONTROL_POSITION =
  0;

const MAX_NORMALIZED_FLOATING_CONTROL_POSITION =
  1;

const CASE_BUDGET_USER_PREFERENCE_SELECT =
  "user_id,theme,sidebar_open_section,floating_control_x,floating_control_y,created_at,updated_at";

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
    const auth =
      await getOptionalCaseBudgetUser();

    if (
      !auth
    ) {
      return createDefaultPreferences(
        "",
      );
    }

    return await loadUserPreferences({
      userId:
        auth.userId,

      supabase:
        auth.supabase,

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

    const nextFloatingControlX =
      updates.floatingControlX !==
      undefined
        ? updates.floatingControlX
        : currentPreferences.floatingControlX;

    const nextFloatingControlY =
      updates.floatingControlY !==
      undefined
        ? updates.floatingControlY
        : currentPreferences.floatingControlY;

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

            floating_control_x:
              nextFloatingControlX,

            floating_control_y:
              nextFloatingControlY,
          },
          {
            onConflict:
              "user_id",
          },
        )
        .select(
          CASE_BUDGET_USER_PREFERENCE_SELECT,
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

/**
 * Persists the authenticated user's floating appearance-control position.
 *
 * Coordinates are normalized from 0 to 1 so the same saved preference can be
 * restored sensibly across different viewport sizes.
 */
export async function updateCurrentUserFloatingControlPosition(
  position:
    CaseBudgetFloatingControlPosition,
): Promise<CaseBudgetUserPreferences> {
  const operation =
    "updateCurrentUserFloatingControlPosition";

  const normalizedPosition =
    normalizeFloatingControlPosition({
      position,
      operation,
    });

  return updateCurrentUserPreferences({
    floatingControlX:
      normalizedPosition.x,

    floatingControlY:
      normalizedPosition.y,
  });
}

/**
 * Clears the user's stored floating-control position so the client can return
 * to the normal default placement.
 */
export async function resetCurrentUserFloatingControlPosition():
  Promise<CaseBudgetUserPreferences> {
  return updateCurrentUserPreferences({
    floatingControlX:
      null,

    floatingControlY:
      null,
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
        CASE_BUDGET_USER_PREFERENCE_SELECT,
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

    floatingControlX:
      DEFAULT_FLOATING_CONTROL_X,

    floatingControlY:
      DEFAULT_FLOATING_CONTROL_Y,

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

    floatingControlX:
      normalizeStoredFloatingControlCoordinate(
        row.floating_control_x,
      ),

    floatingControlY:
      normalizeStoredFloatingControlCoordinate(
        row.floating_control_y,
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

  let floatingControlX:
    number | null | undefined;

  let floatingControlY:
    number | null | undefined;

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

  const hasFloatingControlX =
    Object.prototype.hasOwnProperty.call(
      input,
      "floatingControlX",
    );

  const hasFloatingControlY =
    Object.prototype.hasOwnProperty.call(
      input,
      "floatingControlY",
    );

  if (
    hasFloatingControlX !==
    hasFloatingControlY
  ) {
    throw new UserPreferenceServiceError({
      message:
        "Both CASE Budget floating-control coordinates must be provided together.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    hasFloatingControlX &&
    hasFloatingControlY
  ) {
    const inputX =
      input.floatingControlX;

    const inputY =
      input.floatingControlY;

    const bothNull =
      inputX ===
        null &&
      inputY ===
        null;

    const bothCoordinates =
      isNormalizedFloatingControlCoordinate(
        inputX,
      ) &&
      isNormalizedFloatingControlCoordinate(
        inputY,
      );

    if (
      !bothNull &&
      !bothCoordinates
    ) {
      throw new UserPreferenceServiceError({
        message:
          "CASE Budget floating-control coordinates must both be numbers between 0 and 1, or both be null.",

        code:
          "invalid-input",

        operation,
      });
    }

    floatingControlX =
      inputX ===
        null
        ? null
        : normalizeCoordinatePrecision(
            inputX as number,
          );

    floatingControlY =
      inputY ===
        null
        ? null
        : normalizeCoordinatePrecision(
            inputY as number,
          );
  }

  return {
    theme,

    sidebarOpenSection,

    floatingControlX,

    floatingControlY,

    hasChanges:
      theme !==
        undefined ||
      sidebarOpenSection !==
        undefined ||
      floatingControlX !==
        undefined ||
      floatingControlY !==
        undefined,
  };
}

function normalizeFloatingControlPosition({
  position,
  operation,
}: {
  position:
    CaseBudgetFloatingControlPosition;

  operation:
    string;
}): CaseBudgetFloatingControlPosition {
  if (
    !position ||
    typeof position !==
      "object" ||
    Array.isArray(
      position,
    ) ||
    !isNormalizedFloatingControlCoordinate(
      position.x,
    ) ||
    !isNormalizedFloatingControlCoordinate(
      position.y,
    )
  ) {
    throw new UserPreferenceServiceError({
      message:
        "A valid CASE Budget floating-control position is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  return {
    x:
      normalizeCoordinatePrecision(
        position.x,
      ),

    y:
      normalizeCoordinatePrecision(
        position.y,
      ),
  };
}

function normalizeStoredFloatingControlCoordinate(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const numericValue =
    typeof value ===
      "number"
      ? value
      : typeof value ===
          "string" &&
        value.trim()
        ? Number(
            value,
          )
        : Number.NaN;

  if (
    !isNormalizedFloatingControlCoordinate(
      numericValue,
    )
  ) {
    return null;
  }

  return normalizeCoordinatePrecision(
    numericValue,
  );
}

function isNormalizedFloatingControlCoordinate(
  value:
    unknown,
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    ) &&
    value >=
      MIN_NORMALIZED_FLOATING_CONTROL_POSITION &&
    value <=
      MAX_NORMALIZED_FLOATING_CONTROL_POSITION
  );
}

function normalizeCoordinatePrecision(
  value:
    number,
) {
  return Number(
    value.toFixed(
      6,
    ),
  );
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
