import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  getNotificationFeed,
  getUnreadNotificationCount,
  setAllNotificationsRead,
  setNotificationDismissed,
  setNotificationRead,
  setNotificationRestored,
  setNotificationUnread,
} from "@/lib/notifications/notification-service";

import {
  NotificationStorageError,
} from "@/lib/notifications/notification-storage";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  NotificationServiceItem,
} from "@/lib/notifications/notification-service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type NotificationPatchAction =
  | "mark-read"
  | "mark-unread"
  | "dismiss"
  | "restore";

type NotificationPatchRequest = {
  notificationId:
    string;

  action:
    NotificationPatchAction;
};

type NotificationListResponseData = {
  notifications:
    NotificationServiceItem[];

  unreadCount:
    number;
};

type NotificationStateResponseData = {
  notification:
    NotificationServiceItem;

  unreadCount:
    number;
};

type NotificationMarkAllReadResponseData = {
  updatedCount:
    number;

  unreadCount:
    number;
};

type ApiSuccessResponse<
  Data,
> = {
  success:
    true;

  data:
    Data;

  error:
    null;
};

type ApiErrorResponse = {
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

type ApiResponse<
  Data,
> =
  | ApiSuccessResponse<Data>
  | ApiErrorResponse;

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

const DEFAULT_NOTIFICATION_LIMIT =
  100;

const MAX_NOTIFICATION_LIMIT =
  250;

/**
 * GET /api/notifications
 *
 * Returns the authenticated user's persisted notification feed for the
 * currently active CASE Budget workspace.
 *
 * Optional query parameters:
 *
 *   includeDismissed=true
 *   includeExpired=true
 *   limit=100
 *
 * userId and workspaceId are never accepted from the browser. They are
 * resolved from trusted server authentication state.
 */
export async function GET(
  request:
    NextRequest,
) {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    const access =
      await verifyActiveWorkspaceAccess({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    if (
      !access.success
    ) {
      return access.response;
    }

    const options =
      parseListOptions(
        request,
      );

    const [
      notifications,
      unreadCount,
    ] =
      await Promise.all([
        getNotificationFeed({
          userId:
            auth.userId,

          workspaceId:
            auth.workspaceId,

          includeDismissed:
            options.includeDismissed,

          includeExpired:
            options.includeExpired,

          limit:
            options.limit,
        }),

        getUnreadNotificationCount({
          userId:
            auth.userId,

          workspaceId:
            auth.workspaceId,
        }),
      ]);

    return createSuccessResponse<
      NotificationListResponseData
    >({
      notifications,
      unreadCount,
    });
  } catch (
    error
  ) {
    return createNotificationApiErrorResponse(
      error,
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Updates one persisted notification belonging to the authenticated user
 * inside the active workspace.
 *
 * Supported actions:
 *
 *   mark-read
 *   mark-unread
 *   dismiss
 *   restore
 *
 * The notification ID may be supplied by the browser because every storage
 * update is additionally scoped by trusted userId + workspaceId.
 */
export async function PATCH(
  request:
    NextRequest,
) {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    const access =
      await verifyActiveWorkspaceAccess({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    if (
      !access.success
    ) {
      return access.response;
    }

    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      !isNotificationPatchRequest(
        requestBody,
      )
    ) {
      return createErrorResponse({
        status:
          400,

        code:
          "invalid-request",

        message:
          "A valid notification ID and notification action are required.",
      });
    }

    const notificationId =
      requestBody.notificationId.trim();

    if (
      !isUuid(
        notificationId,
      )
    ) {
      return createErrorResponse({
        status:
          400,

        code:
          "invalid-notification-id",

        message:
          "A valid notification ID is required.",
      });
    }

    const updateInput = {
      userId:
        auth.userId,

      workspaceId:
        auth.workspaceId,

      notificationId,
    };

    let notification:
      NotificationServiceItem;

    switch (
      requestBody.action
    ) {
      case "mark-read": {
        const result =
          await setNotificationRead(
            updateInput,
          );

        notification =
          result.notification;

        break;
      }

      case "mark-unread": {
        const result =
          await setNotificationUnread(
            updateInput,
          );

        notification =
          result.notification;

        break;
      }

      case "dismiss": {
        const result =
          await setNotificationDismissed(
            updateInput,
          );

        notification =
          result.notification;

        break;
      }

      case "restore": {
        const result =
          await setNotificationRestored(
            updateInput,
          );

        notification =
          result.notification;

        break;
      }

      default:
        return assertNever(
          requestBody.action,
        );
    }

    const unreadCount =
      await getUnreadNotificationCount({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    return createSuccessResponse<
      NotificationStateResponseData
    >({
      notification,
      unreadCount,
    });
  } catch (
    error
  ) {
    return createNotificationApiErrorResponse(
      error,
    );
  }
}

/**
 * POST /api/notifications
 *
 * Marks every active notification read for the authenticated user in the
 * current workspace.
 *
 * This endpoint intentionally accepts no user/workspace identifiers and no
 * request body. It is a scoped bulk state transition, not a creation route.
 */
export async function POST() {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    const access =
      await verifyActiveWorkspaceAccess({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    if (
      !access.success
    ) {
      return access.response;
    }

    const updatedCount =
      await setAllNotificationsRead({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    const unreadCount =
      await getUnreadNotificationCount({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    return createSuccessResponse<
      NotificationMarkAllReadResponseData
    >({
      updatedCount,
      unreadCount,
    });
  } catch (
    error
  ) {
    return createNotificationApiErrorResponse(
      error,
    );
  }
}

async function verifyActiveWorkspaceAccess({
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
        NextResponse<ApiErrorResponse>;
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
      "[CASE Budget Notifications API] Workspace lookup failed.",
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
      "[CASE Budget Notifications API] Workspace membership lookup failed.",
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

function parseListOptions(
  request:
    NextRequest,
) {
  const searchParams =
    request.nextUrl.searchParams;

  const includeDismissed =
    parseBooleanQueryValue(
      searchParams.get(
        "includeDismissed",
      ),
    );

  const includeExpired =
    parseBooleanQueryValue(
      searchParams.get(
        "includeExpired",
      ),
    );

  const limit =
    parseLimit(
      searchParams.get(
        "limit",
      ),
    );

  return {
    includeDismissed,
    includeExpired,
    limit,
  };
}

function parseBooleanQueryValue(
  value:
    string | null,
) {
  return value
    ?.trim()
    .toLowerCase() ===
    "true";
}

function parseLimit(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  return Math.min(
    MAX_NOTIFICATION_LIMIT,
    Math.max(
      1,
      parsed,
    ),
  );
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

function isNotificationPatchRequest(
  value:
    unknown,
): value is NotificationPatchRequest {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  if (
    typeof value.notificationId !==
      "string"
  ) {
    return false;
  }

  return isNotificationPatchAction(
    value.action,
  );
}

function isNotificationPatchAction(
  value:
    unknown,
): value is NotificationPatchAction {
  return (
    value ===
      "mark-read" ||
    value ===
      "mark-unread" ||
    value ===
      "dismiss" ||
    value ===
      "restore"
  );
}

function createSuccessResponse<
  Data,
>(
  data:
    Data,
) {
  return NextResponse.json<
    ApiResponse<Data>
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
    ApiErrorResponse
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

function createNotificationApiErrorResponse(
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
    NotificationStorageError
  ) {
    console.error(
      "[CASE Budget Notifications API] Notification storage error.",
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

      case "not-found":
        return createErrorResponse({
          status:
            404,

          code:
            error.code,

          message:
            error.message,
        });

      case "database-error":
      case "unknown":
        return createErrorResponse({
          status:
            500,

          code:
            error.code,

          message:
            "CASE Budget could not update notification data. Please try again.",
        });

      default:
        return assertNever(
          error.code,
        );
    }
  }

  console.error(
    "[CASE Budget Notifications API] Unexpected error.",
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
      "CASE Budget could not complete the notification request. Please try again.",
  });
}

function isUuid(
  value:
    string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
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
    `Unhandled CASE Budget notification value: ${String(
      value,
    )}`,
  );
}
