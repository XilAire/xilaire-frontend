"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  enforceHouseholdApproval,
} from "@/lib/household/approval-enforcement";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import {
  BudgetActivitySyncError,
  recalculateBudgetActivity,
} from "@/lib/transactions/budget-activity-sync";

import type {
  CaseBudgetTransactionDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  HouseholdApprovalRequest,
} from "@/types/household/household-approval";

export type DeleteTransactionInput = {
  transactionId:
    string;
};

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

export type DeleteCaseBudgetTransactionResult =
  | {
      success:
        true;

      status:
        "deleted";

      transaction:
        CaseBudgetTransactionDatabaseRow;

      approvalRequired:
        false;

      approval:
        null;

      error:
        null;
    }
  | {
      success:
        true;

      status:
        "approval-required";

      transaction:
        null;

      approvalRequired:
        true;

      approval:
        HouseholdApprovalRequest;

      error:
        null;
    }
  | {
      success:
        false;

      status:
        "error";

      transaction:
        null;

      approvalRequired:
        false;

      approval:
        null;

      error: {
        code:
          | "invalid-transaction"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "feature-not-available"
          | "transaction-not-found"
          | "transaction-already-deleted"
          | "provider-managed"
          | "reference-load-failed"
          | "approval-check-failed"
          | "transaction-delete-conflict"
          | "transaction-delete-failed"
          | "budget-activity-sync-failed"
          | "transaction-rollback-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          "transactionId";
      };
    };

const TRANSACTIONS_PATH =
  "/dashboard/transactions";

const BUDGET_PATH =
  "/dashboard/budget";

const ACCOUNTS_PATH =
  "/dashboard/accounts";

const DASHBOARD_PATH =
  "/dashboard";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

/**
 * Soft-deletes one canonical CASE Budget transaction.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server-side auth state.
 * - The browser never supplies workspace_id.
 * - The caller must have an active Owner/Admin/Member membership.
 * - Viewer remains read-only.
 * - Only transactions belonging to the active workspace can be deleted.
 * - Provider-managed transactions cannot be manually deleted here.
 * - Household approval enforcement runs before the soft delete.
 * - If approval is required, the transaction remains unchanged.
 * - Deletion uses the previously read updated_at value as an optimistic
 *   concurrency condition.
 * - After a categorized expense is soft-deleted, its budget item is
 *   recalculated from the canonical non-deleted transaction ledger.
 * - If budget synchronization fails, the transaction deletion is restored
 *   with optimistic concurrency and the budget item is recalculated again
 *   from the restored ledger state.
 * - Historical transaction data remains in Supabase.
 * - No localStorage is involved.
 */
export async function deleteTransaction(
  input:
    DeleteTransactionInput,
): Promise<DeleteCaseBudgetTransactionResult> {
  try {
    const transactionId =
      normalizeOptionalText(
        input.transactionId,
      );

    if (
      !transactionId
    ) {
      return failure({
        code:
          "invalid-transaction",

        message:
          "A valid transaction is required.",

        field:
          "transactionId",
      });
    }

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
          "permission-denied",

        message:
          membershipResult.message,
      });
    }

    if (
      membershipResult.membership.role ===
      "viewer"
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "View-only members cannot delete transactions.",
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
          "id",
          transactionId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .maybeSingle();

    if (
      transactionError
    ) {
      console.error(
        "[CASE Budget Transactions] Failed to load transaction for deletion.",
        {
          workspaceId,
          userId,
          transactionId,
          error:
            transactionError,
        },
      );

      return failure({
        code:
          "transaction-not-found",

        message:
          "CASE Budget could not load the selected transaction.",
      });
    }

    const transaction =
      transactionData as unknown as
        | CaseBudgetTransactionDatabaseRow
        | null;

    if (
      !transaction
    ) {
      return failure({
        code:
          "transaction-not-found",

        message:
          "The selected transaction could not be found in this workspace.",
      });
    }

    if (
      transaction.is_deleted
    ) {
      return failure({
        code:
          "transaction-already-deleted",

        message:
          "This transaction has already been deleted.",
      });
    }

    /*
     * Plaid/system transactions are provider-owned records.
     *
     * Deleting them locally could cause sync/reconciliation conflicts or
     * simply cause the provider synchronization process to recreate them.
     *
     * A future "hide from budget" / "exclude" workflow should be modeled
     * separately from canonical deletion.
     */
    if (
      transaction.source !==
      "manual"
    ) {
      return failure({
        code:
          "provider-managed",

        message:
          "Synced transactions cannot be deleted through the manual transaction workflow.",
      });
    }

    const referenceResult =
      await loadTransactionReferences({
        workspaceId,
        transaction,
      });

    if (
      !referenceResult.success
    ) {
      return failure({
        code:
          "reference-load-failed",

        message:
          referenceResult.message,
      });
    }

    const normalizedAmount =
      normalizeDatabaseAmount(
        transaction.amount,
      );

    if (
      normalizedAmount ===
      null
    ) {
      console.error(
        "[CASE Budget Transactions] Transaction amount could not be normalized before deletion.",
        {
          workspaceId,
          transactionId,
          amount:
            transaction.amount,
        },
      );

      return failure({
        code:
          "transaction-delete-failed",

        message:
          "CASE Budget could not verify the transaction amount before deletion.",
      });
    }

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "transaction",

        title:
          buildApprovalTitle({
            transaction,
            amount:
              normalizedAmount,
          }),

        description:
          buildApprovalDescription({
            transaction,
            amount:
              normalizedAmount,
            accountName:
              referenceResult.account.name,
            transferAccountName:
              referenceResult.transferAccount?.name ??
              null,
            budgetItemName:
              referenceResult.budgetItem?.name ??
              null,
          }),

        amount:
          normalizedAmount,

        target: {
          entityType:
            "transaction",

          entityId:
            transaction.id,
        },

        payload: {
          operation:
            "delete",

          transactionId:
            transaction.id,

          transactionSnapshot: {
            transactionDate:
              transaction.transaction_date,

            merchant:
              transaction.merchant,

            description:
              transaction.description,

            note:
              transaction.note,

            amount:
              normalizedAmount,

            transactionType:
              transaction.transaction_type,

            status:
              transaction.status,

            source:
              transaction.source,

            accountId:
              transaction.account_id,

            transferAccountId:
              transaction.transfer_account_id,

            budgetItemId:
              transaction.budget_item_id,

            currencyCode:
              transaction.currency_code,

            provider:
              transaction.provider,

            providerTransactionId:
              transaction.provider_transaction_id,

            reconciledAt:
              transaction.reconciled_at,

            createdAt:
              transaction.created_at,

            updatedAt:
              transaction.updated_at,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Transactions] Approval enforcement failed during deletion.",
        {
          workspaceId,
          userId,
          transactionId,
          error:
            approvalResult.error,
        },
      );

      return failure({
        code:
          "approval-check-failed",

        message:
          approvalResult.error.message,
      });
    }

    if (
      approvalResult.requiresApproval
    ) {
      return {
        success:
          true,

        status:
          "approval-required",

        transaction:
          null,

        approvalRequired:
          true,

        approval:
          approvalResult.approval,

        error:
          null,
      };
    }

    const deletedAt =
      new Date().toISOString();

    /*
     * Soft delete + optimistic concurrency.
     *
     * The updated_at match prevents a stale browser from deleting a
     * transaction that another process modified after it was loaded.
     */
    const {
      data:
        deletedData,
      error:
        deleteError,
    } =
      await admin
        .from(
          "case_budget_transactions",
        )
        .update({
          is_deleted:
            true,

          deleted_at:
            deletedAt,

          deleted_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          updated_at:
            deletedAt,
        })
        .eq(
          "id",
          transactionId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "is_deleted",
          false,
        )
        .eq(
          "source",
          "manual",
        )
        .eq(
          "updated_at",
          transaction.updated_at,
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,account_id,transfer_account_id,budget_item_id,transaction_type,status,source,transaction_date,merchant,description,note,amount,currency_code,provider,provider_transaction_id,provider_account_id,provider_pending_transaction_id,is_deleted,deleted_at,deleted_by_user_id,reconciled_at,reconciled_by_user_id,created_at,updated_at",
        )
        .maybeSingle();

    if (
      deleteError
    ) {
      console.error(
        "[CASE Budget Transactions] Failed to soft-delete transaction.",
        {
          workspaceId,
          userId,
          transactionId,
          error:
            deleteError,
        },
      );

      return failure({
        code:
          "transaction-delete-failed",

        message:
          "CASE Budget could not delete the transaction.",
      });
    }

    if (
      !deletedData
    ) {
      return failure({
        code:
          "transaction-delete-conflict",

        message:
          "This transaction changed before the deletion completed. Refresh the transaction list and try again.",
      });
    }

    const deletedTransaction =
      deletedData as unknown as
        CaseBudgetTransactionDatabaseRow;

    const affectedBudgetItemId =
      transaction.transaction_type ===
        "expense"
        ? transaction.budget_item_id
        : null;

    if (
      affectedBudgetItemId
    ) {
      try {
        await recalculateBudgetActivity({
          userId,
          workspaceId,

          budgetItemIds: [
            affectedBudgetItemId,
          ],
        });
      } catch (
        syncError
      ) {
        console.error(
          "[CASE Budget Transactions] Budget activity synchronization failed after transaction deletion.",
          {
            workspaceId,
            userId,

            transactionId:
              deletedTransaction.id,

            budgetItemId:
              affectedBudgetItemId,

            error:
              syncError,
          },
        );

        const rollbackResult =
          await rollbackDeletedTransaction({
            previous:
              transaction,

            deleted:
              deletedTransaction,

            userId,
            workspaceId,
          });

        if (
          !rollbackResult.success
        ) {
          console.error(
            "[CASE Budget Transactions] Failed to restore transaction after budget activity synchronization failure.",
            {
              workspaceId,
              userId,

              transactionId:
                deletedTransaction.id,

              budgetItemId:
                affectedBudgetItemId,

              rollbackError:
                rollbackResult.error,
            },
          );

          return failure({
            code:
              "transaction-rollback-failed",

            message:
              "The transaction was deleted, but CASE Budget could not synchronize the budget or safely restore the transaction. Refresh your data before making additional changes.",
          });
        }

        try {
          await recalculateBudgetActivity({
            userId,
            workspaceId,

            budgetItemIds: [
              affectedBudgetItemId,
            ],
          });
        } catch (
          repairError
        ) {
          console.error(
            "[CASE Budget Transactions] Budget activity repair failed after transaction deletion rollback.",
            {
              workspaceId,
              userId,

              transactionId:
                deletedTransaction.id,

              budgetItemId:
                affectedBudgetItemId,

              error:
                repairError,
            },
          );

          return failure({
            code:
              "budget-activity-sync-failed",

            message:
              "CASE Budget restored the transaction, but could not verify the budget activity repair. Refresh your data before trying again.",
          });
        }

        return failure({
          code:
            "budget-activity-sync-failed",

          message:
            syncError instanceof
              BudgetActivitySyncError
              ? `The transaction deletion was rolled back because CASE Budget could not synchronize the budget: ${syncError.message}`
              : "The transaction deletion was rolled back because CASE Budget could not synchronize the budget.",
        });
      }
    }

    revalidateTransactionPaths();

    return {
      success:
        true,

      status:
        "deleted",

      transaction:
        deletedTransaction,

      approvalRequired:
        false,

      approval:
        null,

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
      "[CASE Budget Transactions] Unexpected transaction deletion error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not delete the transaction. Please try again.",
    });
  }
}

async function rollbackDeletedTransaction({
  previous,
  deleted,
  userId,
  workspaceId,
}: {
  previous:
    CaseBudgetTransactionDatabaseRow;

  deleted:
    CaseBudgetTransactionDatabaseRow;

  userId:
    string;

  workspaceId:
    string;
}):
  Promise<
    | {
        success:
          true;

        transaction:
          CaseBudgetTransactionDatabaseRow;
      }
    | {
        success:
          false;

        error:
          unknown;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const rollbackAt =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "case_budget_transactions",
      )
      .update({
        is_deleted:
          previous.is_deleted,

        deleted_at:
          previous.deleted_at,

        deleted_by_user_id:
          previous.deleted_by_user_id,

        updated_by_user_id:
          userId,

        updated_at:
          rollbackAt,
      })
      .eq(
        "id",
        deleted.id,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "is_deleted",
        true,
      )
      .eq(
        "updated_at",
        deleted.updated_at,
      )
      .select(
        "id,workspace_id,created_by_user_id,updated_by_user_id,account_id,transfer_account_id,budget_item_id,transaction_type,status,source,transaction_date,merchant,description,note,amount,currency_code,provider,provider_transaction_id,provider_account_id,provider_pending_transaction_id,is_deleted,deleted_at,deleted_by_user_id,reconciled_at,reconciled_by_user_id,created_at,updated_at",
      )
      .maybeSingle();

  if (
    error
  ) {
    return {
      success:
        false,

      error,
    };
  }

  if (
    !data
  ) {
    return {
      success:
        false,

      error:
        new Error(
          "The deleted transaction changed before rollback could complete.",
        ),
    };
  }

  return {
    success:
      true,

    transaction:
      data as unknown as
        CaseBudgetTransactionDatabaseRow,
  };
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
      "[CASE Budget Transactions] Failed to load workspace during transaction deletion.",
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
        "Transactions cannot be deleted while this workspace is inactive.",
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
      "[CASE Budget Transactions] Failed to verify membership during transaction deletion.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not verify your workspace permissions.",
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

      message:
        "You do not have active access to delete transactions in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadTransactionReferences({
  workspaceId,
  transaction,
}: {
  workspaceId:
    string;

  transaction:
    CaseBudgetTransactionDatabaseRow;
}):
  Promise<
    | {
        success:
          true;

        account:
          AccountRow;

        transferAccount:
          AccountRow | null;

        budgetItem:
          BudgetItemRow | null;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const accountResult =
    await loadAccount({
      workspaceId,

      accountId:
        transaction.account_id,
    });

  if (
    !accountResult.success
  ) {
    return {
      success:
        false,

      message:
        "CASE Budget could not verify the account attached to this transaction.",
    };
  }

  let transferAccount:
    AccountRow | null =
    null;

  if (
    transaction.transfer_account_id
  ) {
    const transferResult =
      await loadAccount({
        workspaceId,

        accountId:
          transaction.transfer_account_id,
      });

    if (
      !transferResult.success
    ) {
      return {
        success:
          false,

        message:
          "CASE Budget could not verify the transfer destination attached to this transaction.",
      };
    }

    transferAccount =
      transferResult.account;
  }

  let budgetItem:
    BudgetItemRow | null =
    null;

  if (
    transaction.budget_item_id
  ) {
    const budgetItemResult =
      await loadBudgetItem({
        workspaceId,

        budgetItemId:
          transaction.budget_item_id,
      });

    if (
      !budgetItemResult.success
    ) {
      return {
        success:
          false,

        message:
          "CASE Budget could not verify the budget item attached to this transaction.",
      };
    }

    budgetItem =
      budgetItemResult.budgetItem;
  }

  return {
    success:
      true,

    account:
      accountResult.account,

    transferAccount,

    budgetItem,
  };
}

async function loadAccount({
  workspaceId,
  accountId,
}: {
  workspaceId:
    string;

  accountId:
    string;
}):
  Promise<
    | {
        success:
          true;

        account:
          AccountRow;
      }
    | {
        success:
          false;
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
        "case_budget_accounts",
      )
      .select(
        "id,workspace_id,name,currency_code,is_active,is_archived",
      )
      .eq(
        "id",
        accountId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load account reference during transaction deletion.",
      {
        workspaceId,
        accountId,
        error,
      },
    );

    return {
      success:
        false,
    };
  }

  const account =
    data as unknown as
      | AccountRow
      | null;

  if (
    !account
  ) {
    return {
      success:
        false,
    };
  }

  return {
    success:
      true,

    account,
  };
}

async function loadBudgetItem({
  workspaceId,
  budgetItemId,
}: {
  workspaceId:
    string;

  budgetItemId:
    string;
}):
  Promise<
    | {
        success:
          true;

        budgetItem:
          BudgetItemRow;
      }
    | {
        success:
          false;
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
        "case_budget_budget_items",
      )
      .select(
        "id,workspace_id,budget_month_id,budget_group_id,name,is_archived",
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
    console.error(
      "[CASE Budget Transactions] Failed to load budget-item reference during transaction deletion.",
      {
        workspaceId,
        budgetItemId,
        error,
      },
    );

    return {
      success:
        false,
    };
  }

  const budgetItem =
    data as unknown as
      | BudgetItemRow
      | null;

  if (
    !budgetItem
  ) {
    return {
      success:
        false,
    };
  }

  return {
    success:
      true,

    budgetItem,
  };
}

function buildApprovalTitle({
  transaction,
  amount,
}: {
  transaction:
    CaseBudgetTransactionDatabaseRow;

  amount:
    number;
}) {
  const amountLabel =
    formatCurrency({
      amount,

      currencyCode:
        transaction.currency_code,
    });

  const merchant =
    normalizeOptionalText(
      transaction.merchant,
    );

  switch (
    transaction.transaction_type
  ) {
    case "transfer":
      return `Delete transfer ${amountLabel}`;

    case "income":
      return merchant
        ? `Delete income: ${merchant}`
        : `Delete income ${amountLabel}`;

    case "expense":
    default:
      return merchant
        ? `Delete expense: ${merchant}`
        : `Delete expense ${amountLabel}`;
  }
}

function buildApprovalDescription({
  transaction,
  amount,
  accountName,
  transferAccountName,
  budgetItemName,
}: {
  transaction:
    CaseBudgetTransactionDatabaseRow;

  amount:
    number;

  accountName:
    string;

  transferAccountName:
    string | null;

  budgetItemName:
    string | null;
}) {
  const amountLabel =
    formatCurrency({
      amount,

      currencyCode:
        transaction.currency_code,
    });

  const merchant =
    normalizeOptionalText(
      transaction.merchant,
    );

  if (
    transaction.transaction_type ===
    "transfer"
  ) {
    return `Delete the ${amountLabel} transfer from ${accountName} to ${
      transferAccountName ??
      "the selected destination account"
    } dated ${transaction.transaction_date}.`;
  }

  const typeLabel =
    transaction.transaction_type ===
    "income"
      ? "income"
      : "expense";

  const merchantText =
    merchant
      ? ` for ${merchant}`
      : "";

  const budgetText =
    budgetItemName
      ? ` assigned to ${budgetItemName}`
      : "";

  return `Delete the ${typeLabel} of ${amountLabel}${merchantText} in ${accountName}${budgetText} dated ${transaction.transaction_date}.`;
}

function normalizeDatabaseAmount(
  value:
    unknown,
): number | null {
  if (
    typeof value ===
      "number"
  ) {
    if (
      !Number.isFinite(
        value,
      ) ||
      value <
        0
    ) {
      return null;
    }

    return roundCurrencyAmount(
      value,
    );
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

    if (
      !Number.isFinite(
        parsed,
      ) ||
      parsed <
        0
    ) {
      return null;
    }

    return roundCurrencyAmount(
      parsed,
    );
  }

  return null;
}

function formatCurrency({
  amount,
  currencyCode,
}: {
  amount:
    number;

  currencyCode:
    string;
}) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency:
          currencyCode,
      },
    ).format(
      amount,
    );
  } catch {
    return `${amount.toFixed(
      2,
    )} ${currencyCode}`;
  }
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

function revalidateTransactionPaths() {
  revalidatePath(
    TRANSACTIONS_PATH,
  );

  revalidatePath(
    BUDGET_PATH,
  );

  revalidatePath(
    ACCOUNTS_PATH,
  );

  revalidatePath(
    DASHBOARD_PATH,
  );

  revalidatePath(
    HOUSEHOLD_APPROVALS_PATH,
  );
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
  field,
}: {
  code:
    Extract<
      DeleteCaseBudgetTransactionResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      DeleteCaseBudgetTransactionResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): DeleteCaseBudgetTransactionResult {
  return {
    success:
      false,

    status:
      "error",

    transaction:
      null,

    approvalRequired:
      false,

    approval:
      null,

    error: {
      code,

      message,

      ...(field
        ? {
            field,
          }
        : {}),
    },
  };
}
