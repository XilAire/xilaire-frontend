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
  type CreateAccountData,
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

export type CreateCaseBudgetAccountResult =
  | {
      success:
        true;

      status:
        "created";

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
          | "approval-check-failed"
          | "account-create-failed"
          | "unexpected-error";

        message:
          string;

        field?:
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
          | "sortOrder";
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
 * Creates one canonical manual CASE Budget account.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server-side auth state.
 * - The browser never supplies workspace_id or audit user IDs.
 * - The caller must be an active Owner/Admin/Member.
 * - Viewer is read-only.
 * - Manual account creation stores source = "manual".
 * - Rich UI account types are persisted through account_type +
 *   account_subtype.
 * - Household account-change approval enforcement runs before insert.
 * - If approval is required, NO account row is created.
 * - Supabase is the source of truth.
 * - No localStorage is involved.
 */
export async function createAccount(
  input:
    CreateAccountData,
): Promise<CreateCaseBudgetAccountResult> {
  try {
    const name =
      normalizeOptionalText(
        input.name,
      );

    if (
      !name ||
      name.length >
        NAME_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-name",

        message:
          `Account name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

        field:
          "name",
      });
    }

    const institution =
      normalizeOptionalText(
        input.institution,
      );

    if (
      institution &&
      institution.length >
        INSTITUTION_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-institution",

        message:
          `Institution must be ${INSTITUTION_MAX_LENGTH} characters or fewer.`,

        field:
          "institution",
      });
    }

    const databaseType =
      accountTypeToDatabaseType(
        input.type,
      );

    const subtype =
      accountTypeToSubtype(
        input.type,
      );

    const expectedClassification =
      getDefaultAccountClassification(
        input.type,
      );

    /**
     * The current case_budget_accounts schema does not persist a separate
     * classification column. Classification is derived from account type.
     *
     * Reject a conflicting value instead of silently storing data that will
     * come back differently after reload.
     */
    if (
      input.classification !==
      expectedClassification
    ) {
      return failure({
        code:
          "invalid-classification",

        message:
          `${formatAccountType(
            input.type,
          )} accounts are currently classified as ${expectedClassification} accounts in CASE Budget.`,

        field:
          "classification",
      });
    }

    const balance =
      normalizeMoney(
        input.balance,
      );

    if (
      balance ===
      null
    ) {
      return failure({
        code:
          "invalid-balance",

        message:
          "Enter a valid account balance.",

        field:
          "balance",
      });
    }

    const availableBalance =
      input.availableBalance ===
        undefined
        ? null
        : normalizeMoney(
            input.availableBalance,
          );

    if (
      input.availableBalance !==
        undefined &&
      availableBalance ===
        null
    ) {
      return failure({
        code:
          "invalid-available-balance",

        message:
          "Enter a valid available balance.",

        field:
          "availableBalance",
      });
    }

    const creditLimit =
      input.creditLimit ===
        undefined
        ? null
        : normalizeNonNegativeMoney(
            input.creditLimit,
          );

    if (
      input.creditLimit !==
        undefined &&
      creditLimit ===
        null
    ) {
      return failure({
        code:
          "invalid-credit-limit",

        message:
          "Credit limit must be zero or greater.",

        field:
          "creditLimit",
      });
    }

    const currency =
      normalizeCurrencyCode(
        input.currency,
      );

    if (
      !currency
    ) {
      return failure({
        code:
          "invalid-currency",

        message:
          "Currency must be a valid three-letter currency code.",

        field:
          "currency",
      });
    }

    const mask =
      normalizeOptionalText(
        input.mask,
      );

    if (
      mask &&
      (
        mask.length >
          MASK_MAX_LENGTH ||
        mask.length <
          1
      )
    ) {
      return failure({
        code:
          "invalid-mask",

        message:
          `Account mask must be ${MASK_MAX_LENGTH} characters or fewer.`,

        field:
          "mask",
      });
    }

    const note =
      normalizeOptionalText(
        input.note,
      );

    if (
      note &&
      note.length >
        NOTE_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-note",

        message:
          `Account note must be ${NOTE_MAX_LENGTH} characters or fewer.`,

        field:
          "note",
      });
    }

    const sortOrder =
      normalizeSortOrder(
        input.sortOrder,
      );

    if (
      sortOrder ===
      null
    ) {
      return failure({
        code:
          "invalid-sort-order",

        message:
          "Account sort order must be zero or greater.",

        field:
          "sortOrder",
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
          "View-only members cannot create accounts.",
      });
    }

    const accountId =
      crypto.randomUUID();

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "account",

        title:
          `Create account: ${name}`,

        description:
          buildApprovalDescription({
            name,
            type:
              input.type,
            institution,
            classification:
              expectedClassification,
            balance,
            currency,
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
            "create",

          accountId,

          account: {
            name,
            institution,
            type:
              input.type,
            databaseType,
            subtype,
            classification:
              expectedClassification,
            balance,
            availableBalance,
            creditLimit,
            currency,
            mask,
            includeInNetWorth:
              input.isIncludedInNetWorth ??
              true,
            note,
            sortOrder,
            source:
              "manual",
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Accounts] Approval enforcement failed during account creation.",
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

    const admin =
      createWorkspaceAdminClient();

    const now =
      new Date().toISOString();

    const {
      data,
      error,
    } =
      await admin
        .from(
          "case_budget_accounts",
        )
        .insert({
          id:
            accountId,

          workspace_id:
            workspaceId,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          name,

          account_type:
            databaseType,

          account_subtype:
            subtype,

          institution_name:
            institution,

          mask,

          source:
            "manual",

          provider:
            null,

          provider_record_id:
            null,

          provider_account_id:
            null,

          current_balance:
            balance,

          available_balance:
            availableBalance,

          credit_limit:
            creditLimit,

          currency_code:
            currency,

          include_in_net_worth:
            input.isIncludedInNetWorth ??
            true,

          is_active:
            true,

          is_archived:
            false,

          archived_at:
            null,

          archived_by_user_id:
            null,

          sort_order:
            sortOrder,

          note,

          balance_last_synced_at:
            null,

          provider_last_synced_at:
            null,

          created_at:
            now,

          updated_at:
            now,
        })
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
      error
    ) {
      console.error(
        "[CASE Budget Accounts] Failed to create account.",
        {
          workspaceId,
          userId,
          accountId,
          error,
        },
      );

      return failure({
        code:
          "account-create-failed",

        message:
          "CASE Budget could not create the account.",
      });
    }

    if (
      !data
    ) {
      return failure({
        code:
          "account-create-failed",

        message:
          "CASE Budget saved the account but could not verify the new record.",
      });
    }

    const row =
      data as unknown as
        CaseBudgetAccountDatabaseRow;

    const account =
      mapAccountRow(
        row,
      );

    if (
      !account
    ) {
      console.error(
        "[CASE Budget Accounts] Created account could not be mapped.",
        {
          workspaceId,
          userId,
          accountId,
        },
      );

      return failure({
        code:
          "account-create-failed",

        message:
          "CASE Budget saved the account but could not verify its details.",
      });
    }

    revalidateAccountPaths();

    return {
      success:
        true,

      status:
        "created",

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
      "[CASE Budget Accounts] Unexpected account creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the account. Please try again.",
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
      "[CASE Budget Accounts] Failed to load workspace during account creation.",
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
        "Accounts cannot be created while this workspace is inactive.",
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
      "[CASE Budget Accounts] Failed to verify membership during account creation.",
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
        "You do not have active access to create accounts in this workspace.",
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

  const classification =
    getDefaultAccountClassification(
      type,
    );

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

    classification,

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
  name,
  type,
  institution,
  classification,
  balance,
  currency,
}: {
  name:
    string;

  type:
    CreateAccountData["type"];

  institution:
    string | null;

  classification:
    CreateAccountData["classification"];

  balance:
    number;

  currency:
    string;
}) {
  const institutionText =
    institution
      ? ` at ${institution}`
      : "";

  return `Create ${classification} account "${name}"${institutionText} as ${formatAccountType(
    type,
  )} with an opening balance of ${formatCurrency({
    amount:
      Math.abs(
        balance,
      ),
    currency,
  })}.`;
}

function formatAccountType(
  type:
    CreateAccountData["type"],
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
    value ===
      undefined ||
    value ===
      null
  ) {
    return "USD";
  }

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
    value ===
      undefined ||
    value ===
      null
  ) {
    return 0;
  }

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
      CreateCaseBudgetAccountResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CreateCaseBudgetAccountResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CreateCaseBudgetAccountResult {
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
