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
  BudgetCategoryData,
} from "@/types/budget";

import type {
  CaseBudgetBudgetGroupDatabaseRow,
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

export type CreateBudgetItemInput = {
  /**
   * Canonical parent budget-group ID.
   *
   * workspace_id and budget_month_id are intentionally not accepted from
   * the browser. They are derived from the group after workspace scoping.
   */
  groupId:
    string;

  name:
    string;

  description?:
    string;

  /**
   * Amount assigned/planned for this item in the selected month.
   */
  plannedAmount:
    number;

  /**
   * Optional starting rollover amount.
   *
   * New normal monthly items should generally leave this omitted so it
   * starts at zero. It exists for controlled month-copy / migration paths.
   */
  rolloverAmount?:
    number;

  rolloverEnabled?:
    boolean;

  targetAmount?:
    number;

  /**
   * ISO calendar date in YYYY-MM-DD format.
   */
  targetDate?:
    string;

  isRecurring?:
    boolean;

  sortOrder?:
    number;
};

export type CreateBudgetItemRecord = {
  id:
    string;

  workspaceId:
    string;

  budgetMonthId:
    string;

  budgetGroupId:
    string;

  monthKey:
    string;

  name:
    string;

  description:
    string | null;

  plannedAmount:
    number;

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

  createdAt:
    string;

  updatedAt:
    string;

  item:
    BudgetCategoryData;
};

export type CreateCaseBudgetItemResult =
  | {
      success:
        true;

      status:
        "created";

      item:
        CreateBudgetItemRecord;

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

      item:
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

      item:
        null;

      approvalRequired:
        false;

      approval:
        null;

      error: {
        code:
          | "invalid-group"
          | "invalid-name"
          | "invalid-description"
          | "invalid-planned-amount"
          | "invalid-rollover-amount"
          | "invalid-target-amount"
          | "invalid-target-date"
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-group-not-found"
          | "budget-group-archived"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "approval-check-failed"
          | "budget-item-create-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "groupId"
          | "name"
          | "description"
          | "plannedAmount"
          | "rolloverAmount"
          | "targetAmount"
          | "targetDate"
          | "sortOrder";
      };
    };

const BUDGET_PATH =
  "/dashboard/budget";

const DASHBOARD_PATH =
  "/dashboard";

const TRANSACTIONS_PATH =
  "/dashboard/transactions";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const NAME_MAX_LENGTH =
  160;

const DESCRIPTION_MAX_LENGTH =
  1000;

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
 * Creates one canonical monthly CASE Budget item.
 *
 * Production rules:
 *
 * - workspace_id comes from trusted server-side auth state.
 * - budget_month_id comes from the selected canonical group.
 * - The client cannot choose a workspace or month directly.
 * - Owner/Admin/Member may create.
 * - Viewer remains read-only.
 * - The parent group must belong to the active workspace and must not be
 *   archived.
 * - The parent month must exist and remain open.
 * - activity_amount always starts at 0 for a newly created item.
 * - available_amount is calculated server-side as:
 *
 *     planned_amount + rollover_amount - activity_amount
 *
 *   Since activity starts at zero, a new item's available amount is:
 *
 *     planned_amount + rollover_amount
 *
 * - Browser/client code must never initialize or directly manipulate
 *   transaction activity.
 * - Household budget-change approval runs before insertion.
 * - If approval is required, no budget item is inserted.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function createBudgetItem(
  input:
    CreateBudgetItemInput,
): Promise<CreateCaseBudgetItemResult> {
  try {
    const groupId =
      normalizeOptionalText(
        input.groupId,
      );

    if (
      !groupId
    ) {
      return failure({
        code:
          "invalid-group",

        message:
          "A valid budget group is required.",

        field:
          "groupId",
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
          `Budget item name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

        field:
          "name",
      });
    }

    const description =
      normalizeOptionalText(
        input.description,
      );

    if (
      description &&
      description.length >
        DESCRIPTION_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-description",

        message:
          `Budget item description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,

        field:
          "description",
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
          "Planned amount must be zero or greater.",

        field:
          "plannedAmount",
      });
    }

    const rolloverAmount =
      input.rolloverAmount ===
        undefined
        ? 0
        : normalizeNonNegativeMoney(
            input.rolloverAmount,
          );

    if (
      rolloverAmount ===
      null
    ) {
      return failure({
        code:
          "invalid-rollover-amount",

        message:
          "Rollover amount must be zero or greater.",

        field:
          "rolloverAmount",
      });
    }

    const rolloverEnabled =
      input.rolloverEnabled ??
      false;

    const targetAmount =
      input.targetAmount ===
        undefined
        ? null
        : normalizeNonNegativeMoney(
            input.targetAmount,
          );

    if (
      input.targetAmount !==
        undefined &&
      targetAmount ===
        null
    ) {
      return failure({
        code:
          "invalid-target-amount",

        message:
          "Target amount must be zero or greater.",

        field:
          "targetAmount",
      });
    }

    const targetDate =
      input.targetDate ===
        undefined
        ? null
        : normalizeDatabaseDate(
            input.targetDate,
          );

    if (
      input.targetDate !==
        undefined &&
      targetDate ===
        null
    ) {
      return failure({
        code:
          "invalid-target-date",

        message:
          "Target date must be a valid date in YYYY-MM-DD format.",

        field:
          "targetDate",
      });
    }

    const isRecurring =
      input.isRecurring ??
      false;

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
          "Budget item sort order must be zero or greater.",

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
          "View-only members cannot create budget items.",
      });
    }

    const groupResult =
      await loadBudgetGroup({
        workspaceId,
        groupId,
      });

    if (
      !groupResult.success
    ) {
      return failure({
        code:
          "budget-group-not-found",

        message:
          groupResult.message,

        field:
          "groupId",
      });
    }

    const group =
      groupResult.group;

    if (
      group.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "Budget items cannot be added to an archived budget group.",

        field:
          "groupId",
      });
    }

    const monthResult =
      await loadBudgetMonthById({
        workspaceId,
        budgetMonthId:
          group.budget_month_id,
      });

    if (
      !monthResult.success
    ) {
      return failure({
        code:
          "budget-month-not-found",

        message:
          monthResult.message,
      });
    }

    const budgetMonth =
      monthResult.month;

    if (
      budgetMonth.is_closed
    ) {
      return failure({
        code:
          "budget-month-closed",

        message:
          "Budget items cannot be added to a closed budget month.",
      });
    }

    const budgetMonthDate =
      normalizeDatabaseDate(
        budgetMonth.budget_month,
      );

    if (
      !budgetMonthDate
    ) {
      return failure({
        code:
          "budget-month-not-found",

        message:
          "CASE Budget could not verify the selected budget month.",
      });
    }

    const monthKey =
      budgetMonthDate.slice(
        0,
        7,
      );

    const activityAmount =
      0;

    const availableAmount =
      roundCurrency(
        plannedAmount +
        rolloverAmount -
        activityAmount,
      );

    const itemId =
      crypto.randomUUID();

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Create budget item: ${name}`,

        description:
          buildApprovalDescription({
            monthKey,
            groupName:
              group.name,
            name,
            plannedAmount,
            rolloverAmount,
            rolloverEnabled,
            targetAmount,
            targetDate,
            isRecurring,
          }),

        amount:
          plannedAmount,

        target: {
          entityType:
            "budget-item",

          entityId:
            itemId,
        },

        payload: {
          operation:
            "create-budget-item",

          itemId,

          budgetMonthId:
            group.budget_month_id,

          budgetGroupId:
            group.id,

          monthKey,

          name,

          description,

          plannedAmount,

          activityAmount,

          availableAmount,

          rolloverAmount,

          rolloverEnabled,

          targetAmount,

          targetDate,

          isRecurring,

          sortOrder,
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-item creation.",
        {
          workspaceId,
          userId,
          budgetMonthId:
            group.budget_month_id,
          groupId:
            group.id,
          itemId,
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

        item:
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
     * Re-read structural parents immediately before insertion so we do not
     * create an item under a group/month that was archived or closed after
     * approval enforcement.
     */
    const freshGroupResult =
      await loadBudgetGroup({
        workspaceId,
        groupId,
      });

    if (
      !freshGroupResult.success ||
      freshGroupResult.group.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "The budget group changed before the item could be created. Refresh the budget and try again.",
      });
    }

    const freshMonthResult =
      await loadBudgetMonthById({
        workspaceId,
        budgetMonthId:
          freshGroupResult.group.budget_month_id,
      });

    if (
      !freshMonthResult.success
    ) {
      return failure({
        code:
          "budget-month-not-found",

        message:
          freshMonthResult.message,
      });
    }

    if (
      freshMonthResult.month.is_closed
    ) {
      return failure({
        code:
          "budget-month-closed",

        message:
          "The budget month was closed before the item could be created.",
      });
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
          "case_budget_budget_items",
        )
        .insert({
          id:
            itemId,

          workspace_id:
            workspaceId,

          budget_month_id:
            freshGroupResult.group.budget_month_id,

          budget_group_id:
            freshGroupResult.group.id,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          name,

          description,

          planned_amount:
            plannedAmount,

          activity_amount:
            activityAmount,

          available_amount:
            availableAmount,

          rollover_amount:
            rolloverAmount,

          rollover_enabled:
            rolloverEnabled,

          target_amount:
            targetAmount,

          target_date:
            targetDate,

          is_recurring:
            isRecurring,

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
          ITEM_SELECT,
        )
        .maybeSingle();

    if (
      createError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to create budget item.",
        {
          workspaceId,
          userId,
          budgetMonthId:
            freshGroupResult.group.budget_month_id,
          groupId:
            freshGroupResult.group.id,
          itemId,
          error:
            createError,
        },
      );

      return failure({
        code:
          "budget-item-create-failed",

        message:
          "CASE Budget could not create the budget item.",
      });
    }

    if (
      !createdData
    ) {
      return failure({
        code:
          "budget-item-create-failed",

        message:
          "CASE Budget created the budget item but could not verify the new record.",
      });
    }

    const row =
      createdData as unknown as
        CaseBudgetBudgetItemDatabaseRow;

    const record =
      mapBudgetItemRecord({
        row,

        budgetMonth:
          freshMonthResult.month,
      });

    if (
      !record
    ) {
      return failure({
        code:
          "budget-item-create-failed",

        message:
          "CASE Budget created the budget item but could not normalize its details.",
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "created",

      item:
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
      "[CASE Budget Budget] Unexpected budget-item creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the budget item. Please try again.",
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
      "[CASE Budget Budget] Failed to load workspace during budget-item creation.",
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
        "Budget items cannot be created while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget-item creation.",
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
        "You do not have active access to create budget items in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadBudgetGroup({
  workspaceId,
  groupId,
}: {
  workspaceId:
    string;

  groupId:
    string;
}):
  Promise<
    | {
        success:
          true;

        group:
          CaseBudgetBudgetGroupDatabaseRow;
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
        "case_budget_budget_groups",
      )
      .select(
        GROUP_SELECT,
      )
      .eq(
        "id",
        groupId,
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
      "[CASE Budget Budget] Failed to load parent group during budget-item creation.",
      {
        workspaceId,
        groupId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the selected budget group.",
    };
  }

  const group =
    data as unknown as
      | CaseBudgetBudgetGroupDatabaseRow
      | null;

  if (
    !group
  ) {
    return {
      success:
        false,

      message:
        "The selected budget group could not be found in this workspace.",
    };
  }

  return {
    success:
      true,

    group,
  };
}

async function loadBudgetMonthById({
  workspaceId,
  budgetMonthId,
}: {
  workspaceId:
    string;

  budgetMonthId:
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
        MONTH_SELECT,
      )
      .eq(
        "id",
        budgetMonthId,
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
      "[CASE Budget Budget] Failed to load parent month during budget-item creation.",
      {
        workspaceId,
        budgetMonthId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the budget item's month.",
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

      message:
        "The budget item's month could not be found.",
    };
  }

  return {
    success:
      true,

    month,
  };
}

function mapBudgetItemRecord({
  row,
  budgetMonth,
}: {
  row:
    CaseBudgetBudgetItemDatabaseRow;

  budgetMonth:
    CaseBudgetBudgetMonthDatabaseRow;
}): CreateBudgetItemRecord | null {
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

  const budgetGroupId =
    normalizeOptionalText(
      row.budget_group_id,
    );

  const name =
    normalizeOptionalText(
      row.name,
    );

  const plannedAmount =
    normalizeNonNegativeDatabaseMoney(
      row.planned_amount,
    );

  const activityAmount =
    normalizeDatabaseMoney(
      row.activity_amount,
    );

  const availableAmount =
    normalizeDatabaseMoney(
      row.available_amount,
    );

  const rolloverAmount =
    normalizeNonNegativeDatabaseMoney(
      row.rollover_amount,
    );

  const targetAmount =
    normalizeNullableNonNegativeDatabaseMoney(
      row.target_amount,
    );

  const targetDate =
    normalizeNullableDatabaseDate(
      row.target_date,
    );

  const budgetMonthDate =
    normalizeDatabaseDate(
      budgetMonth.budget_month,
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
    !budgetGroupId ||
    !name ||
    plannedAmount ===
      null ||
    activityAmount ===
      null ||
    availableAmount ===
      null ||
    rolloverAmount ===
      null ||
    !budgetMonthDate ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const description =
    normalizeOptionalText(
      row.description,
    );

  const item:
    BudgetCategoryData = {
      id,

      name,

      assignedAmount:
        plannedAmount,

      spentAmount:
        roundCurrency(
          Math.abs(
            activityAmount,
          ),
        ),

      rolloverAmount,

      availableAmount,
    };

  return {
    id,

    workspaceId,

    budgetMonthId,

    budgetGroupId,

    monthKey:
      budgetMonthDate.slice(
        0,
        7,
      ),

    name,

    description,

    plannedAmount,

    activityAmount,

    availableAmount,

    rolloverAmount,

    rolloverEnabled:
      Boolean(
        row.rollover_enabled,
      ),

    targetAmount,

    targetDate,

    isRecurring:
      Boolean(
        row.is_recurring,
      ),

    sortOrder:
      normalizeDatabaseSortOrder(
        row.sort_order,
      ),

    createdAt,

    updatedAt,

    item,
  };
}

function buildApprovalDescription({
  monthKey,
  groupName,
  name,
  plannedAmount,
  rolloverAmount,
  rolloverEnabled,
  targetAmount,
  targetDate,
  isRecurring,
}: {
  monthKey:
    string;

  groupName:
    string;

  name:
    string;

  plannedAmount:
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
}) {
  const details:
    string[] = [
      `${formatCurrency(
        plannedAmount,
      )} assigned`,
  ];

  if (
    rolloverEnabled
  ) {
    details.push(
      rolloverAmount >
      0
        ? `${formatCurrency(
            rolloverAmount,
          )} starting rollover`
        : "rollover enabled",
    );
  }

  if (
    targetAmount !==
    null
  ) {
    details.push(
      `target ${formatCurrency(
        targetAmount,
      )}`,
    );
  }

  if (
    targetDate
  ) {
    details.push(
      `target date ${targetDate}`,
    );
  }

  if (
    isRecurring
  ) {
    details.push(
      "recurring",
    );
  }

  return `Create budget item "${name}" in "${groupName}" for the ${formatMonthLabel(
    monthKey,
  )} budget with ${details.join(
    ", ",
  )}.`;
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
      CreateCaseBudgetItemResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CreateCaseBudgetItemResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CreateCaseBudgetItemResult {
  return {
    success:
      false,

    status:
      "error",

    item:
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
