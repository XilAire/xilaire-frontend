import "server-only";

import {
  generateNotifications,
} from "@/lib/notifications/generate-notifications";

import {
  countUnreadNotifications,
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  persistNotifications,
  restoreNotification,
} from "@/lib/notifications/notification-storage";

import type {
  NotificationCategory,
  NotificationGenerationInput,
  NotificationItem,
} from "@/lib/notifications/generate-notifications";

import type {
  ListNotificationsInput,
  NotificationStorageScope,
  PersistNotificationsResult,
  UpdateNotificationStateInput,
} from "@/lib/notifications/notification-storage";

import type {
  CaseBudgetNotificationCategoryDatabaseEnum,
  CaseBudgetNotificationDatabaseRow,
  CaseBudgetNotificationPriorityDatabaseEnum,
  Json,
} from "@/types/database";

/**
 * Server-side CASE Budget notification orchestration.
 *
 * Responsibilities:
 *
 * 1. Run the existing deterministic notification-generation engine.
 * 2. Translate generator categories into the canonical database enums.
 * 3. Persist generated notifications through notification-storage.ts.
 * 4. Preserve database-owned read/dismissed state across regeneration.
 * 5. Expose a normalized feed model for server components / route handlers.
 *
 * This module intentionally does NOT load financial-domain data itself.
 * Callers provide the already-authorized workspace financial snapshot through
 * NotificationGenerationInput. Keeping data loading separate prevents this
 * service from becoming a second account/budget/bill/transaction repository.
 */

export type NotificationServiceScope =
  NotificationStorageScope;

export type GenerateAndPersistNotificationsInput =
  NotificationServiceScope & {
    generation:
      NotificationGenerationInput;
  };

export type GeneratedNotificationPersistenceResult = {
  generated:
    number;

  created:
    number;

  existing:
    number;

  notifications:
    NotificationServiceItem[];

  persistence:
    PersistNotificationsResult;
};

export type NotificationServiceItem = {
  id:
    string;

  notificationKey:
    string;

  workspaceId:
    string;

  userId:
    string;

  category:
    CaseBudgetNotificationCategoryDatabaseEnum;

  priority:
    CaseBudgetNotificationPriorityDatabaseEnum;

  title:
    string;

  message:
    string;

  createdAt:
    string;

  persistedAt:
    string;

  updatedAt:
    string;

  read:
    boolean;

  readAt:
    string | null;

  dismissed:
    boolean;

  dismissedAt:
    string | null;

  expiresAt:
    string | null;

  actionLabel:
    string | null;

  href:
    string | null;

  sourceType:
    string | null;

  sourceId:
    string | null;

  metadata:
    Json;
};

export type GetNotificationFeedInput =
  ListNotificationsInput;

export type NotificationServiceStateResult = {
  notification:
    NotificationServiceItem;
};

type GeneratedNotificationMetadata = {
  generatedNotificationId:
    string;

  generatedCategory:
    NotificationCategory;

  generatedCreatedAt:
    string;

  actionLabel:
    string | null;

  href:
    string | null;
};

/**
 * Runs CASE Budget's existing notification engine and persists the result.
 *
 * Idempotency is inherited from notification-storage.ts and the database
 * unique constraint on:
 *
 *   workspace_id + user_id + notification_key
 *
 * The generated notification ID becomes notification_key. This means the
 * generator remains the canonical source of event identity while Supabase
 * remains the canonical source of read/dismissed persistence.
 */
export async function generateAndPersistNotifications({
  userId,
  workspaceId,
  generation,
}: GenerateAndPersistNotificationsInput):
  Promise<GeneratedNotificationPersistenceResult> {
  const generated =
    generateNotifications({
      ...generation,

      /**
       * Read state is database-owned once notifications are persistent.
       *
       * Do not allow caller-supplied readNotificationIds to overwrite the
       * persisted state model. Duplicate inserts return the existing row
       * without changing is_read / read_at.
       */
      readNotificationIds:
        [],
    });

  if (
    generated.length ===
    0
  ) {
    return {
      generated:
        0,

      created:
        0,

      existing:
        0,

      notifications:
        [],

      persistence: {
        created:
          0,

        existing:
          0,

        notifications:
          [],
      },
    };
  }

  const persistence =
    await persistNotifications({
      userId,
      workspaceId,

      notifications:
        generated.map(
          (
            notification,
          ) =>
            mapGeneratedNotificationForPersistence(
              notification,
            ),
        ),
    });

  return {
    generated:
      generated.length,

    created:
      persistence.created,

    existing:
      persistence.existing,

    notifications:
      persistence.notifications.map(
        mapNotificationRowToServiceItem,
      ),

    persistence,
  };
}

/**
 * Loads the active persisted notification feed for one user/workspace.
 *
 * The default storage behavior excludes dismissed and expired notifications.
 */
export async function getNotificationFeed({
  userId,
  workspaceId,
  includeDismissed,
  includeExpired,
  limit,
}: GetNotificationFeedInput):
  Promise<NotificationServiceItem[]> {
  const rows =
    await listNotifications({
      userId,
      workspaceId,
      includeDismissed,
      includeExpired,
      limit,
    });

  return rows.map(
    mapNotificationRowToServiceItem,
  );
}

/**
 * Returns the active unread notification count used by badges such as TopBar.
 */
export async function getUnreadNotificationCount(
  scope:
    NotificationServiceScope,
): Promise<number> {
  return countUnreadNotifications(
    scope,
  );
}

/**
 * Marks one notification read and returns the normalized service model.
 */
export async function setNotificationRead(
  input:
    UpdateNotificationStateInput,
): Promise<NotificationServiceStateResult> {
  const row =
    await markNotificationRead(
      input,
    );

  return {
    notification:
      mapNotificationRowToServiceItem(
        row,
      ),
  };
}

/**
 * Marks one notification unread and returns the normalized service model.
 */
export async function setNotificationUnread(
  input:
    UpdateNotificationStateInput,
): Promise<NotificationServiceStateResult> {
  const row =
    await markNotificationUnread(
      input,
    );

  return {
    notification:
      mapNotificationRowToServiceItem(
        row,
      ),
  };
}

/**
 * Dismisses one notification without deleting notification history.
 */
export async function setNotificationDismissed(
  input:
    UpdateNotificationStateInput,
): Promise<NotificationServiceStateResult> {
  const row =
    await dismissNotification(
      input,
    );

  return {
    notification:
      mapNotificationRowToServiceItem(
        row,
      ),
  };
}

/**
 * Restores one previously dismissed notification.
 */
export async function setNotificationRestored(
  input:
    UpdateNotificationStateInput,
): Promise<NotificationServiceStateResult> {
  const row =
    await restoreNotification(
      input,
    );

  return {
    notification:
      mapNotificationRowToServiceItem(
        row,
      ),
  };
}

/**
 * Marks all active notifications read for one user/workspace.
 *
 * Returns the number of rows changed.
 */
export async function setAllNotificationsRead(
  scope:
    NotificationServiceScope,
): Promise<number> {
  return markAllNotificationsRead(
    scope,
  );
}

/**
 * Converts one generator notification into the storage contract.
 *
 * Generator category names are intentionally translated instead of changing
 * the existing generator files:
 *
 *   bill        -> bills
 *   transaction -> transactions
 *   savings     -> goals
 *   debt        -> debts
 *   account     -> accounts
 *   budget      -> budget
 */
function mapGeneratedNotificationForPersistence(
  notification:
    NotificationItem,
) {
  const metadata:
    GeneratedNotificationMetadata = {
      generatedNotificationId:
        notification.id,

      generatedCategory:
        notification.category,

      generatedCreatedAt:
        normalizeGeneratedCreatedAt(
          notification.createdAt,
        ),

      actionLabel:
        normalizeOptionalText(
          notification.actionLabel,
        ),

      href:
        normalizeOptionalText(
          notification.href,
        ),
  };

  return {
    notificationKey:
      notification.id,

    category:
      mapGeneratedCategoryToDatabaseCategory(
        notification.category,
      ),

    priority:
      notification.priority,

    title:
      notification.title,

    message:
      notification.message,

    actionUrl:
      normalizeOptionalText(
        notification.href,
      ),

    sourceType:
      notification.category,

    sourceId:
      null,

    metadata:
      metadata as unknown as Json,

    expiresAt:
      null,
  };
}

function mapGeneratedCategoryToDatabaseCategory(
  category:
    NotificationCategory,
): CaseBudgetNotificationCategoryDatabaseEnum {
  switch (
    category
  ) {
    case "bill":
      return "bills";

    case "budget":
      return "budget";

    case "transaction":
      return "transactions";

    case "savings":
      return "goals";

    case "debt":
      return "debts";

    case "account":
      return "accounts";

    default:
      return assertNever(
        category,
      );
  }
}

/**
 * Converts a persistent notification row into the server-facing feed model.
 *
 * generatedCreatedAt is preferred over created_at because it represents the
 * financial event's timestamp. created_at remains available as persistedAt
 * so UI/operations can distinguish event time from storage time.
 */
function mapNotificationRowToServiceItem(
  row:
    CaseBudgetNotificationDatabaseRow,
): NotificationServiceItem {
  const metadata =
    normalizeJson(
      row.metadata,
    );

  const generatedCreatedAt =
    readMetadataString({
      metadata,

      key:
        "generatedCreatedAt",
    });

  const actionLabel =
    readMetadataString({
      metadata,

      key:
        "actionLabel",
    });

  const hrefFromMetadata =
    readMetadataString({
      metadata,

      key:
        "href",
    });

  return {
    id:
      row.id,

    notificationKey:
      row.notification_key,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    category:
      row.category,

    priority:
      row.priority,

    title:
      row.title,

    message:
      row.message,

    createdAt:
      normalizeExistingTimestamp(
        generatedCreatedAt,
        row.created_at,
      ),

    persistedAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    read:
      row.is_read,

    readAt:
      row.read_at,

    dismissed:
      row.is_dismissed,

    dismissedAt:
      row.dismissed_at,

    expiresAt:
      row.expires_at,

    actionLabel,

    href:
      row.action_url ??
      hrefFromMetadata,

    sourceType:
      row.source_type,

    sourceId:
      row.source_id,

    metadata,
  };
}

/**
 * Public mapper for server-side consumers that already possess a row.
 *
 * This avoids duplicating database-to-feed mapping in future route handlers,
 * server actions, or dashboard loaders.
 */
export function toNotificationServiceItem(
  row:
    CaseBudgetNotificationDatabaseRow,
): NotificationServiceItem {
  return mapNotificationRowToServiceItem(
    row,
  );
}

/**
 * Maps persistent database categories back into the current generator-domain
 * category vocabulary where such a mapping exists.
 *
 * workspace/security/system are database-only categories and therefore return
 * null until dedicated generators for those domains are introduced.
 */
export function mapDatabaseCategoryToGeneratedCategory(
  category:
    CaseBudgetNotificationCategoryDatabaseEnum,
): NotificationCategory | null {
  switch (
    category
  ) {
    case "bills":
      return "bill";

    case "budget":
      return "budget";

    case "transactions":
      return "transaction";

    case "goals":
      return "savings";

    case "debts":
      return "debt";

    case "accounts":
      return "account";

    case "workspace":
    case "security":
    case "system":
      return null;

    default:
      return assertNever(
        category,
      );
  }
}

function normalizeGeneratedCreatedAt(
  value:
    string,
) {
  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return new Date(
      0,
    ).toISOString();
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeExistingTimestamp(
  preferred:
    string | null,
  fallback:
    string,
) {
  if (
    preferred
  ) {
    const preferredTimestamp =
      Date.parse(
        preferred,
      );

    if (
      !Number.isNaN(
        preferredTimestamp,
      )
    ) {
      return new Date(
        preferredTimestamp,
      ).toISOString();
    }
  }

  const fallbackTimestamp =
    Date.parse(
      fallback,
    );

  if (
    Number.isNaN(
      fallbackTimestamp,
    )
  ) {
    return fallback;
  }

  return new Date(
    fallbackTimestamp,
  ).toISOString();
}

function normalizeOptionalText(
  value:
    string | null | undefined,
) {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : null;
}

function normalizeJson(
  value:
    Json,
): Json {
  if (
    value ===
    undefined
  ) {
    return {};
  }

  return value;
}

function readMetadataString({
  metadata,
  key,
}: {
  metadata:
    Json;

  key:
    string;
}) {
  if (
    !isJsonObject(
      metadata,
    )
  ) {
    return null;
  }

  const value =
    metadata[
      key
    ];

  return typeof value ===
    "string" &&
    value.trim()
      ? value.trim()
      : null;
}

function isJsonObject(
  value:
    Json,
): value is {
  [key: string]:
    Json | undefined;
} {
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

function assertNever(
  value:
    never,
): never {
  throw new Error(
    `Unhandled CASE Budget notification category: ${String(
      value,
    )}`,
  );
}
