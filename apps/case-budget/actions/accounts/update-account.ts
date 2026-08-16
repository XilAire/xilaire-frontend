"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  enforceHouseholdApproval,
} from "@/lib/household/approval-enforcement";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import {
  accountTypeToDatabaseType,
  accountTypeToSubtype,
  databaseTypeToAccountType,
  getAccountConnectionStatus,
  getDefaultAccountClassification,
  type AccountData,
  type AccountType,
  type UpdateAccountData,
} from "@/types/account";

import type {
  CaseBudgetAccountDatabaseRow,
  CaseBudgetAccountTypeDatabaseEnum,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  HouseholdApprovalRequest,
} from "@/types/household/household-approval";

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

export type UpdateCaseBudgetAccountInput = {
  accountId:
    string;

  updates:
    UpdateAccountData;
};

export type UpdateCaseBudgetAccountResult =
  | {
      success:
        true;

      status:
        "updated";

      account:
        AccountData;

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

      account:
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

      account:
        null;

      approvalRequired:
        false;

      approval:
        null;

      error: {
        code:
          | "invalid-account"
          | "invalid-name"
          | "invalid-institution"
          | "invalid-type"
          | "invalid-classification"
          | "invalid-balance"
          | "invalid-available-balance"
          | "invalid-credit-limit"
          | "invalid-currency"
          | "invalid-mask"
          | "invalid-note"
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "account-not-found"
          | "account-archived"
          | "provider-managed"
          | "approval-check-failed"
          | "account-update-conflict"
          | "account-update-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "accountId"
          | "name"
          | "institution"
          | "type"
          | "classification"
          | "balance"
          | "availableBalance"
          | "creditLimit"
          | "currency"
          | "mask"
          | "note"
          | "sortOrder"
          | "isActive"
          | "isIncludedInNetWorth";
      };
    };

const ACCOUNTS_PATH =
  "/dashboard/accounts";

const DASHBOARD_PATH =
  "/dashboard";

const TRANSACTIONS_PATH =
  "/dashboard/transactions";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const NAME_MAX_LENGTH =
  120;

const INSTITUTION_MAX_LENGTH =
  160;

const MASK_MAX_LENGTH =
  8;

const NOTE_MAX_LENGTH =
  2000;

/**
 * Updates one canonical CASE Budget account.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server-side auth state.
 * - The client never supplies workspace_id or audit user IDs.
 * - The caller must have an active Owner/Admin/Member membership.
 * - Viewer remains read-only.
 * - Archived accounts cannot be edited through the standard account editor.
 * - Provider-managed account identity/source fields remain protected.
 * - Rich UI account types are persisted through account_type +
 *   account_subtype.
 * - Household account-change approval enforcement runs before the update.
 * - If approval is required, the existing account remains unchanged.
 * - The update is guarded by updated_at optimistic concurrency.
 * - Supabase is the source of truth.
 * - No localStorage is involved.
 */
export async function updateAccount(
  input:
    UpdateCaseBudgetAccountInput,
): Promise<UpdateCaseBudgetAccountResult> {
  try {
    const accountId =
      normalizeOptionalText(
        input.accountId,
      );

    if (
      !accountId
    ) {
      return failure({
        code:
          "invalid-account",

        message:
          "A valid account is required.",

        field:
          "accountId",
      });
    }

    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

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
          "View-only members cannot update accounts.",
      });
    }

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        existingData,
      error:
        existingError,
    } =
      await admin
        .from(
          "case_budget_accounts",
        )
        .select(
          [
            "id",
            "workspace_id",
            "created_by_user_id",
            "updated_by_user_id",
            "name",
            "account_type",
            "account_subtype",
            "institution_name",
            "mask",
            "source",
            "provider",
            "provider_record_id",
            "provider_account_id",
            "current_balance",
            "available_balance",
            "credit_limit",
            "currency_code",
            "include_in_net_worth",
            "is_active",
            "is_archived",
            "archived_at",
            "archived_by_user_id",
            "sort_order",
            "note",
            "balance_last_synced_at",
            "provider_last_synced_at",
            "created_at",
            "updated_at",
          ].join(
            ",",
          ),
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
      existingError
    ) {
      console.error(
        "[CASE Budget Accounts] Failed to load account for update.",
        {
          workspaceId,
          userId,
          accountId,
          error:
            existingError,
        },
      );

      return failure({
        code:
          "account-not-found",

        message:
          "CASE Budget could not load the selected account.",
      });
    }

    const existing =
      existingData as unknown as
        | CaseBudgetAccountDatabaseRow
        | null;

    if (
      !existing
    ) {
      return failure({
        code:
          "account-not-found",

        message:
          "The selected account could not be found in this workspace.",
      });
    }

    if (
      existing.is_archived
    ) {
      return failure({
        code:
          "account-archived",

        message:
          "Archived accounts cannot be edited through the standard account editor.",
      });
    }

    /*
     * Provider-connected accounts may still allow some local presentation
     * fields to change, but their provider identity/source fields are not
     * exposed through UpdateAccountData and therefore cannot be rewritten
     * by this action.
     *
     * Core financial-provider balances are also protected here: a connected
     * account's current/available balance must come from the provider sync
     * workflow, not the manual account editor.
     */
    const isProviderManaged =
      existing.source !==
      "manual";

    const validationResult =
      validateAndBuildNextState({
        existing,
        updates:
          input.updates,
        isProviderManaged,
      });

    if (
      !validationResult.success
    ) {
      return validationResult.result;
    }

    const next =
      validationResult.next;

    if (
      !hasMeaningfulChanges({
        existing,
        next,
      })
    ) {
      const mappedExisting =
        mapAccountRow(
          existing,
        );

      if (
        !mappedExisting
      ) {
        return failure({
          code:
            "account-update-failed",

          message:
            "CASE Budget could not verify the current account details.",
        });
      }

      return {
        success:
          true,

        status:
          "updated",

        account:
          mappedExisting,

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
          "account",

        title:
          `Update account: ${next.name}`,

        description:
          buildApprovalDescription({
            existing,
            next,
          }),

        amount:
          Math.abs(
            next.currentBalance,
          ),

        target: {
          entityType:
            "account",

          entityId:
            accountId,
        },

        payload: {
          operation:
            "update",

          accountId,

          previous: {
            name:
              existing.name,
            accountType:
              existing.account_type,
            accountSubtype:
              existing.account_subtype,
            institution:
              existing.institution_name,
            mask:
              existing.mask,
            currentBalance:
              existing.current_balance,
            availableBalance:
              existing.available_balance,
            creditLimit:
              existing.credit_limit,
            currencyCode:
              existing.currency_code,
            includeInNetWorth:
              existing.include_in_net_worth,
            isActive:
              existing.is_active,
            sortOrder:
              existing.sort_order,
            note:
              existing.note,
            updatedAt:
              existing.updated_at,
          },

          requested: {
            name:
              next.name,
            accountType:
              next.accountType,
            accountSubtype:
              next.accountSubtype,
            institution:
              next.institutionName,
            mask:
              next.mask,
            currentBalance:
              next.currentBalance,
            availableBalance:
              next.availableBalance,
            creditLimit:
              next.creditLimit,
            currencyCode:
              next.currencyCode,
            includeInNetWorth:
              next.includeInNetWorth,
            isActive:
              next.isActive,
            sortOrder:
              next.sortOrder,
            note:
              next.note,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Accounts] Approval enforcement failed during account update.",
        {
          workspaceId,
          userId,
          accountId,
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

        account:
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

    const updatePayload = {
      updated_by_user_id:
        userId,

      name:
        next.name,

      account_type:
        next.accountType,

      account_subtype:
        next.accountSubtype,

      institution_name:
        next.institutionName,

      mask:
        next.mask,

      current_balance:
        next.currentBalance,

      available_balance:
        next.availableBalance,

      credit_limit:
        next.creditLimit,

      currency_code:
        next.currencyCode,

      include_in_net_worth:
        next.includeInNetWorth,

      is_active:
        next.isActive,

      sort_order:
        next.sortOrder,

      note:
        next.note,

      updated_at:
        now,
    };

    /*
     * Provider-managed balances must come from provider synchronization.
     *
     * The validation layer guarantees that next balances equal existing
     * balances for provider-managed records. Keeping these fields present in
     * the update payload is safe but unnecessary, so remove them by building a
     * provider-specific payload below.
     */
    const finalUpdatePayload =
      isProviderManaged
        ? {
            updated_by_user_id:
              updatePayload.updated_by_user_id,

            name:
              updatePayload.name,

            account_type:
              updatePayload.account_type,

            account_subtype:
              updatePayload.account_subtype,

            institution_name:
              updatePayload.institution_name,

            mask:
              updatePayload.mask,

            currency_code:
              updatePayload.currency_code,

            include_in_net_worth:
              updatePayload.include_in_net_worth,

            is_active:
              updatePayload.is_active,

            sort_order:
              updatePayload.sort_order,

            note:
              updatePayload.note,

            updated_at:
              updatePayload.updated_at,
          }
        : updatePayload;

    const {
      data:
        updatedData,
      error:
        updateError,
    } =
      await admin
        .from(
          "case_budget_accounts",
        )
        .update(
          finalUpdatePayload,
        )
        .eq(
          "id",
          accountId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "is_archived",
          false,
        )
        .eq(
          "updated_at",
          existing.updated_at,
        )
        .select(
          [
            "id",
            "workspace_id",
            "created_by_user_id",
            "updated_by_user_id",
            "name",
            "account_type",
            "account_subtype",
            "institution_name",
            "mask",
            "source",
            "provider",
            "provider_record_id",
            "provider_account_id",
            "current_balance",
            "available_balance",
            "credit_limit",
            "currency_code",
            "include_in_net_worth",
            "is_active",
            "is_archived",
            "archived_at",
            "archived_by_user_id",
            "sort_order",
            "note",
            "balance_last_synced_at",
            "provider_last_synced_at",
            "created_at",
            "updated_at",
          ].join(
            ",",
          ),
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[CASE Budget Accounts] Failed to update account.",
        {
          workspaceId,
          userId,
          accountId,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "account-update-failed",

        message:
          "CASE Budget could not update the account.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "account-update-conflict",

        message:
          "This account changed before your update completed. Refresh the account and try again.",
      });
    }

    const updatedRow =
      updatedData as unknown as
        CaseBudgetAccountDatabaseRow;

    const account =
      mapAccountRow(
        updatedRow,
      );

    if (
      !account
    ) {
      return failure({
        code:
          "account-update-failed",

        message:
          "CASE Budget updated the account but could not verify its details.",
      });
    }

    revalidateAccountPaths();

    return {
      success:
        true,

      status:
        "updated",

      account,

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
      "[CASE Budget Accounts] Unexpected account update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the account. Please try again.",
    });
  }
}

type NextAccountState = {
  name:
    string;

  accountType:
    CaseBudgetAccountTypeDatabaseEnum;

  accountSubtype:
    string | null;

  institutionName:
    string | null;

  mask:
    string | null;

  currentBalance:
    number;

  availableBalance:
    number | null;

  creditLimit:
    number | null;

  currencyCode:
    string;

  includeInNetWorth:
    boolean;

  isActive:
    boolean;

  sortOrder:
    number;

  note:
    string | null;
};

function validateAndBuildNextState({
  existing,
  updates,
  isProviderManaged,
}: {
  existing:
    CaseBudgetAccountDatabaseRow;

  updates:
    UpdateAccountData;

  isProviderManaged:
    boolean;
}):
  | {
      success:
        true;

      next:
        NextAccountState;
    }
  | {
      success:
        false;

      result:
        UpdateCaseBudgetAccountResult;
    } {
  const existingDomainType =
    databaseTypeToAccountType({
      accountType:
        existing.account_type,

      accountSubtype:
        existing.account_subtype,
    });

  const nextDomainType:
    AccountType =
    updates.type ??
    existingDomainType;

  const nextAccountType =
    accountTypeToDatabaseType(
      nextDomainType,
    );

  const nextAccountSubtype =
    accountTypeToSubtype(
      nextDomainType,
    );

  const expectedClassification =
    getDefaultAccountClassification(
      nextDomainType,
    );

  if (
    updates.classification !==
      undefined &&
    updates.classification !==
      expectedClassification
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-classification",

          message:
            `${formatAccountType(
              nextDomainType,
            )} accounts are currently classified as ${expectedClassification} accounts in CASE Budget.`,

          field:
            "classification",
        }),
    };
  }

  const name =
    updates.name ===
      undefined
      ? existing.name
      : normalizeOptionalText(
          updates.name,
        );

  if (
    !name ||
    name.length >
      NAME_MAX_LENGTH
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-name",

          message:
            `Account name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

          field:
            "name",
        }),
    };
  }

  const institutionName =
    updates.institution ===
      undefined
      ? existing.institution_name
      : normalizeOptionalText(
          updates.institution,
        );

  if (
    institutionName &&
    institutionName.length >
      INSTITUTION_MAX_LENGTH
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-institution",

          message:
            `Institution must be ${INSTITUTION_MAX_LENGTH} characters or fewer.`,

          field:
            "institution",
        }),
    };
  }

  let currentBalance =
    normalizeDatabaseMoney(
      existing.current_balance,
    );

  if (
    currentBalance ===
      null
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "account-update-failed",

          message:
            "CASE Budget could not verify the current account balance.",
        }),
    };
  }

  if (
    updates.balance !==
    undefined
  ) {
    if (
      isProviderManaged
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "provider-managed",

            message:
              "Connected account balances are managed by the financial provider and cannot be changed manually.",

            field:
              "balance",
          }),
      };
    }

    const normalizedBalance =
      normalizeMoney(
        updates.balance,
      );

    if (
      normalizedBalance ===
        null
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-balance",

          message:
              "Enter a valid account balance.",

          field:
              "balance",
          }),
      };
    }

    currentBalance =
      normalizedBalance;
  }

  let availableBalance =
    normalizeNullableDatabaseMoney(
      existing.available_balance,
    );

  if (
    updates.availableBalance !==
    undefined
  ) {
    if (
      isProviderManaged
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "provider-managed",

            message:
              "Connected account available balances are managed by the financial provider and cannot be changed manually.",

            field:
              "availableBalance",
          }),
      };
    }

    if (
      updates.availableBalance ===
      null
    ) {
      availableBalance =
        null;
    } else {
      const normalizedAvailableBalance =
        normalizeMoney(
          updates.availableBalance,
        );

      if (
        normalizedAvailableBalance ===
          null
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-available-balance",

              message:
                "Enter a valid available balance.",

              field:
                "availableBalance",
            }),
        };
      }

      availableBalance =
        normalizedAvailableBalance;
    }
  }

  let creditLimit =
    normalizeNullableDatabaseMoney(
      existing.credit_limit,
    );

  if (
    updates.creditLimit !==
    undefined
  ) {
    if (
      updates.creditLimit ===
      null
    ) {
      creditLimit =
        null;
    } else {
      const normalizedCreditLimit =
        normalizeNonNegativeMoney(
          updates.creditLimit,
        );

      if (
        normalizedCreditLimit ===
          null
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-credit-limit",

              message:
                "Credit limit must be zero or greater.",

              field:
                "creditLimit",
            }),
        };
      }

      creditLimit =
        normalizedCreditLimit;
    }
  }

  const currencyCode =
    updates.currency ===
      undefined
      ? normalizeCurrencyCode(
          existing.currency_code,
        )
      : normalizeCurrencyCode(
          updates.currency,
        );

  if (
    !currencyCode
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-currency",

          message:
            "Currency must be a valid three-letter currency code.",

          field:
            "currency",
        }),
    };
  }

  const mask =
    updates.mask ===
      undefined
      ? existing.mask
      : normalizeOptionalText(
          updates.mask,
        );

  if (
    mask &&
    mask.length >
      MASK_MAX_LENGTH
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-mask",

          message:
            `Account mask must be ${MASK_MAX_LENGTH} characters or fewer.`,

          field:
            "mask",
        }),
    };
  }

  const note =
    updates.note ===
      undefined
      ? existing.note
      : normalizeOptionalText(
          updates.note,
        );

  if (
    note &&
    note.length >
      NOTE_MAX_LENGTH
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-note",

          message:
            `Account note must be ${NOTE_MAX_LENGTH} characters or fewer.`,

          field:
            "note",
        }),
    };
  }

  const sortOrder =
    updates.sortOrder ===
      undefined
      ? normalizeDatabaseSortOrder(
          existing.sort_order,
        )
      : normalizeSortOrder(
          updates.sortOrder,
        );

  if (
    sortOrder ===
      null
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-sort-order",

          message:
            "Account sort order must be zero or greater.",

          field:
            "sortOrder",
        }),
    };
  }

  return {
    success:
      true,

    next: {
      name,

      accountType:
        nextAccountType,

      accountSubtype:
        nextAccountSubtype,

      institutionName,

      mask,

      currentBalance,

      availableBalance,

      creditLimit,

      currencyCode,

      includeInNetWorth:
        updates.isIncludedInNetWorth ??
        existing.include_in_net_worth,

      isActive:
        updates.isActive ??
        existing.is_active,

      sortOrder,

      note,
    },
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
      "[CASE Budget Accounts] Failed to load workspace during account update.",
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
        "Accounts cannot be updated while this workspace is inactive.",
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
      "[CASE Budget Accounts] Failed to verify membership during account update.",
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
        "You do not have active access to update accounts in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function hasMeaningfulChanges({
  existing,
  next,
}: {
  existing:
    CaseBudgetAccountDatabaseRow;

  next:
    NextAccountState;
}) {
  return (
    normalizeOptionalText(
      existing.name,
    ) !==
      next.name ||
    existing.account_type !==
      next.accountType ||
    normalizeOptionalText(
      existing.account_subtype,
    ) !==
      next.accountSubtype ||
    normalizeOptionalText(
      existing.institution_name,
    ) !==
      next.institutionName ||
    normalizeOptionalText(
      existing.mask,
    ) !==
      next.mask ||
    normalizeDatabaseMoney(
      existing.current_balance,
    ) !==
      next.currentBalance ||
    normalizeNullableDatabaseMoney(
      existing.available_balance,
    ) !==
      next.availableBalance ||
    normalizeNullableDatabaseMoney(
      existing.credit_limit,
    ) !==
      next.creditLimit ||
    normalizeCurrencyCode(
      existing.currency_code,
    ) !==
      next.currencyCode ||
    existing.include_in_net_worth !==
      next.includeInNetWorth ||
    existing.is_active !==
      next.isActive ||
    normalizeDatabaseSortOrder(
      existing.sort_order,
    ) !==
      next.sortOrder ||
    normalizeOptionalText(
      existing.note,
    ) !==
      next.note
  );
}

function mapAccountRow(
  row:
    CaseBudgetAccountDatabaseRow,
): AccountData | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const workspaceId =
    normalizeOptionalText(
      row.workspace_id,
    );

  const name =
    normalizeOptionalText(
      row.name,
    );

  const createdByUserId =
    normalizeOptionalText(
      row.created_by_user_id,
    );

  const updatedByUserId =
    normalizeOptionalText(
      row.updated_by_user_id,
    );

  const createdAt =
    normalizeIsoDate(
      row.created_at,
    );

  const updatedAt =
    normalizeIsoDate(
      row.updated_at,
    );

  if (
    !id ||
    !workspaceId ||
    !name ||
    !createdByUserId ||
    !updatedByUserId ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const type =
    databaseTypeToAccountType({
      accountType:
        row.account_type,

      accountSubtype:
        row.account_subtype,
    });

  const balance =
    normalizeDatabaseMoney(
      row.current_balance,
    );

  if (
    balance ===
      null
  ) {
    return null;
  }

  const availableBalance =
    normalizeNullableDatabaseMoney(
      row.available_balance,
    );

  const creditLimit =
    normalizeNullableDatabaseMoney(
      row.credit_limit,
    );

  const balanceLastSyncedAt =
    normalizeNullableIsoDate(
      row.balance_last_synced_at,
    );

  const providerLastSyncedAt =
    normalizeNullableIsoDate(
      row.provider_last_synced_at,
    );

  return {
    id,
    workspaceId,
    name,

    institution:
      normalizeOptionalText(
        row.institution_name,
      ) ??
      undefined,

    type,

    databaseType:
      row.account_type,

    subtype:
      normalizeOptionalText(
        row.account_subtype,
      ) ??
      undefined,

    classification:
      getDefaultAccountClassification(
        type,
      ),

    balance,

    ...(availableBalance !==
    null
      ? {
          availableBalance,
        }
      : {}),

    ...(creditLimit !==
    null
      ? {
          creditLimit,
        }
      : {}),

    currency:
      normalizeCurrencyCode(
        row.currency_code,
      ) ??
      "USD",

    mask:
      normalizeOptionalText(
        row.mask,
      ) ??
      undefined,

    isIncludedInNetWorth:
      row.include_in_net_worth,

    connectionStatus:
      getAccountConnectionStatus({
        source:
          row.source,

        provider:
          row.provider,

        providerRecordId:
          row.provider_record_id,

        isActive:
          row.is_active,
      }),

    source:
      row.source,

    provider:
      normalizeOptionalText(
        row.provider,
      ) ??
      undefined,

    providerRecordId:
      normalizeOptionalText(
        row.provider_record_id,
      ) ??
      undefined,

    providerAccountId:
      normalizeOptionalText(
        row.provider_account_id,
      ) ??
      undefined,

    isActive:
      row.is_active,

    isArchived:
      row.is_archived,

    archivedAt:
      normalizeNullableIsoDate(
        row.archived_at,
      ) ??
      undefined,

    note:
      normalizeOptionalText(
        row.note,
      ) ??
      undefined,

    sortOrder:
      normalizeDatabaseSortOrder(
        row.sort_order,
      ),

    balanceLastSyncedAt:
      balanceLastSyncedAt ??
      undefined,

    providerLastSyncedAt:
      providerLastSyncedAt ??
      undefined,

    lastSyncedAt:
      getLatestIsoDate(
        balanceLastSyncedAt,
        providerLastSyncedAt,
      ) ??
      undefined,

    createdByUserId,
    updatedByUserId,
    createdAt,
    updatedAt,
  };
}

function buildApprovalDescription({
  existing,
  next,
}: {
  existing:
    CaseBudgetAccountDatabaseRow;

  next:
    NextAccountState;
}) {
  const oldType =
    databaseTypeToAccountType({
      accountType:
        existing.account_type,

      accountSubtype:
        existing.account_subtype,
    });

  const newType =
    databaseTypeToAccountType({
      accountType:
        next.accountType,

      accountSubtype:
        next.accountSubtype,
    });

  const changes:
    string[] = [];

  if (
    existing.name !==
    next.name
  ) {
    changes.push(
      `name to "${next.name}"`,
    );
  }

  if (
    oldType !==
    newType
  ) {
    changes.push(
      `type to ${formatAccountType(
        newType,
      )}`,
    );
  }

  if (
    normalizeDatabaseMoney(
      existing.current_balance,
    ) !==
    next.currentBalance
  ) {
    changes.push(
      `balance to ${formatCurrency({
        amount:
          Math.abs(
            next.currentBalance,
          ),
        currency:
          next.currencyCode,
      })}`,
    );
  }

  if (
    existing.include_in_net_worth !==
    next.includeInNetWorth
  ) {
    changes.push(
      next.includeInNetWorth
        ? "include in net worth"
        : "exclude from net worth",
    );
  }

  if (
    existing.is_active !==
    next.isActive
  ) {
    changes.push(
      next.isActive
        ? "mark active"
        : "mark inactive",
    );
  }

  if (
    changes.length ===
    0
  ) {
    return `Update account "${next.name}".`;
  }

  return `Update account "${existing.name}": ${changes.join(
    ", ",
  )}.`;
}

function formatAccountType(
  type:
    AccountType,
) {
  return type
    .split(
      "-",
    )
    .map(
      (
        part,
      ) =>
        `${part
          .charAt(
            0,
          )
          .toUpperCase()}${part.slice(
          1,
        )}`,
    )
    .join(
      " ",
    );
}

function formatCurrency({
  amount,
  currency,
}: {
  amount:
    number;

  currency:
    string;
}) {
  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style:
          "currency",

        currency,
      },
    ).format(
      amount,
    );
  } catch {
    return `${amount.toFixed(
      2,
    )} ${currency}`;
  }
}

function normalizeMoney(
  value:
    unknown,
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return roundCurrency(
    value,
  );
}

function normalizeNonNegativeMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeMoney(
      value,
    );

  if (
    normalized ===
      null ||
    normalized <
      0
  ) {
    return null;
  }

  return normalized;
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
      ? roundCurrency(
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
      ? roundCurrency(
          parsed,
        )
      : null;
  }

  return null;
}

function normalizeNullableDatabaseMoney(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeDatabaseMoney(
    value,
  );
}

function normalizeCurrencyCode(
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
    value
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z]{3}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}

function normalizeSortOrder(
  value:
    unknown,
): number | null {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    ) ||
    value <
      0
  ) {
    return null;
  }

  return Math.trunc(
    value,
  );
}

function normalizeDatabaseSortOrder(
  value:
    unknown,
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(
      value,
    ),
  );
}

function normalizeIsoDate(
  value:
    unknown,
): string | null {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized
  ) {
    return null;
  }

  const parsed =
    Date.parse(
      normalized,
    );

  if (
    Number.isNaN(
      parsed,
    )
  ) {
    return null;
  }

  return new Date(
    parsed,
  ).toISOString();
}

function normalizeNullableIsoDate(
  value:
    unknown,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeIsoDate(
    value,
  );
}

function getLatestIsoDate(
  ...values:
    Array<
      string | null
    >
) {
  let latest:
    string | null =
    null;

  let latestTimestamp =
    Number.NEGATIVE_INFINITY;

  for (
    const value of
      values
  ) {
    if (
      !value
    ) {
      continue;
    }

    const timestamp =
      Date.parse(
        value,
      );

    if (
      Number.isNaN(
        timestamp,
      )
    ) {
      continue;
    }

    if (
      timestamp >
      latestTimestamp
    ) {
      latest =
        value;

      latestTimestamp =
        timestamp;
    }
  }

  return latest;
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

function roundCurrency(
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

function revalidateAccountPaths() {
  revalidatePath(
    ACCOUNTS_PATH,
  );

  revalidatePath(
    DASHBOARD_PATH,
  );

  revalidatePath(
    TRANSACTIONS_PATH,
  );

  revalidatePath(
    HOUSEHOLD_APPROVALS_PATH,
  );
}

function failure({
  code,
  message,
  field,
}: {
  code:
    Extract<
      UpdateCaseBudgetAccountResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      UpdateCaseBudgetAccountResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): UpdateCaseBudgetAccountResult {
  return {
    success:
      false,

    status:
      "error",

    account:
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
