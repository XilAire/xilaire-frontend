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

export type ArchiveBudgetItemInput = {
  itemId:
    string;

  archived?:
    boolean;
};

export type ArchiveBudgetItemRecord = {
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

  isArchived:
    boolean;

  archivedAt:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;

  item:
    BudgetCategoryData;
};

export type ArchiveCaseBudgetItemResult =
  | {
      success:
        true;

      status:
        "archived" |
        "restored";

      item:
        ArchiveBudgetItemRecord;

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
          | "invalid-item"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-item-not-found"
          | "budget-group-not-found"
          | "budget-group-archived"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "approval-check-failed"
          | "budget-item-archive-conflict"
          | "budget-item-archive-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          "itemId";
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

/**
 * Soft-archives or restores one canonical monthly CASE Budget item.
 *
 * Production rules:
 *
 * - The active workspace is resolved from trusted server-side auth state.
 * - The client never supplies workspace_id or budget_month_id.
 * - Owner/Admin/Member may archive or restore.
 * - Viewer remains read-only.
 * - The item must belong to the active workspace.
 * - The parent budget month must exist and remain open.
 * - Archival is soft. The item row, transaction links, activity, and
 *   historical reporting data remain preserved.
 * - Restoring an item reactivates the same historical row.
 * - Restoring is blocked if the parent group is archived.
 * - Archiving an item is allowed even if the group is later archived, as long
 *   as the parent month remains open.
 * - Household budget-change approval runs before mutation.
 * - If approval is required, the database row remains unchanged.
 * - updated_at optimistic concurrency prevents stale archival changes.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function archiveBudgetItem(
  input:
    ArchiveBudgetItemInput,
): Promise<ArchiveCaseBudgetItemResult> {
  try {
    const itemId =
      normalizeOptionalText(
        input.itemId,
      );

    if (
      !itemId
    ) {
      return failure({
        code:
          "invalid-item",

        message:
          "A valid budget item is required.",

        field:
          "itemId",
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
          "View-only members cannot archive or restore budget items.",
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
          "case_budget_budget_items",
        )
        .select(
          ITEM_SELECT,
        )
        .eq(
          "id",
          itemId,
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
        "[CASE Budget Budget] Failed to load budget item for archival.",
        {
          workspaceId,
          userId,
          itemId,
          error:
            existingError,
        },
      );

      return failure({
        code:
          "budget-item-not-found",

        message:
          "CASE Budget could not load the selected budget item.",
      });
    }

    const existing =
      existingData as unknown as
        | CaseBudgetBudgetItemDatabaseRow
        | null;

    if (
      !existing
    ) {
      return failure({
        code:
          "budget-item-not-found",

        message:
          "The selected budget item could not be found in this workspace.",
      });
    }

    const groupResult =
      await loadBudgetGroup({
        workspaceId,
        groupId:
          existing.budget_group_id,
      });

    if (
      !groupResult.success
    ) {
      return failure({
        code:
          "budget-group-not-found",

        message:
          groupResult.message,
      });
    }

    const group =
      groupResult.group;

    const monthResult =
      await loadBudgetMonthById({
        workspaceId,
        budgetMonthId:
          existing.budget_month_id,
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
          "Budget items cannot be archived or restored in a closed budget month.",
      });
    }

    if (
      !shouldArchive &&
      group.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "This budget item cannot be restored while its parent budget group is archived. Restore the group first.",
      });
    }

    /*
     * Idempotent behavior:
     * if the item is already in the requested archival state, return the
     * canonical record without creating another approval request.
     */
    if (
      Boolean(
        existing.is_archived,
      ) ===
      shouldArchive
    ) {
      const record =
        mapBudgetItemRecord({
          row:
            existing,

          budgetMonth,
        });

      if (
        !record
      ) {
        return failure({
          code:
            "budget-item-archive-failed",

          message:
            "CASE Budget could not verify the current budget-item state.",
        });
      }

      return {
        success:
          true,

        status:
          shouldArchive
            ? "archived"
            : "restored",

        item:
          record,

        approvalRequired:
          false,

        approval:
          null,

        error:
          null,
      };
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
          "CASE Budget could not verify the budget item's month.",
      });
    }

    const monthKey =
      budgetMonthDate.slice(
        0,
        7,
      );

    const plannedAmount =
      normalizeNonNegativeDatabaseMoney(
        existing.planned_amount,
      );

    const activityAmount =
      normalizeDatabaseMoney(
        existing.activity_amount,
      );

    const availableAmount =
      normalizeDatabaseMoney(
        existing.available_amount,
      );

    const rolloverAmount =
      normalizeNonNegativeDatabaseMoney(
        existing.rollover_amount,
      );

    if (
      plannedAmount ===
        null ||
      activityAmount ===
        null ||
      availableAmount ===
        null ||
      rolloverAmount ===
        null
    ) {
      return failure({
        code:
          "budget-item-archive-failed",

        message:
          "CASE Budget could not verify the current budget-item amounts.",
      });
    }

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          shouldArchive
            ? `Archive budget item: ${existing.name}`
            : `Restore budget item: ${existing.name}`,

        description:
          buildApprovalDescription({
            monthKey,
            groupName:
              group.name,
            itemName:
              existing.name,
            plannedAmount,
            activityAmount,
            shouldArchive,
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
            shouldArchive
              ? "archive-budget-item"
              : "restore-budget-item",

          itemId,

          budgetMonthId:
            existing.budget_month_id,

          budgetGroupId:
            existing.budget_group_id,

          monthKey,

          previous: {
            isArchived:
              existing.is_archived,

            archivedAt:
              existing.archived_at,

            archivedByUserId:
              existing.archived_by_user_id,

            plannedAmount:
              existing.planned_amount,

            activityAmount:
              existing.activity_amount,

            availableAmount:
              existing.available_amount,

            rolloverAmount:
              existing.rollover_amount,

            updatedAt:
              existing.updated_at,
          },

          requested: {
            isArchived:
              shouldArchive,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-item archival.",
        {
          workspaceId,
          userId,
          itemId,
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
     * Re-check structural parents immediately before mutation so a restore
     * cannot race with a group archive or month close.
     */
    const freshGroupResult =
      await loadBudgetGroup({
        workspaceId,
        groupId:
          existing.budget_group_id,
      });

    if (
      !freshGroupResult.success
    ) {
      return failure({
        code:
          "budget-group-not-found",

        message:
          freshGroupResult.message,
      });
    }

    if (
      !shouldArchive &&
      freshGroupResult.group.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "The parent budget group was archived before this item could be restored.",
      });
    }

    const freshMonthResult =
      await loadBudgetMonthById({
        workspaceId,
        budgetMonthId:
          existing.budget_month_id,
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
          "The budget month was closed before the archival change completed.",
      });
    }

    const now =
      new Date().toISOString();

    const {
      data:
        updatedData,
      error:
        updateError,
    } =
      await admin
        .from(
          "case_budget_budget_items",
        )
        .update({
          updated_by_user_id:
            userId,

          is_archived:
            shouldArchive,

          archived_at:
            shouldArchive
              ? now
              : null,

          archived_by_user_id:
            shouldArchive
              ? userId
              : null,

          updated_at:
            now,
        })
        .eq(
          "id",
          itemId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "budget_month_id",
          existing.budget_month_id,
        )
        .eq(
          "budget_group_id",
          existing.budget_group_id,
        )
        .eq(
          "is_archived",
          Boolean(
            existing.is_archived,
          ),
        )
        .eq(
          "updated_at",
          existing.updated_at,
        )
        .select(
          ITEM_SELECT,
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to change budget-item archival state.",
        {
          workspaceId,
          userId,
          itemId,
          shouldArchive,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "budget-item-archive-failed",

        message:
          shouldArchive
            ? "CASE Budget could not archive the budget item."
            : "CASE Budget could not restore the budget item.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "budget-item-archive-conflict",

        message:
          "This budget item changed before the archival update completed. Refresh the budget and try again.",
      });
    }

    const updatedRow =
      updatedData as unknown as
        CaseBudgetBudgetItemDatabaseRow;

    const record =
      mapBudgetItemRecord({
        row:
          updatedRow,

        budgetMonth:
          freshMonthResult.month,
      });

    if (
      !record
    ) {
      return failure({
        code:
          "budget-item-archive-failed",

        message:
          shouldArchive
            ? "CASE Budget archived the budget item but could not verify its updated state."
            : "CASE Budget restored the budget item but could not verify its updated state.",
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        shouldArchive
          ? "archived"
          : "restored",

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
      "[CASE Budget Budget] Unexpected budget-item archival error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not change the budget-item archival state. Please try again.",
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
      "[CASE Budget Budget] Failed to load workspace during budget-item archival.",
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
        "Budget items cannot be archived or restored while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget-item archival.",
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
        "You do not have active access to archive or restore budget items in this workspace.",
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
      "[CASE Budget Budget] Failed to load parent group during budget-item archival.",
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
        "CASE Budget could not load the budget item's parent group.",
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
        "The budget item's parent group could not be found.",
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
      "[CASE Budget Budget] Failed to load parent month during budget-item archival.",
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
}): ArchiveBudgetItemRecord | null {
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

  const amountType =
    normalizeBudgetAmountType(
      (
        row as CaseBudgetBudgetItemDatabaseRow & {
          amount_type?:
            unknown;
        }
      ).amount_type,
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
    !amountType ||
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

      amountType,

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

    isArchived:
      Boolean(
        row.is_archived,
      ),

    archivedAt:
      normalizeNullableIsoTimestamp(
        row.archived_at,
      ),

    createdAt,

    updatedAt,

    item,
  };
}

function buildApprovalDescription({
  monthKey,
  groupName,
  itemName,
  plannedAmount,
  activityAmount,
  shouldArchive,
}: {
  monthKey:
    string;

  groupName:
    string;

  itemName:
    string;

  plannedAmount:
    number;

  activityAmount:
    number;

  shouldArchive:
    boolean;
}) {
  const action =
    shouldArchive
      ? "Archive"
      : "Restore";

  const activityText =
    activityAmount !==
    0
      ? ` It currently has ${formatCurrency(
          Math.abs(
            activityAmount,
          ),
        )} of recorded activity.`
      : "";

  return `${action} budget item "${itemName}" in "${groupName}" for the ${formatMonthLabel(
    monthKey,
  )} budget. The item has ${formatCurrency(
    plannedAmount,
  )} assigned.${activityText}`;
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
      ArchiveCaseBudgetItemResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      ArchiveCaseBudgetItemResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): ArchiveCaseBudgetItemResult {
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
