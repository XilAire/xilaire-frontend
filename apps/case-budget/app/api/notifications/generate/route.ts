import "server-only";

import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  generateWorkspaceNotifications,
  NotificationDataServiceError,
} from "@/lib/notifications/notification-data-service";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type GenerateNotificationsSuccessResponse = {
  success:
    true;

  data: {
    userId:
      string;

    workspaceId:
      string;

    asOf:
      string;

    sourceCounts: {
      bills:
        number;

      budgetCategories:
        number;

      transactions:
        number;

      savingsGoals:
        number;

      debts:
        number;

      accounts:
        number;
    };

    generated:
      number;

    created:
      number;

    existing:
      number;
  };

  error:
    null;
};

type GenerateNotificationsErrorResponse = {
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

type GenerateNotificationsApiResponse =
  | GenerateNotificationsSuccessResponse
  | GenerateNotificationsErrorResponse;

type WorkspaceRow = {
  id:
    string;

  is_active:
    boolean;
};

type WorkspaceMembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  status:
    string;
};

const WORKSPACE_SELECT =
  "id,is_active" as const;

const MEMBERSHIP_SELECT =
  "id,workspace_id,user_id,status" as const;

/**
 * POST /api/notifications/generate
 *
 * Generates and persists CASE Budget notifications for the authenticated
 * user's currently active workspace.
 *
 * Security model:
 *
 * - The browser does not provide userId.
 * - The browser does not provide workspaceId.
 * - Both values are resolved through requireCaseBudgetServerAuth().
 * - The active workspace must still exist and be active.
 * - The authenticated user must have an active workspace membership.
 * - Notification generation runs only after those checks succeed.
 *
 * The route intentionally accepts no financial payload. Financial data is
 * loaded server-side by notification-data-service.ts from Supabase.
 */
export async function POST() {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const accessCheck =
      await verifyNotificationWorkspaceAccess({
        userId,
        workspaceId,
      });

    if (
      !accessCheck.success
    ) {
      return accessCheck.response;
    }

    const result =
      await generateWorkspaceNotifications({
        userId,
        workspaceId,
      });

    return NextResponse.json<
      GenerateNotificationsSuccessResponse
    >(
      {
        success:
          true,

        data: {
          userId,
          workspaceId,

          asOf:
            result.snapshot.asOf,

          sourceCounts:
            result.snapshot.counts,

          generated:
            result.persistence.generated,

          created:
            result.persistence.created,

          existing:
            result.persistence.existing,
        },

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
  } catch (
    error
  ) {
    return createGenerateNotificationsErrorResponse(
      error,
    );
  }
}

async function verifyNotificationWorkspaceAccess({
  userId,
  workspaceId,
}: {
  userId:
    string;

  workspaceId:
    string;
}): Promise<
  | {
      success:
        true;
    }
  | {
      success:
        false;

      response:
        NextResponse<GenerateNotificationsErrorResponse>;
    }
> {
  const admin =
    createWorkspaceAdminClient();

  const {
    data:
      workspaceData,
    error:
      workspaceError,
  } =
    await admin
      .from(
        "workspaces",
      )
      .select(
        WORKSPACE_SELECT,
      )
      .eq(
        "id",
        workspaceId,
      )
      .maybeSingle();

  if (
    workspaceError
  ) {
    console.error(
      "[CASE Budget Notification Generate API] Workspace lookup failed.",
      {
        userId,
        workspaceId,

        code:
          workspaceError.code,

        message:
          workspaceError.message,
      },
    );

    return {
      success:
        false,

      response:
        createErrorResponse({
          status:
            500,

          code:
            "workspace-load-failed",

          message:
            "CASE Budget could not load the active workspace.",
        }),
    };
  }

  const workspace =
    workspaceData as
      | WorkspaceRow
      | null;

  if (
    !workspace
  ) {
    return {
      success:
        false,

      response:
        createErrorResponse({
          status:
            404,

          code:
            "workspace-not-found",

          message:
            "The active CASE Budget workspace could not be found.",
        }),
    };
  }

  if (
    !workspace.is_active
  ) {
    return {
      success:
        false,

      response:
        createErrorResponse({
          status:
            403,

          code:
            "workspace-inactive",

          message:
            "The selected CASE Budget workspace is not active.",
        }),
    };
  }

  const {
    data:
      membershipData,
    error:
      membershipError,
  } =
    await admin
      .from(
        "workspace_members",
      )
      .select(
        MEMBERSHIP_SELECT,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (
    membershipError
  ) {
    console.error(
      "[CASE Budget Notification Generate API] Workspace membership lookup failed.",
      {
        userId,
        workspaceId,

        code:
          membershipError.code,

        message:
          membershipError.message,
      },
    );

    return {
      success:
        false,

      response:
        createErrorResponse({
          status:
            500,

          code:
            "workspace-membership-load-failed",

          message:
            "CASE Budget could not verify your workspace access.",
        }),
    };
  }

  const membership =
    membershipData as
      | WorkspaceMembershipRow
      | null;

  if (
    !membership ||
    membership.status !==
      "active"
  ) {
    return {
      success:
        false,

      response:
        createErrorResponse({
          status:
            403,

          code:
            "workspace-access-denied",

          message:
            "You do not have active access to this CASE Budget workspace.",
        }),
    };
  }

  return {
    success:
      true,
  };
}

function createGenerateNotificationsErrorResponse(
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
    NotificationDataServiceError
  ) {
    console.error(
      "[CASE Budget Notification Generate API] Notification generation failed.",
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

    return createErrorResponse({
      status:
        getNotificationDataErrorStatus(
          error.code,
        ),

      code:
        error.code,

      message:
        getSafeNotificationDataErrorMessage(
          error,
        ),
    });
  }

  console.error(
    "[CASE Budget Notification Generate API] Unexpected error.",
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
      "CASE Budget could not generate notifications. Please try again.",
  });
}

function getNotificationDataErrorStatus(
  code:
    NotificationDataServiceError["code"],
) {
  switch (
    code
  ) {
    case "invalid-input":
      return 400;

    case "database-error":
    case "unknown":
      return 500;

    default:
      return 500;
  }
}

function getSafeNotificationDataErrorMessage(
  error:
    NotificationDataServiceError,
) {
  switch (
    error.code
  ) {
    case "invalid-input":
      return error.message;

    case "database-error":
      return "CASE Budget could not load the financial data required to generate notifications.";

    case "unknown":
      return "CASE Budget could not generate notifications. Please try again.";

    default:
      return "CASE Budget could not generate notifications. Please try again.";
  }
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
    GenerateNotificationsErrorResponse
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
