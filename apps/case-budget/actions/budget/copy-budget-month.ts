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
  BudgetAmountType,
  BudgetCategoryData,
  BudgetCategoryGroupData,
  BudgetIncomeSource,
  BudgetMonthData,
} from "@/types/budget";

import type {
  CaseBudgetBudgetGroupDatabaseRow,
  CaseBudgetBudgetIncomeSourceDatabaseRow,
  CaseBudgetBudgetItemDatabaseRow,
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

type SourceBudgetHierarchy = {
  month:
    CaseBudgetBudgetMonthDatabaseRow;

  incomeSources:
    CaseBudgetBudgetIncomeSourceDatabaseRow[];

  groups:
    CaseBudgetBudgetGroupDatabaseRow[];

  items:
    CaseBudgetBudgetItemDatabaseRow[];
};

type TargetBudgetState = {
  month:
    CaseBudgetBudgetMonthDatabaseRow | null;

  activeIncomeSourceCount:
    number;

  activeGroupCount:
    number;

  activeItemCount:
    number;
};

type CopiedIncomeSource = {
  id:
    string;

  name:
    string;

  plannedAmount:
    number;

  receivedAmount:
    number;

  sortOrder:
    number;
};

type CopiedBudgetItem = {
  id:
    string;

  sourceItemId:
    string;

  groupId:
    string;

  name:
    string;

  description:
    string | null;

  plannedAmount:
    number;

  amountType:
    BudgetAmountType;

  activityAmount:
    number;

  availableAmount:
    number;

  rolloverAmount:
    number;

  rolloverEnabled:
    boolean;

  targetAmount:
    number | null;

  targetDate:
    string | null;

  isRecurring:
    boolean;

  sortOrder:
    number;
};

type CopiedBudgetGroup = {
  id:
    string;

  sourceGroupId:
    string;

  name:
    string;

  description:
    string | null;

  sortOrder:
    number;

  isCollapsed:
    boolean;

  items:
    CopiedBudgetItem[];
};

export type CopyBudgetMonthInput = {
  /**
   * Destination calendar month in YYYY-MM format.
   */
  targetMonthKey:
    string;

  /**
   * Optional source calendar month in YYYY-MM format.
   *
   * When omitted, CASE Budget automatically uses the calendar month
   * immediately before targetMonthKey.
   */
  sourceMonthKey?:
    string;
};

export type CopiedBudgetMonthRecord = {
  id:
    string;

  workspaceId:
    string;

  sourceMonthId:
    string;

  sourceMonthKey:
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

export type CopyCaseBudgetMonthResult =
  | {
      success:
        true;

      status:
        "copied";

      month:
        CopiedBudgetMonthRecord;

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
          | "invalid-target-month"
          | "invalid-source-month"
          | "same-month"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "source-month-not-found"
          | "source-month-closed"
          | "source-budget-load-failed"
          | "target-budget-load-failed"
          | "target-month-not-empty"
          | "approval-check-failed"
          | "copy-conflict"
          | "copy-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "targetMonthKey"
          | "sourceMonthKey";
      };
    };

const BUDGET_PATH =
  "/dashboard/budget";

const DASHBOARD_PATH =
  "/dashboard";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

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

const GROUP_SELECT =
  [
    "id",
    "workspace_id",
    "budget_month_id",
    "created_by_user_id",
    "updated_by_user_id",
    "name",
    "description",
    "sort_order",
    "is_collapsed",
    "is_archived",
    "archived_at",
    "archived_by_user_id",
    "created_at",
    "updated_at",
  ].join(
    ",",
  );

const ITEM_SELECT =
  [
    "id",
    "workspace_id",
    "budget_month_id",
    "budget_group_id",
    "created_by_user_id",
    "updated_by_user_id",
    "name",
    "description",
    "planned_amount",
    "amount_type",
    "activity_amount",
    "available_amount",
    "rollover_amount",
    "rollover_enabled",
    "target_amount",
    "target_date",
    "is_recurring",
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
 * Copies a source CASE Budget month into a destination month.
 *
 * This is the server-side replacement for the current provider's
 * copyPreviousMonth() behavior.
 *
 * Copy semantics:
 *
 * Income sources:
 * - preserve name
 * - preserve planned_amount
 * - reset received_amount to 0
 *
 * Budget groups:
 * - preserve name
 * - preserve description
 * - preserve sort order
 * - preserve collapsed preference
 *
 * Budget items:
 * - preserve name
 * - preserve description
 * - preserve planned_amount
 * - reset activity_amount to 0
 * - set available_amount to planned_amount
 * - reset rollover_amount to 0
 * - preserve rollover_enabled
 * - preserve target_amount / target_date
 * - preserve is_recurring
 * - preserve sort order
 *
 * Destination behavior:
 *
 * - The destination may not exist yet.
 * - An already-created EMPTY destination month may also be populated.
 * - A destination with any active income source, group, or item is never
 *   overwritten.
 * - Existing destination month metadata (starting balance, name, note) is
 *   preserved when the destination month already exists.
 *
 * Production rules:
 *
 * - workspace_id is resolved exclusively from trusted server auth.
 * - Viewer is read-only.
 * - Household budget-change approval is enforced before writes.
 * - If approval is required, no budget data is copied.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 *
 * NOTE:
 *
 * This action performs several related inserts. The ideal long-term database
 * boundary is a PostgreSQL RPC/function that performs the entire copy in one
 * transaction. Until that RPC exists, this action uses compensating cleanup
 * for rows it creates if a later step fails.
 */
export async function copyBudgetMonth(
  input:
    CopyBudgetMonthInput,
): Promise<CopyCaseBudgetMonthResult> {
  try {
    const targetMonthKey =
      normalizeMonthKey(
        input.targetMonthKey,
      );

    if (
      !targetMonthKey
    ) {
      return failure({
        code:
          "invalid-target-month",

        message:
          "Enter a valid destination budget month.",

        field:
          "targetMonthKey",
      });
    }

    const sourceMonthKey =
      input.sourceMonthKey ===
        undefined
        ? shiftMonthKey(
            targetMonthKey,
            -1,
          )
        : normalizeMonthKey(
            input.sourceMonthKey,
          );

    if (
      !sourceMonthKey
    ) {
      return failure({
        code:
          "invalid-source-month",

        message:
          "Enter a valid source budget month.",

        field:
          "sourceMonthKey",
      });
    }

    if (
      sourceMonthKey ===
      targetMonthKey
    ) {
      return failure({
        code:
          "same-month",

        message:
          "The source and destination budget months must be different.",

        field:
          "sourceMonthKey",
      });
    }

    const sourceBudgetMonth =
      `${sourceMonthKey}-01`;

    const targetBudgetMonth =
      `${targetMonthKey}-01`;

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
          "View-only members cannot copy budget months.",
      });
    }

    const sourceResult =
      await loadSourceBudgetHierarchy({
        workspaceId,
        budgetMonth:
          sourceBudgetMonth,
      });

    if (
      !sourceResult.success
    ) {
      return failure({
        code:
          sourceResult.code,

        message:
          sourceResult.message,

        ...(sourceResult.field
          ? {
              field:
                sourceResult.field,
            }
          : {}),
      });
    }

    const source =
      sourceResult.source;

    if (
      source.month.is_closed
    ) {
      /*
       * Closed months are still perfectly valid historical templates in many
       * budgeting systems. The current CASE Budget UI does not prohibit
       * copying them, so do NOT block the operation.
       *
       * This branch intentionally remains non-blocking. Keeping this explicit
       * documents the chosen behavior for future close-month rules.
       */
    }

    const targetResult =
      await loadTargetBudgetState({
        workspaceId,
        budgetMonth:
          targetBudgetMonth,
      });

    if (
      !targetResult.success
    ) {
      return failure({
        code:
          "target-budget-load-failed",

        message:
          targetResult.message,
      });
    }

    const targetState =
      targetResult.target;

    if (
      !isTargetBudgetEmpty(
        targetState,
      )
    ) {
      return failure({
        code:
          "target-month-not-empty",

        message:
          `${formatMonthLabel(
            targetMonthKey,
          )} already contains budget data and cannot be overwritten.`,

        field:
          "targetMonthKey",
      });
    }

    const copyPlan =
      buildCopyPlan({
        source,
      });

    const plannedIncome =
      roundCurrency(
        copyPlan.incomeSources.reduce(
          (
            total,
            income,
          ) =>
            total +
            income.plannedAmount,
          0,
        ),
      );

    const targetMonthId =
      targetState.month?.id ??
      crypto.randomUUID();

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Copy ${formatMonthLabel(
            sourceMonthKey,
          )} budget to ${formatMonthLabel(
            targetMonthKey,
          )}`,

        description:
          buildApprovalDescription({
            sourceMonthKey,
            targetMonthKey,
            incomeSourceCount:
              copyPlan.incomeSources.length,
            groupCount:
              copyPlan.groups.length,
            itemCount:
              copyPlan.groups.reduce(
                (
                  total,
                  group,
                ) =>
                  total +
                  group.items.length,
                0,
              ),
            plannedIncome,
          }),

        amount:
          plannedIncome,

        target: {
          entityType:
            "budget-month",

          entityId:
            targetMonthId,
        },

        payload: {
          operation:
            "copy-budget-month",

          sourceMonthId:
            source.month.id,

          sourceMonthKey,

          targetMonthId,

          targetMonthKey,

          targetMonthAlreadyExists:
            Boolean(
              targetState.month,
            ),

          copiedIncomeSourceCount:
            copyPlan.incomeSources.length,

          copiedGroupCount:
            copyPlan.groups.length,

          copiedItemCount:
            copyPlan.groups.reduce(
              (
                total,
                group,
              ) =>
                total +
                group.items.length,
              0,
            ),

          plannedIncome,

          actualIncome:
            0,

          copySemantics: {
            resetIncomeReceived:
              true,

            resetItemActivity:
              true,

            resetRolloverAmount:
              true,

            preservePlannedAmounts:
              true,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget copy.",
        {
          workspaceId,
          userId,
          sourceMonthKey,
          targetMonthKey,
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
     * Re-read target immediately before writing so stale clients cannot
     * overwrite data another user added after approval enforcement.
     */
    const freshTargetResult =
      await loadTargetBudgetState({
        workspaceId,
        budgetMonth:
          targetBudgetMonth,
      });

    if (
      !freshTargetResult.success
    ) {
      return failure({
        code:
          "target-budget-load-failed",

        message:
          freshTargetResult.message,
      });
    }

    const freshTarget =
      freshTargetResult.target;

    if (
      !isTargetBudgetEmpty(
        freshTarget,
      )
    ) {
      return failure({
        code:
          "copy-conflict",

        message:
          `${formatMonthLabel(
            targetMonthKey,
          )} changed before the copy completed. Refresh the budget and try again.`,
      });
    }

    /*
     * If the original target did not exist but one now exists, use the
     * canonical row that won the race rather than attempting to create a
     * duplicate.
     */
    const canonicalTargetMonthId =
      freshTarget.month?.id ??
      targetMonthId;

    const writeResult =
      await executeCopy({
        workspaceId,
        userId,
        targetMonthId:
          canonicalTargetMonthId,
        targetBudgetMonth,
        targetMonth:
          freshTarget.month,
        copyPlan,
        plannedIncome,
      });

    if (
      !writeResult.success
    ) {
      return failure({
        code:
          writeResult.code,

        message:
          writeResult.message,
      });
    }

    const copiedMonthResult =
      await loadCopiedMonth({
        workspaceId,
        targetMonthId:
          canonicalTargetMonthId,
        sourceMonthId:
          source.month.id,
        sourceMonthKey,
        targetMonthKey,
      });

    if (
      !copiedMonthResult.success
    ) {
      return failure({
        code:
          "copy-failed",

        message:
          copiedMonthResult.message,
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "copied",

      month:
        copiedMonthResult.month,

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
      "[CASE Budget Budget] Unexpected copy-budget-month error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not copy the budget month. Please try again.",
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
      "[CASE Budget Budget] Failed to load workspace during budget copy.",
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
        "Budget months cannot be copied while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget copy.",
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
        "You do not have active access to copy budget months in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadSourceBudgetHierarchy({
  workspaceId,
  budgetMonth,
}: {
  workspaceId:
    string;

  budgetMonth:
    string;
}):
  Promise<
    | {
        success:
          true;

        source:
          SourceBudgetHierarchy;
      }
    | {
        success:
          false;

        code:
          "source-month-not-found" |
          "source-budget-load-failed";

        message:
          string;

        field?:
          "sourceMonthKey";
      }
  > {
  const admin =
    createWorkspaceAdminClient();

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
        MONTH_SELECT,
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
    monthError
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load source month.",
      {
        workspaceId,
        budgetMonth,
        error:
          monthError,
      },
    );

    return {
      success:
        false,

      code:
        "source-budget-load-failed",

      message:
        "CASE Budget could not load the source budget month.",
    };
  }

  const month =
    monthData as unknown as
      | CaseBudgetBudgetMonthDatabaseRow
      | null;

  if (
    !month
  ) {
    return {
      success:
        false,

      code:
        "source-month-not-found",

      message:
        "The source budget month does not exist.",

      field:
        "sourceMonthKey",
    };
  }

  const [
    incomeResult,
    groupResult,
    itemResult,
  ] =
    await Promise.all([
      admin
        .from(
          "case_budget_budget_income_sources",
        )
        .select(
          INCOME_SOURCE_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          month.id,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          },
        ),

      admin
        .from(
          "case_budget_budget_groups",
        )
        .select(
          GROUP_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          month.id,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          },
        ),

      admin
        .from(
          "case_budget_budget_items",
        )
        .select(
          ITEM_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          month.id,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          },
        ),
    ]);

  if (
    incomeResult.error ||
    groupResult.error ||
    itemResult.error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load source budget hierarchy.",
      {
        workspaceId,
        budgetMonthId:
          month.id,
        incomeError:
          incomeResult.error,
        groupError:
          groupResult.error,
        itemError:
          itemResult.error,
      },
    );

    return {
      success:
        false,

      code:
        "source-budget-load-failed",

      message:
        "CASE Budget could not load the complete source budget.",
    };
  }

  return {
    success:
      true,

    source: {
      month,

      incomeSources:
        (
          incomeResult.data ??
          []
        ) as unknown as
          CaseBudgetBudgetIncomeSourceDatabaseRow[],

      groups:
        (
          groupResult.data ??
          []
        ) as unknown as
          CaseBudgetBudgetGroupDatabaseRow[],

      items:
        (
          itemResult.data ??
          []
        ) as unknown as
          CaseBudgetBudgetItemDatabaseRow[],
    },
  };
}

async function loadTargetBudgetState({
  workspaceId,
  budgetMonth,
}: {
  workspaceId:
    string;

  budgetMonth:
    string;
}):
  Promise<
    | {
        success:
          true;

        target:
          TargetBudgetState;
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
      monthData,
    error:
      monthError,
  } =
    await admin
      .from(
        "case_budget_budget_months",
      )
      .select(
        MONTH_SELECT,
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
    monthError
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load target month.",
      {
        workspaceId,
        budgetMonth,
        error:
          monthError,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the destination budget month.",
    };
  }

  const month =
    monthData as unknown as
      | CaseBudgetBudgetMonthDatabaseRow
      | null;

  if (
    !month
  ) {
    return {
      success:
        true,

      target: {
        month:
          null,

        activeIncomeSourceCount:
          0,

        activeGroupCount:
          0,

        activeItemCount:
          0,
      },
    };
  }

  const [
    incomeCountResult,
    groupCountResult,
    itemCountResult,
  ] =
    await Promise.all([
      admin
        .from(
          "case_budget_budget_income_sources",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          month.id,
        )
        .eq(
          "is_archived",
          false,
        ),

      admin
        .from(
          "case_budget_budget_groups",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          month.id,
        )
        .eq(
          "is_archived",
          false,
        ),

      admin
        .from(
          "case_budget_budget_items",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          month.id,
        )
        .eq(
          "is_archived",
          false,
        ),
    ]);

  if (
    incomeCountResult.error ||
    groupCountResult.error ||
    itemCountResult.error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to inspect target month contents.",
      {
        workspaceId,
        budgetMonthId:
          month.id,
        incomeError:
          incomeCountResult.error,
        groupError:
          groupCountResult.error,
        itemError:
          itemCountResult.error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not verify whether the destination budget month is empty.",
    };
  }

  return {
    success:
      true,

    target: {
      month,

      activeIncomeSourceCount:
        incomeCountResult.count ??
        0,

      activeGroupCount:
        groupCountResult.count ??
        0,

      activeItemCount:
        itemCountResult.count ??
        0,
    },
  };
}

function isTargetBudgetEmpty(
  target:
    TargetBudgetState,
) {
  return (
    target.activeIncomeSourceCount ===
      0 &&
    target.activeGroupCount ===
      0 &&
    target.activeItemCount ===
      0
  );
}

function buildCopyPlan({
  source,
}: {
  source:
    SourceBudgetHierarchy;
}) {
  const incomeSources:
    CopiedIncomeSource[] =
    source.incomeSources.map(
      (
        income,
      ) => {
        const plannedAmount =
          normalizeNonNegativeDatabaseMoney(
            income.planned_amount,
          ) ??
          0;

        return {
          id:
            crypto.randomUUID(),

          name:
            normalizeOptionalText(
              income.name,
            ) ??
            "Income",

          plannedAmount,

          receivedAmount:
            0,

          sortOrder:
            normalizeSortOrder(
              income.sort_order,
            ),
        };
      },
    );

  const sourceItemsByGroupId =
    new Map<
      string,
      CaseBudgetBudgetItemDatabaseRow[]
    >();

  for (
    const item of
      source.items
  ) {
    const current =
      sourceItemsByGroupId.get(
        item.budget_group_id,
      ) ??
      [];

    current.push(
      item,
    );

    sourceItemsByGroupId.set(
      item.budget_group_id,
      current,
    );
  }

  const groups:
    CopiedBudgetGroup[] =
    source.groups.map(
      (
        group,
      ) => {
        const groupId =
          crypto.randomUUID();

        const items:
          CopiedBudgetItem[] =
          (
            sourceItemsByGroupId.get(
              group.id,
            ) ??
            []
          ).map(
            (
              item,
            ) => {
              const plannedAmount =
                normalizeNonNegativeDatabaseMoney(
                  item.planned_amount,
                ) ??
                0;

              return {
                id:
                  crypto.randomUUID(),

                sourceItemId:
                  item.id,

                groupId,

                name:
                  normalizeOptionalText(
                    item.name,
                  ) ??
                  "Budget Item",

                description:
                  normalizeOptionalText(
                    item.description,
                  ),

                plannedAmount,

                amountType:
                  normalizeBudgetAmountType(
                    (
                      item as CaseBudgetBudgetItemDatabaseRow & {
                        amount_type?:
                          unknown;
                      }
                    ).amount_type,
                  ) ??
                  "fixed",

                activityAmount:
                  0,

                availableAmount:
                  plannedAmount,

                rolloverAmount:
                  0,

                rolloverEnabled:
                  Boolean(
                    item.rollover_enabled,
                  ),

                targetAmount:
                  normalizeNullableNonNegativeDatabaseMoney(
                    item.target_amount,
                  ),

                targetDate:
                  normalizeNullableDatabaseDate(
                    item.target_date,
                  ),

                isRecurring:
                  Boolean(
                    item.is_recurring,
                  ),

                sortOrder:
                  normalizeSortOrder(
                    item.sort_order,
                  ),
              };
            },
          );

        return {
          id:
            groupId,

          sourceGroupId:
            group.id,

          name:
            normalizeOptionalText(
              group.name,
            ) ??
            "Budget Group",

          description:
            normalizeOptionalText(
              group.description,
            ),

          sortOrder:
            normalizeSortOrder(
              group.sort_order,
            ),

          isCollapsed:
            Boolean(
              group.is_collapsed,
            ),

          items,
        };
      },
    );

  return {
    incomeSources,
    groups,
  };
}

async function executeCopy({
  workspaceId,
  userId,
  targetMonthId,
  targetBudgetMonth,
  targetMonth,
  copyPlan,
  plannedIncome,
}: {
  workspaceId:
    string;

  userId:
    string;

  targetMonthId:
    string;

  targetBudgetMonth:
    string;

  targetMonth:
    CaseBudgetBudgetMonthDatabaseRow | null;

  copyPlan: {
    incomeSources:
      CopiedIncomeSource[];

    groups:
      CopiedBudgetGroup[];
  };

  plannedIncome:
    number;
}):
  Promise<
    | {
        success:
          true;
      }
    | {
        success:
          false;

        code:
          "copy-conflict" |
          "copy-failed";

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const now =
    new Date().toISOString();

  let createdMonth =
    false;

  let createdIncomeSourceIds:
    string[] =
    [];

  let createdGroupIds:
    string[] =
    [];

  let createdItemIds:
    string[] =
    [];

  try {
    if (
      !targetMonth
    ) {
      const {
        data:
          createdMonthData,
        error:
          createMonthError,
      } =
        await admin
          .from(
            "case_budget_budget_months",
          )
          .insert({
            id:
              targetMonthId,

            workspace_id:
              workspaceId,

            created_by_user_id:
              userId,

            updated_by_user_id:
              userId,

            budget_month:
              targetBudgetMonth,

            name:
              null,

            planned_income:
              plannedIncome,

            actual_income:
              0,

            starting_balance:
              0,

            is_closed:
              false,

            closed_at:
              null,

            closed_by_user_id:
              null,

            note:
              null,

            created_at:
              now,

            updated_at:
              now,
          })
          .select(
            "id",
          )
          .maybeSingle();

      if (
        createMonthError ||
        !createdMonthData
      ) {
        if (
          isLikelyUniqueViolation(
            createMonthError,
          )
        ) {
          return {
            success:
              false,

            code:
              "copy-conflict",

            message:
              "The destination budget month was created by another request. Refresh and try again.",
          };
        }

        throw new Error(
          createMonthError?.message ??
          "Failed to create target budget month.",
        );
      }

      createdMonth =
        true;
    } else {
      /*
       * Preserve existing blank-month metadata while synchronizing the
       * aggregate income totals to the rows about to be copied.
       */
      const {
        data:
          updatedTargetData,
        error:
          updateTargetError,
      } =
        await admin
          .from(
            "case_budget_budget_months",
          )
          .update({
            updated_by_user_id:
              userId,

            planned_income:
              plannedIncome,

            actual_income:
              0,

            updated_at:
              now,
          })
          .eq(
            "id",
            targetMonthId,
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "updated_at",
            targetMonth.updated_at,
          )
          .select(
            "id",
          )
          .maybeSingle();

      if (
        updateTargetError
      ) {
        throw new Error(
          updateTargetError.message,
        );
      }

      if (
        !updatedTargetData
      ) {
        return {
          success:
            false,

          code:
            "copy-conflict",

          message:
            "The destination budget month changed before the copy completed. Refresh and try again.",
        };
      }
    }

    if (
      copyPlan.incomeSources.length >
      0
    ) {
      const incomeRows =
        copyPlan.incomeSources.map(
          (
            income,
          ) => ({
            id:
              income.id,

            workspace_id:
              workspaceId,

            budget_month_id:
              targetMonthId,

            created_by_user_id:
              userId,

            updated_by_user_id:
              userId,

            name:
              income.name,

            planned_amount:
              income.plannedAmount,

            received_amount:
              0,

            sort_order:
              income.sortOrder,

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
          }),
        );

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
          .insert(
            incomeRows,
          )
          .select(
            "id",
          );

      if (
        incomeError
      ) {
        throw new Error(
          incomeError.message,
        );
      }

      createdIncomeSourceIds =
        (
          incomeData ??
          []
        )
          .map(
            (
              row,
            ) =>
              normalizeOptionalText(
                (
                  row as {
                    id?:
                      unknown;
                  }
                ).id,
              ),
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(
                id,
              ),
          );
    }

    if (
      copyPlan.groups.length >
      0
    ) {
      const groupRows =
        copyPlan.groups.map(
          (
            group,
          ) => ({
            id:
              group.id,

            workspace_id:
              workspaceId,

            budget_month_id:
              targetMonthId,

            created_by_user_id:
              userId,

            updated_by_user_id:
              userId,

            name:
              group.name,

            description:
              group.description,

            sort_order:
              group.sortOrder,

            is_collapsed:
              group.isCollapsed,

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
          }),
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
          .insert(
            groupRows,
          )
          .select(
            "id",
          );

      if (
        groupError
      ) {
        throw new Error(
          groupError.message,
        );
      }

      createdGroupIds =
        (
          groupData ??
          []
        )
          .map(
            (
              row,
            ) =>
              normalizeOptionalText(
                (
                  row as {
                    id?:
                      unknown;
                  }
                ).id,
              ),
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(
                id,
              ),
          );
    }

    const itemRows =
      copyPlan.groups.flatMap(
        (
          group,
        ) =>
          group.items.map(
            (
              item,
            ) => ({
              id:
                item.id,

              workspace_id:
                workspaceId,

              budget_month_id:
                targetMonthId,

              budget_group_id:
                item.groupId,

              created_by_user_id:
                userId,

              updated_by_user_id:
                userId,

              name:
                item.name,

              description:
                item.description,

              planned_amount:
                item.plannedAmount,

              amount_type:
                item.amountType,

              activity_amount:
                0,

              available_amount:
                item.availableAmount,

              rollover_amount:
                0,

              rollover_enabled:
                item.rolloverEnabled,

              target_amount:
                item.targetAmount,

              target_date:
                item.targetDate,

              is_recurring:
                item.isRecurring,

              sort_order:
                item.sortOrder,

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
            }),
          ),
      );

    if (
      itemRows.length >
      0
    ) {
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
          .insert(
            itemRows,
          )
          .select(
            "id",
          );

      if (
        itemError
      ) {
        throw new Error(
          itemError.message,
        );
      }

      createdItemIds =
        (
          itemData ??
          []
        )
          .map(
            (
              row,
            ) =>
              normalizeOptionalText(
                (
                  row as {
                    id?:
                      unknown;
                  }
                ).id,
              ),
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(
                id,
              ),
          );
    }

    return {
      success:
        true,
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Budget] Copy failed; attempting compensating cleanup.",
      {
        workspaceId,
        targetMonthId,
        error,
      },
    );

    await cleanupPartialCopy({
      workspaceId,
      targetMonthId,
      createdMonth,
      createdIncomeSourceIds,
      createdGroupIds,
      createdItemIds,
      existingTargetMonth:
        targetMonth,
    });

    return {
      success:
        false,

      code:
        "copy-failed",

      message:
        "CASE Budget could not complete the budget copy. Any partially created copy data was rolled back where possible.",
    };
  }
}

async function cleanupPartialCopy({
  workspaceId,
  targetMonthId,
  createdMonth,
  createdIncomeSourceIds,
  createdGroupIds,
  createdItemIds,
  existingTargetMonth,
}: {
  workspaceId:
    string;

  targetMonthId:
    string;

  createdMonth:
    boolean;

  createdIncomeSourceIds:
    string[];

  createdGroupIds:
    string[];

  createdItemIds:
    string[];

  existingTargetMonth:
    CaseBudgetBudgetMonthDatabaseRow | null;
}) {
  const admin =
    createWorkspaceAdminClient();

  /*
   * If the entire month was created by this action, deleting the month is the
   * cleanest compensation because the confirmed child foreign keys use
   * ON DELETE CASCADE for the budget hierarchy.
   */
  if (
    createdMonth
  ) {
    const {
      error,
    } =
      await admin
        .from(
          "case_budget_budget_months",
        )
        .delete()
        .eq(
          "id",
          targetMonthId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Budget] Failed to remove partially created target month.",
        {
          workspaceId,
          targetMonthId,
          error,
        },
      );
    }

    return;
  }

  /*
   * Existing blank month: remove only rows created by this operation and
   * restore the original month aggregates.
   */
  if (
    createdItemIds.length >
    0
  ) {
    const {
      error,
    } =
      await admin
        .from(
          "case_budget_budget_items",
        )
        .delete()
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          targetMonthId,
        )
        .in(
          "id",
          createdItemIds,
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Budget] Failed to clean up copied items.",
        {
          workspaceId,
          targetMonthId,
          error,
        },
      );
    }
  }

  if (
    createdGroupIds.length >
    0
  ) {
    const {
      error,
    } =
      await admin
        .from(
          "case_budget_budget_groups",
        )
        .delete()
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          targetMonthId,
        )
        .in(
          "id",
          createdGroupIds,
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Budget] Failed to clean up copied groups.",
        {
          workspaceId,
          targetMonthId,
          error,
        },
      );
    }
  }

  if (
    createdIncomeSourceIds.length >
    0
  ) {
    const {
      error,
    } =
      await admin
        .from(
          "case_budget_budget_income_sources",
        )
        .delete()
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          targetMonthId,
        )
        .in(
          "id",
          createdIncomeSourceIds,
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Budget] Failed to clean up copied income sources.",
        {
          workspaceId,
          targetMonthId,
          error,
        },
      );
    }
  }

  if (
    existingTargetMonth
  ) {
    const {
      error,
    } =
      await admin
        .from(
          "case_budget_budget_months",
        )
        .update({
          planned_income:
            existingTargetMonth.planned_income,

          actual_income:
            existingTargetMonth.actual_income,

          updated_by_user_id:
            existingTargetMonth.updated_by_user_id,

          updated_at:
            existingTargetMonth.updated_at,
        })
        .eq(
          "id",
          targetMonthId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Budget] Failed to restore target month aggregates after partial copy.",
        {
          workspaceId,
          targetMonthId,
          error,
        },
      );
    }
  }
}

async function loadCopiedMonth({
  workspaceId,
  targetMonthId,
  sourceMonthId,
  sourceMonthKey,
  targetMonthKey,
}: {
  workspaceId:
    string;

  targetMonthId:
    string;

  sourceMonthId:
    string;

  sourceMonthKey:
    string;

  targetMonthKey:
    string;
}):
  Promise<
    | {
        success:
          true;

        month:
          CopiedBudgetMonthRecord;
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

  const [
    monthResult,
    incomeResult,
    groupResult,
    itemResult,
  ] =
    await Promise.all([
      admin
        .from(
          "case_budget_budget_months",
        )
        .select(
          MONTH_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "id",
          targetMonthId,
        )
        .maybeSingle(),

      admin
        .from(
          "case_budget_budget_income_sources",
        )
        .select(
          INCOME_SOURCE_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          targetMonthId,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          },
        ),

      admin
        .from(
          "case_budget_budget_groups",
        )
        .select(
          GROUP_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          targetMonthId,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          },
        ),

      admin
        .from(
          "case_budget_budget_items",
        )
        .select(
          ITEM_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          targetMonthId,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          },
        ),
    ]);

  if (
    monthResult.error ||
    incomeResult.error ||
    groupResult.error ||
    itemResult.error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load copied budget month.",
      {
        workspaceId,
        targetMonthId,
        monthError:
          monthResult.error,
        incomeError:
          incomeResult.error,
        groupError:
          groupResult.error,
        itemError:
          itemResult.error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget copied the month but could not reload the completed budget.",
    };
  }

  const month =
    monthResult.data as unknown as
      | CaseBudgetBudgetMonthDatabaseRow
      | null;

  if (
    !month
  ) {
    return {
      success:
        false,

      message:
        "CASE Budget could not verify the copied budget month.",
    };
  }

  const incomeSources =
    (
      incomeResult.data ??
      []
    ) as unknown as
      CaseBudgetBudgetIncomeSourceDatabaseRow[];

  const groups =
    (
      groupResult.data ??
      []
    ) as unknown as
      CaseBudgetBudgetGroupDatabaseRow[];

  const items =
    (
      itemResult.data ??
      []
    ) as unknown as
      CaseBudgetBudgetItemDatabaseRow[];

  const mappedBudget =
    mapBudgetHierarchy({
      monthKey:
        targetMonthKey,
      incomeSources,
      groups,
      items,
    });

  const plannedIncome =
    normalizeDatabaseMoney(
      month.planned_income,
    );

  const actualIncome =
    normalizeDatabaseMoney(
      month.actual_income,
    );

  const startingBalance =
    normalizeDatabaseMoney(
      month.starting_balance,
    );

  const budgetMonth =
    normalizeDatabaseDate(
      month.budget_month,
    );

  const createdAt =
    normalizeIsoTimestamp(
      month.created_at,
    );

  const updatedAt =
    normalizeIsoTimestamp(
      month.updated_at,
    );

  if (
    plannedIncome ===
      null ||
    actualIncome ===
      null ||
    startingBalance ===
      null ||
    !budgetMonth ||
    !createdAt ||
    !updatedAt
  ) {
    return {
      success:
        false,

      message:
        "CASE Budget copied the month but could not normalize the completed budget.",
    };
  }

  return {
    success:
      true,

    month: {
      id:
        month.id,

      workspaceId:
        month.workspace_id,

      sourceMonthId,

      sourceMonthKey,

      monthKey:
        targetMonthKey,

      budgetMonth,

      name:
        normalizeOptionalText(
          month.name,
        ),

      plannedIncome,

      actualIncome,

      startingBalance,

      isClosed:
        Boolean(
          month.is_closed,
        ),

      closedAt:
        normalizeNullableIsoTimestamp(
          month.closed_at,
        ),

      closedByUserId:
        normalizeOptionalText(
          month.closed_by_user_id,
        ),

      note:
        normalizeOptionalText(
          month.note,
        ),

      createdAt,

      updatedAt,

      budget:
        mappedBudget,
    },
  };
}

function mapBudgetHierarchy({
  monthKey,
  incomeSources,
  groups,
  items,
}: {
  monthKey:
    string;

  incomeSources:
    CaseBudgetBudgetIncomeSourceDatabaseRow[];

  groups:
    CaseBudgetBudgetGroupDatabaseRow[];

  items:
    CaseBudgetBudgetItemDatabaseRow[];
}): BudgetMonthData {
  const mappedIncomeSources:
    BudgetIncomeSource[] =
    incomeSources
      .filter(
        (
          income,
        ) =>
          !income.is_archived,
      )
      .map(
        (
          income,
        ) => {
          const planned =
            normalizeNonNegativeDatabaseMoney(
              income.planned_amount,
            ) ??
            0;

          const received =
            normalizeNonNegativeDatabaseMoney(
              income.received_amount,
            ) ??
            0;

          return {
            id:
              income.id,

            name:
              income.name,

            amount:
              planned,

            receivedAmount:
              received,

            status:
              getIncomeStatus(
                planned,
                received,
              ),
          };
        },
      );

  const itemsByGroupId =
    new Map<
      string,
      BudgetCategoryData[]
    >();

  for (
    const item of
      items
  ) {
    if (
      item.is_archived
    ) {
      continue;
    }

    const current =
      itemsByGroupId.get(
        item.budget_group_id,
      ) ??
      [];

    current.push({
      id:
        item.id,

      name:
        item.name,

      amountType:
        normalizeBudgetAmountType(
          (
            item as CaseBudgetBudgetItemDatabaseRow & {
              amount_type?:
                unknown;
            }
          ).amount_type,
        ) ??
        "fixed",

      assignedAmount:
        normalizeNonNegativeDatabaseMoney(
          item.planned_amount,
        ) ??
        0,

      spentAmount:
        Math.abs(
          normalizeDatabaseMoney(
            item.activity_amount,
          ) ??
          0,
        ),

      rolloverAmount:
        normalizeNonNegativeDatabaseMoney(
          item.rollover_amount,
        ) ??
        0,

      availableAmount:
        normalizeDatabaseMoney(
          item.available_amount,
        ) ??
        0,
    });

    itemsByGroupId.set(
      item.budget_group_id,
      current,
    );
  }

  const budgetGroups:
    BudgetCategoryGroupData[] =
    groups
      .filter(
        (
          group,
        ) =>
          !group.is_archived,
      )
      .map(
        (
          group,
        ) => ({
          id:
            group.id,

          name:
            group.name,

          ...(normalizeOptionalText(
            group.description,
          )
            ? {
                description:
                  group.description ??
                  undefined,
              }
            : {}),

          categories:
            itemsByGroupId.get(
              group.id,
            ) ??
            [],
        }),
      );

  return {
    monthKey,

    incomeSources:
      mappedIncomeSources,

    budgetGroups,
  };
}

function buildApprovalDescription({
  sourceMonthKey,
  targetMonthKey,
  incomeSourceCount,
  groupCount,
  itemCount,
  plannedIncome,
}: {
  sourceMonthKey:
    string;

  targetMonthKey:
    string;

  incomeSourceCount:
    number;

  groupCount:
    number;

  itemCount:
    number;

  plannedIncome:
    number;
}) {
  return `Copy the ${formatMonthLabel(
    sourceMonthKey,
  )} budget structure to ${formatMonthLabel(
    targetMonthKey,
  )}: ${incomeSourceCount} income source${
    incomeSourceCount ===
    1
      ? ""
      : "s"
  }, ${groupCount} group${
    groupCount ===
    1
      ? ""
      : "s"
  }, and ${itemCount} budget item${
    itemCount ===
    1
      ? ""
      : "s"
  }. Planned income will be ${formatCurrency(
    plannedIncome,
  )}; received income and spending activity will reset to zero.`;
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

function shiftMonthKey(
  monthKey:
    string,
  amount:
    number,
) {
  const normalized =
    normalizeMonthKey(
      monthKey,
    );

  if (
    !normalized
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

  const date =
    new Date(
      Date.UTC(
        Number(
          yearText,
        ),
        Number(
          monthText,
        ) -
          1 +
          amount,
        1,
      ),
    );

  return `${String(
    date.getUTCFullYear(),
  ).padStart(
    4,
    "0",
  )}-${String(
    date.getUTCMonth() +
      1,
  ).padStart(
    2,
    "0",
  )}`;
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

function normalizeBudgetAmountType(
  value:
    unknown,
): BudgetAmountType | null {
  return value ===
      "fixed" ||
    value ===
      "variable" ||
    value ===
      "spending"
    ? value
    : null;
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

function normalizeNullableNonNegativeDatabaseMoney(
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

  return normalizeNonNegativeDatabaseMoney(
    value,
  );
}

function normalizeSortOrder(
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

function normalizeNullableDatabaseDate(
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

  return normalizeDatabaseDate(
    value,
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
  const normalized =
    normalizeMonthKey(
      monthKey,
    );

  if (
    !normalized
  ) {
    return monthKey;
  }

  const [
    yearText,
    monthText,
  ] =
    normalized.split(
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
      CopyCaseBudgetMonthResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CopyCaseBudgetMonthResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CopyCaseBudgetMonthResult {
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
