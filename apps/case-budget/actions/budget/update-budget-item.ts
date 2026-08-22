"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  syncAutomaticBillsForBudgetItem,
} from "@/lib/bills/bill-budget-sync";

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

type BudgetItemRowWithAmountType =
  CaseBudgetBudgetItemDatabaseRow & {
    amount_type:
      unknown;
  };

export type UpdateBudgetItemInput = {
  itemId:
    string;

  /**
   * Optional move to another budget group.
   *
   * The destination group must belong to the same active workspace and the
   * same budget month. Moving an item between months is intentionally not
   * supported by this action.
   */
  groupId?:
    string;

  name?:
    string;

  description?:
    string | null;

  plannedAmount?:
    number;

  amountType?:
    BudgetAmountType;

  rolloverAmount?:
    number;

  rolloverEnabled?:
    boolean;

  targetAmount?:
    number | null;

  targetDate?:
    string | null;

  isRecurring?:
    boolean;

  sortOrder?:
    number;
};

export type UpdateBudgetItemRecord = {
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

  createdAt:
    string;

  updatedAt:
    string;

  item:
    BudgetCategoryData;
};

export type UpdateCaseBudgetItemResult =
  | {
      success:
        true;

      status:
        "updated";

      item:
        UpdateBudgetItemRecord;

      approvalRequired:
        false;

      approval:
        null;

      linkedBillSync: {
        attempted:
          boolean;

        updatedCount:
          number;

        succeeded:
          boolean;
      };

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
          | "invalid-group"
          | "invalid-name"
          | "invalid-description"
          | "invalid-planned-amount"
          | "invalid-amount-type"
          | "invalid-rollover-amount"
          | "invalid-target-amount"
          | "invalid-target-date"
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-item-not-found"
          | "budget-item-archived"
          | "budget-group-not-found"
          | "budget-group-archived"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "cross-month-move-not-allowed"
          | "approval-check-failed"
          | "budget-item-update-conflict"
          | "budget-item-update-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "itemId"
          | "groupId"
          | "name"
          | "description"
          | "plannedAmount"
          | "amountType"
          | "rolloverAmount"
          | "targetAmount"
          | "targetDate"
          | "sortOrder"
          | "rolloverEnabled"
          | "isRecurring";
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
    "amount_type",
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
 * Updates one canonical monthly CASE Budget item.
 *
 * Production rules:
 *
 * - workspace_id is resolved from trusted server-side authentication.
 * - The client may identify only the item and optional destination group.
 * - Owner/Admin/Member may update.
 * - Viewer remains read-only.
 * - Archived items cannot be edited.
 * - The parent budget month must exist and remain open.
 * - The current and destination groups must belong to the active workspace.
 * - Moving an item to a group in another month is blocked.
 * - activity_amount is NOT accepted from the browser.
 * - available_amount is recalculated server-side using canonical activity:
 *
 *     available_amount =
 *       planned_amount
 *       + rollover_amount
 *       - activity_amount
 *
 * - Household budget-change approval runs before mutation.
 * - If approval is required, the item remains unchanged.
 * - updated_at optimistic concurrency prevents stale edits.
 * - Supabase is the only persistence layer.
 * - Automatic linked bills are synchronized server-side after a committed
 *   item rename, same-month group move, or amount-type change.
 * - A secondary linked-bill sync failure never misreports the already
 *   committed canonical budget-item update as failed.
 * - No localStorage is involved.
 */
export async function updateBudgetItem(
  input:
    UpdateBudgetItemInput,
): Promise<UpdateCaseBudgetItemResult> {
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
          "View-only members cannot update budget items.",
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
        "[CASE Budget Budget] Failed to load budget item for update.",
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
        | BudgetItemRowWithAmountType
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

    if (
      existing.is_archived
    ) {
      return failure({
        code:
          "budget-item-archived",

        message:
          "Archived budget items cannot be edited.",
      });
    }

    const currentGroupResult =
      await loadBudgetGroup({
        workspaceId,
        groupId:
          existing.budget_group_id,
      });

    if (
      !currentGroupResult.success
    ) {
      return failure({
        code:
          "budget-group-not-found",

        message:
          currentGroupResult.message,
      });
    }

    const currentGroup =
      currentGroupResult.group;

    if (
      currentGroup.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "Budget items cannot be edited while their parent group is archived.",
      });
    }

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
          "Budget items cannot be changed in a closed budget month.",
      });
    }

    let destinationGroup =
      currentGroup;

    if (
      input.groupId !==
      undefined
    ) {
      const requestedGroupId =
        normalizeOptionalText(
          input.groupId,
        );

      if (
        !requestedGroupId
      ) {
        return failure({
          code:
            "invalid-group",

          message:
            "A valid destination budget group is required.",

          field:
            "groupId",
        });
      }

      const destinationGroupResult =
        await loadBudgetGroup({
          workspaceId,
          groupId:
            requestedGroupId,
        });

      if (
        !destinationGroupResult.success
      ) {
        return failure({
          code:
            "budget-group-not-found",

          message:
            destinationGroupResult.message,

          field:
            "groupId",
        });
      }

      destinationGroup =
        destinationGroupResult.group;

      if (
        destinationGroup.is_archived
      ) {
        return failure({
          code:
            "budget-group-archived",

          message:
            "Budget items cannot be moved into an archived budget group.",

          field:
            "groupId",
        });
      }

      if (
        destinationGroup.budget_month_id !==
        existing.budget_month_id
      ) {
        return failure({
          code:
            "cross-month-move-not-allowed",

          message:
            "Budget items can only be moved between groups in the same budget month.",

          field:
            "groupId",
        });
      }
    }

    const validationResult =
      validateAndBuildNextState({
        existing,
        input,
        destinationGroupId:
          destinationGroup.id,
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
      const mapped =
        mapBudgetItemRecord({
          row:
            existing,

          budgetMonth,
        });

      if (
        !mapped
      ) {
        return failure({
          code:
            "budget-item-update-failed",

          message:
            "CASE Budget could not verify the current budget item.",
        });
      }

      return {
        success:
          true,

        status:
          "updated",

        item:
          mapped,

        approvalRequired:
          false,

        approval:
          null,

        linkedBillSync: {
          attempted:
            false,

          updatedCount:
            0,

          succeeded:
            true,
        },

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

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Update budget item: ${next.name}`,

        description:
          buildApprovalDescription({
            monthKey,
            previous: {
              groupName:
                currentGroup.name,

              name:
                existing.name,

              plannedAmount:
                normalizeNonNegativeDatabaseMoney(
                  existing.planned_amount,
                ) ??
                0,

              amountType:
                normalizeBudgetAmountType(
                  existing.amount_type,
                ) ??
                "fixed",

              rolloverAmount:
                normalizeNonNegativeDatabaseMoney(
                  existing.rollover_amount,
                ) ??
                0,

              rolloverEnabled:
                Boolean(
                  existing.rollover_enabled,
                ),

              targetAmount:
                normalizeNullableNonNegativeDatabaseMoney(
                  existing.target_amount,
                ),

              targetDate:
                normalizeNullableDatabaseDate(
                  existing.target_date,
                ),

              isRecurring:
                Boolean(
                  existing.is_recurring,
                ),
            },

            next: {
              ...next,

              groupName:
                destinationGroup.name,
            },
          }),

        amount:
          next.plannedAmount,

        target: {
          entityType:
            "budget-item",

          entityId:
            itemId,
        },

        payload: {
          operation:
            "update-budget-item",

          itemId,

          budgetMonthId:
            existing.budget_month_id,

          monthKey,

          previous: {
            budgetGroupId:
              existing.budget_group_id,

            name:
              existing.name,

            description:
              existing.description,

            plannedAmount:
              existing.planned_amount,

            amountType:
              existing.amount_type,

            activityAmount:
              existing.activity_amount,

            availableAmount:
              existing.available_amount,

            rolloverAmount:
              existing.rollover_amount,

            rolloverEnabled:
              existing.rollover_enabled,

            targetAmount:
              existing.target_amount,

            targetDate:
              existing.target_date,

            isRecurring:
              existing.is_recurring,

            sortOrder:
              existing.sort_order,

            updatedAt:
              existing.updated_at,
          },

          requested: {
            budgetGroupId:
              next.budgetGroupId,

            name:
              next.name,

            description:
              next.description,

            plannedAmount:
              next.plannedAmount,

            amountType:
              next.amountType,

            activityAmount:
              next.activityAmount,

            availableAmount:
              next.availableAmount,

            rolloverAmount:
              next.rolloverAmount,

            rolloverEnabled:
              next.rolloverEnabled,

            targetAmount:
              next.targetAmount,

            targetDate:
              next.targetDate,

            isRecurring:
              next.isRecurring,

            sortOrder:
              next.sortOrder,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-item update.",
        {
          workspaceId,
          userId,
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
     * Re-check the destination group and month immediately before update.
     */
    const freshDestinationGroupResult =
      await loadBudgetGroup({
        workspaceId,
        groupId:
          next.budgetGroupId,
      });

    if (
      !freshDestinationGroupResult.success
    ) {
      return failure({
        code:
          "budget-group-not-found",

        message:
          freshDestinationGroupResult.message,
      });
    }

    if (
      freshDestinationGroupResult.group.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "The destination budget group was archived before the update completed.",
      });
    }

    if (
      freshDestinationGroupResult.group.budget_month_id !==
      existing.budget_month_id
    ) {
      return failure({
        code:
          "cross-month-move-not-allowed",

        message:
          "The destination budget group no longer belongs to the same budget month.",
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
          "The budget month was closed before the item update completed.",
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

          budget_group_id:
            next.budgetGroupId,

          name:
            next.name,

          description:
            next.description,

          planned_amount:
            next.plannedAmount,

          amount_type:
            next.amountType,

          /*
           * Never accept activity from the client.
           * Preserve the canonical currently loaded activity amount.
           */
          activity_amount:
            next.activityAmount,

          available_amount:
            next.availableAmount,

          rollover_amount:
            next.rolloverAmount,

          rollover_enabled:
            next.rolloverEnabled,

          target_amount:
            next.targetAmount,

          target_date:
            next.targetDate,

          is_recurring:
            next.isRecurring,

          sort_order:
            next.sortOrder,

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
          "is_archived",
          false,
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
        "[CASE Budget Budget] Failed to update budget item.",
        {
          workspaceId,
          userId,
          itemId,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "budget-item-update-failed",

        message:
          "CASE Budget could not update the budget item.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "budget-item-update-conflict",

        message:
          "This budget item changed before your update completed. Refresh the budget and try again.",
      });
    }

    const updatedRow =
      updatedData as unknown as
        BudgetItemRowWithAmountType;

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
          "budget-item-update-failed",

        message:
          "CASE Budget updated the budget item but could not normalize its details.",
      });
    }

    const linkedBillSyncRequired =
      normalizeOptionalText(
        existing.name,
      ) !==
        next.name ||
      existing.budget_group_id !==
        next.budgetGroupId ||
      normalizeBudgetAmountType(
        existing.amount_type,
      ) !==
        next.amountType;

    let linkedBillSync = {
      attempted:
        false,

      updatedCount:
        0,

      succeeded:
        true,
    };

    if (
      linkedBillSyncRequired
    ) {
      linkedBillSync = {
        attempted:
          true,

        updatedCount:
          0,

        succeeded:
          false,
      };

      try {
        const syncResult =
          await syncAutomaticBillsForBudgetItem({
            userId,
            workspaceId,

            budgetItemId:
              itemId,

            budgetItemName:
              record.name,

            budgetItemAmountType:
              record.amountType,

            budgetGroupId:
              record.budgetGroupId,

            budgetGroupName:
              freshDestinationGroupResult.group.name,
          });

        linkedBillSync = {
          attempted:
            true,

          updatedCount:
            syncResult.updatedCount,

          succeeded:
            true,
        };
      } catch (
        syncError
      ) {
        /*
         * The canonical budget-item update has already committed.
         *
         * Do not report the entire item update as failed because that would
         * encourage the client to retry a mutation that already succeeded.
         * Log the secondary synchronization failure and return its status so
         * the UI/server telemetry can surface or retry it separately.
         */
        console.error(
          "[CASE Budget Budget] Budget item updated, but automatic linked-bill synchronization failed.",
          {
            workspaceId,
            userId,
            itemId,
            error:
              syncError,
          },
        );
      }
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "updated",

      item:
        record,

      approvalRequired:
        false,

      approval:
        null,

      linkedBillSync,

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
      "[CASE Budget Budget] Unexpected budget-item update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the budget item. Please try again.",
    });
  }
}

type NextBudgetItemState = {
  budgetGroupId:
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

function validateAndBuildNextState({
  existing,
  input,
  destinationGroupId,
}: {
  existing:
    BudgetItemRowWithAmountType;

  input:
    UpdateBudgetItemInput;

  destinationGroupId:
    string;
}):
  | {
      success:
        true;

      next:
        NextBudgetItemState;
    }
  | {
      success:
        false;

      result:
        UpdateCaseBudgetItemResult;
    } {
  const name =
    input.name ===
      undefined
      ? normalizeOptionalText(
          existing.name,
        )
      : normalizeOptionalText(
          input.name,
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
            `Budget item name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

          field:
            "name",
        }),
    };
  }

  const description =
    input.description ===
      undefined
      ? normalizeOptionalText(
          existing.description,
        )
      : normalizeOptionalText(
          input.description,
        );

  if (
    description &&
    description.length >
      DESCRIPTION_MAX_LENGTH
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "invalid-description",

          message:
            `Budget item description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,

          field:
            "description",
        }),
    };
  }

  let plannedAmount =
    normalizeNonNegativeDatabaseMoney(
      existing.planned_amount,
    );

  if (
    plannedAmount ===
    null
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "budget-item-update-failed",

          message:
            "CASE Budget could not verify the current planned amount.",
        }),
    };
  }

  if (
    input.plannedAmount !==
    undefined
  ) {
    const normalized =
      normalizeNonNegativeMoney(
        input.plannedAmount,
      );

    if (
      normalized ===
      null
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-planned-amount",

            message:
              "Planned amount must be zero or greater.",

            field:
              "plannedAmount",
          }),
      };
    }

    plannedAmount =
      normalized;
  }

  let amountType =
    normalizeBudgetAmountType(
      existing.amount_type,
    );

  if (
    !amountType
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "budget-item-update-failed",

          message:
            "CASE Budget could not verify the current budget item type.",
        }),
    };
  }

  if (
    input.amountType !==
    undefined
  ) {
    const normalized =
      normalizeBudgetAmountType(
        input.amountType,
      );

    if (
      !normalized
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-amount-type",

            message:
              "Budget item type must be fixed, variable, or spending.",

            field:
              "amountType",
          }),
      };
    }

    amountType =
      normalized;
  }

  let rolloverAmount =
    normalizeNonNegativeDatabaseMoney(
      existing.rollover_amount,
    );

  if (
    rolloverAmount ===
    null
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "budget-item-update-failed",

          message:
            "CASE Budget could not verify the current rollover amount.",
        }),
    };
  }

  if (
    input.rolloverAmount !==
    undefined
  ) {
    const normalized =
      normalizeNonNegativeMoney(
        input.rolloverAmount,
      );

    if (
      normalized ===
      null
    ) {
      return {
        success:
          false,

        result:
          failure({
            code:
              "invalid-rollover-amount",

            message:
              "Rollover amount must be zero or greater.",

            field:
              "rolloverAmount",
          }),
      };
    }

    rolloverAmount =
      normalized;
  }

  const rolloverEnabled =
    input.rolloverEnabled ===
      undefined
      ? Boolean(
          existing.rollover_enabled,
        )
      : input.rolloverEnabled;

  let targetAmount =
    normalizeNullableNonNegativeDatabaseMoney(
      existing.target_amount,
    );

  if (
    input.targetAmount !==
    undefined
  ) {
    if (
      input.targetAmount ===
      null
    ) {
      targetAmount =
        null;
    } else {
      const normalized =
        normalizeNonNegativeMoney(
          input.targetAmount,
        );

      if (
        normalized ===
        null
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-target-amount",

              message:
                "Target amount must be zero or greater.",

              field:
                "targetAmount",
            }),
        };
      }

      targetAmount =
        normalized;
    }
  }

  let targetDate =
    normalizeNullableDatabaseDate(
      existing.target_date,
    );

  if (
    input.targetDate !==
    undefined
  ) {
    if (
      input.targetDate ===
      null
    ) {
      targetDate =
        null;
    } else {
      const normalized =
        normalizeDatabaseDate(
          input.targetDate,
        );

      if (
        !normalized
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-target-date",

              message:
                "Target date must be a valid date in YYYY-MM-DD format.",

              field:
                "targetDate",
            }),
        };
      }

      targetDate =
        normalized;
    }
  }

  const isRecurring =
    input.isRecurring ===
      undefined
      ? Boolean(
          existing.is_recurring,
        )
      : input.isRecurring;

  const sortOrder =
    input.sortOrder ===
      undefined
      ? normalizeDatabaseSortOrder(
          existing.sort_order,
        )
      : normalizeSortOrder(
          input.sortOrder,
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
            "Budget item sort order must be zero or greater.",

          field:
            "sortOrder",
        }),
    };
  }

  const activityAmount =
    normalizeDatabaseMoney(
      existing.activity_amount,
    );

  if (
    activityAmount ===
    null
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "budget-item-update-failed",

          message:
            "CASE Budget could not verify the current transaction activity for this budget item.",
        }),
    };
  }

  const availableAmount =
    roundCurrency(
      plannedAmount +
      rolloverAmount -
      activityAmount,
    );

  return {
    success:
      true,

    next: {
      budgetGroupId:
        destinationGroupId,

      name,

      description,

      plannedAmount,

      amountType,

      activityAmount,

      availableAmount,

      rolloverAmount,

      rolloverEnabled,

      targetAmount,

      targetDate,

      isRecurring,

      sortOrder,
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
      "[CASE Budget Budget] Failed to load workspace during budget-item update.",
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
        "Budget items cannot be updated while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget-item update.",
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
        "You do not have active access to update budget items in this workspace.",
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
      "[CASE Budget Budget] Failed to load budget group during item update.",
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
      "[CASE Budget Budget] Failed to load parent month during budget-item update.",
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

function hasMeaningfulChanges({
  existing,
  next,
}: {
  existing:
    BudgetItemRowWithAmountType;

  next:
    NextBudgetItemState;
}) {
  return (
    existing.budget_group_id !==
      next.budgetGroupId ||
    normalizeOptionalText(
      existing.name,
    ) !==
      next.name ||
    normalizeOptionalText(
      existing.description,
    ) !==
      next.description ||
    normalizeNonNegativeDatabaseMoney(
      existing.planned_amount,
    ) !==
      next.plannedAmount ||
    normalizeBudgetAmountType(
      existing.amount_type,
    ) !==
      next.amountType ||
    normalizeDatabaseMoney(
      existing.activity_amount,
    ) !==
      next.activityAmount ||
    normalizeDatabaseMoney(
      existing.available_amount,
    ) !==
      next.availableAmount ||
    normalizeNonNegativeDatabaseMoney(
      existing.rollover_amount,
    ) !==
      next.rolloverAmount ||
    Boolean(
      existing.rollover_enabled,
    ) !==
      next.rolloverEnabled ||
    normalizeNullableNonNegativeDatabaseMoney(
      existing.target_amount,
    ) !==
      next.targetAmount ||
    normalizeNullableDatabaseDate(
      existing.target_date,
    ) !==
      next.targetDate ||
    Boolean(
      existing.is_recurring,
    ) !==
      next.isRecurring ||
    normalizeDatabaseSortOrder(
      existing.sort_order,
    ) !==
      next.sortOrder
  );
}

function mapBudgetItemRecord({
  row,
  budgetMonth,
}: {
  row:
    BudgetItemRowWithAmountType;

  budgetMonth:
    CaseBudgetBudgetMonthDatabaseRow;
}): UpdateBudgetItemRecord | null {
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

  const amountType =
    normalizeBudgetAmountType(
      row.amount_type,
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
    !amountType ||
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

    amountType,

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
  previous,
  next,
}: {
  monthKey:
    string;

  previous: {
    groupName:
      string;

    name:
      string;

    plannedAmount:
      number;

    amountType:
      BudgetAmountType;

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
  };

  next:
    NextBudgetItemState & {
      groupName:
        string;
    };
}) {
  const changes:
    string[] =
    [];

  if (
    previous.name !==
    next.name
  ) {
    changes.push(
      `rename to "${next.name}"`,
    );
  }

  if (
    previous.groupName !==
    next.groupName
  ) {
    changes.push(
      `move to "${next.groupName}"`,
    );
  }

  if (
    previous.plannedAmount !==
    next.plannedAmount
  ) {
    changes.push(
      `assigned amount to ${formatCurrency(
        next.plannedAmount,
      )}`,
    );
  }

  if (
    previous.amountType !==
    next.amountType
  ) {
    changes.push(
      `type to ${formatBudgetAmountType(
        next.amountType,
      )}`,
    );
  }

  if (
    previous.rolloverAmount !==
    next.rolloverAmount
  ) {
    changes.push(
      `rollover amount to ${formatCurrency(
        next.rolloverAmount,
      )}`,
    );
  }

  if (
    previous.rolloverEnabled !==
    next.rolloverEnabled
  ) {
    changes.push(
      next.rolloverEnabled
        ? "enable rollover"
        : "disable rollover",
    );
  }

  if (
    previous.targetAmount !==
    next.targetAmount
  ) {
    changes.push(
      next.targetAmount ===
        null
        ? "remove target amount"
        : `target amount to ${formatCurrency(
            next.targetAmount,
          )}`,
    );
  }

  if (
    previous.targetDate !==
    next.targetDate
  ) {
    changes.push(
      next.targetDate
        ? `target date to ${next.targetDate}`
        : "remove target date",
    );
  }

  if (
    previous.isRecurring !==
    next.isRecurring
  ) {
    changes.push(
      next.isRecurring
        ? "mark recurring"
        : "mark non-recurring",
    );
  }

  if (
    changes.length ===
    0
  ) {
    return `Update budget item "${next.name}" in the ${formatMonthLabel(
      monthKey,
    )} budget.`;
  }

  return `Update budget item "${previous.name}" in the ${formatMonthLabel(
    monthKey,
  )} budget: ${changes.join(
    ", ",
  )}.`;
}

function normalizeBudgetAmountType(
  value:
    unknown,
): BudgetAmountType | null {
  if (
    value === "fixed" ||
    value === "variable" ||
    value === "spending"
  ) {
    return value;
  }

  return null;
}

function formatBudgetAmountType(
  amountType:
    BudgetAmountType,
) {
  switch (
    amountType
  ) {
    case "variable":
      return "Variable";

    case "spending":
      return "Spending";

    case "fixed":
    default:
      return "Fixed";
  }
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
      UpdateCaseBudgetItemResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      UpdateCaseBudgetItemResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): UpdateCaseBudgetItemResult {
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
