import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetNotificationCategoryDatabaseEnum,
  CaseBudgetNotificationDatabaseRow,
  CaseBudgetNotificationPriorityDatabaseEnum,
  Json,
} from "@/types/database";

export type NotificationStorageScope = {
  userId:
    string;

  workspaceId:
    string;
};

export type PersistNotificationInput =
  NotificationStorageScope & {
    notificationKey:
      string;

    category:
      CaseBudgetNotificationCategoryDatabaseEnum;

    priority:
      CaseBudgetNotificationPriorityDatabaseEnum;

    title:
      string;

    message:
      string;

    actionUrl?:
      string | null;

    sourceType?:
      string | null;

    sourceId?:
      string | null;

    metadata?:
      Json;

    expiresAt?:
      string | null;
  };

export type PersistNotificationsInput =
  NotificationStorageScope & {
    notifications:
      Omit<
        PersistNotificationInput,
        keyof NotificationStorageScope
      >[];
  };

export type PersistNotificationResult = {
  notification:
    CaseBudgetNotificationDatabaseRow;

  created:
    boolean;
};

export type PersistNotificationsResult = {
  created:
    number;

  existing:
    number;

  notifications:
    CaseBudgetNotificationDatabaseRow[];
};

export type ListNotificationsInput =
  NotificationStorageScope & {
    includeDismissed?:
      boolean;

    includeExpired?:
      boolean;

    limit?:
      number;
  };

export type UpdateNotificationStateInput =
  NotificationStorageScope & {
    notificationId:
      string;
  };

export type NotificationStorageErrorCode =
  | "invalid-input"
  | "not-found"
  | "database-error"
  | "unknown";

export class NotificationStorageError extends Error {
  readonly code:
    NotificationStorageErrorCode;

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
      NotificationStorageErrorCode;

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
      "NotificationStorageError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode ??
      null;
  }
}

type NotificationRow =
  CaseBudgetNotificationDatabaseRow;

const CASE_BUDGET_NOTIFICATIONS_TABLE =
  "case_budget_notifications";

const POSTGRES_UNIQUE_VIOLATION_CODE =
  "23505";

const DEFAULT_NOTIFICATION_LIMIT =
  100;

const MAX_NOTIFICATION_LIMIT =
  250;

/**
 * Creates one persistent CASE Budget notification.
 *
 * Notification creation is intentionally server-owned. The database has
 * no authenticated INSERT policy, so browser clients cannot manufacture
 * financial/security notifications directly.
 *
 * The database unique key:
 *
 *   workspace_id + user_id + notification_key
 *
 * provides the canonical idempotency boundary. If another worker already
 * created the same notification, this function returns the existing row
 * without changing read/dismissed state.
 */
export async function persistNotification(
  input:
    PersistNotificationInput,
): Promise<PersistNotificationResult> {
  const operation =
    "persistNotification";

  const normalizedInput =
    normalizePersistNotificationInput({
      input,
      operation,
    });

  const admin =
    createAdminClient();

  try {
    const {
      data,
      error,
    } =
      await admin
        .from(
          CASE_BUDGET_NOTIFICATIONS_TABLE,
        )
        .insert({
          workspace_id:
            normalizedInput.workspaceId,

          user_id:
            normalizedInput.userId,

          category:
            normalizedInput.category,

          priority:
            normalizedInput.priority,

          notification_key:
            normalizedInput.notificationKey,

          title:
            normalizedInput.title,

          message:
            normalizedInput.message,

          action_url:
            normalizedInput.actionUrl,

          source_type:
            normalizedInput.sourceType,

          source_id:
            normalizedInput.sourceId,

          metadata:
            normalizedInput.metadata,

          expires_at:
            normalizedInput.expiresAt,
        })
        .select(
          "*",
        )
        .single();

    if (
      error
    ) {
      if (
        readErrorCode(
          error,
        ) ===
        POSTGRES_UNIQUE_VIOLATION_CODE
      ) {
        const existing =
          await getNotificationByKey({
            userId:
              normalizedInput.userId,

            workspaceId:
              normalizedInput.workspaceId,

            notificationKey:
              normalizedInput.notificationKey,
          });

        if (
          existing
        ) {
          return {
            notification:
              existing,

            created:
              false,
          };
        }
      }

      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not persist the notification.",

        error,
      });
    }

    if (
      !data
    ) {
      throw new NotificationStorageError({
        message:
          "CASE Budget created the notification but did not receive the saved record.",

        code:
          "database-error",

        operation,
      });
    }

    return {
      notification:
        data as NotificationRow,

      created:
        true,
    };
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not persist the notification.",
    });
  }
}

/**
 * Persists multiple notifications while preserving each notification's
 * independent idempotency boundary.
 *
 * Sequential processing is intentional here. Notification batches are
 * normally small, and this produces deterministic results while keeping
 * database error handling straightforward.
 */
export async function persistNotifications(
  input:
    PersistNotificationsInput,
): Promise<PersistNotificationsResult> {
  const operation =
    "persistNotifications";

  const scope =
    normalizeStorageScope({
      userId:
        input.userId,

      workspaceId:
        input.workspaceId,

      operation,
    });

  if (
    !Array.isArray(
      input.notifications,
    )
  ) {
    throw new NotificationStorageError({
      message:
        "A valid notification collection is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  let created =
    0;

  let existing =
    0;

  const notifications:
    NotificationRow[] =
    [];

  for (
    const notification
    of input.notifications
  ) {
    const result =
      await persistNotification({
        ...notification,

        userId:
          scope.userId,

        workspaceId:
          scope.workspaceId,
      });

    if (
      result.created
    ) {
      created +=
        1;
    } else {
      existing +=
        1;
    }

    notifications.push(
      result.notification,
    );
  }

  return {
    created,

    existing,

    notifications,
  };
}

/**
 * Loads persisted notifications for one user in one workspace.
 *
 * Even though the service-role client bypasses RLS, this query is always
 * explicitly scoped by both workspace_id and user_id.
 */
export async function listNotifications({
  userId,
  workspaceId,
  includeDismissed = false,
  includeExpired = false,
  limit = DEFAULT_NOTIFICATION_LIMIT,
}: ListNotificationsInput): Promise<
  NotificationRow[]
> {
  const operation =
    "listNotifications";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  const normalizedLimit =
    normalizeLimit(
      limit,
    );

  try {
    let query =
      createAdminClient()
        .from(
          CASE_BUDGET_NOTIFICATIONS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        );

    if (
      !includeDismissed
    ) {
      query =
        query.eq(
          "is_dismissed",
          false,
        );
    }

    if (
      !includeExpired
    ) {
      const now =
        new Date().toISOString();

      query =
        query.or(
          `expires_at.is.null,expires_at.gt.${now}`,
        );
    }

    const {
      data,
      error,
    } =
      await query
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          normalizedLimit,
        );

    if (
      error
    ) {
      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not load notifications.",

        error,
      });
    }

    if (
      !Array.isArray(
        data,
      )
    ) {
      return [];
    }

    return data as NotificationRow[];
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not load notifications.",
    });
  }
}

/**
 * Returns the number of active, unread notifications for one user/workspace.
 */
export async function countUnreadNotifications({
  userId,
  workspaceId,
}: NotificationStorageScope): Promise<number> {
  const operation =
    "countUnreadNotifications";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  try {
    const now =
      new Date().toISOString();

    const {
      count,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_NOTIFICATIONS_TABLE,
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .eq(
          "is_read",
          false,
        )
        .eq(
          "is_dismissed",
          false,
        )
        .or(
          `expires_at.is.null,expires_at.gt.${now}`,
        );

    if (
      error
    ) {
      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not count unread notifications.",

        error,
      });
    }

    return count ??
      0;
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not count unread notifications.",
    });
  }
}

/**
 * Marks one notification read.
 */
export async function markNotificationRead({
  userId,
  workspaceId,
  notificationId,
}: UpdateNotificationStateInput): Promise<NotificationRow> {
  const operation =
    "markNotificationRead";

  const input =
    normalizeNotificationStateInput({
      userId,
      workspaceId,
      notificationId,
      operation,
    });

  const readAt =
    new Date().toISOString();

  return updateNotificationState({
    ...input,

    operation,

    values: {
      is_read:
        true,

      read_at:
        readAt,
    },
  });
}

/**
 * Marks one notification unread.
 */
export async function markNotificationUnread({
  userId,
  workspaceId,
  notificationId,
}: UpdateNotificationStateInput): Promise<NotificationRow> {
  const operation =
    "markNotificationUnread";

  const input =
    normalizeNotificationStateInput({
      userId,
      workspaceId,
      notificationId,
      operation,
    });

  return updateNotificationState({
    ...input,

    operation,

    values: {
      is_read:
        false,

      read_at:
        null,
    },
  });
}

/**
 * Dismisses one notification.
 *
 * Dismissal does not delete history. It only removes the item from the
 * default active notification feed.
 */
export async function dismissNotification({
  userId,
  workspaceId,
  notificationId,
}: UpdateNotificationStateInput): Promise<NotificationRow> {
  const operation =
    "dismissNotification";

  const input =
    normalizeNotificationStateInput({
      userId,
      workspaceId,
      notificationId,
      operation,
    });

  const dismissedAt =
    new Date().toISOString();

  return updateNotificationState({
    ...input,

    operation,

    values: {
      is_dismissed:
        true,

      dismissed_at:
        dismissedAt,
    },
  });
}

/**
 * Restores one previously dismissed notification.
 */
export async function restoreNotification({
  userId,
  workspaceId,
  notificationId,
}: UpdateNotificationStateInput): Promise<NotificationRow> {
  const operation =
    "restoreNotification";

  const input =
    normalizeNotificationStateInput({
      userId,
      workspaceId,
      notificationId,
      operation,
    });

  return updateNotificationState({
    ...input,

    operation,

    values: {
      is_dismissed:
        false,

      dismissed_at:
        null,
    },
  });
}

/**
 * Marks every active notification in one user/workspace as read.
 */
export async function markAllNotificationsRead({
  userId,
  workspaceId,
}: NotificationStorageScope): Promise<number> {
  const operation =
    "markAllNotificationsRead";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  const readAt =
    new Date().toISOString();

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_NOTIFICATIONS_TABLE,
        )
        .update({
          is_read:
            true,

          read_at:
            readAt,
        })
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .eq(
          "is_read",
          false,
        )
        .eq(
          "is_dismissed",
          false,
        )
        .select(
          "id",
        );

    if (
      error
    ) {
      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not mark all notifications as read.",

        error,
      });
    }

    return Array.isArray(
      data,
    )
      ? data.length
      : 0;
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not mark all notifications as read.",
    });
  }
}

async function getNotificationByKey({
  userId,
  workspaceId,
  notificationKey,
}: NotificationStorageScope & {
  notificationKey:
    string;
}): Promise<NotificationRow | null> {
  const operation =
    "getNotificationByKey";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  const normalizedNotificationKey =
    normalizeRequiredText(
      notificationKey,
    );

  if (
    !normalizedNotificationKey
  ) {
    throw new NotificationStorageError({
      message:
        "A valid notification key is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_NOTIFICATIONS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .eq(
          "notification_key",
          normalizedNotificationKey,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not load the existing notification.",

        error,
      });
    }

    return data
      ? (
          data as NotificationRow
        )
      : null;
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not load the existing notification.",
    });
  }
}

async function updateNotificationState({
  userId,
  workspaceId,
  notificationId,
  operation,
  values,
}: NotificationStorageScope & {
  notificationId:
    string;

  operation:
    string;

  values:
    {
      is_read?:
        boolean;

      read_at?:
        string | null;

      is_dismissed?:
        boolean;

      dismissed_at?:
        string | null;
    };
}): Promise<NotificationRow> {
  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_NOTIFICATIONS_TABLE,
        )
        .update(
          values,
        )
        .eq(
          "id",
          notificationId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "user_id",
          userId,
        )
        .select(
          "*",
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,

        message:
          "CASE Budget could not update the notification.",

        error,
      });
    }

    if (
      !data
    ) {
      throw new NotificationStorageError({
        message:
          "The requested CASE Budget notification could not be found.",

        code:
          "not-found",

        operation,
      });
    }

    return data as NotificationRow;
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not update the notification.",
    });
  }
}

function normalizePersistNotificationInput({
  input,
  operation,
}: {
  input:
    PersistNotificationInput;

  operation:
    string;
}) {
  const scope =
    normalizeStorageScope({
      userId:
        input.userId,

      workspaceId:
        input.workspaceId,

      operation,
    });

  const notificationKey =
    normalizeRequiredText(
      input.notificationKey,
    );

  const title =
    normalizeRequiredText(
      input.title,
    );

  const message =
    normalizeRequiredText(
      input.message,
    );

  if (
    !notificationKey
  ) {
    throw new NotificationStorageError({
      message:
        "A valid notification key is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !title
  ) {
    throw new NotificationStorageError({
      message:
        "A notification title is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !message
  ) {
    throw new NotificationStorageError({
      message:
        "A notification message is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  const sourceId =
    normalizeNullableText(
      input.sourceId,
    );

  if (
    sourceId &&
    !isUuid(
      sourceId,
    )
  ) {
    throw new NotificationStorageError({
      message:
        "Notification source IDs must be valid UUID values.",

      code:
        "invalid-input",

      operation,
    });
  }

  const expiresAt =
    normalizeOptionalTimestamp({
      value:
        input.expiresAt,

      fieldName:
        "notification expiration timestamp",

      operation,
    });

  return {
    ...scope,

    notificationKey,

    category:
      input.category,

    priority:
      input.priority,

    title,

    message,

    actionUrl:
      normalizeNullableText(
        input.actionUrl,
      ),

    sourceType:
      normalizeNullableText(
        input.sourceType,
      ),

    sourceId,

    metadata:
      input.metadata ??
      {},

    expiresAt,
  };
}

function normalizeNotificationStateInput({
  userId,
  workspaceId,
  notificationId,
  operation,
}: UpdateNotificationStateInput & {
  operation:
    string;
}) {
  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  const normalizedNotificationId =
    normalizeRequiredText(
      notificationId,
    );

  if (
    !normalizedNotificationId ||
    !isUuid(
      normalizedNotificationId,
    )
  ) {
    throw new NotificationStorageError({
      message:
        "A valid notification ID is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  return {
    ...scope,

    notificationId:
      normalizedNotificationId,
  };
}

function normalizeStorageScope({
  userId,
  workspaceId,
  operation,
}: NotificationStorageScope & {
  operation:
    string;
}) {
  const normalizedUserId =
    normalizeRequiredText(
      userId,
    );

  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedUserId ||
    !isUuid(
      normalizedUserId,
    )
  ) {
    throw new NotificationStorageError({
      message:
        "A valid user ID is required for notification storage.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedWorkspaceId ||
    !isUuid(
      normalizedWorkspaceId,
    )
  ) {
    throw new NotificationStorageError({
      message:
        "A valid workspace ID is required for notification storage.",

      code:
        "invalid-input",

      operation,
    });
  }

  return {
    userId:
      normalizedUserId,

    workspaceId:
      normalizedWorkspaceId,
  };
}

function normalizeLimit(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return DEFAULT_NOTIFICATION_LIMIT;
  }

  const integerValue =
    Math.trunc(
      value,
    );

  return Math.min(
    MAX_NOTIFICATION_LIMIT,
    Math.max(
      1,
      integerValue,
    ),
  );
}

function normalizeOptionalTimestamp({
  value,
  fieldName,
  operation,
}: {
  value:
    string | null | undefined;

  fieldName:
    string;

  operation:
    string;
}) {
  const normalizedValue =
    normalizeNullableText(
      value,
    );

  if (
    !normalizedValue
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      normalizedValue,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    throw new NotificationStorageError({
      message:
        `A valid ${fieldName} is required.`,

      code:
        "invalid-input",

      operation,
    });
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeRequiredText(
  value:
    string | null | undefined,
) {
  return value?.trim() ??
    "";
}

function normalizeNullableText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
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

  return new NotificationStorageError({
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

function normalizeStorageError({
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
    NotificationStorageError
  ) {
    return error;
  }

  return new NotificationStorageError({
    message:
      error instanceof
        Error
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

  const code =
    error.code;

  return typeof code ===
    "string"
    ? code
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

  const message =
    error.message;

  return typeof message ===
    "string"
    ? message.trim()
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
      null
  );
}
