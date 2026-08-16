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
  databaseTypeToAccountType,
  getAccountConnectionStatus,
  getDefaultAccountClassification,
  type AccountData,
  type ArchiveAccountInput,
} from "@/types/account";

import type {
  CaseBudgetAccountDatabaseRow,
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

export type ArchiveCaseBudgetAccountResult =
  | {
      success:
        true;

      status:
        "archived" |
        "restored";

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
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "feature-not-available"
          | "account-not-found"
          | "approval-check-failed"
          | "archive-conflict"
          | "archive-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          "accountId";
      };
    };

const ACCOUNTS_PATH =
  "/dashboard/accounts";

const DASHBOARD_PATH =
  "/dashboard";

const TRANSACTIONS_PATH =
  "/dashboard/transactions";

const BUDGET_PATH =
  "/dashboard/budget";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

/**
 * Archives or restores one canonical CASE Budget account.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server-side auth state.
 * - The browser never supplies workspace_id or audit user IDs.
 * - The caller must have an active Owner/Admin/Member membership.
 * - Viewer is read-only.
 * - Archival is a soft state transition; the account row remains in
 *   Supabase so transactions, reports, and financial history remain intact.
 * - Archiving also marks the account inactive.
 * - Restoring an account marks it active again.
 * - Household account-change approval enforcement runs before the state
 *   transition.
 * - If approval is required, the account remains unchanged.
 * - The mutation is guarded by updated_at optimistic concurrency.
 * - No localStorage is involved.
 */
export async function archiveAccount(
  input:
    ArchiveAccountInput,
): Promise<ArchiveCaseBudgetAccountResult> {
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

    const shouldArchive =
      input.archived ??
      true;

    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "manual-accounts",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure({
        code:
          "feature-not-available",

        message:
          getManualAccountFeatureAccessMessage({
            reason:
              featureAccess.access.reason,

            requiredPlan:
              featureAccess.access.requiredPlan,
          }),
      });
    }

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
          "View-only members cannot archive or restore accounts.",
      });
    }

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        accountData,
      error:
        accountError,
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
      accountError
    ) {
      console.error(
        "[CASE Budget Accounts] Failed to load account for archival.",
        {
          workspaceId,
          userId,
          accountId,
          error:
            accountError,
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
      accountData as unknown as
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

    /*
     * Idempotent behavior.
     *
     * If the account is already in the requested archival state, simply
     * return the current canonical record.
     */
    if (
      existing.is_archived ===
      shouldArchive
    ) {
      const mapped =
        mapAccountRow(
          existing,
        );

      if (
        !mapped
      ) {
        return failure({
          code:
            "archive-failed",

          message:
            "CASE Budget could not verify the current account state.",
        });
      }

      return {
        success:
          true,

        status:
          shouldArchive
            ? "archived"
            : "restored",

        account:
          mapped,

        approvalRequired:
          false,

        approval:
          null,

        error:
          null,
      };
    }

    const balance =
      normalizeDatabaseMoney(
        existing.current_balance,
      );

    if (
      balance ===
      null
    ) {
      return failure({
        code:
          "archive-failed",

        message:
          "CASE Budget could not verify the account balance before changing its archival state.",
      });
    }

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "account",

        title:
          shouldArchive
            ? `Archive account: ${existing.name}`
            : `Restore account: ${existing.name}`,

        description:
          buildApprovalDescription({
            account:
              existing,

            shouldArchive,
          }),

        amount:
          Math.abs(
            balance,
          ),

        target: {
          entityType:
            "account",

          entityId:
            accountId,
        },

        payload: {
          operation:
            shouldArchive
              ? "archive"
              : "restore",

          accountId,

          accountSnapshot: {
            name:
              existing.name,

            accountType:
              existing.account_type,

            accountSubtype:
              existing.account_subtype,

            institution:
              existing.institution_name,

            source:
              existing.source,

            currentBalance:
              balance,

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

            isArchived:
              existing.is_archived,

            archivedAt:
              existing.archived_at,

            updatedAt:
              existing.updated_at,
          },

          requested: {
            isArchived:
              shouldArchive,

            isActive:
              !shouldArchive,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Accounts] Approval enforcement failed during account archival.",
        {
          workspaceId,
          userId,
          accountId,
          shouldArchive,
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

    const nextArchivedAt =
      shouldArchive
        ? now
        : null;

    const nextArchivedByUserId =
      shouldArchive
        ? userId
        : null;

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
        .update({
          updated_by_user_id:
            userId,

          is_active:
            !shouldArchive,

          is_archived:
            shouldArchive,

          archived_at:
            nextArchivedAt,

          archived_by_user_id:
            nextArchivedByUserId,

          updated_at:
            now,
        })
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
          existing.is_archived,
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
        "[CASE Budget Accounts] Failed to change account archival state.",
        {
          workspaceId,
          userId,
          accountId,
          shouldArchive,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "archive-failed",

        message:
          shouldArchive
            ? "CASE Budget could not archive the account."
            : "CASE Budget could not restore the account.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "archive-conflict",

        message:
          "This account changed before the archival update completed. Refresh the account list and try again.",
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
          "archive-failed",

        message:
          shouldArchive
            ? "CASE Budget archived the account but could not verify its updated state."
            : "CASE Budget restored the account but could not verify its updated state.",
      });
    }

    revalidateAccountPaths();

    return {
      success:
        true,

      status:
        shouldArchive
          ? "archived"
          : "restored",

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
      "[CASE Budget Accounts] Unexpected account archival error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not change the account archival state. Please try again.",
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
      "[CASE Budget Accounts] Failed to load workspace during account archival.",
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
        "Account archival changes are unavailable while this workspace is inactive.",
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
      "[CASE Budget Accounts] Failed to verify membership during account archival.",
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
        "You do not have active access to change account archival state in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
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
  account,
  shouldArchive,
}: {
  account:
    CaseBudgetAccountDatabaseRow;

  shouldArchive:
    boolean;
}) {
  const type =
    databaseTypeToAccountType({
      accountType:
        account.account_type,

      accountSubtype:
        account.account_subtype,
    });

  const institution =
    normalizeOptionalText(
      account.institution_name,
    );

  const institutionText =
    institution
      ? ` at ${institution}`
      : "";

  const action =
    shouldArchive
      ? "Archive"
      : "Restore";

  return `${action} ${formatAccountType(
    type,
  )} account "${account.name}"${institutionText}. Historical transactions and financial records will remain preserved.`;
}

function formatAccountType(
  type:
    AccountData["type"],
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
    BUDGET_PATH,
  );

  revalidatePath(
    HOUSEHOLD_APPROVALS_PATH,
  );
}

function getManualAccountFeatureAccessMessage({
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
      return "Manual accounts are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Manual accounts require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Manual accounts require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Manual accounts require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Manual accounts require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Manual accounts are not available for the current workspace subscription.";
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
      ArchiveCaseBudgetAccountResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      ArchiveCaseBudgetAccountResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): ArchiveCaseBudgetAccountResult {
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
