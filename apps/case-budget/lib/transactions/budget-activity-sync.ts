import "server-only";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

type BudgetItemRow = {
  id:
    string;

  workspace_id:
    string;

  planned_amount:
    number | string;

  activity_amount:
    number | string;

  available_amount:
    number | string;

  rollover_amount:
    number | string;

  updated_at:
    string;
};

type TransactionAmountRow = {
  amount:
    number | string;
};

export type BudgetActivitySyncItemResult = {
  budgetItemId:
    string;

  previousActivityAmount:
    number;

  activityAmount:
    number;

  plannedAmount:
    number;

  rolloverAmount:
    number;

  availableAmount:
    number;

  transactionCount:
    number;

  updatedAt:
    string;
};

export type BudgetActivitySyncResult = {
  affectedItemCount:
    number;

  items:
    BudgetActivitySyncItemResult[];
};

export type BudgetActivitySyncErrorCode =
  | "invalid-input"
  | "budget-item-not-found"
  | "invalid-budget-item-data"
  | "transaction-load-failed"
  | "invalid-transaction-data"
  | "budget-item-update-conflict"
  | "budget-item-update-failed"
  | "unexpected-error";

export class BudgetActivitySyncError extends Error {
  readonly code:
    BudgetActivitySyncErrorCode;

  readonly operation:
    string;

  readonly budgetItemId:
    string | null;

  readonly causeCode:
    string | null;

  constructor({
    message,
    code,
    operation,
    budgetItemId,
    causeCode,
    cause,
  }: {
    message:
      string;

    code:
      BudgetActivitySyncErrorCode;

    operation:
      string;

    budgetItemId?:
      string | null;

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
      "BudgetActivitySyncError";

    this.code =
      code;

    this.operation =
      operation;

    this.budgetItemId =
      budgetItemId ??
      null;

    this.causeCode =
      causeCode ??
      null;
  }
}

export type RecalculateBudgetActivityInput = {
  userId:
    string;

  workspaceId:
    string;

  budgetItemIds:
    Array<
      string | null | undefined
    >;
};

const BUDGET_ITEMS_TABLE =
  "case_budget_budget_items";

const TRANSACTIONS_TABLE =
  "case_budget_transactions";

const MAX_UPDATE_ATTEMPTS =
  3;

/**
 * Recalculates canonical budget activity for one or more budget items.
 *
 * Source-of-truth rules:
 *
 * - Supabase transaction rows are authoritative.
 * - No client/browser delta is accepted.
 * - Only non-deleted expense transactions contribute activity.
 * - Both pending and cleared expenses contribute activity so pending card
 *   charges immediately reduce spendable budget availability.
 * - Income and transfer transactions never contribute budget-item activity.
 * - activity_amount is always recomputed from the full matching ledger.
 * - available_amount is always recomputed as:
 *
 *     planned_amount + rollover_amount - activity_amount
 *
 * - Archived budget items are still recalculable because historical
 *   transaction edits/deletes may need to repair their canonical activity.
 * - Closed budget months are not checked here. The transaction mutation
 *   action owns lifecycle validation; this helper only repairs derived data
 *   after an authorized transaction mutation has committed.
 * - Optimistic concurrency protects planned_amount / rollover_amount from
 *   being overwritten by a concurrent budget-item edit.
 * - A conflict triggers a fresh read/recalculation retry rather than applying
 *   a stale snapshot.
 * - No localStorage is involved.
 */
export async function recalculateBudgetActivity({
  userId,
  workspaceId,
  budgetItemIds,
}: RecalculateBudgetActivityInput):
  Promise<BudgetActivitySyncResult> {
  const operation =
    "recalculateBudgetActivity";

  const normalizedUserId =
    normalizeRequiredText(
      userId,
    );

  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedUserId
  ) {
    throw new BudgetActivitySyncError({
      code:
        "invalid-input",

      operation,

      message:
        "A valid user ID is required to recalculate budget activity.",
    });
  }

  if (
    !normalizedWorkspaceId
  ) {
    throw new BudgetActivitySyncError({
      code:
        "invalid-input",

      operation,

      message:
        "A valid workspace ID is required to recalculate budget activity.",
    });
  }

  const normalizedBudgetItemIds =
    Array.from(
      new Set(
        budgetItemIds
          .map(
            (
              budgetItemId,
            ) =>
              normalizeRequiredText(
                budgetItemId,
              ),
          )
          .filter(
            (
              budgetItemId,
            ): budgetItemId is string =>
              Boolean(
                budgetItemId,
              ),
          ),
      ),
    );

  if (
    normalizedBudgetItemIds.length ===
    0
  ) {
    return {
      affectedItemCount:
        0,

      items:
        [],
    };
  }

  try {
    const results:
      BudgetActivitySyncItemResult[] =
      [];

    for (
      const budgetItemId
      of normalizedBudgetItemIds
    ) {
      const itemResult =
        await recalculateOneBudgetItem({
          userId:
            normalizedUserId,

          workspaceId:
            normalizedWorkspaceId,

          budgetItemId,
        });

      results.push(
        itemResult,
      );
    }

    return {
      affectedItemCount:
        results.length,

      items:
        results,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      BudgetActivitySyncError
    ) {
      throw error;
    }

    throw new BudgetActivitySyncError({
      code:
        "unexpected-error",

      operation,

      message:
        error instanceof
          Error
          ? error.message
          : "CASE Budget could not recalculate budget activity.",

      cause:
        error,
    });
  }
}

/**
 * Convenience wrapper for a single affected item.
 */
export async function recalculateBudgetItemActivity({
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
}): Promise<BudgetActivitySyncItemResult> {
  const result =
    await recalculateBudgetActivity({
      userId,
      workspaceId,
      budgetItemIds: [
        budgetItemId,
      ],
    });

  const item =
    result.items[
      0
    ];

  if (
    !item
  ) {
    throw new BudgetActivitySyncError({
      code:
        "budget-item-not-found",

      operation:
        "recalculateBudgetItemActivity",

      budgetItemId,

      message:
        "CASE Budget could not recalculate the selected budget item.",
    });
  }

  return item;
}

async function recalculateOneBudgetItem({
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
}): Promise<BudgetActivitySyncItemResult> {
  const operation =
    "recalculateOneBudgetItem";

  for (
    let attempt =
      1;
    attempt <=
      MAX_UPDATE_ATTEMPTS;
    attempt +=
      1
  ) {
    const item =
      await loadBudgetItem({
        workspaceId,
        budgetItemId,
      });

    const plannedAmount =
      normalizeDatabaseMoney(
        item.planned_amount,
      );

    const previousActivityAmount =
      normalizeDatabaseMoney(
        item.activity_amount,
      );

    const rolloverAmount =
      normalizeDatabaseMoney(
        item.rollover_amount,
      );

    if (
      plannedAmount ===
        null ||
      previousActivityAmount ===
        null ||
      rolloverAmount ===
        null
    ) {
      throw new BudgetActivitySyncError({
        code:
          "invalid-budget-item-data",

        operation,

        budgetItemId,

        message:
          "CASE Budget could not verify the budget item's financial values.",
      });
    }

    const activityResult =
      await calculateCanonicalActivity({
        workspaceId,
        budgetItemId,
      });

    const activityAmount =
      activityResult.activityAmount;

    const availableAmount =
      roundCurrencyAmount(
        plannedAmount +
        rolloverAmount -
        activityAmount,
      );

    const now =
      new Date().toISOString();

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        updatedData,
      error:
        updateError,
    } =
      await admin
        .from(
          BUDGET_ITEMS_TABLE,
        )
        .update({
          activity_amount:
            activityAmount,

          available_amount:
            availableAmount,

          updated_by_user_id:
            userId,

          updated_at:
            now,
        })
        .eq(
          "id",
          budgetItemId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "updated_at",
          item.updated_at,
        )
        .select(
          "id,workspace_id,planned_amount,activity_amount,available_amount,rollover_amount,updated_at",
        )
        .maybeSingle();

    if (
      updateError
    ) {
      throw createDatabaseError({
        code:
          "budget-item-update-failed",

        operation,

        budgetItemId,

        message:
          "CASE Budget could not update the budget item's activity totals.",

        error:
          updateError,
      });
    }

    if (
      !updatedData
    ) {
      if (
        attempt <
        MAX_UPDATE_ATTEMPTS
      ) {
        continue;
      }

      throw new BudgetActivitySyncError({
        code:
          "budget-item-update-conflict",

        operation,

        budgetItemId,

        message:
          "The budget item changed while transaction activity was being recalculated. Please try again.",
      });
    }

    const updatedItem =
      updatedData as unknown as
        BudgetItemRow;

    const persistedActivityAmount =
      normalizeDatabaseMoney(
        updatedItem.activity_amount,
      );

    const persistedAvailableAmount =
      normalizeDatabaseMoney(
        updatedItem.available_amount,
      );

    const persistedPlannedAmount =
      normalizeDatabaseMoney(
        updatedItem.planned_amount,
      );

    const persistedRolloverAmount =
      normalizeDatabaseMoney(
        updatedItem.rollover_amount,
      );

    if (
      persistedActivityAmount ===
        null ||
      persistedAvailableAmount ===
        null ||
      persistedPlannedAmount ===
        null ||
      persistedRolloverAmount ===
        null
    ) {
      throw new BudgetActivitySyncError({
        code:
          "invalid-budget-item-data",

        operation,

        budgetItemId,

        message:
          "CASE Budget updated the budget item but could not verify its recalculated values.",
      });
    }

    return {
      budgetItemId,

      previousActivityAmount,

      activityAmount:
        persistedActivityAmount,

      plannedAmount:
        persistedPlannedAmount,

      rolloverAmount:
        persistedRolloverAmount,

      availableAmount:
        persistedAvailableAmount,

      transactionCount:
        activityResult.transactionCount,

      updatedAt:
        updatedItem.updated_at,
    };
  }

  throw new BudgetActivitySyncError({
    code:
      "budget-item-update-conflict",

    operation,

    budgetItemId,

    message:
      "CASE Budget could not stabilize the budget item after repeated concurrent updates.",
  });
}

async function loadBudgetItem({
  workspaceId,
  budgetItemId,
}: {
  workspaceId:
    string;

  budgetItemId:
    string;
}): Promise<BudgetItemRow> {
  const operation =
    "loadBudgetItem";

  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        BUDGET_ITEMS_TABLE,
      )
      .select(
        "id,workspace_id,planned_amount,activity_amount,available_amount,rollover_amount,updated_at",
      )
      .eq(
        "id",
        budgetItemId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw createDatabaseError({
      code:
        "budget-item-not-found",

      operation,

      budgetItemId,

      message:
        "CASE Budget could not load the budget item for activity recalculation.",

      error,
    });
  }

  const item =
    data as unknown as
      | BudgetItemRow
      | null;

  if (
    !item
  ) {
    throw new BudgetActivitySyncError({
      code:
        "budget-item-not-found",

      operation,

      budgetItemId,

      message:
        "The budget item could not be found in this workspace.",
    });
  }

  return item;
}

async function calculateCanonicalActivity({
  workspaceId,
  budgetItemId,
}: {
  workspaceId:
    string;

  budgetItemId:
    string;
}): Promise<{
  activityAmount:
    number;

  transactionCount:
    number;
}> {
  const operation =
    "calculateCanonicalActivity";

  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        TRANSACTIONS_TABLE,
      )
      .select(
        "amount",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "budget_item_id",
        budgetItemId,
      )
      .eq(
        "transaction_type",
        "expense",
      )
      .eq(
        "is_deleted",
        false,
      );

  if (
    error
  ) {
    throw createDatabaseError({
      code:
        "transaction-load-failed",

      operation,

      budgetItemId,

      message:
        "CASE Budget could not load transaction activity for the budget item.",

      error,
    });
  }

  const rows =
    (
      data ??
      []
    ) as unknown as
      TransactionAmountRow[];

  let activityAmount =
    0;

  for (
    const row of
      rows
  ) {
    const amount =
      normalizeDatabaseMoney(
        row.amount,
      );

    if (
      amount ===
        null ||
      amount <
        0
    ) {
      throw new BudgetActivitySyncError({
        code:
          "invalid-transaction-data",

        operation,

        budgetItemId,

        message:
          "CASE Budget encountered an invalid transaction amount while recalculating budget activity.",
      });
    }

    activityAmount +=
      amount;
  }

  return {
    activityAmount:
      roundCurrencyAmount(
        activityAmount,
      ),

    transactionCount:
      rows.length,
  };
}

function normalizeDatabaseMoney(
  value:
    unknown,
): number | null {
  if (
    typeof value ===
      "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? roundCurrencyAmount(
          value,
        )
      : null;
  }

  if (
    typeof value ===
      "string"
  ) {
    const normalized =
      value.trim();

    if (
      !normalized
    ) {
      return null;
    }

    const parsed =
      Number(
        normalized,
      );

    return Number.isFinite(
      parsed,
    )
      ? roundCurrencyAmount(
          parsed,
        )
      : null;
  }

  return null;
}

function normalizeRequiredText(
  value:
    unknown,
): string {
  if (
    typeof value !==
      "string"
  ) {
    return "";
  }

  return value.trim();
}

function roundCurrencyAmount(
  value:
    number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function createDatabaseError({
  code,
  operation,
  budgetItemId,
  message,
  error,
}: {
  code:
    BudgetActivitySyncErrorCode;

  operation:
    string;

  budgetItemId:
    string;

  message:
    string;

  error:
    unknown;
}) {
  return new BudgetActivitySyncError({
    code,

    operation,

    budgetItemId,

    message:
      `${message} ${readErrorMessage(
        error,
      )}`.trim(),

    causeCode:
      readErrorCode(
        error,
      ),

    cause:
      error,
  });
}

function readErrorCode(
  error:
    unknown,
): string | null {
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
): string {
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
