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
  BudgetMonthData,
} from "@/types/budget";

import type {
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

export type CreateBudgetMonthInput = {
  /**
   * Calendar month in YYYY-MM format.
   *
   * Examples:
   *
   * 2026-08
   * 2026-12
   */
  monthKey:
    string;

  /**
   * Optional user-facing month name.
   *
   * The current BudgetProvider does not require this value, but the
   * production database supports it.
   */
  name?:
    string;

  /**
   * Optional opening balance carried into the month.
   *
   * A blank budget defaults to zero.
   */
  startingBalance?:
    number;

  /**
   * Optional private month note.
   */
  note?:
    string;
};

export type CreatedBudgetMonthRecord = {
  id:
    string;

  workspaceId:
    string;

  monthKey:
    string;

  budgetMonth:
    string;

  name:
    string | null;

  plannedIncome:
    number;

  actualIncome:
    number;

  startingBalance:
    number;

  isClosed:
    boolean;

  closedAt:
    string | null;

  closedByUserId:
    string | null;

  note:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;

  budget:
    BudgetMonthData;
};

export type CreateCaseBudgetMonthResult =
  | {
      success:
        true;

      status:
        "created";

      month:
        CreatedBudgetMonthRecord;

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

      month:
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

      month:
        null;

      approvalRequired:
        false;

      approval:
        null;

      error: {
        code:
          | "invalid-month"
          | "invalid-name"
          | "invalid-starting-balance"
          | "invalid-note"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-month-exists"
          | "approval-check-failed"
          | "budget-month-create-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "monthKey"
          | "name"
          | "startingBalance"
          | "note";
      };
    };

const BUDGET_PATH =
  "/dashboard/budget";

const DASHBOARD_PATH =
  "/dashboard";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const NAME_MAX_LENGTH =
  120;

const NOTE_MAX_LENGTH =
  2000;

const MONTH_SELECT =
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
  );

/**
 * Creates one blank monthly CASE Budget budget.
 *
 * Production rules:
 *
 * - workspace_id is resolved from trusted server-side authentication.
 * - The client never supplies workspace_id or audit user IDs.
 * - The caller must have an active Owner/Admin/Member membership.
 * - Viewer is read-only.
 * - Month keys are normalized to the first calendar day in PostgreSQL.
 * - Only one budget month may exist per workspace/month.
 * - A blank month starts with:
 *
 *     planned_income  = 0
 *     actual_income   = 0
 *     starting_balance = supplied value or 0
 *
 * - No income sources, groups, or items are inserted here.
 * - Household budget-change approval enforcement runs before creation.
 * - If approval is required, NO budget month row is created.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function createBudgetMonth(
  input:
    CreateBudgetMonthInput,
): Promise<CreateCaseBudgetMonthResult> {
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

    const budgetMonth =
      `${monthKey}-01`;

    const name =
      normalizeOptionalText(
        input.name,
      );

    if (
      name &&
      name.length >
        NAME_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-name",

        message:
          `Budget month name must be ${NAME_MAX_LENGTH} characters or fewer.`,

        field:
          "name",
      });
    }

    const startingBalance =
      input.startingBalance ===
        undefined
        ? 0
        : normalizeMoney(
            input.startingBalance,
          );

    if (
      startingBalance ===
      null
    ) {
      return failure({
        code:
          "invalid-starting-balance",

        message:
          "Enter a valid starting balance.",

        field:
          "startingBalance",
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
          `Budget month note must be ${NOTE_MAX_LENGTH} characters or fewer.`,

        field:
          "note",
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
          "View-only members cannot create budget months.",
      });
    }

    const admin =
      createWorkspaceAdminClient();

    /*
     * Check for an existing month before approval creation so we do not
     * generate an approval request for an operation that can never succeed.
     */
    const {
      data:
        existingData,
      error:
        existingError,
    } =
      await admin
        .from(
          "case_budget_budget_months",
        )
        .select(
          "id,budget_month",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month",
          budgetMonth,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to check for an existing budget month.",
        {
          workspaceId,
          userId,
          monthKey,
          error:
            existingError,
        },
      );

      return failure({
        code:
          "budget-month-create-failed",

        message:
          "CASE Budget could not verify whether this budget month already exists.",
      });
    }

    if (
      existingData
    ) {
      return failure({
        code:
          "budget-month-exists",

        message:
          `A budget already exists for ${formatMonthLabel(
            monthKey,
          )}.`,

        field:
          "monthKey",
      });
    }

    /*
     * Generate the final UUID before approval enforcement.
     *
     * That gives the approval request a stable target_entity_id even though
     * the budget month row itself is intentionally not inserted until approval
     * is no longer required.
     */
    const budgetMonthId =
      crypto.randomUUID();

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Create ${formatMonthLabel(
            monthKey,
          )} budget`,

        description:
          buildApprovalDescription({
            monthKey,
            name,
            startingBalance,
          }),

        amount:
          Math.abs(
            startingBalance,
          ),

        target: {
          entityType:
            "budget-month",

          entityId:
            budgetMonthId,
        },

        payload: {
          operation:
            "create-budget-month",

          budgetMonthId,

          monthKey,

          budgetMonth,

          name,

          startingBalance,

          note,

          plannedIncome:
            0,

          actualIncome:
            0,
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-month creation.",
        {
          workspaceId,
          userId,
          budgetMonthId,
          monthKey,
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

        month:
          null,

        approvalRequired:
          true,

        approval:
          approvalResult.approval,

        error:
          null,
      };
    }

    /*
     * Re-check immediately before insert.
     *
     * The first duplicate check improves UX. This second check narrows the
     * race window if two clients attempt to create the same month.
     *
     * A database unique constraint on (workspace_id, budget_month) remains
     * the strongest final enforcement boundary and is recommended if not
     * already present.
     */
    const {
      data:
        concurrentExistingData,
      error:
        concurrentExistingError,
    } =
      await admin
        .from(
          "case_budget_budget_months",
        )
        .select(
          "id,budget_month",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month",
          budgetMonth,
        )
        .maybeSingle();

    if (
      concurrentExistingError
    ) {
      console.error(
        "[CASE Budget Budget] Failed final duplicate check before budget-month creation.",
        {
          workspaceId,
          userId,
          monthKey,
          error:
            concurrentExistingError,
        },
      );

      return failure({
        code:
          "budget-month-create-failed",

        message:
          "CASE Budget could not complete the budget month validation.",
      });
    }

    if (
      concurrentExistingData
    ) {
      return failure({
        code:
          "budget-month-exists",

        message:
          `A budget already exists for ${formatMonthLabel(
            monthKey,
          )}.`,

        field:
          "monthKey",
      });
    }

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
          "case_budget_budget_months",
        )
        .insert({
          id:
            budgetMonthId,

          workspace_id:
            workspaceId,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          budget_month:
            budgetMonth,

          name,

          planned_income:
            0,

          actual_income:
            0,

          starting_balance:
            startingBalance,

          is_closed:
            false,

          closed_at:
            null,

          closed_by_user_id:
            null,

          note,

          created_at:
            now,

          updated_at:
            now,
        })
        .select(
          MONTH_SELECT,
        )
        .maybeSingle();

    if (
      createError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to create budget month.",
        {
          workspaceId,
          userId,
          budgetMonthId,
          monthKey,
          error:
            createError,
        },
      );

      if (
        isLikelyUniqueViolation(
          createError,
        )
      ) {
        return failure({
          code:
            "budget-month-exists",

          message:
            `A budget already exists for ${formatMonthLabel(
              monthKey,
            )}.`,

          field:
            "monthKey",
        });
      }

      return failure({
        code:
          "budget-month-create-failed",

        message:
          "CASE Budget could not create the budget month.",
      });
    }

    if (
      !createdData
    ) {
      return failure({
        code:
          "budget-month-create-failed",

        message:
          "CASE Budget created the budget month but could not verify the new record.",
      });
    }

    const row =
      createdData as unknown as
        CaseBudgetBudgetMonthDatabaseRow;

    const month =
      mapCreatedMonth(
        row,
      );

    if (
      !month
    ) {
      console.error(
        "[CASE Budget Budget] Created budget month could not be mapped.",
        {
          workspaceId,
          userId,
          budgetMonthId,
          monthKey,
        },
      );

      return failure({
        code:
          "budget-month-create-failed",

        message:
          "CASE Budget created the budget month but could not verify its details.",
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "created",

      month,

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
      "[CASE Budget Budget] Unexpected budget-month creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the budget month. Please try again.",
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
      "[CASE Budget Budget] Failed to load workspace during budget-month creation.",
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
        "Budget months cannot be created while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget-month creation.",
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
        "You do not have active access to create budget months in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function mapCreatedMonth(
  row:
    CaseBudgetBudgetMonthDatabaseRow,
): CreatedBudgetMonthRecord | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const workspaceId =
    normalizeOptionalText(
      row.workspace_id,
    );

  const budgetMonth =
    normalizeDatabaseDate(
      row.budget_month,
    );

  const createdAt =
    normalizeIsoTimestamp(
      row.created_at,
    );

  const updatedAt =
    normalizeIsoTimestamp(
      row.updated_at,
    );

  const plannedIncome =
    normalizeDatabaseMoney(
      row.planned_income,
    );

  const actualIncome =
    normalizeDatabaseMoney(
      row.actual_income,
    );

  const startingBalance =
    normalizeDatabaseMoney(
      row.starting_balance,
    );

  if (
    !id ||
    !workspaceId ||
    !budgetMonth ||
    !createdAt ||
    !updatedAt ||
    plannedIncome ===
      null ||
    actualIncome ===
      null ||
    startingBalance ===
      null
  ) {
    return null;
  }

  const monthKey =
    budgetMonth.slice(
      0,
      7,
    );

  return {
    id,

    workspaceId,

    monthKey,

    budgetMonth,

    name:
      normalizeOptionalText(
        row.name,
      ),

    plannedIncome,

    actualIncome,

    startingBalance,

    isClosed:
      Boolean(
        row.is_closed,
      ),

    closedAt:
      normalizeNullableIsoTimestamp(
        row.closed_at,
      ),

    closedByUserId:
      normalizeOptionalText(
        row.closed_by_user_id,
      ),

    note:
      normalizeOptionalText(
        row.note,
      ),

    createdAt,

    updatedAt,

    budget: {
      monthKey,

      incomeSources:
        [],

      budgetGroups:
        [],
    },
  };
}

function buildApprovalDescription({
  monthKey,
  name,
  startingBalance,
}: {
  monthKey:
    string;

  name:
    string | null;

  startingBalance:
    number;
}) {
  const label =
    formatMonthLabel(
      monthKey,
    );

  const nameText =
    name
      ? ` named "${name}"`
      : "";

  if (
    startingBalance ===
    0
  ) {
    return `Create a blank budget for ${label}${nameText}.`;
  }

  return `Create a blank budget for ${label}${nameText} with a starting balance of ${formatCurrency(
    startingBalance,
  )}.`;
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

function normalizeDatabaseDate(
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

function normalizeNullableIsoTimestamp(
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

  return normalizeIsoTimestamp(
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

  const year =
    Number(
      yearText,
    );

  const month =
    Number(
      monthText,
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
        year,
        month -
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

function isLikelyUniqueViolation(
  error:
    unknown,
) {
  if (
    !error ||
    typeof error !==
      "object"
  ) {
    return false;
  }

  const candidate =
    error as {
      code?:
        unknown;

      message?:
        unknown;

      details?:
        unknown;
    };

  if (
    candidate.code ===
    "23505"
  ) {
    return true;
  }

  const combined =
    [
      candidate.message,
      candidate.details,
    ]
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
          "string",
      )
      .join(
        " ",
      )
      .toLowerCase();

  return (
    combined.includes(
      "duplicate",
    ) ||
    combined.includes(
      "unique",
    )
  );
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
      CreateCaseBudgetMonthResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CreateCaseBudgetMonthResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CreateCaseBudgetMonthResult {
  return {
    success:
      false,

    status:
      "error",

    month:
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
