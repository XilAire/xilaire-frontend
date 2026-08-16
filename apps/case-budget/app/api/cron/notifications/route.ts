import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  generateWorkspaceNotifications,
} from "@/lib/notifications/notification-data-service";
import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

type WorkspaceMembershipRow = {
  workspace_id:
    string;

  user_id:
    string;
};

type ActiveWorkspaceRow = {
  id:
    string;

  is_active:
    boolean;
};

type NotificationCronScope = {
  userId:
    string;

  workspaceId:
    string;
};

type NotificationCronScopeResult = {
  userId:
    string;

  workspaceId:
    string;

  generated:
    number;

  created:
    number;

  existing:
    number;
};

type NotificationCronScopeFailure = {
  userId:
    string;

  workspaceId:
    string;

  error: {
    name:
      string;

    message:
      string;

    code:
      string | null;

    operation:
      string | null;

    causeCode:
      string | null;
  };
};

type NotificationCronSuccessResponse = {
  success:
    true;

  data: {
    startedAt:
      string;

    completedAt:
      string;

    durationMs:
      number;

    membershipsLoaded:
      number;

    scopesEligible:
      number;

    scopesProcessed:
      number;

    scopesSucceeded:
      number;

    scopesFailed:
      number;

    generated:
      number;

    created:
      number;

    existing:
      number;

    results:
      NotificationCronScopeResult[];

    failures:
      NotificationCronScopeFailure[];
  };

  error:
    null;
};

type NotificationCronErrorResponse = {
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

type NotificationCronResponse =
  | NotificationCronSuccessResponse
  | NotificationCronErrorResponse;

const WORKSPACE_MEMBERS_TABLE =
  "workspace_members";

const WORKSPACES_TABLE =
  "workspaces";

const ACTIVE_MEMBERSHIP_SELECT =
  "workspace_id,user_id" as const;

const ACTIVE_WORKSPACE_SELECT =
  "id,is_active" as const;

/**
 * GET /api/cron/notifications
 *
 * Production CASE Budget notification generation cron.
 *
 * Responsibilities:
 *
 * 1. Authenticate the cron request.
 * 2. Load active CASE Budget workspace memberships.
 * 3. Verify that each referenced workspace is still active.
 * 4. Generate the current financial notification snapshot for every
 *    eligible user/workspace pair.
 * 5. Persist generated notifications through the existing notification
 *    service.
 * 6. Preserve idempotency through the existing notification persistence
 *    layer.
 * 7. Isolate per-scope failures so one broken workspace or user does not
 *    stop the entire batch.
 *
 * Notification generation remains delegated to
 * generateWorkspaceNotifications(). This route does not duplicate the
 * financial notification engine.
 */
export async function GET(
  request:
    NextRequest,
) {
  const startedAtDate =
    new Date();

  const startedAt =
    startedAtDate.toISOString();

  try {
    const cronSecret =
  normalizeRequiredText(
    process.env.CRON_SECRET ??
      process.env.CASE_BUDGET_CRON_SECRET,
  );  

    if (
      !cronSecret
    ) {
      console.error(
        "[CASE Budget Notification Cron] CRON_SECRET or CASE_BUDGET_CRON_SECRET is not configured.",
      );

      return createErrorResponse({
        status:
          500,

        code:
          "cron-secret-not-configured",

        message:
          "CASE Budget notification cron authentication is not configured.",
      });
    }

    if (
      !isAuthorizedCronRequest({
        request,
        cronSecret,
      })
    ) {
      return createErrorResponse({
        status:
          401,

        code:
          "unauthorized",

        message:
          "Unauthorized CASE Budget notification cron request.",
      });
    }

    const admin =
      createWorkspaceAdminClient();

    /*
     * Load every active workspace membership.
     *
     * The notification recipient is the membership user, while financial
     * records remain workspace-owned. Therefore every active
     * user/workspace membership represents an independent notification
     * generation scope.
     */
    const {
      data:
        membershipData,
      error:
        membershipError,
    } =
      await admin
        .from(
          WORKSPACE_MEMBERS_TABLE,
        )
        .select(
          ACTIVE_MEMBERSHIP_SELECT,
        )
        .eq(
          "status",
          "active",
        );

    if (
      membershipError
    ) {
      console.error(
        "[CASE Budget Notification Cron] Could not load active workspace memberships.",
        {
          detail:
            membershipError.message,
        },
      );

      return createErrorResponse({
        status:
          500,

        code:
          "workspace-memberships-load-failed",

        message:
          "CASE Budget could not load active workspace memberships for notification generation.",
      });
    }

    const memberships =
      normalizeMembershipRows(
        membershipData,
      );

    if (
      memberships.length ===
      0
    ) {
      const completedAtDate =
        new Date();

      return createSuccessResponse({
        startedAt,

        completedAt:
          completedAtDate.toISOString(),

        durationMs:
          completedAtDate.getTime() -
          startedAtDate.getTime(),

        membershipsLoaded:
          0,

        scopesEligible:
          0,

        scopesProcessed:
          0,

        scopesSucceeded:
          0,

        scopesFailed:
          0,

        generated:
          0,

        created:
          0,

        existing:
          0,

        results:
          [],

        failures:
          [],
      });
    }

    /*
     * Membership status alone is not enough.
     *
     * A membership can theoretically remain active while its workspace has
     * been disabled. Notification generation must therefore independently
     * verify workspace state.
     */
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
      await admin
        .from(
          WORKSPACES_TABLE,
        )
        .select(
          ACTIVE_WORKSPACE_SELECT,
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
      console.error(
        "[CASE Budget Notification Cron] Could not load active workspaces.",
        {
          detail:
            workspaceError.message,
        },
      );

      return createErrorResponse({
        status:
          500,

        code:
          "active-workspaces-load-failed",

        message:
          "CASE Budget could not verify active workspaces for notification generation.",
      });
    }

    const activeWorkspaceIds =
      new Set(
        normalizeWorkspaceRows(
          workspaceData,
        )
          .filter(
            (
              workspace,
            ) =>
              workspace.is_active,
          )
          .map(
            (
              workspace,
            ) =>
              workspace.id,
          ),
      );

    /*
     * Deduplicate by user + workspace.
     *
     * The database should already enforce sensible membership uniqueness,
     * but the cron establishes its own deterministic processing boundary
     * instead of depending on that assumption.
     */
    const scopes =
      deduplicateScopes(
        memberships
          .filter(
            (
              membership,
            ) =>
              activeWorkspaceIds.has(
                membership.workspace_id,
              ),
          )
          .map(
            (
              membership,
            ) => ({
              userId:
                membership.user_id,

              workspaceId:
                membership.workspace_id,
            }),
          ),
      );

    const results:
      NotificationCronScopeResult[] =
      [];

    const failures:
      NotificationCronScopeFailure[] =
      [];

    let totalGenerated =
      0;

    let totalCreated =
      0;

    let totalExisting =
      0;

    /*
     * Sequential processing is intentional.
     *
     * Notification generation performs multiple workspace-scoped database
     * reads and subsequent notification writes. Running every membership
     * concurrently could produce unnecessary connection pressure as the
     * customer base grows.
     *
     * This also gives deterministic batch behavior and keeps individual
     * scope failures isolated.
     */
    for (
      const scope
      of scopes
    ) {
      try {
        const generationResult =
          await generateWorkspaceNotifications({
            userId:
              scope.userId,

            workspaceId:
              scope.workspaceId,
          });

        const generated =
          generationResult
            .persistence
            .generated;

        const created =
          generationResult
            .persistence
            .created;

        const existing =
          generationResult
            .persistence
            .existing;

        totalGenerated +=
          generated;

        totalCreated +=
          created;

        totalExisting +=
          existing;

        results.push({
          userId:
            scope.userId,

          workspaceId:
            scope.workspaceId,

          generated,

          created,

          existing,
        });
      } catch (
        error
      ) {
        const serializedError =
          serializeUnknownError(
            error,
          );

        failures.push({
          userId:
            scope.userId,

          workspaceId:
            scope.workspaceId,

          error:
            serializedError,
        });

        console.error(
          "[CASE Budget Notification Cron] Notification generation failed for a workspace membership.",
          {
            userId:
              scope.userId,

            workspaceId:
              scope.workspaceId,

            error:
              serializedError,
          },
        );
      }
    }

    const completedAtDate =
      new Date();

    const responseData:
      NotificationCronSuccessResponse["data"] =
      {
        startedAt,

        completedAt:
          completedAtDate.toISOString(),

        durationMs:
          completedAtDate.getTime() -
          startedAtDate.getTime(),

        membershipsLoaded:
          memberships.length,

        scopesEligible:
          scopes.length,

        scopesProcessed:
          results.length +
          failures.length,

        scopesSucceeded:
          results.length,

        scopesFailed:
          failures.length,

        generated:
          totalGenerated,

        created:
          totalCreated,

        existing:
          totalExisting,

        results,

        failures,
      };

    console.info(
      "[CASE Budget Notification Cron] Notification generation completed.",
      {
        startedAt:
          responseData.startedAt,

        completedAt:
          responseData.completedAt,

        durationMs:
          responseData.durationMs,

        membershipsLoaded:
          responseData.membershipsLoaded,

        scopesEligible:
          responseData.scopesEligible,

        scopesSucceeded:
          responseData.scopesSucceeded,

        scopesFailed:
          responseData.scopesFailed,

        generated:
          responseData.generated,

        created:
          responseData.created,

        existing:
          responseData.existing,
      },
    );

    return createSuccessResponse(
      responseData,
    );
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Notification Cron] Unexpected notification cron failure.",
      serializeUnknownError(
        error,
      ),
    );

    return createErrorResponse({
      status:
        500,

      code:
        "notification-cron-failed",

      message:
        "CASE Budget could not complete notification generation.",
    });
  }
}

function isAuthorizedCronRequest({
  request,
  cronSecret,
}: {
  request:
    NextRequest;

  cronSecret:
    string;
}) {
  const authorizationHeader =
    request.headers.get(
      "authorization",
    );

  if (
    !authorizationHeader
  ) {
    return false;
  }

  const expectedAuthorization =
    `Bearer ${cronSecret}`;

  return constantTimeStringEquals(
    authorizationHeader,
    expectedAuthorization,
  );
}

/**
 * Compares authentication values without returning as soon as the first
 * differing character is encountered.
 *
 * This avoids using a simple direct equality check for the cron credential.
 */
function constantTimeStringEquals(
  firstValue:
    string,
  secondValue:
    string,
) {
  const firstBuffer =
    Buffer.from(
      firstValue,
      "utf8",
    );

  const secondBuffer =
    Buffer.from(
      secondValue,
      "utf8",
    );

  if (
    firstBuffer.length !==
    secondBuffer.length
  ) {
    return false;
  }

  let difference =
    0;

  for (
    let index =
      0;
    index <
    firstBuffer.length;
    index +=
      1
  ) {
    difference |=
      firstBuffer[index] ^
      secondBuffer[index];
  }

  return difference ===
    0;
}

function normalizeMembershipRows(
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

  const rows:
    WorkspaceMembershipRow[] =
    [];

  for (
    const item
    of value
  ) {
    if (
      !isRecord(
        item,
      )
    ) {
      continue;
    }

    const workspaceId =
      normalizeRequiredText(
        item.workspace_id,
      );

    const userId =
      normalizeRequiredText(
        item.user_id,
      );

    if (
      !workspaceId ||
      !userId
    ) {
      continue;
    }

    rows.push({
      workspace_id:
        workspaceId,

      user_id:
        userId,
    });
  }

  return rows;
}

function normalizeWorkspaceRows(
  value:
    unknown,
): ActiveWorkspaceRow[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  const rows:
    ActiveWorkspaceRow[] =
    [];

  for (
    const item
    of value
  ) {
    if (
      !isRecord(
        item,
      )
    ) {
      continue;
    }

    const id =
      normalizeRequiredText(
        item.id,
      );

    if (
      !id ||
      typeof item.is_active !==
        "boolean"
    ) {
      continue;
    }

    rows.push({
      id,

      is_active:
        item.is_active,
    });
  }

  return rows;
}

function deduplicateScopes(
  scopes:
    NotificationCronScope[],
): NotificationCronScope[] {
  const scopeMap =
    new Map<
      string,
      NotificationCronScope
    >();

  for (
    const scope
    of scopes
  ) {
    const key =
      createScopeKey(
        scope,
      );

    if (
      scopeMap.has(
        key,
      )
    ) {
      continue;
    }

    scopeMap.set(
      key,
      scope,
    );
  }

  return Array.from(
    scopeMap.values(),
  );
}

function createScopeKey(
  scope:
    NotificationCronScope,
) {
  return [
    scope.workspaceId,
    scope.userId,
  ].join(
    ":",
  );
}

function normalizeRequiredText(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function createSuccessResponse(
  data:
    NotificationCronSuccessResponse["data"],
) {
  return NextResponse.json<
    NotificationCronResponse
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
    NotificationCronResponse
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

function serializeUnknownError(
  error:
    unknown,
): NotificationCronScopeFailure["error"] {
  if (
    error instanceof
    Error
  ) {
    const errorRecord =
      error as Error & {
        code?:
          unknown;

        operation?:
          unknown;

        causeCode?:
          unknown;
      };

    return {
      name:
        error.name,

      message:
        error.message,

      code:
        normalizeOptionalErrorValue(
          errorRecord.code,
        ),

      operation:
        normalizeOptionalErrorValue(
          errorRecord.operation,
        ),

      causeCode:
        normalizeOptionalErrorValue(
          errorRecord.causeCode,
        ),
    };
  }

  if (
    typeof error ===
    "string"
  ) {
    return {
      name:
        "Error",

      message:
        error,

      code:
        null,

      operation:
        null,

      causeCode:
        null,
    };
  }

  return {
    name:
      "Error",

    message:
      "Unknown error",

    code:
      null,

    operation:
      null,

    causeCode:
      null,
  };
}

function normalizeOptionalErrorValue(
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