"use server";

import {
  getAccounts,
} from "@/actions/accounts/get-accounts";

import {
  getTransactions,
  type CaseBudgetTransactionRecord,
} from "@/actions/transactions/get-transactions";

import {
  loadNetWorthSnapshotsAction,
} from "@/app/(app)/dashboard/net-worth/actions";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  buildReportSummary,
  getPreviousDateRange,
  resolveReportDateRange,
  type ReportDateRange,
  type ReportPeriodPreset,
  type ReportSummary,
} from "@/lib/reports/reports-service";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  TransactionData,
} from "@/types/transaction";

export type ReportNetWorthHistoryPoint = {
  id:
    string;

  date:
    string;

  totalAssets:
    number;

  totalLiabilities:
    number;

  netWorth:
    number;
};

export type GetReportsInput = {
  periodPreset?:
    ReportPeriodPreset;

  customDateRange?:
    ReportDateRange | null;
};

export type GetReportsResult =
  | {
      success:
        true;

      workspaceId:
        string;

      workspaceName:
        string;

      periodPreset:
        ReportPeriodPreset;

      dateRange:
        ReportDateRange;

      previousDateRange:
        ReportDateRange;

      report:
        ReportSummary;

      previousReport:
        ReportSummary;

      netWorthHistory:
        ReportNetWorthHistoryPoint[];

      error:
        null;
    }
  | {
      success:
        false;

      workspaceId:
        string | null;

      workspaceName:
        string | null;

      periodPreset:
        ReportPeriodPreset;

      dateRange:
        ReportDateRange;

      previousDateRange:
        ReportDateRange;

      report:
        null;

      previousReport:
        null;

      netWorthHistory:
        [];

      error: {
        code:
          | "workspace-not-found"
          | "permission-denied"
          | "reports-unavailable"
          | "report-load-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const DEFAULT_PERIOD_PRESET:
  ReportPeriodPreset =
  "this-month";

/**
 * Loads the complete canonical Reports dataset for the authenticated
 * CASE Budget workspace.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server authentication.
 * - the browser never supplies workspaceId.
 * - the Reports plan entitlement is enforced before report data is loaded.
 * - accounts and transactions are loaded from their canonical server actions.
 * - net-worth history is loaded from the existing server-side snapshot flow.
 * - report calculations are performed from canonical server-returned data.
 * - Supabase remains the persistent source of truth.
 * - no localStorage or sessionStorage is used.
 */
export async function getReports({
  periodPreset =
    DEFAULT_PERIOD_PRESET,
  customDateRange =
    null,
}: GetReportsInput = {}): Promise<GetReportsResult> {
  const normalizedPeriodPreset =
    normalizeReportPeriodPreset(
      periodPreset,
    );

  const dateRange =
    resolveRequestedDateRange({
      periodPreset:
        normalizedPeriodPreset,

      customDateRange,
    });

  const previousDateRange =
    getPreviousDateRange(
      dateRange,
    );

  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "reports",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure({
        workspaceId,
        periodPreset:
          normalizedPeriodPreset,
        dateRange,
        previousDateRange,

        code:
          "reports-unavailable",

        message:
          getReportsFeatureAccessMessage({
            reason:
              featureAccess.access.reason,

            requiredPlan:
              featureAccess.access.requiredPlan,
          }),
      });
    }

    const workspaceName =
      await loadWorkspaceName({
        workspaceId,
        userId,
      });

    const [
      accountsResult,
      transactionsResult,
      netWorthResult,
    ] =
      await Promise.all([
        getAccounts(),
        getTransactions(),
        loadNetWorthSnapshotsAction(
          workspaceId,
        ),
      ]);

    if (
      !accountsResult.success
    ) {
      console.error(
        "[CASE Budget Reports] Failed to load accounts.",
        {
          workspaceId,
          userId,
          error:
            accountsResult.error,
        },
      );

      return failure({
        workspaceId,
        workspaceName,
        periodPreset:
          normalizedPeriodPreset,
        dateRange,
        previousDateRange,

        code:
          mapDependencyErrorCode(
            accountsResult.error.code,
          ),

        message:
          accountsResult.error.message,
      });
    }

    if (
      !transactionsResult.success
    ) {
      console.error(
        "[CASE Budget Reports] Failed to load transactions.",
        {
          workspaceId,
          userId,
          error:
            transactionsResult.error,
        },
      );

      return failure({
        workspaceId,
        workspaceName,
        periodPreset:
          normalizedPeriodPreset,
        dateRange,
        previousDateRange,

        code:
          mapDependencyErrorCode(
            transactionsResult.error.code,
          ),

        message:
          transactionsResult.error.message,
      });
    }

    const transactions =
      transactionsResult
        .transactions
        .map(
          mapServerTransaction,
        )
        .filter(
          (
            transaction,
          ): transaction is TransactionData =>
            transaction !==
            null,
        );

    const report =
      buildReportSummary({
        transactions,

        accounts:
          accountsResult.accounts,

        dateRange,
      });

    const previousReport =
      buildReportSummary({
        transactions,

        accounts:
          accountsResult.accounts,

        dateRange:
          previousDateRange,
      });

    const netWorthHistory =
      netWorthResult.success
        ? netWorthResult.snapshots
            .map(
              mapNetWorthSnapshot,
            )
            .filter(
              (
                snapshot,
              ): snapshot is ReportNetWorthHistoryPoint =>
                snapshot !==
                null,
            )
            .sort(
              (
                firstPoint,
                secondPoint,
              ) =>
                firstPoint.date.localeCompare(
                  secondPoint.date,
                ),
            )
        : [];

    if (
      !netWorthResult.success
    ) {
      /*
       * Reports can still render current account-based net worth if historical
       * snapshots are unavailable. The failure is logged rather than turning
       * the entire Reports page into an error state.
       */
      console.error(
        "[CASE Budget Reports] Failed to load net-worth history.",
        {
          workspaceId,
          userId,
          error:
            netWorthResult.error,
        },
      );
    }

    return {
      success:
        true,

      workspaceId,

      workspaceName,

      periodPreset:
        normalizedPeriodPreset,

      dateRange,

      previousDateRange,

      report,

      previousReport,

      netWorthHistory,

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
        workspaceId:
          null,

        periodPreset:
          normalizedPeriodPreset,

        dateRange,

        previousDateRange,

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
      "[CASE Budget Reports] Unexpected report loading error.",
      error,
    );

    return failure({
      workspaceId:
        null,

      periodPreset:
        normalizedPeriodPreset,

      dateRange,

      previousDateRange,

      code:
        "unexpected-error",

      message:
        "CASE Budget could not load Reports. Please try again.",
    });
  }
}

function resolveRequestedDateRange({
  periodPreset,
  customDateRange,
}: {
  periodPreset:
    ReportPeriodPreset;

  customDateRange:
    ReportDateRange | null;
}) {
  if (
    periodPreset ===
      "custom" &&
    customDateRange
  ) {
    return resolveReportDateRange({
      preset:
        "custom",

      customStartDate:
        customDateRange.startDate,

      customEndDate:
        customDateRange.endDate,
    });
  }

  if (
    periodPreset ===
    "custom"
  ) {
    return resolveReportDateRange({
      preset:
        DEFAULT_PERIOD_PRESET,
    });
  }

  return resolveReportDateRange({
    preset:
      periodPreset,
  });
}

function normalizeReportPeriodPreset(
  value:
    unknown,
): ReportPeriodPreset {
  switch (
    value
  ) {
    case "this-month":
    case "last-month":
    case "year-to-date":
    case "last-30-days":
    case "last-90-days":
    case "custom":
      return value;

    default:
      return DEFAULT_PERIOD_PRESET;
  }
}

async function loadWorkspaceName({
  workspaceId,
  userId,
}: {
  workspaceId:
    string;

  userId:
    string;
}) {
  try {
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
          "id,name",
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
        "[CASE Budget Reports] Failed to load workspace name.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return "Current Workspace";
    }

    const name =
      normalizeOptionalText(
        data?.name,
      );

    return (
      name ??
      "Current Workspace"
    );
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Reports] Unexpected workspace-name loading error.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return "Current Workspace";
  }
}

function mapServerTransaction(
  transaction:
    CaseBudgetTransactionRecord,
): TransactionData | null {
  const accountId =
    normalizeOptionalText(
      transaction.account?.id,
    );

  const accountName =
    normalizeOptionalText(
      transaction.account?.name,
    );

  if (
    !accountId ||
    !accountName
  ) {
    console.error(
      "[CASE Budget Reports] Transaction is missing its canonical account reference.",
      {
        transactionId:
          transaction.id,
      },
    );

    return null;
  }

  const merchant =
    normalizeOptionalText(
      transaction.merchant,
    ) ??
    getFallbackMerchant(
      transaction.type,
    );

  const note =
    normalizeOptionalText(
      transaction.note,
    );

  const category =
    transaction.category
      ? {
          id:
            transaction.category.id,

          name:
            transaction.category.name,

          groupName:
            transaction.category.groupName,
        }
      : undefined;

  const transferAccountId =
    normalizeOptionalText(
      transaction.transferAccountId,
    );

  return {
    id:
      transaction.id,

    date:
      transaction.date,

    merchant,

    ...(note
      ? {
          note,
        }
      : {}),

    amount:
      transaction.amount,

    type:
      transaction.type,

    status:
      transaction.status,

    account: {
      id:
        accountId,

      name:
        accountName,

      type:
        transaction.account.type,
    },

    ...(category
      ? {
          category,
        }
      : {}),

    ...(transferAccountId
      ? {
          transferAccountId,
        }
      : {}),
  };
}

function mapNetWorthSnapshot(
  snapshot: {
    id:
      string;

    snapshotDate:
      string;

    totalAssets:
      number;

    totalLiabilities:
      number;

    netWorth:
      number;
  },
): ReportNetWorthHistoryPoint | null {
  const id =
    normalizeOptionalText(
      snapshot.id,
    );

  const date =
    normalizeDateString(
      snapshot.snapshotDate,
    );

  if (
    !id ||
    !date
  ) {
    return null;
  }

  return {
    id,

    date,

    totalAssets:
      normalizeMoney(
        snapshot.totalAssets,
      ),

    totalLiabilities:
      normalizeMoney(
        snapshot.totalLiabilities,
      ),

    netWorth:
      normalizeMoney(
        snapshot.netWorth,
      ),
  };
}

function getFallbackMerchant(
  type:
    CaseBudgetTransactionRecord["type"],
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
      return "Expense";
  }
}

function getReportsFeatureAccessMessage({
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
      return "Reports are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Reports require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Reports require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Reports require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Reports require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Reports are not available for the current workspace subscription.";
    }
  }
}

function mapDependencyErrorCode(
  code:
    string,
):
  | "workspace-not-found"
  | "permission-denied"
  | "report-load-failed" {
  switch (
    code
  ) {
    case "workspace-not-found":
    case "workspace-inactive":
      return "workspace-not-found";

    case "permission-denied":
      return "permission-denied";

    default:
      return "report-load-failed";
  }
}

function normalizeOptionalText(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

function normalizeDateString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalizedValue,
    )
  ) {
    return null;
  }

  return normalizedValue;
}

function normalizeMoney(
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

  return (
    Math.round(
      value *
        100,
    ) /
    100
  );
}

function failure({
  workspaceId,
  workspaceName =
    null,
  periodPreset,
  dateRange,
  previousDateRange,
  code,
  message,
}: {
  workspaceId:
    string | null;

  workspaceName?:
    string | null;

  periodPreset:
    ReportPeriodPreset;

  dateRange:
    ReportDateRange;

  previousDateRange:
    ReportDateRange;

  code:
    | "workspace-not-found"
    | "permission-denied"
    | "reports-unavailable"
    | "report-load-failed"
    | "unexpected-error";

  message:
    string;
}): GetReportsResult {
  return {
    success:
      false,

    workspaceId,

    workspaceName,

    periodPreset,

    dateRange,

    previousDateRange,

    report:
      null,

    previousReport:
      null,

    netWorthHistory:
      [],

    error: {
      code,
      message,
    },
  };
}
