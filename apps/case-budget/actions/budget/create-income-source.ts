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

import type {
  BudgetIncomeSource,
} from "@/types/budget";

import type {
  CaseBudgetBudgetIncomeSourceDatabaseRow,
  CaseBudgetBudgetMonthDatabaseRow,
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

export type CreateIncomeSourceInput = {
  monthKey:
    string;

  name:
    string;

  plannedAmount:
    number;

  receivedAmount?:
    number;

  sortOrder?:
    number;
};

export type CreateIncomeSourceRecord = {
  id:
    string;

  workspaceId:
    string;

  budgetMonthId:
    string;

  name:
    string;

  plannedAmount:
    number;

  receivedAmount:
    number;

  sortOrder:
    number;

  createdAt:
    string;

  updatedAt:
    string;

  incomeSource:
    BudgetIncomeSource;
};

export type CreateCaseBudgetIncomeSourceResult =
  | {
      success:
        true;

      status:
        "created";

      incomeSource:
        CreateIncomeSourceRecord;

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

      incomeSource:
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

      incomeSource:
        null;

      approvalRequired:
        false;

      approval:
        null;

      error: {
        code:
          | "invalid-month"
          | "invalid-name"
          | "invalid-planned-amount"
          | "invalid-received-amount"
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "approval-check-failed"
          | "income-source-create-failed"
          | "income-source-aggregate-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "monthKey"
          | "name"
          | "plannedAmount"
          | "receivedAmount"
          | "sortOrder";
      };
    };

const BUDGET_PATH =
  "/dashboard/budget";

const DASHBOARD_PATH =
  "/dashboard";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const NAME_MAX_LENGTH =
  160;

const INCOME_SOURCE_SELECT =
  [
    "id",
    "workspace_id",
    "budget_month_id",
    "created_by_user_id",
    "updated_by_user_id",
    "name",
    "planned_amount",
    "received_amount",
    "sort_order",
    "is_archived",
    "archived_at",
    "archived_by_user_id",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

/**
 * Creates one monthly income source.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server auth.
 * - The client never supplies workspace_id or audit user IDs.
 * - Owner/Admin/Member may create.
 * - Viewer remains read-only.
 * - The target budget month must already exist and be open.
 * - Income source amounts must be non-negative.
 * - Household budget-change approval runs before insert.
 * - If approval is required, no row is inserted.
 * - Parent month planned_income / actual_income are recalculated from the
 *   canonical active income-source rows after a successful insert.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function createIncomeSource(
  input:
    CreateIncomeSourceInput,
): Promise<CreateCaseBudgetIncomeSourceResult> {
  try {
    const monthKey =
      normalizeMonthKey(
        input.monthKey,
      );

    if (
      !monthKey
    ) {
      return failure({
        code:
          "invalid-month",

        message:
          "Enter a valid budget month.",

        field:
          "monthKey",
      });
    }

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
          `Income source name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

        field:
          "name",
      });
    }

    const plannedAmount =
      normalizeNonNegativeMoney(
        input.plannedAmount,
      );

    if (
      plannedAmount ===
      null
    ) {
      return failure({
        code:
          "invalid-planned-amount",

        message:
          "Planned income must be zero or greater.",

        field:
          "plannedAmount",
      });
    }

    const receivedAmount =
      input.receivedAmount ===
        undefined
        ? 0
        : normalizeNonNegativeMoney(
            input.receivedAmount,
          );

    if (
      receivedAmount ===
      null
    ) {
      return failure({
        code:
          "invalid-received-amount",

        message:
          "Received income must be zero or greater.",

        field:
          "receivedAmount",
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
          "Income source sort order must be zero or greater.",

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
          "View-only members cannot create income sources.",
      });
    }

    const budgetMonthResult =
      await loadBudgetMonth({
        workspaceId,
        monthKey,
      });

    if (
      !budgetMonthResult.success
    ) {
      return failure({
        code:
          budgetMonthResult.code,

        message:
          budgetMonthResult.message,

        field:
          "monthKey",
      });
    }

    const budgetMonth =
      budgetMonthResult.month;

    if (
      budgetMonth.is_closed
    ) {
      return failure({
        code:
          "budget-month-closed",

        message:
          "Income sources cannot be added to a closed budget month.",
      });
    }

    const incomeSourceId =
      crypto.randomUUID();

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Add income source: ${name}`,

        description:
          buildApprovalDescription({
            monthKey,
            name,
            plannedAmount,
            receivedAmount,
          }),

        amount:
          plannedAmount,

        target: {
          entityType:
            "budget-income-source",

          entityId:
            incomeSourceId,
        },

        payload: {
          operation:
            "create-income-source",

          incomeSourceId,

          budgetMonthId:
            budgetMonth.id,

          monthKey,

          name,

          plannedAmount,

          receivedAmount,

          sortOrder,
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during income-source creation.",
        {
          workspaceId,
          userId,
          budgetMonthId:
            budgetMonth.id,
          incomeSourceId,
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

        incomeSource:
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
      data:
        createdData,
      error:
        createError,
    } =
      await admin
        .from(
          "case_budget_budget_income_sources",
        )
        .insert({
          id:
            incomeSourceId,

          workspace_id:
            workspaceId,

          budget_month_id:
            budgetMonth.id,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          name,

          planned_amount:
            plannedAmount,

          received_amount:
            receivedAmount,

          sort_order:
            sortOrder,

          is_archived:
            false,

          archived_at:
            null,

          archived_by_user_id:
            null,

          created_at:
            now,

          updated_at:
            now,
        })
        .select(
          INCOME_SOURCE_SELECT,
        )
        .maybeSingle();

    if (
      createError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to create income source.",
        {
          workspaceId,
          userId,
          budgetMonthId:
            budgetMonth.id,
          incomeSourceId,
          error:
            createError,
        },
      );

      return failure({
        code:
          "income-source-create-failed",

        message:
          "CASE Budget could not create the income source.",
      });
    }

    if (
      !createdData
    ) {
      return failure({
        code:
          "income-source-create-failed",

        message:
          "CASE Budget created the income source but could not verify the new record.",
      });
    }

    const aggregateResult =
      await recalculateBudgetMonthIncome({
        workspaceId,
        budgetMonthId:
          budgetMonth.id,
        userId,
      });

    if (
      !aggregateResult.success
    ) {
      /*
       * Compensating cleanup keeps the aggregate month record and its active
       * income-source rows from drifting apart if aggregate maintenance fails.
       */
      const {
        error:
          cleanupError,
      } =
        await admin
          .from(
            "case_budget_budget_income_sources",
          )
          .delete()
          .eq(
            "id",
            incomeSourceId,
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "budget_month_id",
            budgetMonth.id,
          );

      if (
        cleanupError
      ) {
        console.error(
          "[CASE Budget Budget] Failed to clean up income source after aggregate update failure.",
          {
            workspaceId,
            budgetMonthId:
              budgetMonth.id,
            incomeSourceId,
            cleanupError,
          },
        );
      }

      return failure({
        code:
          "income-source-aggregate-failed",

        message:
          aggregateResult.message,
      });
    }

    const row =
      createdData as unknown as
        CaseBudgetBudgetIncomeSourceDatabaseRow;

    const record =
      mapIncomeSourceRecord(
        row,
      );

    if (
      !record
    ) {
      return failure({
        code:
          "income-source-create-failed",

        message:
          "CASE Budget created the income source but could not normalize its details.",
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "created",

      incomeSource:
        record,

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
      "[CASE Budget Budget] Unexpected income-source creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the income source. Please try again.",
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
      "[CASE Budget Budget] Failed to load workspace during income-source creation.",
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
        "Income sources cannot be created while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during income-source creation.",
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
        "You do not have active access to create income sources in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadBudgetMonth({
  workspaceId,
  monthKey,
}: {
  workspaceId:
    string;

  monthKey:
    string;
}):
  Promise<
    | {
        success:
          true;

        month:
          CaseBudgetBudgetMonthDatabaseRow;
      }
    | {
        success:
          false;

        code:
          "budget-month-not-found";

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
        "case_budget_budget_months",
      )
      .select(
        [
          "id",
          "workspace_id",
          "created_by_user_id",
          "updated_by_user_id",
          "budget_month",
          "name",
          "planned_income",
          "actual_income",
          "starting_balance",
          "is_closed",
          "closed_at",
          "closed_by_user_id",
          "note",
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
      .eq(
        "budget_month",
        `${monthKey}-01`,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load target month for income-source creation.",
      {
        workspaceId,
        monthKey,
        error,
      },
    );

    return {
      success:
        false,

      code:
        "budget-month-not-found",

      message:
        "CASE Budget could not load the selected budget month.",
    };
  }

  const month =
    data as unknown as
      | CaseBudgetBudgetMonthDatabaseRow
      | null;

  if (
    !month
  ) {
    return {
      success:
        false,

      code:
        "budget-month-not-found",

      message:
        `A budget does not exist for ${formatMonthLabel(
          monthKey,
        )}.`,
    };
  }

  return {
    success:
      true,

    month,
  };
}

async function recalculateBudgetMonthIncome({
  workspaceId,
  budgetMonthId,
  userId,
}: {
  workspaceId:
    string;

  budgetMonthId:
    string;

  userId:
    string;
}):
  Promise<
    | {
        success:
          true;

        plannedIncome:
          number;

        actualIncome:
          number;
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
    data:
      incomeData,
    error:
      incomeError,
  } =
    await admin
      .from(
        "case_budget_budget_income_sources",
      )
      .select(
        "planned_amount,received_amount",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "budget_month_id",
        budgetMonthId,
      )
      .eq(
        "is_archived",
        false,
      );

  if (
    incomeError
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load income rows for aggregate recalculation.",
      {
        workspaceId,
        budgetMonthId,
        error:
          incomeError,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not recalculate the budget month income totals.",
    };
  }

  let plannedIncome =
    0;

  let actualIncome =
    0;

  for (
    const row of
      incomeData ??
      []
  ) {
    const planned =
      normalizeDatabaseMoney(
        (
          row as {
            planned_amount?:
              unknown;
          }
        ).planned_amount,
      );

    const received =
      normalizeDatabaseMoney(
        (
          row as {
            received_amount?:
              unknown;
          }
        ).received_amount,
      );

    if (
      planned ===
        null ||
      received ===
        null
    ) {
      return {
        success:
          false,

        message:
          "CASE Budget encountered an invalid income amount while recalculating the budget month.",
      };
    }

    plannedIncome +=
      planned;

    actualIncome +=
      received;
  }

  plannedIncome =
    roundCurrency(
      plannedIncome,
    );

  actualIncome =
    roundCurrency(
      actualIncome,
    );

  const now =
    new Date().toISOString();

  const {
    error:
      monthUpdateError,
  } =
    await admin
      .from(
        "case_budget_budget_months",
      )
      .update({
        planned_income:
          plannedIncome,

        actual_income:
          actualIncome,

        updated_by_user_id:
          userId,

        updated_at:
          now,
      })
      .eq(
        "id",
        budgetMonthId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      );

  if (
    monthUpdateError
  ) {
    console.error(
      "[CASE Budget Budget] Failed to update budget-month income aggregates.",
      {
        workspaceId,
        budgetMonthId,
        error:
          monthUpdateError,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not update the budget month income totals.",
    };
  }

  return {
    success:
      true,

    plannedIncome,

    actualIncome,
  };
}

function mapIncomeSourceRecord(
  row:
    CaseBudgetBudgetIncomeSourceDatabaseRow,
): CreateIncomeSourceRecord | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const workspaceId =
    normalizeOptionalText(
      row.workspace_id,
    );

  const budgetMonthId =
    normalizeOptionalText(
      row.budget_month_id,
    );

  const name =
    normalizeOptionalText(
      row.name,
    );

  const plannedAmount =
    normalizeNonNegativeDatabaseMoney(
      row.planned_amount,
    );

  const receivedAmount =
    normalizeNonNegativeDatabaseMoney(
      row.received_amount,
    );

  const createdAt =
    normalizeIsoTimestamp(
      row.created_at,
    );

  const updatedAt =
    normalizeIsoTimestamp(
      row.updated_at,
    );

  if (
    !id ||
    !workspaceId ||
    !budgetMonthId ||
    !name ||
    plannedAmount ===
      null ||
    receivedAmount ===
      null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const incomeSource:
    BudgetIncomeSource = {
      id,

      name,

      amount:
        plannedAmount,

      receivedAmount,

      status:
        getIncomeStatus(
          plannedAmount,
          receivedAmount,
        ),
    };

  return {
    id,

    workspaceId,

    budgetMonthId,

    name,

    plannedAmount,

    receivedAmount,

    sortOrder:
      normalizeDatabaseSortOrder(
        row.sort_order,
      ),

    createdAt,

    updatedAt,

    incomeSource,
  };
}

function buildApprovalDescription({
  monthKey,
  name,
  plannedAmount,
  receivedAmount,
}: {
  monthKey:
    string;

  name:
    string;

  plannedAmount:
    number;

  receivedAmount:
    number;
}) {
  const receivedText =
    receivedAmount >
    0
      ? ` with ${formatCurrency(
          receivedAmount,
        )} already received`
      : "";

  return `Add "${name}" to the ${formatMonthLabel(
    monthKey,
  )} budget with ${formatCurrency(
    plannedAmount,
  )} of planned income${receivedText}.`;
}

function normalizeMonthKey(
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
    !/^\d{4}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const [
    yearText,
    monthText,
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

  if (
    !Number.isInteger(
      year,
    ) ||
    year <
      1900 ||
    year >
      9999 ||
    !Number.isInteger(
      month,
    ) ||
    month <
      1 ||
    month >
      12
  ) {
    return null;
  }

  return `${String(
    year,
  ).padStart(
    4,
    "0",
  )}-${String(
    month,
  ).padStart(
    2,
    "0",
  )}`;
}

function normalizeNonNegativeMoney(
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

  return roundCurrency(
    value,
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

function normalizeNonNegativeDatabaseMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseMoney(
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

function normalizeIsoTimestamp(
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

  const timestamp =
    Date.parse(
      normalized,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return null;
  }

  return new Date(
    timestamp,
  ).toISOString();
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

function getIncomeStatus(
  plannedAmount:
    number,
  receivedAmount:
    number,
):
  BudgetIncomeSource["status"] {
  if (
    plannedAmount >
      0 &&
    receivedAmount >=
      plannedAmount
  ) {
    return "received";
  }

  if (
    receivedAmount >
    0
  ) {
    return "partial";
  }

  return "planned";
}

function formatMonthLabel(
  monthKey:
    string,
) {
  const [
    yearText,
    monthText,
  ] =
    monthKey.split(
      "-",
    );

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",

      year:
        "numeric",

      timeZone:
        "UTC",
    },
  ).format(
    new Date(
      Date.UTC(
        Number(
          yearText,
        ),
        Number(
          monthText,
        ) -
          1,
        1,
      ),
    ),
  );
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

function revalidateBudgetPaths() {
  revalidatePath(
    BUDGET_PATH,
  );

  revalidatePath(
    DASHBOARD_PATH,
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
      CreateCaseBudgetIncomeSourceResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CreateCaseBudgetIncomeSourceResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CreateCaseBudgetIncomeSourceResult {
  return {
    success:
      false,

    status:
      "error",

    incomeSource:
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
