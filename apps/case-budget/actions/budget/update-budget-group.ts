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
  BudgetCategoryGroupData,
} from "@/types/budget";

import type {
  CaseBudgetBudgetGroupDatabaseRow,
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

type BudgetItemReferenceRow = {
  id:
    string;

  name:
    string;
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

export type UpdateBudgetGroupInput = {
  groupId:
    string;

  name?:
    string;

  description?:
    string | null;

  sortOrder?:
    number;

  isCollapsed?:
    boolean;
};

export type UpdateBudgetGroupRecord = {
  id:
    string;

  workspaceId:
    string;

  budgetMonthId:
    string;

  monthKey:
    string;

  name:
    string;

  description:
    string | null;

  sortOrder:
    number;

  isCollapsed:
    boolean;

  createdAt:
    string;

  updatedAt:
    string;

  group:
    BudgetCategoryGroupData;
};

export type UpdateCaseBudgetGroupResult =
  | {
      success:
        true;

      status:
        "updated";

      group:
        UpdateBudgetGroupRecord;

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

      group:
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

      group:
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
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-group-not-found"
          | "budget-group-archived"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "approval-check-failed"
          | "budget-group-update-conflict"
          | "budget-group-update-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "groupId"
          | "name"
          | "description"
          | "sortOrder"
          | "isCollapsed";
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

/**
 * Updates one canonical CASE Budget group.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server-side auth state.
 * - The client never supplies workspace_id or budget_month_id.
 * - Owner/Admin/Member may update.
 * - Viewer remains read-only.
 * - The group must belong to the active workspace.
 * - Archived groups cannot be edited.
 * - Closed budget months are immutable.
 * - Only explicitly supplied fields are changed.
 * - Household budget-change approval runs before mutation.
 * - If approval is required, the group remains unchanged.
 * - updated_at optimistic concurrency prevents stale edits.
 * - Supabase is the only persistence layer.
 * - A committed group rename synchronizes the category metadata stored on
 *   automatic bills linked to items in this group.
 * - Non-name group changes do not trigger unnecessary bill writes.
 * - A secondary linked-bill sync failure never misreports an already
 *   committed canonical group update as failed.
 * - No localStorage is involved.
 */
export async function updateBudgetGroup(
  input:
    UpdateBudgetGroupInput,
): Promise<UpdateCaseBudgetGroupResult> {
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
          "View-only members cannot update budget groups.",
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
      existingError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to load budget group for update.",
        {
          workspaceId,
          userId,
          groupId,
          error:
            existingError,
        },
      );

      return failure({
        code:
          "budget-group-not-found",

        message:
          "CASE Budget could not load the selected budget group.",
      });
    }

    const existing =
      existingData as unknown as
        | CaseBudgetBudgetGroupDatabaseRow
        | null;

    if (
      !existing
    ) {
      return failure({
        code:
          "budget-group-not-found",

        message:
          "The selected budget group could not be found in this workspace.",
      });
    }

    if (
      existing.is_archived
    ) {
      return failure({
        code:
          "budget-group-archived",

        message:
          "Archived budget groups cannot be edited.",
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
          "Budget groups cannot be changed in a closed budget month.",
      });
    }

    const validationResult =
      validateAndBuildNextState({
        existing,
        input,
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
        mapBudgetGroupRecord({
          row:
            existing,

          budgetMonth,
        });

      if (
        !mapped
      ) {
        return failure({
          code:
            "budget-group-update-failed",

          message:
            "CASE Budget could not verify the current budget group.",
        });
      }

      return {
        success:
          true,

        status:
          "updated",

        group:
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

    const monthKey =
      normalizeDatabaseDate(
        budgetMonth.budget_month,
      )?.slice(
        0,
        7,
      ) ??
      null;

    if (
      !monthKey
    ) {
      return failure({
        code:
          "budget-month-not-found",

        message:
          "CASE Budget could not verify the budget group month.",
      });
    }

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Update budget group: ${next.name}`,

        description:
          buildApprovalDescription({
            monthKey,
            previous: {
              name:
                existing.name,

              description:
                normalizeOptionalText(
                  existing.description,
                ),

              sortOrder:
                normalizeDatabaseSortOrder(
                  existing.sort_order,
                ),

              isCollapsed:
                Boolean(
                  existing.is_collapsed,
                ),
            },
            next,
          }),

        amount:
          null,

        target: {
          entityType:
            "budget-group",

          entityId:
            groupId,
        },

        payload: {
          operation:
            "update-budget-group",

          groupId,

          budgetMonthId:
            existing.budget_month_id,

          monthKey,

          previous: {
            name:
              existing.name,

            description:
              existing.description,

            sortOrder:
              existing.sort_order,

            isCollapsed:
              existing.is_collapsed,

            updatedAt:
              existing.updated_at,
          },

          requested: {
            name:
              next.name,

            description:
              next.description,

            sortOrder:
              next.sortOrder,

            isCollapsed:
              next.isCollapsed,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-group update.",
        {
          workspaceId,
          userId,
          groupId,
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

        group:
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

    const {
      data:
        updatedData,
      error:
        updateError,
    } =
      await admin
        .from(
          "case_budget_budget_groups",
        )
        .update({
          updated_by_user_id:
            userId,

          name:
            next.name,

          description:
            next.description,

          sort_order:
            next.sortOrder,

          is_collapsed:
            next.isCollapsed,

          updated_at:
            now,
        })
        .eq(
          "id",
          groupId,
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
          GROUP_SELECT,
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to update budget group.",
        {
          workspaceId,
          userId,
          groupId,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "budget-group-update-failed",

        message:
          "CASE Budget could not update the budget group.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "budget-group-update-conflict",

        message:
          "This budget group changed before your update completed. Refresh the budget and try again.",
      });
    }

    const updatedRow =
      updatedData as unknown as
        CaseBudgetBudgetGroupDatabaseRow;

    const record =
      mapBudgetGroupRecord({
        row:
          updatedRow,

        budgetMonth,
      });

    if (
      !record
    ) {
      return failure({
        code:
          "budget-group-update-failed",

        message:
          "CASE Budget updated the budget group but could not normalize its details.",
      });
    }

    const groupNameChanged =
      normalizeOptionalText(
        existing.name,
      ) !==
        record.name;

    let linkedBillSync = {
      attempted:
        false,

      updatedCount:
        0,

      succeeded:
        true,
    };

    if (
      groupNameChanged
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
        const itemReferencesResult =
          await loadBudgetItemReferencesForGroup({
            workspaceId,

            budgetMonthId:
              existing.budget_month_id,

            groupId,
          });

        if (
          !itemReferencesResult.success
        ) {
          throw new Error(
            itemReferencesResult.message,
          );
        }

        let updatedCount =
          0;

        for (
          const item
          of itemReferencesResult.items
        ) {
          const syncResult =
            await syncAutomaticBillsForBudgetItem({
              userId,
              workspaceId,

              budgetItemId:
                item.id,

              budgetItemName:
                item.name,

              budgetGroupId:
                groupId,

              budgetGroupName:
                record.name,
            });

          updatedCount +=
            syncResult.updatedCount;
        }

        linkedBillSync = {
          attempted:
            true,

          updatedCount,

          succeeded:
            true,
        };
      } catch (
        syncError
      ) {
        /*
         * The canonical budget-group rename has already committed.
         *
         * Do not report the group update as failed because that could cause
         * the caller to retry a mutation that already succeeded. The
         * secondary linked-bill synchronization can be retried separately.
         */
        console.error(
          "[CASE Budget Budget] Budget group updated, but automatic linked-bill synchronization failed.",
          {
            workspaceId,
            userId,
            groupId,
            previousName:
              existing.name,
            updatedName:
              record.name,
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

      group:
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
      "[CASE Budget Budget] Unexpected budget-group update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the budget group. Please try again.",
    });
  }
}

type NextBudgetGroupState = {
  name:
    string;

  description:
    string | null;

  sortOrder:
    number;

  isCollapsed:
    boolean;
};

function validateAndBuildNextState({
  existing,
  input,
}: {
  existing:
    CaseBudgetBudgetGroupDatabaseRow;

  input:
    UpdateBudgetGroupInput;
}):
  | {
      success:
        true;

      next:
        NextBudgetGroupState;
    }
  | {
      success:
        false;

      result:
        UpdateCaseBudgetGroupResult;
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
            `Budget group name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

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
            `Budget group description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,

          field:
            "description",
        }),
    };
  }

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
            "Budget group sort order must be zero or greater.",

          field:
            "sortOrder",
        }),
    };
  }

  const isCollapsed =
    input.isCollapsed ===
      undefined
      ? Boolean(
          existing.is_collapsed,
        )
      : input.isCollapsed;

  return {
    success:
      true,

    next: {
      name,

      description,

      sortOrder,

      isCollapsed,
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
      "[CASE Budget Budget] Failed to load workspace during budget-group update.",
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
        "Budget groups cannot be updated while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget-group update.",
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
        "You do not have active access to update budget groups in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
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
      "[CASE Budget Budget] Failed to load parent month during budget-group update.",
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
        "CASE Budget could not load the budget group's month.",
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
        "The budget group's month could not be found.",
    };
  }

  return {
    success:
      true,

    month,
  };
}

async function loadBudgetItemReferencesForGroup({
  workspaceId,
  budgetMonthId,
  groupId,
}: {
  workspaceId:
    string;

  budgetMonthId:
    string;

  groupId:
    string;
}): Promise<
  | {
      success:
        true;

      items:
        BudgetItemReferenceRow[];
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
        "case_budget_budget_items",
      )
      .select(
        "id,name",
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
        "budget_group_id",
        groupId,
      );

  if (
    error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to load budget items for linked-bill group synchronization.",
      {
        workspaceId,
        budgetMonthId,
        groupId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the group's budget items for linked-bill synchronization.",
    };
  }

  const items =
    (
      Array.isArray(
        data,
      )
        ? data
        : []
    )
      .map(
        (
          row,
        ) => {
          const id =
            normalizeOptionalText(
              row.id,
            );

          const name =
            normalizeOptionalText(
              row.name,
            );

          if (
            !id ||
            !name
          ) {
            return null;
          }

          return {
            id,
            name,
          };
        },
      )
      .filter(
        (
          item,
        ): item is BudgetItemReferenceRow =>
          item !==
          null,
      );

  return {
    success:
      true,

    items,
  };
}

function hasMeaningfulChanges({
  existing,
  next,
}: {
  existing:
    CaseBudgetBudgetGroupDatabaseRow;

  next:
    NextBudgetGroupState;
}) {
  return (
    normalizeOptionalText(
      existing.name,
    ) !==
      next.name ||
    normalizeOptionalText(
      existing.description,
    ) !==
      next.description ||
    normalizeDatabaseSortOrder(
      existing.sort_order,
    ) !==
      next.sortOrder ||
    Boolean(
      existing.is_collapsed,
    ) !==
      next.isCollapsed
  );
}

function mapBudgetGroupRecord({
  row,
  budgetMonth,
}: {
  row:
    CaseBudgetBudgetGroupDatabaseRow;

  budgetMonth:
    CaseBudgetBudgetMonthDatabaseRow;
}): UpdateBudgetGroupRecord | null {
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
    !name ||
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

  const group:
    BudgetCategoryGroupData = {
      id,

      name,

      ...(description
        ? {
            description,
          }
        : {}),

      categories:
        [],
    };

  return {
    id,

    workspaceId,

    budgetMonthId,

    monthKey:
      budgetMonthDate.slice(
        0,
        7,
      ),

    name,

    description,

    sortOrder:
      normalizeDatabaseSortOrder(
        row.sort_order,
      ),

    isCollapsed:
      Boolean(
        row.is_collapsed,
      ),

    createdAt,

    updatedAt,

    group,
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
    name:
      string;

    description:
      string | null;

    sortOrder:
      number;

    isCollapsed:
      boolean;
  };

  next:
    NextBudgetGroupState;
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
    previous.description !==
    next.description
  ) {
    changes.push(
      next.description
        ? "update description"
        : "remove description",
    );
  }

  if (
    previous.sortOrder !==
    next.sortOrder
  ) {
    changes.push(
      `sort order to ${next.sortOrder}`,
    );
  }

  if (
    previous.isCollapsed !==
    next.isCollapsed
  ) {
    changes.push(
      next.isCollapsed
        ? "collapse group"
        : "expand group",
    );
  }

  if (
    changes.length ===
    0
  ) {
    return `Update budget group "${next.name}" in the ${formatMonthLabel(
      monthKey,
    )} budget.`;
  }

  return `Update budget group "${previous.name}" in the ${formatMonthLabel(
    monthKey,
  )} budget: ${changes.join(
    ", ",
  )}.`;
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
      UpdateCaseBudgetGroupResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      UpdateCaseBudgetGroupResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): UpdateCaseBudgetGroupResult {
  return {
    success:
      false,

    status:
      "error",

    group:
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
