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

import type {
  CaseBudgetAccountTypeDatabaseEnum,
  CaseBudgetTransactionDatabaseRow,
  CaseBudgetTransactionStatusDatabaseEnum,
  CaseBudgetTransactionTypeDatabaseEnum,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  HouseholdApprovalRequest,
} from "@/types/household/household-approval";

import type {
  UpdateTransactionData,
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

type BudgetMonthRow = {
  id:
    string;

  workspace_id:
    string;

  budget_month:
    string;

  is_closed:
    boolean;
};

export type UpdateCaseBudgetTransactionResult =
  | {
      success:
        true;

      status:
        "updated";

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
          | "invalid-date"
          | "invalid-merchant"
          | "invalid-note"
          | "invalid-amount"
          | "invalid-type"
          | "invalid-status"
          | "invalid-account"
          | "invalid-transfer-account"
          | "invalid-budget-item"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "feature-not-available"
          | "transaction-not-found"
          | "transaction-deleted"
          | "provider-managed"
          | "account-not-found"
          | "account-unavailable"
          | "transfer-account-not-found"
          | "transfer-account-unavailable"
          | "budget-item-not-found"
          | "budget-item-unavailable"
          | "budget-month-closed"
          | "budget-month-mismatch"
          | "approval-check-failed"
          | "transaction-update-conflict"
          | "transaction-update-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "id"
          | "date"
          | "merchant"
          | "note"
          | "amount"
          | "type"
          | "status"
          | "accountId"
          | "transferAccountId"
          | "categoryId";
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

const MERCHANT_MAX_LENGTH =
  200;

const NOTE_MAX_LENGTH =
  1000;

/**
 * Updates one canonical CASE Budget transaction in Supabase.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server auth state.
 * - The client never supplies workspace_id.
 * - The caller must have an active Owner/Admin/Member membership.
 * - Viewer is read-only.
 * - Only non-deleted manual transactions may currently be edited.
 * - Account, transfer-account, and budget-item references are validated
 *   against the active workspace.
 * - Expense budget assignment must belong to the same calendar month as
 *   the transaction.
 * - Household approval enforcement runs before the update.
 * - If approval is required, the current transaction remains unchanged.
 * - The update uses the previously loaded updated_at timestamp as an
 *   optimistic-concurrency condition so stale edits cannot silently
 *   overwrite a newer server-side change.
 * - No localStorage is involved.
 */
export async function updateTransaction(
  input:
    UpdateTransactionData,
): Promise<UpdateCaseBudgetTransactionResult> {
  try {
    const transactionId =
      normalizeRequiredText(
        input.id,
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
          "id",
      });
    }

    const normalizedDate =
      normalizeTransactionDate(
        input.date,
      );

    if (
      !normalizedDate
    ) {
      return failure({
        code:
          "invalid-date",

        message:
          "Enter a valid transaction date.",

        field:
          "date",
      });
    }

    const normalizedMerchant =
      normalizeOptionalText(
        input.merchant,
      );

    if (
      normalizedMerchant &&
      normalizedMerchant.length >
        MERCHANT_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-merchant",

        message:
          `Merchant must be ${MERCHANT_MAX_LENGTH} characters or fewer.`,

        field:
          "merchant",
      });
    }

    const normalizedNote =
      normalizeOptionalText(
        input.note,
      );

    if (
      normalizedNote &&
      normalizedNote.length >
        NOTE_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-note",

        message:
          `Transaction note must be ${NOTE_MAX_LENGTH} characters or fewer.`,

        field:
          "note",
      });
    }

    const normalizedAmount =
      normalizeAmount(
        input.amount,
      );

    if (
      normalizedAmount ===
      null
    ) {
      return failure({
        code:
          "invalid-amount",

        message:
          "Transaction amount must be greater than zero.",

        field:
          "amount",
      });
    }

    const transactionType =
      normalizeTransactionType(
        input.type,
      );

    if (
      !transactionType
    ) {
      return failure({
        code:
          "invalid-type",

        message:
          "Select a valid transaction type.",

        field:
          "type",
      });
    }

    const transactionStatus =
      normalizeTransactionStatus(
        input.status,
      );

    if (
      !transactionStatus
    ) {
      return failure({
        code:
          "invalid-status",

        message:
          "Select a valid transaction status.",

        field:
          "status",
      });
    }

    const accountId =
      normalizeRequiredText(
        input.accountId,
      );

    if (
      !accountId
    ) {
      return failure({
        code:
          "invalid-account",

        message:
          "Select an account for this transaction.",

        field:
          "accountId",
      });
    }

    const transferAccountId =
      normalizeOptionalText(
        input.transferAccountId,
      );

    const budgetItemId =
      normalizeOptionalText(
        input.categoryId,
      );

    const structuralValidation =
      validateTransactionStructure({
        transactionType,
        accountId,
        transferAccountId,
        budgetItemId,
      });

    if (
      !structuralValidation.success
    ) {
      return structuralValidation.result;
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
          "View-only members cannot update transactions.",
      });
    }

    const {
      data:
        existingData,
      error:
        existingError,
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
      existingError
    ) {
      console.error(
        "[CASE Budget Transactions] Failed to load transaction for update.",
        {
          workspaceId,
          userId,
          transactionId,
          error:
            existingError,
        },
      );

      return failure({
        code:
          "transaction-not-found",

        message:
          "CASE Budget could not load the selected transaction.",
      });
    }

    const existing =
      existingData as unknown as
        | CaseBudgetTransactionDatabaseRow
        | null;

    if (
      !existing
    ) {
      return failure({
        code:
          "transaction-not-found",

        message:
          "The selected transaction could not be found in this workspace.",
      });
    }

    if (
      existing.is_deleted
    ) {
      return failure({
        code:
          "transaction-deleted",

        message:
          "This transaction has been deleted and can no longer be edited.",
      });
    }

    /*
     * Provider-synced transactions must be managed by the provider sync
     * workflow so user edits cannot corrupt reconciliation/provider state.
     *
     * A future override/annotation layer can support local categorization
     * or notes without rewriting provider-owned core transaction fields.
     */
    if (
      existing.source !==
      "manual"
    ) {
      return failure({
        code:
          "provider-managed",

        message:
          "Synced transactions cannot be edited through the manual transaction editor.",
      });
    }

    const accountResult =
      await loadAvailableAccount({
        accountId,
        workspaceId,
      });

    if (
      !accountResult.success
    ) {
      return failure({
        code:
          accountResult.code,

        message:
          accountResult.message,

        field:
          "accountId",
      });
    }

    const account =
      accountResult.account;

    let transferAccount:
      AccountRow | null =
      null;

    if (
      transferAccountId
    ) {
      const transferResult =
        await loadAvailableAccount({
          accountId:
            transferAccountId,

          workspaceId,
        });

      if (
        !transferResult.success
      ) {
        return failure({
          code:
            transferResult.code ===
            "account-not-found"
              ? "transfer-account-not-found"
              : "transfer-account-unavailable",

          message:
            transferResult.code ===
            "account-not-found"
              ? "The selected transfer destination account could not be found in this workspace."
              : "The selected transfer destination account is not available for new transactions.",

          field:
            "transferAccountId",
        });
      }

      transferAccount =
        transferResult.account;

      if (
        transferAccount.currency_code !==
        account.currency_code
      ) {
        return failure({
          code:
            "invalid-transfer-account",

          message:
            "Transfers between accounts with different currencies are not supported yet.",

          field:
            "transferAccountId",
        });
      }
    }

    let budgetItem:
      BudgetItemRow | null =
      null;

    let budgetMonth:
      BudgetMonthRow | null =
      null;

    if (
      budgetItemId
    ) {
      const budgetResult =
        await loadBudgetAssignment({
          budgetItemId,
          workspaceId,
        });

      if (
        !budgetResult.success
      ) {
        return failure({
          code:
            budgetResult.code,

          message:
            budgetResult.message,

          field:
            "categoryId",
        });
      }

      budgetItem =
        budgetResult.item;

      budgetMonth =
        budgetResult.month;

      if (
        budgetMonth.is_closed
      ) {
        return failure({
          code:
            "budget-month-closed",

          message:
            "This budget month is closed and cannot receive transaction activity.",

          field:
            "categoryId",
        });
      }

      if (
        !isSameBudgetMonth({
          transactionDate:
            normalizedDate,

          budgetMonth:
            budgetMonth.budget_month,
        })
      ) {
        return failure({
          code:
            "budget-month-mismatch",

          message:
            "The selected budget item belongs to a different month than the transaction date.",

          field:
            "categoryId",
        });
      }
    }

    const hasMeaningfulChanges =
      hasTransactionChanged({
        existing,
        next: {
          transactionDate:
            normalizedDate,

          merchant:
            normalizedMerchant,

          note:
            normalizedNote,

          amount:
            normalizedAmount,

          transactionType,

          transactionStatus,

          accountId:
            account.id,

          transferAccountId:
            transferAccount?.id ??
            null,

          budgetItemId:
            budgetItem?.id ??
            null,

          currencyCode:
            account.currency_code,
        },
      });

    if (
      !hasMeaningfulChanges
    ) {
      return {
        success:
          true,

        status:
          "updated",

        transaction:
          existing,

        approvalRequired:
          false,

        approval:
          null,

        error:
          null,
      };
    }

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "transaction",

        title:
          buildApprovalTitle({
            transactionType,
            merchant:
              normalizedMerchant,
            amount:
              normalizedAmount,
          }),

        description:
          buildApprovalDescription({
            transactionType,
            merchant:
              normalizedMerchant,
            amount:
              normalizedAmount,
            accountName:
              account.name,
            transferAccountName:
              transferAccount?.name ??
              null,
            budgetItemName:
              budgetItem?.name ??
              null,
            transactionDate:
              normalizedDate,
          }),

        amount:
          normalizedAmount,

        target: {
          entityType:
            "transaction",

          entityId:
            transactionId,
        },

        payload: {
          operation:
            "update",

          transactionId,

          previous: {
            transactionDate:
              existing.transaction_date,
            merchant:
              existing.merchant,
            note:
              existing.note,
            amount:
              existing.amount,
            transactionType:
              existing.transaction_type,
            status:
              existing.status,
            accountId:
              existing.account_id,
            transferAccountId:
              existing.transfer_account_id,
            budgetItemId:
              existing.budget_item_id,
            currencyCode:
              existing.currency_code,
            updatedAt:
              existing.updated_at,
          },

          requested: {
            transactionDate:
              normalizedDate,
            merchant:
              normalizedMerchant,
            note:
              normalizedNote,
            amount:
              normalizedAmount,
            transactionType,
            status:
              transactionStatus,
            accountId:
              account.id,
            transferAccountId:
              transferAccount?.id ??
              null,
            budgetItemId:
              budgetItem?.id ??
              null,
            currencyCode:
              account.currency_code,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Transactions] Approval enforcement failed during update.",
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

    const now =
      new Date().toISOString();

    /*
     * Optimistic concurrency:
     *
     * The row must still have the same updated_at value we originally read.
     * If another server process modified it in the meantime, the update
     * matches zero rows and we return a conflict instead of overwriting it.
     */
    const {
      data:
        updatedData,
      error:
        updateError,
    } =
      await admin
        .from(
          "case_budget_transactions",
        )
        .update({
          updated_by_user_id:
            userId,

          account_id:
            account.id,

          transfer_account_id:
            transferAccount?.id ??
            null,

          budget_item_id:
            budgetItem?.id ??
            null,

          transaction_type:
            transactionType,

          status:
            transactionStatus,

          transaction_date:
            normalizedDate,

          merchant:
            normalizedMerchant,

          note:
            normalizedNote,

          amount:
            normalizedAmount,

          currency_code:
            account.currency_code,

          updated_at:
            now,
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
          existing.updated_at,
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,account_id,transfer_account_id,budget_item_id,transaction_type,status,source,transaction_date,merchant,description,note,amount,currency_code,provider,provider_transaction_id,provider_account_id,provider_pending_transaction_id,is_deleted,deleted_at,deleted_by_user_id,reconciled_at,reconciled_by_user_id,created_at,updated_at",
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[CASE Budget Transactions] Failed to update transaction.",
        {
          workspaceId,
          userId,
          transactionId,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "transaction-update-failed",

        message:
          "CASE Budget could not update the transaction.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "transaction-update-conflict",

        message:
          "This transaction changed before your update was completed. Refresh the transaction and try again.",
      });
    }

    const updatedTransaction =
      updatedData as unknown as
        CaseBudgetTransactionDatabaseRow;

    revalidateTransactionPaths();

    return {
      success:
        true,

      status:
        "updated",

      transaction:
        updatedTransaction,

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
      "[CASE Budget Transactions] Unexpected transaction update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the transaction. Please try again.",
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
      "[CASE Budget Transactions] Failed to load workspace during transaction update.",
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
        "Transactions cannot be updated while this workspace is inactive.",
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
      "[CASE Budget Transactions] Failed to verify workspace membership during transaction update.",
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
        "You do not have active access to update transactions in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadAvailableAccount({
  accountId,
  workspaceId,
}: {
  accountId:
    string;

  workspaceId:
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

        code:
          "account-not-found" |
          "account-unavailable";

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
        "case_budget_accounts",
      )
      .select(
        "id,workspace_id,name,account_type,currency_code,is_active,is_archived",
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
      "[CASE Budget Transactions] Failed to load account during transaction update.",
      {
        workspaceId,
        accountId,
        error,
      },
    );

    return {
      success:
        false,

      code:
        "account-not-found",

      message:
        "CASE Budget could not verify the selected account.",
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

      code:
        "account-not-found",

      message:
        "The selected account could not be found in this workspace.",
    };
  }

  if (
    !account.is_active ||
    account.is_archived
  ) {
    return {
      success:
        false,

      code:
        "account-unavailable",

      message:
        "The selected account is not available for transaction updates.",
    };
  }

  return {
    success:
      true,

    account,
  };
}

async function loadBudgetAssignment({
  budgetItemId,
  workspaceId,
}: {
  budgetItemId:
    string;

  workspaceId:
    string;
}):
  Promise<
    | {
        success:
          true;

        item:
          BudgetItemRow;

        month:
          BudgetMonthRow;
      }
    | {
        success:
          false;

        code:
          "budget-item-not-found" |
          "budget-item-unavailable";

        message:
          string;
      }
  > {
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
        "id",
        budgetItemId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    itemError
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load budget item during transaction update.",
      {
        workspaceId,
        budgetItemId,
        error:
          itemError,
      },
    );

    return {
      success:
        false,

      code:
        "budget-item-not-found",

      message:
        "CASE Budget could not verify the selected budget item.",
    };
  }

  const item =
    itemData as unknown as
      | BudgetItemRow
      | null;

  if (
    !item
  ) {
    return {
      success:
        false,

      code:
        "budget-item-not-found",

      message:
        "The selected budget item could not be found in this workspace.",
    };
  }

  if (
    item.is_archived
  ) {
    return {
      success:
        false,

      code:
        "budget-item-unavailable",

      message:
        "The selected budget item is archived and cannot receive transaction activity.",
    };
  }

  const {
    data:
      monthData,
    error:
      monthError,
  } =
    await admin
      .from(
        "case_budget_budget_months",
      )
      .select(
        "id,workspace_id,budget_month,is_closed",
      )
      .eq(
        "id",
        item.budget_month_id,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    monthError
  ) {
    console.error(
      "[CASE Budget Transactions] Failed to load budget month during transaction update.",
      {
        workspaceId,
        budgetItemId,
        budgetMonthId:
          item.budget_month_id,
        error:
          monthError,
      },
    );

    return {
      success:
        false,

      code:
        "budget-item-unavailable",

      message:
        "CASE Budget could not verify the budget month for this item.",
    };
  }

  const month =
    monthData as unknown as
      | BudgetMonthRow
      | null;

  if (
    !month
  ) {
    return {
      success:
        false,

      code:
        "budget-item-unavailable",

      message:
        "The selected budget item is not attached to a valid budget month.",
    };
  }

  return {
    success:
      true,

    item,

    month,
  };
}

function validateTransactionStructure({
  transactionType,
  accountId,
  transferAccountId,
  budgetItemId,
}: {
  transactionType:
    CaseBudgetTransactionTypeDatabaseEnum;

  accountId:
    string;

  transferAccountId:
    string | null;

  budgetItemId:
    string | null;
}):
  | {
      success:
        true;
    }
  | {
      success:
        false;

      result:
        UpdateCaseBudgetTransactionResult;
    } {
  if (
    transactionType ===
    "transfer"
  ) {
    if (
      !transferAccountId
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-transfer-account",

            message:
              "Select a destination account for this transfer.",

            field:
              "transferAccountId",
          }),
      };
    }

    if (
      transferAccountId ===
      accountId
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-transfer-account",

            message:
              "The transfer destination must be different from the source account.",

            field:
              "transferAccountId",
          }),
      };
    }

    if (
      budgetItemId
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-budget-item",

            message:
              "Transfers cannot be assigned to a budget item.",

            field:
              "categoryId",
          }),
      };
    }

    return {
      success:
        true,
    };
  }

  if (
    transferAccountId
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-transfer-account",

          message:
            "Only transfer transactions can have a destination account.",

          field:
            "transferAccountId",
        }),
    };
  }

  if (
    transactionType !==
      "expense" &&
    budgetItemId
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-budget-item",

          message:
            "Only expense transactions can be assigned to a budget item.",

          field:
            "categoryId",
        }),
    };
  }

  return {
    success:
      true,
  };
}

function hasTransactionChanged({
  existing,
  next,
}: {
  existing:
    CaseBudgetTransactionDatabaseRow;

  next: {
    transactionDate:
      string;

    merchant:
      string | null;

    note:
      string | null;

    amount:
      number;

    transactionType:
      CaseBudgetTransactionTypeDatabaseEnum;

    transactionStatus:
      CaseBudgetTransactionStatusDatabaseEnum;

    accountId:
      string;

    transferAccountId:
      string | null;

    budgetItemId:
      string | null;

    currencyCode:
      string;
  };
}) {
  return (
    existing.transaction_date !==
      next.transactionDate ||
    normalizeOptionalText(
      existing.merchant,
    ) !==
      next.merchant ||
    normalizeOptionalText(
      existing.note,
    ) !==
      next.note ||
    normalizeAmountForComparison(
      existing.amount,
    ) !==
      normalizeAmountForComparison(
        next.amount,
      ) ||
    existing.transaction_type !==
      next.transactionType ||
    existing.status !==
      next.transactionStatus ||
    existing.account_id !==
      next.accountId ||
    existing.transfer_account_id !==
      next.transferAccountId ||
    existing.budget_item_id !==
      next.budgetItemId ||
    existing.currency_code !==
      next.currencyCode
  );
}

function normalizeTransactionType(
  value:
    unknown,
): CaseBudgetTransactionTypeDatabaseEnum | null {
  switch (
    value
  ) {
    case "expense":
    case "income":
    case "transfer":
      return value;

    default:
      return null;
  }
}

function normalizeTransactionStatus(
  value:
    unknown,
): CaseBudgetTransactionStatusDatabaseEnum | null {
  switch (
    value
  ) {
    case "pending":
    case "cleared":
      return value;

    default:
      return null;
  }
}

function normalizeAmount(
  value:
    unknown,
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    return null;
  }

  return roundCurrencyAmount(
    value,
  );
}

function normalizeAmountForComparison(
  value:
    unknown,
) {
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
    const parsed =
      Number(
        value,
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

function normalizeTransactionDate(
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

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] =
    normalized.split(
      "-",
    );

  const year =
    Number(
      yearText,
    );

  const month =
    Number(
      monthText,
    );

  const day =
    Number(
      dayText,
    );

  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        day,
      ),
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month -
        1 ||
    date.getUTCDate() !==
      day
  ) {
    return null;
  }

  return normalized;
}

function isSameBudgetMonth({
  transactionDate,
  budgetMonth,
}: {
  transactionDate:
    string;

  budgetMonth:
    string;
}) {
  return (
    transactionDate.slice(
      0,
      7,
    ) ===
    budgetMonth.slice(
      0,
      7,
    )
  );
}

function buildApprovalTitle({
  transactionType,
  merchant,
  amount,
}: {
  transactionType:
    CaseBudgetTransactionTypeDatabaseEnum;

  merchant:
    string | null;

  amount:
    number;
}) {
  if (
    transactionType ===
    "transfer"
  ) {
    return `Update transfer ${formatCurrency(
      amount,
    )}`;
  }

  if (
    merchant
  ) {
    return `Update ${
      transactionType ===
      "income"
        ? "income"
        : "expense"
    }: ${merchant}`;
  }

  return `Update ${
    transactionType ===
    "income"
      ? "income"
      : "expense"
  } ${formatCurrency(
    amount,
  )}`;
}

function buildApprovalDescription({
  transactionType,
  merchant,
  amount,
  accountName,
  transferAccountName,
  budgetItemName,
  transactionDate,
}: {
  transactionType:
    CaseBudgetTransactionTypeDatabaseEnum;

  merchant:
    string | null;

  amount:
    number;

  accountName:
    string;

  transferAccountName:
    string | null;

  budgetItemName:
    string | null;

  transactionDate:
    string;
}) {
  const amountLabel =
    formatCurrency(
      amount,
    );

  if (
    transactionType ===
    "transfer"
  ) {
    return `Update the ${amountLabel} transfer from ${accountName} to ${
      transferAccountName ??
      "the selected destination account"
    } dated ${transactionDate}.`;
  }

  const merchantText =
    merchant
      ? ` for ${merchant}`
      : "";

  const budgetText =
    budgetItemName
      ? ` assigned to ${budgetItemName}`
      : "";

  return `Update the ${
    transactionType ===
    "income"
      ? "income"
      : "expense"
  } of ${amountLabel}${merchantText} in ${accountName}${budgetText} dated ${transactionDate}.`;
}

function formatCurrency(
  amount:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",
    },
  ).format(
    amount,
  );
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

function normalizeRequiredText(
  value:
    unknown,
): string | null {
  return normalizeOptionalText(
    value,
  );
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
      UpdateCaseBudgetTransactionResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      UpdateCaseBudgetTransactionResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): UpdateCaseBudgetTransactionResult {
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
