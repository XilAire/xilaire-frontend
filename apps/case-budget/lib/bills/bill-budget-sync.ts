import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  BudgetAmountType,
} from "@/types/budget";

export type SyncAutomaticBillsForBudgetItemInput = {
  userId:
    string;

  workspaceId:
    string;

  budgetItemId:
    string;

  budgetItemName:
    string;

  budgetItemAmountType:
    BudgetAmountType;

  budgetGroupId:
    string;

  budgetGroupName:
    string;
};

export type SyncAutomaticBillsForBudgetItemResult = {
  updatedCount:
    number;

  updatedBillIds:
    string[];

  syncedAt:
    string | null;
};

export type BillBudgetSyncErrorCode =
  | "invalid-input"
  | "database-error"
  | "unknown";

export class BillBudgetSyncError extends Error {
  readonly code:
    BillBudgetSyncErrorCode;

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
      BillBudgetSyncErrorCode;

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
      "BillBudgetSyncError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode ??
      null;
  }
}

type UpdatedBillRow = {
  id:
    string;
};

const CASE_BUDGET_BILLS_TABLE =
  "case_budget_bills";

/**
 * Synchronizes metadata on bills that are linked to one budget item and have
 * automatic budget synchronization enabled.
 *
 * Important production boundary:
 *
 * - This helper does NOT change budget item planned amounts.
 * - This helper does NOT change budget item activity/spending.
 * - This helper does NOT create transactions.
 * - This helper does NOT mark bills paid.
 *
 * Its only responsibility is keeping automatic bill references aligned when
 * the canonical budget item is renamed, moved to another group, or changes
 * between fixed, variable, and spending amount behavior.
 *
 * The behavior replaces the previous BillsProvider client-side
 * syncBudgetItemUpdate() flow.
 *
 * All queries are explicitly scoped by both workspace_id and user_id because
 * the service-role client bypasses RLS.
 */
export async function syncAutomaticBillsForBudgetItem({
  userId,
  workspaceId,
  budgetItemId,
  budgetItemName,
  budgetItemAmountType,
  budgetGroupId,
  budgetGroupName,
}: SyncAutomaticBillsForBudgetItemInput):
  Promise<SyncAutomaticBillsForBudgetItemResult> {
  const operation =
    "syncAutomaticBillsForBudgetItem";

  const normalizedUserId =
    normalizeRequiredText(
      userId,
    );

  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedBudgetItemId =
    normalizeRequiredText(
      budgetItemId,
    );

  const normalizedBudgetItemName =
    normalizeRequiredText(
      budgetItemName,
    );

  const normalizedBudgetItemAmountType =
    normalizeBudgetAmountType(
      budgetItemAmountType,
    );

  const normalizedBudgetGroupId =
    normalizeRequiredText(
      budgetGroupId,
    );

  const normalizedBudgetGroupName =
    normalizeRequiredText(
      budgetGroupName,
    );

  if (
    !normalizedUserId
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid user ID is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedWorkspaceId
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid workspace ID is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedBudgetItemId
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid budget item ID is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedBudgetItemName
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid budget item name is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedBudgetItemAmountType
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid budget item amount type is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedBudgetGroupId
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid budget group ID is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  if (
    !normalizedBudgetGroupName
  ) {
    throw new BillBudgetSyncError({
      message:
        "A valid budget group name is required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  const syncedAt =
    new Date().toISOString();

  try {
    const admin =
      createAdminClient();

    const {
      data,
      error,
    } =
      await admin
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .update({
          name:
            normalizedBudgetItemName,

          budget_item_name:
            normalizedBudgetItemName,

          amount_type:
            normalizedBudgetItemAmountType,

          budget_category_id:
            normalizedBudgetGroupId,

          budget_category_name:
            normalizedBudgetGroupName,

          budget_sync_last_synced_at:
            syncedAt,

          updated_at:
            syncedAt,
        })
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "user_id",
          normalizedUserId,
        )
        .eq(
          "budget_item_id",
          normalizedBudgetItemId,
        )
        .eq(
          "budget_sync_enabled",
          true,
        )
        .eq(
          "budget_sync_mode",
          "automatic",
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
          "CASE Budget could not synchronize automatic linked bills.",

        error,
      });
    }

    const rows =
      Array.isArray(
        data,
      )
        ? (
            data as UpdatedBillRow[]
          )
        : [];

    return {
      updatedCount:
        rows.length,

      updatedBillIds:
        rows
          .map(
            (
              row,
            ) =>
              normalizeRequiredText(
                row.id,
              ),
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(
                id,
              ),
          ),

      syncedAt:
        rows.length >
          0
          ? syncedAt
          : null,
    };
  } catch (
    error
  ) {
    throw normalizeSyncError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not synchronize automatic linked bills.",
    });
  }
}

/**
 * Clears stale budget-item metadata from automatic linked bills when a
 * budget item is archived.
 *
 * We intentionally keep budget_item_id/category references intact so the
 * historical relationship remains traceable and the item can be restored.
 * Only the last-synced timestamp is updated here.
 *
 * This function exists mainly to give archive flows a single server-side
 * synchronization boundary without deleting bill history.
 */
export async function touchAutomaticBillsForArchivedBudgetItem({
  userId,
  workspaceId,
  budgetItemId,
}: {
  userId:
    string;

  workspaceId:
    string;

  budgetItemId:
    string;
}): Promise<SyncAutomaticBillsForBudgetItemResult> {
  const operation =
    "touchAutomaticBillsForArchivedBudgetItem";

  const normalizedUserId =
    normalizeRequiredText(
      userId,
    );

  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  const normalizedBudgetItemId =
    normalizeRequiredText(
      budgetItemId,
    );

  if (
    !normalizedUserId ||
    !normalizedWorkspaceId ||
    !normalizedBudgetItemId
  ) {
    throw new BillBudgetSyncError({
      message:
        "Valid user, workspace, and budget-item IDs are required for bill synchronization.",

      code:
        "invalid-input",

      operation,
    });
  }

  const syncedAt =
    new Date().toISOString();

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .update({
          budget_sync_last_synced_at:
            syncedAt,

          updated_at:
            syncedAt,
        })
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "user_id",
          normalizedUserId,
        )
        .eq(
          "budget_item_id",
          normalizedBudgetItemId,
        )
        .eq(
          "budget_sync_enabled",
          true,
        )
        .eq(
          "budget_sync_mode",
          "automatic",
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
          "CASE Budget could not update linked-bill synchronization metadata.",

        error,
      });
    }

    const rows =
      Array.isArray(
        data,
      )
        ? (
            data as UpdatedBillRow[]
          )
        : [];

    return {
      updatedCount:
        rows.length,

      updatedBillIds:
        rows
          .map(
            (
              row,
            ) =>
              normalizeRequiredText(
                row.id,
              ),
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(
                id,
              ),
          ),

      syncedAt:
        rows.length >
          0
          ? syncedAt
          : null,
    };
  } catch (
    error
  ) {
    throw normalizeSyncError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not update linked-bill synchronization metadata.",
    });
  }
}

function normalizeBudgetAmountType(
  value:
    unknown,
): BudgetAmountType | null {
  if (
    value === "fixed" ||
    value === "variable" ||
    value === "spending"
  ) {
    return value;
  }

  return null;
}

function normalizeRequiredText(
  value:
    string | null | undefined,
) {
  const normalized =
    value?.trim();

  return normalized ??
    "";
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
  return new BillBudgetSyncError({
    message:
      `${message} ${readErrorMessage(
        error,
      )}`.trim(),

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

function normalizeSyncError({
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
    BillBudgetSyncError
  ) {
    return error;
  }

  return new BillBudgetSyncError({
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
      null &&
    !Array.isArray(
      value,
    )
  );
}
