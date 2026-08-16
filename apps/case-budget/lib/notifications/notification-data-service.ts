import "server-only";

import {
  listBills,
} from "@/lib/bills/bill-storage";

import {
  generateAndPersistNotifications,
} from "@/lib/notifications/notification-service";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  AccountConnectionStatus,
  AccountSyncStatus,
  BillData as NotificationBillData,
  BudgetData,
  ConnectedAccountData,
  DebtData,
  NotificationGenerationInput,
  SavingsGoalData,
  TransactionData,
} from "@/lib/notifications/generate-notifications";

import type {
  GeneratedNotificationPersistenceResult,
} from "@/lib/notifications/notification-service";

import type {
  BillData,
} from "@/types/bill";

import type {
  CaseBudgetAccountDatabaseRow,
  CaseBudgetBudgetGroupDatabaseRow,
  CaseBudgetBudgetIncomeSourceDatabaseRow,
  CaseBudgetBudgetItemDatabaseRow,
  CaseBudgetBudgetMonthDatabaseRow,
  CaseBudgetDebtDatabaseRow,
  CaseBudgetGoalDatabaseRow,
  CaseBudgetTransactionDatabaseRow,
} from "@/types/database";

export type NotificationDataScope = {
  userId:
    string;

  workspaceId:
    string;
};

export type LoadNotificationGenerationInput =
  NotificationDataScope & {
    asOf?:
      Date | string;

    largePurchaseThreshold?:
      number;
  };

export type NotificationDataSnapshot = {
  userId:
    string;

  workspaceId:
    string;

  asOf:
    string;

  generation:
    NotificationGenerationInput;

  counts: {
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
};

export type GenerateWorkspaceNotificationsInput =
  LoadNotificationGenerationInput;

export type GenerateWorkspaceNotificationsResult = {
  snapshot:
    NotificationDataSnapshot;

  persistence:
    GeneratedNotificationPersistenceResult;
};

export type NotificationDataServiceErrorCode =
  | "invalid-input"
  | "database-error"
  | "unknown";

export class NotificationDataServiceError extends Error {
  readonly code:
    NotificationDataServiceErrorCode;

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
      NotificationDataServiceErrorCode;

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
      "NotificationDataServiceError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode ??
      null;
  }
}

type BudgetLoadResult = {
  budget:
    BudgetData | null;

  categoryCount:
    number;
};

type AccountNotificationRow =
  CaseBudgetAccountDatabaseRow & {
    connection_status?:
      string | null;

    previous_connection_status?:
      string | null;

    sync_status?:
      string | null;

    previous_sync_status?:
      string | null;
  };

const CASE_BUDGET_BUDGET_MONTHS_TABLE =
  "case_budget_budget_months";

const CASE_BUDGET_BUDGET_INCOME_SOURCES_TABLE =
  "case_budget_budget_income_sources";

const CASE_BUDGET_BUDGET_GROUPS_TABLE =
  "case_budget_budget_groups";

const CASE_BUDGET_BUDGET_ITEMS_TABLE =
  "case_budget_budget_items";

const CASE_BUDGET_TRANSACTIONS_TABLE =
  "case_budget_transactions";

const CASE_BUDGET_GOALS_TABLE =
  "case_budget_goals";

const CASE_BUDGET_DEBTS_TABLE =
  "case_budget_debts";

const CASE_BUDGET_ACCOUNTS_TABLE =
  "case_budget_accounts";

const DEFAULT_LARGE_PURCHASE_THRESHOLD =
  500;

/**
 * Loads one deterministic, workspace-scoped financial snapshot for CASE
 * Budget's existing notification generator.
 *
 * Important ownership boundary:
 *
 * - The recipient is userId.
 * - Financial records are loaded by workspaceId because budgets, transactions,
 *   goals, debts, and accounts are canonical workspace-owned data.
 * - Bills currently retain both user_id and workspace_id ownership, so the
 *   existing listBills() repository is used and explicitly scopes both.
 *
 * This service uses the service-role client and therefore never relies on RLS
 * as its only workspace boundary.
 */
export async function loadNotificationDataSnapshot({
  userId,
  workspaceId,
  asOf = new Date(),
  largePurchaseThreshold =
    DEFAULT_LARGE_PURCHASE_THRESHOLD,
}: LoadNotificationGenerationInput):
  Promise<NotificationDataSnapshot> {
  const operation =
    "loadNotificationDataSnapshot";

  const scope =
    normalizeScope({
      userId,
      workspaceId,
      operation,
    });

  const normalizedAsOf =
    normalizeAsOf({
      value:
        asOf,

      operation,
    });

  const normalizedLargePurchaseThreshold =
    normalizeLargePurchaseThreshold(
      largePurchaseThreshold,
    );

  try {
    const [
      bills,
      budgetResult,
      transactions,
      savingsGoals,
      debts,
      accounts,
    ] =
      await Promise.all([
        loadBills({
          ...scope,
        }),

        loadCurrentBudget({
          workspaceId:
            scope.workspaceId,

          asOf:
            normalizedAsOf,
        }),

        loadTransactions({
          workspaceId:
            scope.workspaceId,

          asOf:
            normalizedAsOf,
        }),

        loadSavingsGoals({
          workspaceId:
            scope.workspaceId,
        }),

        loadDebts({
          workspaceId:
            scope.workspaceId,
        }),

        loadConnectedAccounts({
          workspaceId:
            scope.workspaceId,
        }),
      ]);

    const generation:
      NotificationGenerationInput = {
        bills,

        budget:
          budgetResult.budget,

        transactions,

        savingsGoals,

        debts,

        accounts,

        asOf:
          normalizedAsOf,

        largePurchaseThreshold:
          normalizedLargePurchaseThreshold,
    };

    return {
      userId:
        scope.userId,

      workspaceId:
        scope.workspaceId,

      asOf:
        normalizedAsOf,

      generation,

      counts: {
        bills:
          bills.length,

        budgetCategories:
          budgetResult.categoryCount,

        transactions:
          transactions.length,

        savingsGoals:
          savingsGoals.length,

        debts:
          debts.length,

        accounts:
          accounts.length,
      },
    };
  } catch (
    error
  ) {
    throw normalizeServiceError({
      operation,

      error,

      fallbackMessage:
        "CASE Budget could not load notification data.",
    });
  }
}

/**
 * Production orchestration entry point.
 *
 * Loads the current workspace snapshot, runs the existing generator, and
 * persists the resulting notifications through notification-service.ts.
 */
export async function generateWorkspaceNotifications(
  input:
    GenerateWorkspaceNotificationsInput,
): Promise<GenerateWorkspaceNotificationsResult> {
  const snapshot =
    await loadNotificationDataSnapshot(
      input,
    );

  const persistence =
    await generateAndPersistNotifications({
      userId:
        snapshot.userId,

      workspaceId:
        snapshot.workspaceId,

      generation:
        snapshot.generation,
    });

  return {
    snapshot,

    persistence,
  };
}

async function loadBills({
  userId,
  workspaceId,
}: NotificationDataScope): Promise<
  NotificationBillData[]
> {
  const bills =
    await listBills({
      userId,
      workspaceId,
    });

  return bills.map(
    mapBillForNotifications,
  );
}

async function loadCurrentBudget({
  workspaceId,
  asOf,
}: {
  workspaceId:
    string;

  asOf:
    string;
}): Promise<BudgetLoadResult> {
  const operation =
    "loadCurrentBudget";

  const admin =
    createAdminClient();

  const asOfDate =
    new Date(
      asOf,
    );

  const monthKey =
    createMonthKey(
      asOfDate,
    );

  const {
    data:
      monthRows,
    error:
      monthError,
  } =
    await admin
      .from(
        CASE_BUDGET_BUDGET_MONTHS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .order(
        "budget_month",
        {
          ascending:
            false,
        },
      )
      .limit(
        24,
      );

  if (
    monthError
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load the current budget month.",

      error:
        monthError,
    });
  }

  const budgetMonth =
    findBudgetMonthForMonthKey(
      asArray<CaseBudgetBudgetMonthDatabaseRow>(
        monthRows,
      ),
      monthKey,
    );

  if (
    !budgetMonth
  ) {
    return {
      budget:
        null,

      categoryCount:
        0,
    };
  }

  const [
    incomeSourcesResult,
    groupsResult,
    itemsResult,
  ] =
    await Promise.all([
      admin
        .from(
          CASE_BUDGET_BUDGET_INCOME_SOURCES_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          budgetMonth.id,
        )
        .eq(
          "is_archived",
          false,
        ),

      admin
        .from(
          CASE_BUDGET_BUDGET_GROUPS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          budgetMonth.id,
        )
        .eq(
          "is_archived",
          false,
        ),

      admin
        .from(
          CASE_BUDGET_BUDGET_ITEMS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          budgetMonth.id,
        )
        .eq(
          "is_archived",
          false,
        ),
    ]);

  if (
    incomeSourcesResult.error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load budget income sources.",

      error:
        incomeSourcesResult.error,
    });
  }

  if (
    groupsResult.error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load budget groups.",

      error:
        groupsResult.error,
    });
  }

  if (
    itemsResult.error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load budget items.",

      error:
        itemsResult.error,
    });
  }

  const incomeSources =
    asArray<CaseBudgetBudgetIncomeSourceDatabaseRow>(
      incomeSourcesResult.data,
    );

  const groups =
    asArray<CaseBudgetBudgetGroupDatabaseRow>(
      groupsResult.data,
    );

  const items =
    asArray<CaseBudgetBudgetItemDatabaseRow>(
      itemsResult.data,
    );

  const groupById =
    new Map(
      groups.map(
        (
          group,
        ) => [
          group.id,
          group,
        ] as const,
      ),
    );

  const income =
    resolveBudgetIncome({
      budgetMonth,
      incomeSources,
    });

  const assignedAmount =
    roundMoney(
      items.reduce(
        (
          total,
          item,
        ) =>
          total +
          toFiniteNumber(
            item.planned_amount,
          ),
        0,
      ),
    );

  const categories =
    items.map(
      (
        item,
      ) => {
        const group =
          groupById.get(
            item.budget_group_id,
          );

        return {
          id:
            item.id,

          name:
            group
              ? `${group.name} · ${item.name}`
              : item.name,

          budgetedAmount:
            roundMoney(
              Math.max(
                0,
                toFiniteNumber(
                  item.planned_amount,
                ),
              ),
            ),

          /**
           * CASE Budget's budget-item schema stores activity_amount as the
           * canonical activity value. Notification rules expect positive
           * spending. Negative activity therefore represents money spent,
           * while positive activity (refund/credit/inflow) does not increase
           * spending for limit-alert purposes.
           */
          spentAmount:
            roundMoney(
              Math.max(
                0,
                -toFiniteNumber(
                  item.activity_amount,
                ),
              ),
            ),

          createdAt:
            item.created_at,

          updatedAt:
            item.updated_at,
        };
      },
    );

  const unassignedAmount =
    roundMoney(
      income -
      assignedAmount,
    );

  return {
    budget: {
      id:
        budgetMonth.id,

      month:
        normalizeBudgetMonthValue(
          budgetMonth.budget_month,
        ),

      income,

      assignedAmount,

      unassignedAmount,

      categories,

      createdAt:
        budgetMonth.created_at,

      updatedAt:
        budgetMonth.updated_at,
    },

    categoryCount:
      categories.length,
  };
}

async function loadTransactions({
  workspaceId,
  asOf,
}: {
  workspaceId:
    string;

  asOf:
    string;
}): Promise<TransactionData[]> {
  const operation =
    "loadTransactions";

  const endDate =
    new Date(
      asOf,
    );

  /**
   * A bounded window prevents the notification generator from repeatedly
   * examining the workspace's entire transaction history. Ninety days is
   * sufficient for the current large-purchase, uncategorized, recently
   * cleared, and duplicate-transaction rules.
   */
  const startDate =
    new Date(
      endDate,
    );

  startDate.setUTCDate(
    startDate.getUTCDate() -
    90,
  );

  const startDateKey =
    createDateKey(
      startDate,
    );

  const endDateKey =
    createDateKey(
      endDate,
    );

  const admin =
    createAdminClient();

  const {
    data:
      transactionRows,
    error:
      transactionError,
  } =
    await admin
      .from(
        CASE_BUDGET_TRANSACTIONS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "is_deleted",
        false,
      )
      .gte(
        "transaction_date",
        startDateKey,
      )
      .lte(
        "transaction_date",
        endDateKey,
      )
      .order(
        "transaction_date",
        {
          ascending:
            false,
        },
      )
      .limit(
        1000,
      );

  if (
    transactionError
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load transactions for notifications.",

      error:
        transactionError,
    });
  }

  const rows =
    asArray<CaseBudgetTransactionDatabaseRow>(
      transactionRows,
    );

  const budgetItemIds =
    Array.from(
      new Set(
        rows
          .map(
            (
              row,
            ) =>
              row.budget_item_id,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    );

  const budgetItemsById =
    await loadBudgetItemNamesById({
      workspaceId,
      budgetItemIds,
    });

  return rows.map(
    (
      row,
    ) => {
      const budgetItemName =
        row.budget_item_id
          ? budgetItemsById.get(
              row.budget_item_id,
            ) ??
            null
          : null;

      return {
        id:
          row.id,

        amount:
          toFiniteNumber(
            row.amount,
          ),

        merchant:
          normalizeNullableText(
            row.merchant,
          ) ??
          undefined,

        description:
          normalizeNullableText(
            row.description,
          ) ??
          undefined,

        date:
          row.transaction_date,

        transactionDate:
          row.transaction_date,

        categoryId:
          row.budget_item_id,

        categoryName:
          budgetItemName,

        budgetItemId:
          row.budget_item_id,

        accountId:
          row.account_id,

        status:
          row.status,

        type:
          row.transaction_type,

        isIncome:
          row.transaction_type ===
          "income",

        isTransfer:
          row.transaction_type ===
          "transfer",

        createdAt:
          row.created_at,

        updatedAt:
          row.updated_at,
      };
    },
  );
}

async function loadBudgetItemNamesById({
  workspaceId,
  budgetItemIds,
}: {
  workspaceId:
    string;

  budgetItemIds:
    string[];
}) {
  const names =
    new Map<
      string,
      string
    >();

  if (
    budgetItemIds.length ===
    0
  ) {
    return names;
  }

  const {
    data,
    error,
  } =
    await createAdminClient()
      .from(
        CASE_BUDGET_BUDGET_ITEMS_TABLE,
      )
      .select(
        "id,name",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .in(
        "id",
        budgetItemIds,
      );

  if (
    error
  ) {
    throw createDatabaseError({
      operation:
        "loadBudgetItemNamesById",

      message:
        "CASE Budget could not resolve transaction budget items.",

      error,
    });
  }

  if (
    !Array.isArray(
      data,
    )
  ) {
    return names;
  }

  for (
    const value
    of data
  ) {
    if (
      !isRecord(
        value,
      )
    ) {
      continue;
    }

    const id =
      typeof value.id ===
        "string"
        ? value.id
        : "";

    const name =
      typeof value.name ===
        "string"
        ? value.name.trim()
        : "";

    if (
      id &&
      name
    ) {
      names.set(
        id,
        name,
      );
    }
  }

  return names;
}

async function loadSavingsGoals({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<SavingsGoalData[]> {
  const operation =
    "loadSavingsGoals";

  const {
    data,
    error,
  } =
    await createAdminClient()
      .from(
        CASE_BUDGET_GOALS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "is_archived",
        false,
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      );

  if (
    error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load savings goals for notifications.",

      error,
    });
  }

  return asArray<CaseBudgetGoalDatabaseRow>(
    data,
  ).map(
    (
      row,
    ) => ({
      id:
        row.id,

      name:
        row.name,

      targetAmount:
        toFiniteNumber(
          row.target_amount,
        ),

      currentAmount:
        toFiniteNumber(
          row.current_amount,
        ),

      targetDate:
        row.target_date,

      status:
        row.status,

      createdAt:
        row.created_at,

      updatedAt:
        row.updated_at,
    }),
  );
}

async function loadDebts({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<DebtData[]> {
  const operation =
    "loadDebts";

  const {
    data,
    error,
  } =
    await createAdminClient()
      .from(
        CASE_BUDGET_DEBTS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "is_archived",
        false,
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      );

  if (
    error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load debts for notifications.",

      error,
    });
  }

  return asArray<CaseBudgetDebtDatabaseRow>(
    data,
  ).map(
    (
      row,
    ) => ({
      id:
        row.id,

      name:
        row.name,

      balance:
        toFiniteNumber(
          row.current_balance,
        ),

      originalBalance:
        toFiniteNumber(
          row.original_balance,
        ),

      minimumPayment:
        toFiniteNumber(
          row.minimum_payment,
        ),

      /**
       * The confirmed debt schema does not currently contain a canonical
       * next-payment date or prior-balance field. Do not invent those values.
       * The generator can still produce paid-off / balance milestone events.
       */
      createdAt:
        row.created_at,

      updatedAt:
        row.updated_at,
    }),
  );
}

async function loadConnectedAccounts({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<ConnectedAccountData[]> {
  const operation =
    "loadConnectedAccounts";

  const {
    data,
    error,
  } =
    await createAdminClient()
      .from(
        CASE_BUDGET_ACCOUNTS_TABLE,
      )
      .select(
        "*",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "is_active",
        true,
      )
      .eq(
        "is_archived",
        false,
      )
      .neq(
        "source",
        "manual",
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      );

  if (
    error
  ) {
    throw createDatabaseError({
      operation,

      message:
        "CASE Budget could not load connected accounts for notifications.",

      error,
    });
  }

  return asArray<AccountNotificationRow>(
    data,
  ).map(
    (
      row,
    ) => {
      const connectionStatus =
        normalizeConnectionStatus(
          row.connection_status,
        );

      const previousConnectionStatus =
        normalizeConnectionStatus(
          row.previous_connection_status,
        );

      const syncStatus =
        normalizeSyncStatus(
          row.sync_status,
        );

      const previousSyncStatus =
        normalizeSyncStatus(
          row.previous_sync_status,
        );

      return {
        id:
          row.id,

        name:
          row.name,

        institutionName:
          normalizeNullableText(
            row.institution_name,
          ) ??
          undefined,

        connectionStatus,

        previousConnectionStatus,

        syncStatus,

        previousSyncStatus,

        lastSyncedAt:
          row.provider_last_synced_at ??
          row.balance_last_synced_at,

        createdAt:
          row.created_at,

        updatedAt:
          row.updated_at,
      };
    },
  );
}

function mapBillForNotifications(
  bill:
    BillData,
): NotificationBillData {
  return {
    id:
      bill.id,

    name:
      bill.name,

    amount:
      bill.amount,

    dueDate:
      bill.dueDate,

    status:
      bill.status,

    payee:
      bill.payee,

    paymentMethod:
      bill.paymentMethod,

    paidAt:
      bill.paidDate ??
      null,

    createdAt:
      bill.createdAt,

    updatedAt:
      bill.updatedAt,

    reminder: {
      enabled:
        bill.reminder.enabled,

      timing:
        bill.reminder.timing,
    },
  };
}

function resolveBudgetIncome({
  budgetMonth,
  incomeSources,
}: {
  budgetMonth:
    CaseBudgetBudgetMonthDatabaseRow;

  incomeSources:
    CaseBudgetBudgetIncomeSourceDatabaseRow[];
}) {
  const plannedIncome =
    toFiniteNumber(
      budgetMonth.planned_income,
    );

  const actualIncome =
    toFiniteNumber(
      budgetMonth.actual_income,
    );

  const sourceReceivedIncome =
    incomeSources.reduce(
      (
        total,
        source,
      ) =>
        total +
        toFiniteNumber(
          source.received_amount,
        ),
      0,
    );

  const sourcePlannedIncome =
    incomeSources.reduce(
      (
        total,
        source,
      ) =>
        total +
        toFiniteNumber(
          source.planned_amount,
        ),
      0,
    );

  /**
   * Prefer actual/received income when present, then fall back to planned
   * income. This keeps zero-based "money to assign" notifications tied to
   * the best persisted value available without fabricating income.
   */
  if (
    actualIncome >
    0
  ) {
    return roundMoney(
      actualIncome,
    );
  }

  if (
    sourceReceivedIncome >
    0
  ) {
    return roundMoney(
      sourceReceivedIncome,
    );
  }

  if (
    plannedIncome >
    0
  ) {
    return roundMoney(
      plannedIncome,
    );
  }

  return roundMoney(
    sourcePlannedIncome,
  );
}

function findBudgetMonthForMonthKey(
  rows:
    CaseBudgetBudgetMonthDatabaseRow[],
  monthKey:
    string,
) {
  return rows.find(
    (
      row,
    ) =>
      normalizeBudgetMonthValue(
        row.budget_month,
      ) ===
      monthKey,
  ) ??
    null;
}

function normalizeBudgetMonthValue(
  value:
    string,
) {
  const normalized =
    value.trim();

  const match =
    normalized.match(
      /^(\d{4})-(\d{2})/,
    );

  if (
    !match
  ) {
    return normalized;
  }

  return `${match[1]}-${match[2]}`;
}

function createMonthKey(
  value:
    Date,
) {
  const year =
    value
      .getUTCFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      value.getUTCMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}`;
}

function createDateKey(
  value:
    Date,
) {
  const year =
    value
      .getUTCFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      value.getUTCMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    value
      .getUTCDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}-${day}`;
}

function normalizeScope({
  userId,
  workspaceId,
  operation,
}: NotificationDataScope & {
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
    throw new NotificationDataServiceError({
      message:
        "A valid user ID is required for notification data.",

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
    throw new NotificationDataServiceError({
      message:
        "A valid workspace ID is required for notification data.",

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

function normalizeAsOf({
  value,
  operation,
}: {
  value:
    Date | string;

  operation:
    string;
}) {
  const date =
    value instanceof
      Date
      ? new Date(
          value.getTime(),
        )
      : new Date(
          value,
        );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new NotificationDataServiceError({
      message:
        "A valid notification reference date is required.",

      code:
        "invalid-input",

      operation,
    });
  }

  return date.toISOString();
}

function normalizeLargePurchaseThreshold(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    return DEFAULT_LARGE_PURCHASE_THRESHOLD;
  }

  return roundMoney(
    value,
  );
}

function normalizeConnectionStatus(
  value:
    string | null | undefined,
): AccountConnectionStatus | undefined {
  switch (
    value
  ) {
    case "connected":
    case "disconnected":
    case "error":
    case "syncing":
      return value;

    default:
      return undefined;
  }
}

function normalizeSyncStatus(
  value:
    string | null | undefined,
): AccountSyncStatus | undefined {
  switch (
    value
  ) {
    case "success":
    case "failed":
    case "pending":
    case "syncing":
      return value;

    default:
      return undefined;
  }
}

function roundMoney(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    value *
    100,
  ) /
    100;
}

function toFiniteNumber(
  value:
    unknown,
) {
  const numberValue =
    Number(
      value ??
      0,
    );

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : 0;
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
  const normalized =
    value?.trim();

  return normalized
    ? normalized
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

function asArray<
  Row,
>(
  value:
    unknown,
): Row[] {
  return Array.isArray(
    value,
  )
    ? (
        value as Row[]
      )
    : [];
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

  return new NotificationDataServiceError({
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
    NotificationDataServiceError
  ) {
    return error;
  }

  return new NotificationDataServiceError({
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
