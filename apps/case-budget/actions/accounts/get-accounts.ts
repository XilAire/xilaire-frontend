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
  CaseBudgetAccountDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  databaseTypeToAccountType,
  getAccountConnectionStatus,
  getDefaultAccountClassification,
  type AccountData,
  type AccountSummary,
} from "@/types/account";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
  is_active: boolean;
};

type MembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRoleDatabaseEnum;
  status: WorkspaceMembershipStatusDatabaseEnum;
};

export type GetCaseBudgetAccountsResult =
  | {
      success: true;
      accounts: AccountData[];
      summary: AccountSummary;
      error: null;
    }
  | {
      success: false;
      accounts: [];
      summary: AccountSummary;
      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "feature-not-available"
          | "account-load-failed"
          | "unexpected-error";
        message: string;
      };
    };

const EMPTY_SUMMARY: AccountSummary = {
  totalAssets: 0,
  totalLiabilities: 0,
  netWorth: 0,
  activeAccountCount: 0,
  archivedAccountCount: 0,
  connectedAccountCount: 0,
  manualAccountCount: 0,
  includedInNetWorthCount: 0,
  totalCount: 0,
};

/**
 * Loads canonical CASE Budget accounts for the currently active workspace.
 *
 * Production rules:
 *
 * - The active workspace is resolved from trusted server-side auth state.
 * - The browser never supplies workspace_id.
 * - The caller must have an active membership in the workspace.
 * - Supabase is the source of truth.
 * - Archived and inactive accounts are still returned so the UI can make
 *   explicit filtering decisions instead of silently losing historical data.
 * - No localStorage is involved.
 */
export async function getAccounts(): Promise<GetCaseBudgetAccountsResult> {
  try {
    const {
      userId,
      workspaceId,
    } = await requireCaseBudgetServerAuth();

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

    if (!workspaceResult.success) {
      return failure({
        code: workspaceResult.code,
        message: workspaceResult.message,
      });
    }

    const membershipResult =
      await loadMembership({
        workspaceId,
        userId,
      });

    if (!membershipResult.success) {
      return failure({
        code: "permission-denied",
        message: membershipResult.message,
      });
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
          "workspace_id",
          workspaceId,
        )
        .order(
          "is_archived",
          {
            ascending: true,
          },
        )
        .order(
          "sort_order",
          {
            ascending: true,
          },
        )
        .order(
          "name",
          {
            ascending: true,
          },
        );

    if (error) {
      console.error(
        "[CASE Budget Accounts] Failed to load accounts.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return failure({
        code: "account-load-failed",
        message:
          "CASE Budget could not load accounts for this workspace.",
      });
    }

    const rows =
      (
        data ??
        []
      ) as unknown as CaseBudgetAccountDatabaseRow[];

    const accounts =
      rows
        .map(
          mapAccountRow,
        )
        .filter(
          (
            account,
          ): account is AccountData =>
            account !==
            null,
        );

    return {
      success: true,
      accounts,
      summary:
        buildAccountSummary(
          accounts,
        ),
      error: null,
    };
  } catch (error) {
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
      "[CASE Budget Accounts] Unexpected account-loading error.",
      error,
    );

    return failure({
      code: "unexpected-error",
      message:
        "CASE Budget could not load accounts. Please try again.",
    });
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId: string;
}): Promise<
  | {
      success: true;
      workspace: WorkspaceRow;
    }
  | {
      success: false;
      code:
        | "workspace-not-found"
        | "workspace-inactive";
      message: string;
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

  if (error) {
    console.error(
      "[CASE Budget Accounts] Failed to load active workspace.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success: false,
      code: "workspace-not-found",
      message:
        "CASE Budget could not load the active workspace.",
    };
  }

  const workspace =
    data as unknown as
      | WorkspaceRow
      | null;

  if (!workspace) {
    return {
      success: false,
      code: "workspace-not-found",
      message:
        "The active CASE Budget workspace could not be found.",
    };
  }

  if (
    !workspace.is_active
  ) {
    return {
      success: false,
      code: "workspace-inactive",
      message:
        "Accounts are unavailable because this workspace is inactive.",
    };
  }

  return {
    success: true,
    workspace,
  };
}

async function loadMembership({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<
  | {
      success: true;
      membership: MembershipRow;
    }
  | {
      success: false;
      message: string;
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

  if (error) {
    console.error(
      "[CASE Budget Accounts] Failed to verify workspace membership.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success: false,
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
      success: false,
      message:
        "You do not have active access to accounts in this workspace.",
    };
  }

  return {
    success: true,
    membership,
  };
}

function mapAccountRow(
  row: CaseBudgetAccountDatabaseRow,
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

  const currentBalance =
    normalizeDatabaseAmount(
      row.current_balance,
    );

  if (
    currentBalance ===
    null
  ) {
    return null;
  }

  const availableBalance =
    normalizeNullableDatabaseAmount(
      row.available_balance,
    );

  const creditLimit =
    normalizeNullableDatabaseAmount(
      row.credit_limit,
    );

  const currencyCode =
    normalizeOptionalText(
      row.currency_code,
    ) ??
    "USD";

  const connectionStatus =
    getAccountConnectionStatus({
      source:
        row.source,

      provider:
        row.provider,

      providerRecordId:
        row.provider_record_id,

      isActive:
        row.is_active,
    });

  const balanceLastSyncedAt =
    normalizeNullableIsoDate(
      row.balance_last_synced_at,
    );

  const providerLastSyncedAt =
    normalizeNullableIsoDate(
      row.provider_last_synced_at,
    );

  const lastSyncedAt =
    getLatestIsoDate(
      balanceLastSyncedAt,
      providerLastSyncedAt,
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

    balance:
      currentBalance,

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
      currencyCode,

    mask:
      normalizeOptionalText(
        row.mask,
      ) ??
      undefined,

    isIncludedInNetWorth:
      row.include_in_net_worth,

    connectionStatus,

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
      normalizeSortOrder(
        row.sort_order,
      ),

    balanceLastSyncedAt:
      balanceLastSyncedAt ??
      undefined,

    providerLastSyncedAt:
      providerLastSyncedAt ??
      undefined,

    lastSyncedAt:
      lastSyncedAt ??
      undefined,

    createdByUserId,
    updatedByUserId,
    createdAt,
    updatedAt,
  };
}

function buildAccountSummary(
  accounts: AccountData[],
): AccountSummary {
  let totalAssets =
    0;

  let totalLiabilities =
    0;

  let activeAccountCount =
    0;

  let archivedAccountCount =
    0;

  let connectedAccountCount =
    0;

  let manualAccountCount =
    0;

  let includedInNetWorthCount =
    0;

  for (
    const account of
      accounts
  ) {
    if (
      account.isActive &&
      !account.isArchived
    ) {
      activeAccountCount +=
        1;
    }

    if (
      account.isArchived
    ) {
      archivedAccountCount +=
        1;
    }

    if (
      account.connectionStatus ===
      "connected"
    ) {
      connectedAccountCount +=
        1;
    }

    if (
      account.source ===
      "manual"
    ) {
      manualAccountCount +=
        1;
    }

    if (
      !account.isIncludedInNetWorth ||
      account.isArchived
    ) {
      continue;
    }

    includedInNetWorthCount +=
      1;

    if (
      account.classification ===
      "liability"
    ) {
      totalLiabilities +=
        Math.abs(
          account.balance,
        );
    } else {
      totalAssets +=
        Math.abs(
          account.balance,
        );
    }
  }

  totalAssets =
    roundCurrency(
      totalAssets,
    );

  totalLiabilities =
    roundCurrency(
      totalLiabilities,
    );

  return {
    totalAssets,
    totalLiabilities,

    netWorth:
      roundCurrency(
        totalAssets -
        totalLiabilities,
      ),

    activeAccountCount,
    archivedAccountCount,
    connectedAccountCount,
    manualAccountCount,
    includedInNetWorthCount,

    totalCount:
      accounts.length,
  };
}

function normalizeDatabaseAmount(
  value: unknown,
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

    if (!normalized) {
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

function normalizeNullableDatabaseAmount(
  value: unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeDatabaseAmount(
    value,
  );
}

function normalizeSortOrder(
  value: unknown,
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
    if (!value) {
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

function normalizeIsoDate(
  value: unknown,
): string | null {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (!normalized) {
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
  value: unknown,
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

function normalizeOptionalText(
  value: unknown,
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
  value: number,
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
}: {
  code:
    Extract<
      GetCaseBudgetAccountsResult,
      {
        success: false;
      }
    >["error"]["code"];

  message: string;
}): GetCaseBudgetAccountsResult {
  return {
    success: false,
    accounts: [],
    summary: {
      ...EMPTY_SUMMARY,
    },
    error: {
      code,
      message,
    },
  };
}