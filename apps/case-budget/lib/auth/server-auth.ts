import "server-only";

import {
  cookies,
} from "next/headers";

import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";

import type {
  AuthError,
  SupabaseClient,
  User,
} from "@supabase/supabase-js";

export type CaseBudgetServerAuthContext = {
  user:
    User;

  userId:
    string;

  workspaceId:
    string;

  supabase:
    SupabaseClient;
};

export type CaseBudgetServerAuthErrorCode =
  | "configuration-error"
  | "unauthenticated"
  | "workspace-required"
  | "invalid-workspace"
  | "session-error"
  | "unknown";

export class CaseBudgetServerAuthError extends Error {
  readonly code:
    CaseBudgetServerAuthErrorCode;

  readonly status:
    number;

  constructor({
    message,
    code,
    status,
    cause,
  }: {
    message:
      string;

    code:
      CaseBudgetServerAuthErrorCode;

    status:
      number;

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
      "CaseBudgetServerAuthError";

    this.code =
      code;

    this.status =
      status;
  }
}

export const CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE =
  "case-budget-active-workspace-id";

const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_PUBLISHABLE_KEY_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_CASE_BUDGET";

const AUTH_DIAGNOSTICS_ENABLED =
  process.env.NODE_ENV !==
  "production";

type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";

type WorkspaceMembershipRow = {
  workspace_id:
    string;

  user_id:
    string;

  role:
    WorkspaceRole;

  status:
    string;
};

type WorkspaceRow = {
  id:
    string;

  workspace_type:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

/**
 * Resolves the authenticated CASE Budget user and active workspace
 * entirely from trusted server state.
 *
 * User identity:
 * - Read from the Supabase Auth session cookie.
 * - Verified through supabase.auth.getUser().
 *
 * Workspace identity:
 * - Prefer the CASE Budget active-workspace cookie.
 * - Verify the cookie still points to an active workspace that the
 *   authenticated user can access.
 * - If the cookie is missing, stale, or invalid, automatically resolve
 *   the user's preferred active workspace from Supabase.
 *
 * This prevents an authenticated dashboard request from failing only
 * because the active-workspace cookie has not yet been established.
 */
export async function requireCaseBudgetServerAuth():
  Promise<CaseBudgetServerAuthContext> {
  const supabase =
    await createCaseBudgetSupabaseServerClient();

  const user =
    await resolveAuthenticatedUser({
      supabase,

      operation:
        "requireCaseBudgetServerAuth",
    });

  const workspaceId =
    await resolveActiveWorkspaceId({
      supabase,

      userId:
        user.id,
    });

  if (
    !workspaceId
  ) {
    throw new CaseBudgetServerAuthError({
      message:
        "No active CASE Budget workspace is available for this account.",

      code:
        "workspace-required",

      status:
        400,
    });
  }

  validateWorkspaceId(
    workspaceId,
  );

  return {
    user,

    userId:
      user.id,

    workspaceId,

    supabase,
  };
}

/**
 * Returns the current authenticated user without requiring a workspace.
 *
 * Use this only for routes that intentionally operate outside a workspace,
 * such as onboarding or workspace creation.
 */
export async function requireCaseBudgetUser() {
  const supabase =
    await createCaseBudgetSupabaseServerClient();

  const user =
    await resolveAuthenticatedUser({
      supabase,

      operation:
        "requireCaseBudgetUser",
    });

  return {
    user,

    userId:
      user.id,

    supabase,
  };
}

/**
 * Returns the current CASE Budget user when a valid Supabase session exists.
 *
 * Unlike requireCaseBudgetUser(), this helper intentionally treats a missing
 * authentication session as a normal anonymous state and returns null.
 *
 * Use this only from public-safe server rendering flows that may legitimately
 * execute before sign-in, such as resolving a default theme preference for
 * the root layout.
 *
 * Configuration problems, expired/invalid sessions, refresh-token failures,
 * and other genuine authentication failures still throw a
 * CaseBudgetServerAuthError.
 */
export async function getOptionalCaseBudgetUser() {
  const supabase =
    await createCaseBudgetSupabaseServerClient();

  const user =
    await resolveOptionalAuthenticatedUser({
      supabase,

      operation:
        "getOptionalCaseBudgetUser",
    });

  if (
    !user
  ) {
    return null;
  }

  return {
    user,

    userId:
      user.id,

    supabase,
  };
}

/**
 * Creates the cookie-aware Supabase client used by Server Components,
 * Server Actions, and Route Handlers.
 */
export async function createCaseBudgetSupabaseServerClient() {
  const supabaseUrl =
    requireEnvironmentVariable(
      SUPABASE_URL_ENV_NAME,
    );

  const supabasePublishableKey =
    requireEnvironmentVariable(
      SUPABASE_PUBLISHABLE_KEY_ENV_NAME,
    );

  const cookieStore =
    await cookies();

  logServerAuthDiagnostics({
    operation:
      "createCaseBudgetSupabaseServerClient",

    message:
      "Creating CASE Budget Supabase server client.",

    details: {
      projectReference:
        getSupabaseProjectReference(
          supabaseUrl,
        ),

      cookieNames:
        cookieStore
          .getAll()
          .map(
            (
              cookie,
            ) =>
              cookie.name,
          )
          .filter(
            (
              cookieName,
            ) =>
              cookieName.startsWith(
                "sb-",
              ) ||
              cookieName ===
                CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE,
          ),

      hasWorkspaceCookie:
        Boolean(
          cookieStore.get(
            CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE,
          )?.value,
        ),
    },
  });

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet,
        ) {
          try {
            for (
              const {
                name,
                value,
                options,
              } of cookiesToSet
            ) {
              cookieStore.set(
                name,
                value,
                normalizeCookieOptions(
                  options,
                ),
              );
            }
          } catch (
            error
          ) {
            logServerAuthWarning({
              operation:
                "createCaseBudgetSupabaseServerClient.setAll",

              message:
                "The current server context could not write refreshed Supabase cookies.",

              details: {
                cookieNames:
                  cookiesToSet.map(
                    (
                      cookie,
                    ) =>
                      cookie.name,
                  ),

                error:
                  serializeUnknownError(
                    error,
                  ),
              },
            });

            /**
             * Server Components cannot always write cookies.
             *
             * Session refresh cookie writes should normally be handled by
             * the project's Supabase proxy. Route Handlers and Server Actions
             * can still write them when supported.
             */
          }
        },
      },
    },
  );
}

/**
 * Returns the active workspace ID from the trusted server cookie.
 */
export async function getActiveWorkspaceId() {
  const cookieStore =
    await cookies();

  return normalizeOptionalText(
    cookieStore.get(
      CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE,
    )?.value,
  );
}

/**
 * Resolves the workspace that should be used for the current request.
 *
 * Resolution order:
 *
 * 1. Existing active-workspace cookie, if still valid.
 * 2. Owned personal workspace.
 * 3. Any other owned workspace.
 * 4. Admin workspace.
 * 5. Member workspace.
 * 6. Viewer workspace.
 */
async function resolveActiveWorkspaceId({
  supabase,
  userId,
}: {
  supabase:
    SupabaseClient;

  userId:
    string;
}) {
  const operation =
    "resolveActiveWorkspaceId";

  const cookieWorkspaceId =
    await getActiveWorkspaceId();

  if (
    cookieWorkspaceId
  ) {
    try {
      validateWorkspaceId(
        cookieWorkspaceId,
      );

      const cookieWorkspaceIsAccessible =
        await userCanAccessWorkspace({
          supabase,

          userId,

          workspaceId:
            cookieWorkspaceId,
        });

      if (
        cookieWorkspaceIsAccessible
      ) {
        logServerAuthDiagnostics({
          operation,

          message:
            "Using the active CASE Budget workspace from the workspace cookie.",

          details: {
            userId,

            workspaceId:
              cookieWorkspaceId,
          },
        });

        return cookieWorkspaceId;
      }

      logServerAuthWarning({
        operation,

        message:
          "The active-workspace cookie does not point to an active workspace available to this user. A fallback workspace will be resolved.",

        details: {
          userId,

          workspaceId:
            cookieWorkspaceId,
        },
      });
    } catch (
      error
    ) {
      logServerAuthWarning({
        operation,

        message:
          "The active-workspace cookie contained an invalid workspace identifier. A fallback workspace will be resolved.",

        details: {
          userId,

          workspaceId:
            cookieWorkspaceId,

          error:
            serializeUnknownError(
              error,
            ),
        },
      });
    }
  }

  const fallbackWorkspaceId =
    await findPreferredActiveWorkspaceId({
      supabase,

      userId,
    });

  if (
    !fallbackWorkspaceId
  ) {
    logServerAuthWarning({
      operation,

      message:
        "No active CASE Budget workspace could be resolved for the authenticated user.",

      details: {
        userId,
      },
    });

    return null;
  }

  await tryPersistActiveWorkspaceId(
    fallbackWorkspaceId,
  );

  logServerAuthDiagnostics({
    operation,

    message:
      "Resolved a fallback active CASE Budget workspace.",

    details: {
      userId,

      workspaceId:
        fallbackWorkspaceId,
    },
  });

  return fallbackWorkspaceId;
}

/**
 * Confirms that the user has an active membership in the requested
 * workspace and that the workspace itself is active.
 */
async function userCanAccessWorkspace({
  supabase,
  userId,
  workspaceId,
}: {
  supabase:
    SupabaseClient;

  userId:
    string;

  workspaceId:
    string;
}) {
  const {
    data:
      membershipData,
    error:
      membershipError,
  } =
    await supabase
      .from(
        "workspace_members",
      )
      .select(
        "workspace_id,user_id,status",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "active",
      )
      .maybeSingle();

  if (
    membershipError
  ) {
    logServerAuthWarning({
      operation:
        "userCanAccessWorkspace",

      message:
        "CASE Budget could not verify the active workspace membership.",

      details: {
        userId,
        workspaceId,

        error:
          membershipError.message,
      },
    });

    return false;
  }

  if (
    !membershipData
  ) {
    return false;
  }

  const {
    data:
      workspaceData,
    error:
      workspaceError,
  } =
    await supabase
      .from(
        "workspaces",
      )
      .select(
        "id,is_active",
      )
      .eq(
        "id",
        workspaceId,
      )
      .eq(
        "is_active",
        true,
      )
      .maybeSingle();

  if (
    workspaceError
  ) {
    logServerAuthWarning({
      operation:
        "userCanAccessWorkspace",

      message:
        "CASE Budget could not verify that the workspace is active.",

      details: {
        userId,
        workspaceId,

        error:
          workspaceError.message,
      },
    });

    return false;
  }

  return Boolean(
    workspaceData,
  );
}

/**
 * Finds the preferred active workspace for a user when the active
 * workspace cookie is unavailable or no longer valid.
 */
async function findPreferredActiveWorkspaceId({
  supabase,
  userId,
}: {
  supabase:
    SupabaseClient;

  userId:
    string;
}) {
  const {
    data:
      membershipData,
    error:
      membershipError,
  } =
    await supabase
      .from(
        "workspace_members",
      )
      .select(
        "workspace_id,user_id,role,status",
      )
      .eq(
        "user_id",
        userId,
      )
      .eq(
        "status",
        "active",
      );

  if (
    membershipError
  ) {
    throw new CaseBudgetServerAuthError({
      message:
        "CASE Budget could not load the user's active workspace memberships.",

      code:
        "invalid-workspace",

      status:
        500,

      cause:
        membershipError,
    });
  }

  const memberships =
    parseActiveWorkspaceMemberships(
      membershipData,
    );

  if (
    memberships.length ===
      0
  ) {
    return null;
  }

  const workspaceIds =
    Array.from(
      new Set(
        memberships.map(
          (
            membership,
          ) =>
            membership.workspace_id,
        ),
      ),
    );

  const {
    data:
      workspaceData,
    error:
      workspaceError,
  } =
    await supabase
      .from(
        "workspaces",
      )
      .select(
        "id,workspace_type,owner_user_id,is_active",
      )
      .in(
        "id",
        workspaceIds,
      )
      .eq(
        "is_active",
        true,
      );

  if (
    workspaceError
  ) {
    throw new CaseBudgetServerAuthError({
      message:
        "CASE Budget could not load the user's active workspaces.",

      code:
        "invalid-workspace",

      status:
        500,

      cause:
        workspaceError,
    });
  }

  const workspaces =
    parseActiveWorkspaces(
      workspaceData,
    );

  if (
    workspaces.length ===
      0
  ) {
    return null;
  }

  const membershipByWorkspaceId =
    new Map<
      string,
      WorkspaceMembershipRow
    >();

  for (
    const membership
    of memberships
  ) {
    membershipByWorkspaceId.set(
      membership.workspace_id,
      membership,
    );
  }

  const accessibleWorkspaces =
    workspaces
      .map(
        (
          workspace,
        ) => {
          const membership =
            membershipByWorkspaceId.get(
              workspace.id,
            );

          if (
            !membership
          ) {
            return null;
          }

          return {
            workspace,
            membership,
          };
        },
      )
      .filter(
        (
          value,
        ): value is {
          workspace:
            WorkspaceRow;

          membership:
            WorkspaceMembershipRow;
        } =>
          value !==
          null,
      )
      .sort(
        (
          first,
          second,
        ) => {
          const firstPriority =
            getWorkspacePriority({
              workspace:
                first.workspace,

              membership:
                first.membership,

              userId,
            });

          const secondPriority =
            getWorkspacePriority({
              workspace:
                second.workspace,

              membership:
                second.membership,

              userId,
            });

          return (
            firstPriority -
            secondPriority
          );
        },
      );

  return (
    accessibleWorkspaces[0]
      ?.workspace.id ??
    null
  );
}

/**
 * Best-effort persistence of an automatically resolved workspace.
 *
 * Server Components cannot always write cookies, so failure here must
 * never prevent the current request from using the resolved workspace.
 */
async function tryPersistActiveWorkspaceId(
  workspaceId:
    string,
) {
  try {
    const cookieStore =
      await cookies();

    cookieStore.set(
      CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE,
      workspaceId,
      {
        httpOnly:
          true,

        sameSite:
          "lax",

        secure:
          process.env.NODE_ENV ===
          "production",

        path:
          "/",

        maxAge:
          60 *
          60 *
          24 *
          365,
      },
    );
  } catch (
    error
  ) {
    logServerAuthDiagnostics({
      operation:
        "tryPersistActiveWorkspaceId",

      message:
        "The current server context could not persist the automatically selected workspace cookie. The resolved workspace will still be used for this request.",

      details: {
        workspaceId,

        error:
          serializeUnknownError(
            error,
          ),
      },
    });
  }
}

function parseActiveWorkspaceMemberships(
  value:
    unknown,
): WorkspaceMembershipRow[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        candidate,
      ) => {
        if (
          !isRecord(
            candidate,
          )
        ) {
          return null;
        }

        const workspaceId =
          readRequiredString(
            candidate.workspace_id,
          );

        const userId =
          readRequiredString(
            candidate.user_id,
          );

        const role =
          normalizeWorkspaceRole(
            candidate.role,
          );

        const status =
          readRequiredString(
            candidate.status,
          );

        if (
          !workspaceId ||
          !userId ||
          !role ||
          status !==
            "active"
        ) {
          return null;
        }

        return {
          workspace_id:
            workspaceId,

          user_id:
            userId,

          role,

          status,
        };
      },
    )
    .filter(
      (
        membership,
      ): membership is WorkspaceMembershipRow =>
        membership !==
        null,
    );
}

function parseActiveWorkspaces(
  value:
    unknown,
): WorkspaceRow[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        candidate,
      ) => {
        if (
          !isRecord(
            candidate,
          )
        ) {
          return null;
        }

        const id =
          readRequiredString(
            candidate.id,
          );

        const workspaceType =
          readRequiredString(
            candidate.workspace_type,
          );

        const ownerUserId =
          readRequiredString(
            candidate.owner_user_id,
          );

        if (
          !id ||
          !workspaceType ||
          !ownerUserId ||
          candidate.is_active !==
            true
        ) {
          return null;
        }

        return {
          id,

          workspace_type:
            workspaceType,

          owner_user_id:
            ownerUserId,

          is_active:
            true,
        };
      },
    )
    .filter(
      (
        workspace,
      ): workspace is WorkspaceRow =>
        workspace !==
        null,
    );
}

function getWorkspacePriority({
  workspace,
  membership,
  userId,
}: {
  workspace:
    WorkspaceRow;

  membership:
    WorkspaceMembershipRow;

  userId:
    string;
}) {
  if (
    workspace.owner_user_id ===
      userId &&
    workspace.workspace_type ===
      "personal" &&
    membership.role ===
      "owner"
  ) {
    return 0;
  }

  if (
    membership.role ===
      "owner"
  ) {
    return 1;
  }

  if (
    membership.role ===
      "admin"
  ) {
    return 2;
  }

  if (
    membership.role ===
      "member"
  ) {
    return 3;
  }

  return 4;
}

function normalizeWorkspaceRole(
  value:
    unknown,
): WorkspaceRole | null {
  if (
    value ===
      "owner" ||
    value ===
      "admin" ||
    value ===
      "member" ||
    value ===
      "viewer"
  ) {
    return value;
  }

  return null;
}

/**
 * Shared safe response data for Route Handler error mapping.
 */
export function getCaseBudgetServerAuthErrorResponse(
  error:
    CaseBudgetServerAuthError,
) {
  return {
    status:
      error.status,

    body: {
      error: {
        code:
          error.code,

        message:
          error.message,
      },
    },
  };
}

async function resolveOptionalAuthenticatedUser({
  supabase,
  operation,
}: {
  supabase:
    SupabaseClient;

  operation:
    string;
}): Promise<User | null> {
  try {
    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (
      error
    ) {
      if (
        isMissingAuthSessionError(
          error,
        )
      ) {
        logServerAuthDiagnostics({
          operation,

          message:
            "No Supabase authentication session is present. Continuing as an anonymous request.",

          details: {
            status:
              error.status,

            code:
              readAuthErrorCode(
                error,
              ),
          },
        });

        return null;
      }

      logSupabaseAuthError({
        operation,
        error,
      });

      throw new CaseBudgetServerAuthError({
        message:
          getSafeSessionErrorMessage(
            error,
          ),

        code:
          "session-error",

        status:
          401,

        cause:
          error,
      });
    }

    if (
      !data.user
    ) {
      logServerAuthDiagnostics({
        operation,

        message:
          "Supabase returned no authenticated user. Continuing as an anonymous request.",
      });

      return null;
    }

    logServerAuthDiagnostics({
      operation,

      message:
        "Supabase authenticated the optional CASE Budget user successfully.",

      details: {
        userId:
          data.user.id,

        email:
          data.user.email ??
          null,

        authenticatedAt:
          data.user.last_sign_in_at ??
          null,
      },
    });

    return data.user;
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      throw error;
    }

    logServerAuthError({
      operation,

      message:
        "Unexpected error while optionally verifying the Supabase session.",

      details: {
        error:
          serializeUnknownError(
            error,
          ),
      },
    });

    throw new CaseBudgetServerAuthError({
      message:
        "CASE Budget could not verify the authenticated session.",

      code:
        "session-error",

      status:
        401,

      cause:
        error,
    });
  }
}

async function resolveAuthenticatedUser({
  supabase,
  operation,
}: {
  supabase:
    SupabaseClient;

  operation:
    string;
}): Promise<User> {
  try {
    const {
      data,
      error,
    } =
      await supabase.auth.getUser();

    if (
      error
    ) {
      if (
        isMissingAuthSessionError(
          error,
        )
      ) {
        logServerAuthDiagnostics({
          operation,

          message:
            "No Supabase authentication session is present.",

          details: {
            status:
              error.status,

            code:
              readAuthErrorCode(
                error,
              ),
          },
        });
      } else {
        logSupabaseAuthError({
          operation,
          error,
        });
      }

      throw new CaseBudgetServerAuthError({
        message:
          getSafeSessionErrorMessage(
            error,
          ),

        code:
          isMissingAuthSessionError(
            error,
          )
            ? "unauthenticated"
            : "session-error",

        status:
          401,

        cause:
          error,
      });
    }

    if (
      !data.user
    ) {
      logServerAuthWarning({
        operation,

        message:
          "Supabase getUser() completed without an error but returned no authenticated user.",

        details: {
          user:
            null,
        },
      });

      throw new CaseBudgetServerAuthError({
        message:
          "An authenticated CASE Budget user is required.",

        code:
          "unauthenticated",

        status:
          401,
      });
    }

    logServerAuthDiagnostics({
      operation,

      message:
        "Supabase authenticated the CASE Budget user successfully.",

      details: {
        userId:
          data.user.id,

        email:
          data.user.email ??
          null,

        authenticatedAt:
          data.user.last_sign_in_at ??
          null,
      },
    });

    return data.user;
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      throw error;
    }

    logServerAuthError({
      operation,

      message:
        "Unexpected error while verifying the Supabase session.",

      details: {
        error:
          serializeUnknownError(
            error,
          ),
      },
    });

    throw new CaseBudgetServerAuthError({
      message:
        "CASE Budget could not verify the authenticated session.",

      code:
        "session-error",

      status:
        401,

      cause:
        error,
    });
  }
}

function isMissingAuthSessionError(
  error:
    AuthError,
) {
  const normalizedMessage =
    error.message.toLowerCase();

  const normalizedCode =
    readAuthErrorCode(
      error,
    )?.toLowerCase() ??
    "";

  return (
    normalizedMessage.includes(
      "session missing",
    ) ||
    normalizedMessage.includes(
      "auth session missing",
    ) ||
    normalizedCode ===
      "session_not_found"
  );
}

function getSafeSessionErrorMessage(
  error:
    AuthError,
) {
  const normalizedMessage =
    error.message.toLowerCase();

  if (
    normalizedMessage.includes(
      "session missing",
    ) ||
    normalizedMessage.includes(
      "auth session missing",
    )
  ) {
    return "An authenticated CASE Budget user is required.";
  }

  if (
    normalizedMessage.includes(
      "refresh token",
    )
  ) {
    return "Your CASE Budget session has expired. Please sign in again.";
  }

  if (
    normalizedMessage.includes(
      "invalid jwt",
    ) ||
    normalizedMessage.includes(
      "jwt expired",
    ) ||
    normalizedMessage.includes(
      "token is expired",
    )
  ) {
    return "Your CASE Budget session is no longer valid. Please sign in again.";
  }

  return "CASE Budget could not verify the authenticated session.";
}

function logSupabaseAuthError({
  operation,
  error,
}: {
  operation:
    string;

  error:
    AuthError;
}) {
  logServerAuthError({
    operation,

    message:
      "Supabase getUser() returned an authentication error.",

    details: {
      name:
        error.name,

      message:
        error.message,

      status:
        error.status,

      code:
        readAuthErrorCode(
          error,
        ),
    },
  });
}

function readAuthErrorCode(
  error:
    AuthError,
) {
  const possibleCode =
    (
      error as AuthError & {
        code?:
          unknown;
      }
    ).code;

  return typeof possibleCode ===
    "string"
    ? possibleCode
    : null;
}

/**
 * Development-only informational authentication diagnostics.
 *
 * Routine authentication activity should never use console.error(),
 * because Next.js development tooling may surface console.error()
 * calls as application errors in the browser overlay.
 */
function logServerAuthDiagnostics({
  operation,
  message,
  details,
}: {
  operation:
    string;

  message:
    string;

  details?:
    Record<
      string,
      unknown
    >;
}) {
  if (
    !AUTH_DIAGNOSTICS_ENABLED
  ) {
    return;
  }

  console.debug(
    `[CASE Budget Auth] ${operation}: ${message}`,
    details ??
    {},
  );
}

/**
 * Development-only warning diagnostics.
 *
 * Warnings represent unusual conditions that may deserve attention
 * but are not necessarily fatal application errors.
 */
function logServerAuthWarning({
  operation,
  message,
  details,
}: {
  operation:
    string;

  message:
    string;

  details?:
    Record<
      string,
      unknown
    >;
}) {
  if (
    !AUTH_DIAGNOSTICS_ENABLED
  ) {
    return;
  }

  console.warn(
    `[CASE Budget Auth Warning] ${operation}: ${message}`,
    details ??
    {},
  );
}

/**
 * Development-only error diagnostics.
 *
 * Only genuine authentication or unexpected execution failures
 * should reach this logger.
 */
function logServerAuthError({
  operation,
  message,
  details,
}: {
  operation:
    string;

  message:
    string;

  details?:
    Record<
      string,
      unknown
    >;
}) {
  if (
    !AUTH_DIAGNOSTICS_ENABLED
  ) {
    return;
  }

  console.error(
    `[CASE Budget Auth Error] ${operation}: ${message}`,
    details ??
    {},
  );
}

function getSupabaseProjectReference(
  supabaseUrl:
    string,
) {
  try {
    const parsedUrl =
      new URL(
        supabaseUrl,
      );

    return parsedUrl.hostname.split(
      ".",
    )[0] ??
      null;
  } catch {
    return null;
  }
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

function validateWorkspaceId(
  workspaceId:
    string,
) {
  if (
    workspaceId.length >
      200
  ) {
    throw new CaseBudgetServerAuthError({
      message:
        "The active CASE Budget workspace identifier is invalid.",

      code:
        "invalid-workspace",

      status:
        400,
    });
  }

  if (
    !/^[a-zA-Z0-9_-]+$/.test(
      workspaceId,
    )
  ) {
    throw new CaseBudgetServerAuthError({
      message:
        "The active CASE Budget workspace identifier is invalid.",

      code:
        "invalid-workspace",

      status:
        400,
    });
  }
}

function requireEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    value
  ) {
    return value;
  }

  throw new CaseBudgetServerAuthError({
    message:
      `Missing required environment variable ${variableName}.`,

    code:
      "configuration-error",

    status:
      503,
  });
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

function normalizeCookieOptions(
  options:
    CookieOptions,
) {
  return {
    ...options,

    sameSite:
      normalizeSameSite(
        options.sameSite,
      ),
  };
}

function normalizeSameSite(
  sameSite:
    CookieOptions["sameSite"],
):
  | "lax"
  | "strict"
  | "none"
  | boolean
  | undefined {
  if (
    sameSite ===
      "lax" ||
    sameSite ===
      "strict" ||
    sameSite ===
      "none" ||
    typeof sameSite ===
      "boolean"
  ) {
    return sameSite;
  }

  return undefined;
}

function readRequiredString(
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

  return normalizedValue ||
    null;
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
