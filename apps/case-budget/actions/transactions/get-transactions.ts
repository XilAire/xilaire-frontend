"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetAccountTypeDatabaseEnum,
  CaseBudgetTransactionDatabaseRow,
  CaseBudgetTransactionSourceDatabaseEnum,
  CaseBudgetTransactionStatusDatabaseEnum,
  CaseBudgetTransactionTypeDatabaseEnum,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  TransactionSummary,
} from "@/types/transaction";

type WorkspaceRow = {
  id:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type MembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    WorkspaceRoleDatabaseEnum;

  status:
    WorkspaceMembershipStatusDatabaseEnum;
};

type AccountRow = {
  id:
    string;

  workspace_id:
    string;

  name:
    string;

  account_type:
    CaseBudgetAccountTypeDatabaseEnum;

  account_subtype:
    string | null;

  institution_name:
    string | null;

  mask:
    string | null;

  currency_code:
    string;

  is_active:
    boolean;

  is_archived:
    boolean;
};

type BudgetItemRow = {
  id:
    string;

  workspace_id:
    string;

  budget_month_id:
    string;

  budget_group_id:
    string;

  name:
    string;

  is_archived:
    boolean;
};

type BudgetGroupRow = {
  id:
    string;

  workspace_id:
    string;

  budget_month_id:
    string;

  name:
    string;

  is_archived:
    boolean;
};

export type CaseBudgetTransactionAccountReference = {
  id:
    string;

  name:
    string;

  type:
    CaseBudgetAccountTypeDatabaseEnum;

  subtype:
    string | null;

  institutionName:
    string | null;

  mask:
    string | null;

  currencyCode:
    string;

  isActive:
    boolean;

  isArchived:
    boolean;
};

export type CaseBudgetTransactionCategoryReference = {
  id:
    string;

  name:
    string;

  groupId:
    string;

  groupName:
    string;

  budgetMonthId:
    string;
};

export type CaseBudgetTransactionRecord = {
  id:
    string;

  workspaceId:
    string;

  date:
    string;

  merchant:
    string;

  description:
    string | null;

  note?:
    string;

  amount:
    number;

  type:
    CaseBudgetTransactionTypeDatabaseEnum;

  status:
    CaseBudgetTransactionStatusDatabaseEnum;

  source:
    CaseBudgetTransactionSourceDatabaseEnum;

  currencyCode:
    string;

  accountId:
    string;

  account:
    CaseBudgetTransactionAccountReference;

  categoryId?:
    string;

  category?:
    CaseBudgetTransactionCategoryReference;

  budgetItemId?:
    string;

  transferAccountId?:
    string;

  transferAccount?:
    CaseBudgetTransactionAccountReference;

  provider:
    string | null;

  providerTransactionId:
    string | null;

  providerAccountId:
    string | null;

  providerPendingTransactionId:
    string | null;

  createdByUserId:
    string;

  updatedByUserId:
    string;

  reconciledAt:
    string | null;

  reconciledByUserId:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

export type GetCaseBudgetTransactionsResult =
  | {
      success:
        true;

      transactions:
        CaseBudgetTransactionRecord[];

      summary:
        TransactionSummary;

      error:
        null;
    }
  | {
      success:
        false;

      transactions:
        [];

      summary:
        TransactionSummary;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "feature-not-available"
          | "transaction-load-failed"
          | "reference-load-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const EMPTY_SUMMARY:
  TransactionSummary = {
    totalIncome:
      0,

    totalExpenses:
      0,

    netAmount:
      0,

    clearedIncome:
      0,

    clearedExpenses:
      0,

    netClearedAmount:
      0,

    pendingExpenseAmount:
      0,

    totalTransferAmount:
      0,

    pendingCount:
      0,

    clearedCount:
      0,

    transferCount:
      0,

    uncategorizedCount:
      0,

    totalCount:
      0,
  };

/**
 * Loads canonical transactions for the currently active CASE Budget
 * workspace.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The caller must have an active membership in the workspace.
 * - Soft-deleted transactions are excluded.
 * - Account, transfer-account, budget-item, and budget-group references
 *   are loaded from Supabase and enriched in one server response.
 * - Supabase is the source of truth.
 * - No localStorage is involved.
 */
export async function getTransactions():
  Promise<GetCaseBudgetTransactionsResult> {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "transactions",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure({
        code:
          "feature-not-available",

        message:
          getTransactionFeatureAccessMessage({
            reason:
              featureAccess.access.reason,

            requiredPlan:
              featureAccess.access.requiredPlan,
          }),
      });
    }

    const admin =
      createWorkspaceAdminClient();

    const workspaceResult =
      await loadWorkspace({
        workspaceId,
      });

    if (
      !workspaceResult.success
    ) {
      return failure({
        code:
          workspaceResult.code,

        message:
          workspaceResult.message,
      });
    }

    const membershipResult =
      await loadMembership({
        workspaceId,
        userId,
      });

    if (
      !membershipResult.success
    ) {
      return failure({
        code:
          membershipResult.code,

        message:
          membershipResult.message,
      });
    }

    const {
      data:
        transactionData,
      error:
        transactionError,
    } =
      await admin
        .from(
          "case_budget_transactions",
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,account_id,transfer_account_id,budget_item_id,transaction_type,status,source,transaction_date,merchant,description,note,amount,currency_code,provider,provider_transaction_id,provider_account_id,provider_pending_transaction_id,is_deleted,deleted_at,deleted_by_user_id,reconciled_at,reconciled_by_user_id,created_at,updated_at",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "is_deleted",
          false,
        )
        .order(
          "transaction_date",
          {
            ascending:
              false,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      transactionError
    ) {
      console.error(
        "[CASE Budget Transactions] Failed to load transactions.",
        {
          workspaceId,
          userId,
          error:
            transactionError,
        },
      );

      return failure({
        code:
          "transaction-load-failed",

        message:
          "CASE Budget could not load transactions for this workspace.",
      });
    }

    const transactionRows =
      (
        transactionData ??
        []
      ) as unknown as
        CaseBudgetTransactionDatabaseRow[];

    if (
      transactionRows.length ===
      0
    ) {
      return {
        success:
          true,

        transactions: [],

        summary: {
          ...EMPTY_SUMMARY,
        },

        error:
          null,
      };
    }

    const accountIds =
      Array.from(
        new Set(
          transactionRows.flatMap(
            (
              transaction,
            ) => {
              const ids =
                [
                  transaction.account_id,
                ];

              if (
                transaction.transfer_account_id
              ) {
                ids.push(
                  transaction.transfer_account_id,
                );
              }

              return ids;
            },
          ),
        ),
      );

    const budgetItemIds =
      Array.from(
        new Set(
          transactionRows
            .map(
              (
                transaction,
              ) =>
                transaction.budget_item_id,
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

    const accountMapResult =
      await loadAccountMap({
        workspaceId,
        accountIds,
      });

    if (
      !accountMapResult.success
    ) {
      return failure({
        code:
          "reference-load-failed",

        message:
          accountMapResult.message,
      });
    }

    const budgetMapResult =
      await loadBudgetReferenceMap({
        workspaceId,
        budgetItemIds,
      });

    if (
      !budgetMapResult.success
    ) {
      return failure({
        code:
          "reference-load-failed",

        message:
          budgetMapResult.message,
      });
    }

    const transactions:
      CaseBudgetTransactionRecord[] =
      [];

    for (
      const row of
        transactionRows
    ) {
      const parsed =
        mapTransactionRow({
          row,

          accountMap:
            accountMapResult.accountMap,

          budgetReferenceMap:
            budgetMapResult.referenceMap,
        });

      if (
        !parsed
      ) {
        console.error(
          "[CASE Budget Transactions] Skipping transaction with invalid or missing references.",
          {
            workspaceId,
            transactionId:
              row.id,
            accountId:
              row.account_id,
            transferAccountId:
              row.transfer_account_id,
            budgetItemId:
              row.budget_item_id,
          },
        );

        continue;
      }

      transactions.push(
        parsed,
      );
    }

    return {
      success:
        true,

      transactions,

      summary:
        buildTransactionSummary(
          transactions,
        ),

      error:
        null,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return failure({
        code:
          error.code ===
          "workspace-required"
            ? "workspace-not-found"
            : "permission-denied",

        message:
          error.message,
      });
    }

    console.error(
      "[CASE Budget Transactions] Unexpected transaction-loading error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not load transactions. Please try again.",
    });
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId:
    string;
}):
  Promise<
    | {
        success:
          true;

        workspace:
          WorkspaceRow;
      }
    | {
        success:
          false;

        code:
          "workspace-not-found" |
          "workspace-inactive";

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "workspaces",
      )
      .select(
        "id,owner_user_id,is_active",
      )
      .eq(
        "id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load active workspace.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success:
        false,

      code:
        "workspace-not-found",

      message:
        "CASE Budget could not load the active workspace.",
    };
  }

  const workspace =
    data as unknown as
      | WorkspaceRow
      | null;

  if (
    !workspace
  ) {
    return {
      success:
        false,

      code:
        "workspace-not-found",

      message:
        "The active CASE Budget workspace could not be found.",
    };
  }

  if (
    !workspace.is_active
  ) {
    return {
      success:
        false,

      code:
        "workspace-inactive",

      message:
        "Transactions are unavailable because this workspace is inactive.",
    };
  }

  return {
    success:
      true,

    workspace,
  };
}

async function loadMembership({
  workspaceId,
  userId,
}: {
  workspaceId:
    string;

  userId:
    string;
}):
  Promise<
    | {
        success:
          true;

        membership:
          MembershipRow;
      }
    | {
        success:
          false;

        code:
          "permission-denied";

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "workspace_members",
      )
      .select(
        "id,workspace_id,user_id,role,status",
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
    error
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to verify workspace membership.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success:
        false,

      code:
        "permission-denied",

      message:
        "CASE Budget could not verify your workspace access.",
    };
  }

  const membership =
    data as unknown as
      | MembershipRow
      | null;

  if (
    !membership ||
    membership.status !==
      "active"
  ) {
    return {
      success:
        false,

      code:
        "permission-denied",

      message:
        "You do not have active access to transactions in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadAccountMap({
  workspaceId,
  accountIds,
}: {
  workspaceId:
    string;

  accountIds:
    string[];
}):
  Promise<
    | {
        success:
          true;

        accountMap:
          Map<
            string,
            AccountRow
          >;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const accountMap =
    new Map<
      string,
      AccountRow
    >();

  if (
    accountIds.length ===
    0
  ) {
    return {
      success:
        true,

      accountMap,
    };
  }

  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "case_budget_accounts",
      )
      .select(
        "id,workspace_id,name,account_type,account_subtype,institution_name,mask,currency_code,is_active,is_archived",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .in(
        "id",
        accountIds,
      );

  if (
    error
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load account references.",
      {
        workspaceId,
        accountIds,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load account references for the transaction list.",
    };
  }

  const rows =
    (
      data ??
      []
    ) as unknown as
      AccountRow[];

  for (
    const row of
      rows
  ) {
    accountMap.set(
      row.id,
      row,
    );
  }

  return {
    success:
      true,

    accountMap,
  };
}

async function loadBudgetReferenceMap({
  workspaceId,
  budgetItemIds,
}: {
  workspaceId:
    string;

  budgetItemIds:
    string[];
}):
  Promise<
    | {
        success:
          true;

        referenceMap:
          Map<
            string,
            CaseBudgetTransactionCategoryReference
          >;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const referenceMap =
    new Map<
      string,
      CaseBudgetTransactionCategoryReference
    >();

  if (
    budgetItemIds.length ===
    0
  ) {
    return {
      success:
        true,

      referenceMap,
    };
  }

  const admin =
    createWorkspaceAdminClient();

  const {
    data:
      itemData,
    error:
      itemError,
  } =
    await admin
      .from(
        "case_budget_budget_items",
      )
      .select(
        "id,workspace_id,budget_month_id,budget_group_id,name,is_archived",
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
    itemError
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load budget-item references.",
      {
        workspaceId,
        budgetItemIds,
        error:
          itemError,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load budget-item references for the transaction list.",
    };
  }

  const itemRows =
    (
      itemData ??
      []
    ) as unknown as
      BudgetItemRow[];

  if (
    itemRows.length ===
    0
  ) {
    return {
      success:
        true,

      referenceMap,
    };
  }

  const groupIds =
    Array.from(
      new Set(
        itemRows.map(
          (
            item,
          ) =>
            item.budget_group_id,
        ),
      ),
    );

  const {
    data:
      groupData,
    error:
      groupError,
  } =
    await admin
      .from(
        "case_budget_budget_groups",
      )
      .select(
        "id,workspace_id,budget_month_id,name,is_archived",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .in(
        "id",
        groupIds,
      );

  if (
    groupError
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load budget-group references.",
      {
        workspaceId,
        groupIds,
        error:
          groupError,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load budget-group references for the transaction list.",
    };
  }

  const groupRows =
    (
      groupData ??
      []
    ) as unknown as
      BudgetGroupRow[];

  const groupMap =
    new Map<
      string,
      BudgetGroupRow
    >();

  for (
    const group of
      groupRows
  ) {
    groupMap.set(
      group.id,
      group,
    );
  }

  for (
    const item of
      itemRows
  ) {
    const group =
      groupMap.get(
        item.budget_group_id,
      );

    if (
      !group
    ) {
      console.error(
        "[CASE Budget Transactions] Budget item references a missing group.",
        {
          workspaceId,
          budgetItemId:
            item.id,
          budgetGroupId:
            item.budget_group_id,
        },
      );

      continue;
    }

    if (
      group.budget_month_id !==
      item.budget_month_id
    ) {
      console.error(
        "[CASE Budget Transactions] Budget item/group month mismatch.",
        {
          workspaceId,
          budgetItemId:
            item.id,
          budgetGroupId:
            group.id,
          itemBudgetMonthId:
            item.budget_month_id,
          groupBudgetMonthId:
            group.budget_month_id,
        },
      );

      continue;
    }

    referenceMap.set(
      item.id,
      {
        id:
          item.id,

        name:
          item.name,

        groupId:
          group.id,

        groupName:
          group.name,

        budgetMonthId:
          item.budget_month_id,
      },
    );
  }

  return {
    success:
      true,

    referenceMap,
  };
}

function mapTransactionRow({
  row,
  accountMap,
  budgetReferenceMap,
}: {
  row:
    CaseBudgetTransactionDatabaseRow;

  accountMap:
    Map<
      string,
      AccountRow
    >;

  budgetReferenceMap:
    Map<
      string,
      CaseBudgetTransactionCategoryReference
    >;
}): CaseBudgetTransactionRecord | null {
  const account =
    accountMap.get(
      row.account_id,
    );

  if (
    !account
  ) {
    return null;
  }

  let transferAccount:
    AccountRow | null =
    null;

  if (
    row.transfer_account_id
  ) {
    transferAccount =
      accountMap.get(
        row.transfer_account_id,
      ) ??
      null;

    if (
      !transferAccount
    ) {
      return null;
    }
  }

  let category:
    CaseBudgetTransactionCategoryReference | undefined;

  if (
    row.budget_item_id
  ) {
    category =
      budgetReferenceMap.get(
        row.budget_item_id,
      );

    if (
      !category
    ) {
      return null;
    }
  }

  const amount =
    normalizeDatabaseAmount(
      row.amount,
    );

  if (
    amount ===
    null
  ) {
    return null;
  }

  const merchant =
    normalizeOptionalText(
      row.merchant,
    ) ??
    normalizeOptionalText(
      row.description,
    ) ??
    getFallbackMerchant(
      row.transaction_type,
    );

  const note =
    normalizeOptionalText(
      row.note,
    );

  return {
    id:
      row.id,

    workspaceId:
      row.workspace_id,

    date:
      row.transaction_date,

    merchant,

    description:
      normalizeOptionalText(
        row.description,
      ),

    ...(note
      ? {
          note,
        }
      : {}),

    amount,

    type:
      row.transaction_type,

    status:
      row.status,

    source:
      row.source,

    currencyCode:
      row.currency_code,

    accountId:
      account.id,

    account:
      mapAccountReference(
        account,
      ),

    ...(category
      ? {
          categoryId:
            category.id,

          category,

          budgetItemId:
            category.id,
        }
      : {}),

    ...(transferAccount
      ? {
          transferAccountId:
            transferAccount.id,

          transferAccount:
            mapAccountReference(
              transferAccount,
            ),
        }
      : {}),

    provider:
      row.provider,

    providerTransactionId:
      row.provider_transaction_id,

    providerAccountId:
      row.provider_account_id,

    providerPendingTransactionId:
      row.provider_pending_transaction_id,

    createdByUserId:
      row.created_by_user_id,

    updatedByUserId:
      row.updated_by_user_id,

    reconciledAt:
      row.reconciled_at,

    reconciledByUserId:
      row.reconciled_by_user_id,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function mapAccountReference(
  account:
    AccountRow,
): CaseBudgetTransactionAccountReference {
  return {
    id:
      account.id,

    name:
      account.name,

    type:
      account.account_type,

    subtype:
      account.account_subtype,

    institutionName:
      account.institution_name,

    mask:
      account.mask,

    currencyCode:
      account.currency_code,

    isActive:
      account.is_active,

    isArchived:
      account.is_archived,
  };
}

function buildTransactionSummary(
  transactions:
    CaseBudgetTransactionRecord[],
): TransactionSummary {
  let totalIncome =
    0;

  let totalExpenses =
    0;

  let clearedIncome =
    0;

  let clearedExpenses =
    0;

  let pendingExpenseAmount =
    0;

  let totalTransferAmount =
    0;

  let pendingCount =
    0;

  let clearedCount =
    0;

  let transferCount =
    0;

  let uncategorizedCount =
    0;

  for (
    const transaction of
      transactions
  ) {
    const amount =
      transaction.amount;

    if (
      transaction.status ===
      "pending"
    ) {
      pendingCount +=
        1;
    }

    if (
      transaction.status ===
      "cleared"
    ) {
      clearedCount +=
        1;
    }

    switch (
      transaction.type
    ) {
      case "income": {
        totalIncome +=
          amount;

        if (
          transaction.status ===
          "cleared"
        ) {
          clearedIncome +=
            amount;
        }

        break;
      }

      case "expense": {
        totalExpenses +=
          amount;

        if (
          transaction.status ===
          "cleared"
        ) {
          clearedExpenses +=
            amount;
        }

        if (
          transaction.status ===
          "pending"
        ) {
          pendingExpenseAmount +=
            amount;
        }

        if (
          !transaction.categoryId
        ) {
          uncategorizedCount +=
            1;
        }

        break;
      }

      case "transfer": {
        totalTransferAmount +=
          amount;

        transferCount +=
          1;

        break;
      }
    }
  }

  return {
    totalIncome:
      roundCurrencyAmount(
        totalIncome,
      ),

    totalExpenses:
      roundCurrencyAmount(
        totalExpenses,
      ),

    netAmount:
      roundCurrencyAmount(
        totalIncome -
        totalExpenses,
      ),

    clearedIncome:
      roundCurrencyAmount(
        clearedIncome,
      ),

    clearedExpenses:
      roundCurrencyAmount(
        clearedExpenses,
      ),

    netClearedAmount:
      roundCurrencyAmount(
        clearedIncome -
        clearedExpenses,
      ),

    pendingExpenseAmount:
      roundCurrencyAmount(
        pendingExpenseAmount,
      ),

    totalTransferAmount:
      roundCurrencyAmount(
        totalTransferAmount,
      ),

    pendingCount,

    clearedCount,

    transferCount,

    uncategorizedCount,

    totalCount:
      transactions.length,
  };
}

function normalizeDatabaseAmount(
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
      ? value
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
      ? parsed
      : null;
  }

  return null;
}

function getFallbackMerchant(
  type:
    CaseBudgetTransactionTypeDatabaseEnum,
) {
  switch (
    type
  ) {
    case "income":
      return "Income";

    case "transfer":
      return "Transfer";

    case "expense":
    default:
      return "Transaction";
  }
}

function normalizeOptionalText(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
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

function getTransactionFeatureAccessMessage({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  switch (
    reason
  ) {
    case "inactive-subscription":
      return "Transactions are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Transactions require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Transactions require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Transactions require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Transactions require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Transactions are not available for the current workspace subscription.";
    }
  }
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      GetCaseBudgetTransactionsResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): GetCaseBudgetTransactionsResult {
  return {
    success:
      false,

    transactions: [],

    summary: {
      ...EMPTY_SUMMARY,
    },

    error: {
      code,

      message,
    },
  };
}
