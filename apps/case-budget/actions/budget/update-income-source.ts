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

export type UpdateIncomeSourceInput = {
  incomeSourceId:
    string;

  name?:
    string;

  plannedAmount?:
    number;

  receivedAmount?:
    number;

  sortOrder?:
    number;
};

export type UpdateIncomeSourceRecord = {
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

export type UpdateCaseBudgetIncomeSourceResult =
  | {
      success:
        true;

      status:
        "updated";

      incomeSource:
        UpdateIncomeSourceRecord;

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
          | "invalid-income-source"
          | "invalid-name"
          | "invalid-planned-amount"
          | "invalid-received-amount"
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "income-source-not-found"
          | "income-source-archived"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "approval-check-failed"
          | "income-source-update-conflict"
          | "income-source-update-failed"
          | "income-source-aggregate-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "incomeSourceId"
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
 * Updates one canonical monthly income source.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server auth state.
 * - The client never supplies workspace_id or budget_month_id.
 * - Owner/Admin/Member may update.
 * - Viewer remains read-only.
 * - The income source must belong to the active workspace.
 * - Archived income sources cannot be edited.
 * - The parent budget month must exist and remain open.
 * - Only explicitly supplied fields are changed.
 * - Household budget-change approval runs before mutation.
 * - If approval is required, the income-source row remains unchanged.
 * - updated_at optimistic concurrency prevents stale edits.
 * - Parent month planned_income / actual_income are recalculated from
 *   canonical active income-source rows after a successful update.
 * - If aggregate maintenance fails, the source row is rolled back to its
 *   previously loaded values where possible.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function updateIncomeSource(
  input:
    UpdateIncomeSourceInput,
): Promise<UpdateCaseBudgetIncomeSourceResult> {
  try {
    const incomeSourceId =
      normalizeOptionalText(
        input.incomeSourceId,
      );

    if (
      !incomeSourceId
    ) {
      return failure({
        code:
          "invalid-income-source",

        message:
          "A valid income source is required.",

        field:
          "incomeSourceId",
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
          "View-only members cannot update income sources.",
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
          "case_budget_budget_income_sources",
        )
        .select(
          INCOME_SOURCE_SELECT,
        )
        .eq(
          "id",
          incomeSourceId,
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
        "[CASE Budget Budget] Failed to load income source for update.",
        {
          workspaceId,
          userId,
          incomeSourceId,
          error:
            existingError,
        },
      );

      return failure({
        code:
          "income-source-not-found",

        message:
          "CASE Budget could not load the selected income source.",
      });
    }

    const existing =
      existingData as unknown as
        | CaseBudgetBudgetIncomeSourceDatabaseRow
        | null;

    if (
      !existing
    ) {
      return failure({
        code:
          "income-source-not-found",

        message:
          "The selected income source could not be found in this workspace.",
      });
    }

    if (
      existing.is_archived
    ) {
      return failure({
        code:
          "income-source-archived",

        message:
          "Archived income sources cannot be edited.",
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
          "Income sources cannot be changed in a closed budget month.",
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
        mapIncomeSourceRecord({
          row:
            existing,

          budgetMonth,
        });

      if (
        !mapped
      ) {
        return failure({
          code:
            "income-source-update-failed",

          message:
            "CASE Budget could not verify the current income source.",
        });
      }

      return {
        success:
          true,

        status:
          "updated",

        incomeSource:
          mapped,

        approvalRequired:
          false,

        approval:
          null,

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
          "CASE Budget could not verify the income source budget month.",
      });
    }

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Update income source: ${next.name}`,

        description:
          buildApprovalDescription({
            monthKey,
            previous: {
              name:
                existing.name,

              plannedAmount:
                normalizeNonNegativeDatabaseMoney(
                  existing.planned_amount,
                ) ??
                0,

              receivedAmount:
                normalizeNonNegativeDatabaseMoney(
                  existing.received_amount,
                ) ??
                0,
            },
            next,
          }),

        amount:
          next.plannedAmount,

        target: {
          entityType:
            "budget-income-source",

          entityId:
            incomeSourceId,
        },

        payload: {
          operation:
            "update-income-source",

          incomeSourceId,

          budgetMonthId:
            existing.budget_month_id,

          monthKey,

          previous: {
            name:
              existing.name,

            plannedAmount:
              existing.planned_amount,

            receivedAmount:
              existing.received_amount,

            sortOrder:
              existing.sort_order,

            updatedAt:
              existing.updated_at,
          },

          requested: {
            name:
              next.name,

            plannedAmount:
              next.plannedAmount,

            receivedAmount:
              next.receivedAmount,

            sortOrder:
              next.sortOrder,
          },
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during income-source update.",
        {
          workspaceId,
          userId,
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
          "case_budget_budget_income_sources",
        )
        .update({
          updated_by_user_id:
            userId,

          name:
            next.name,

          planned_amount:
            next.plannedAmount,

          received_amount:
            next.receivedAmount,

          sort_order:
            next.sortOrder,

          updated_at:
            now,
        })
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
          INCOME_SOURCE_SELECT,
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to update income source.",
        {
          workspaceId,
          userId,
          incomeSourceId,
          error:
            updateError,
        },
      );

      return failure({
        code:
          "income-source-update-failed",

        message:
          "CASE Budget could not update the income source.",
      });
    }

    if (
      !updatedData
    ) {
      return failure({
        code:
          "income-source-update-conflict",

        message:
          "This income source changed before your update completed. Refresh the budget and try again.",
      });
    }

    const aggregateResult =
      await recalculateBudgetMonthIncome({
        workspaceId,
        budgetMonthId:
          existing.budget_month_id,
        userId,
      });

    if (
      !aggregateResult.success
    ) {
      await rollbackIncomeSource({
        workspaceId,
        incomeSourceId,
        existing,
      });

      return failure({
        code:
          "income-source-aggregate-failed",

        message:
          aggregateResult.message,
      });
    }

    const updatedRow =
      updatedData as unknown as
        CaseBudgetBudgetIncomeSourceDatabaseRow;

    const record =
      mapIncomeSourceRecord({
        row:
          updatedRow,

        budgetMonth,
      });

    if (
      !record
    ) {
      return failure({
        code:
          "income-source-update-failed",

        message:
          "CASE Budget updated the income source but could not normalize its details.",
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "updated",

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
      "[CASE Budget Budget] Unexpected income-source update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the income source. Please try again.",
    });
  }
}

type NextIncomeSourceState = {
  name:
    string;

  plannedAmount:
    number;

  receivedAmount:
    number;

  sortOrder:
    number;
};

function validateAndBuildNextState({
  existing,
  input,
}: {
  existing:
    CaseBudgetBudgetIncomeSourceDatabaseRow;

  input:
    UpdateIncomeSourceInput;
}):
  | {
      success:
        true;

      next:
        NextIncomeSourceState;
    }
  | {
      success:
        false;

      result:
        UpdateCaseBudgetIncomeSourceResult;
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
            `Income source name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

          field:
            "name",
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
            "income-source-update-failed",

          message:
            "CASE Budget could not verify the current planned income amount.",
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
              "Planned income must be zero or greater.",

          field:
              "plannedAmount",
          }),
      };
    }

    plannedAmount =
      normalized;
  }

  let receivedAmount =
    normalizeNonNegativeDatabaseMoney(
      existing.received_amount,
    );

  if (
    receivedAmount ===
    null
  ) {
    return {
      success:
        false,

      result:
        failure({
          code:
            "income-source-update-failed",

          message:
            "CASE Budget could not verify the current received income amount.",
        }),
    };
  }

  if (
    input.receivedAmount !==
    undefined
  ) {
    const normalized =
      normalizeNonNegativeMoney(
        input.receivedAmount,
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
              "invalid-received-amount",

          message:
              "Received income must be zero or greater.",

          field:
              "receivedAmount",
          }),
      };
    }

    receivedAmount =
      normalized;
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
            "Income source sort order must be zero or greater.",

          field:
            "sortOrder",
        }),
    };
  }

  return {
    success:
      true,

    next: {
      name,

      plannedAmount,

      receivedAmount,

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
      "[CASE Budget Budget] Failed to load workspace during income-source update.",
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
        "Income sources cannot be updated while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during income-source update.",
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
        "You do not have active access to update income sources in this workspace.",
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
      "[CASE Budget Budget] Failed to load parent month during income-source update.",
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
        "CASE Budget could not load the income source budget month.",
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
        "The income source budget month could not be found.",
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

  const {
    data:
      updatedMonth,
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
          new Date().toISOString(),
      })
      .eq(
        "id",
        budgetMonthId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .select(
        "id",
      )
      .maybeSingle();

  if (
    monthUpdateError ||
    !updatedMonth
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

async function rollbackIncomeSource({
  workspaceId,
  incomeSourceId,
  existing,
}: {
  workspaceId:
    string;

  incomeSourceId:
    string;

  existing:
    CaseBudgetBudgetIncomeSourceDatabaseRow;
}) {
  const admin =
    createWorkspaceAdminClient();

  const {
    error,
  } =
    await admin
      .from(
        "case_budget_budget_income_sources",
      )
      .update({
        updated_by_user_id:
          existing.updated_by_user_id,

        name:
          existing.name,

        planned_amount:
          existing.planned_amount,

        received_amount:
          existing.received_amount,

        sort_order:
          existing.sort_order,

        updated_at:
          existing.updated_at,
      })
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
        existing.budget_month_id,
      );

  if (
    error
  ) {
    console.error(
      "[CASE Budget Budget] Failed to roll back income source after aggregate failure.",
      {
        workspaceId,
        incomeSourceId,
        error,
      },
    );
  }
}

function hasMeaningfulChanges({
  existing,
  next,
}: {
  existing:
    CaseBudgetBudgetIncomeSourceDatabaseRow;

  next:
    NextIncomeSourceState;
}) {
  return (
    normalizeOptionalText(
      existing.name,
    ) !==
      next.name ||
    normalizeNonNegativeDatabaseMoney(
      existing.planned_amount,
    ) !==
      next.plannedAmount ||
    normalizeNonNegativeDatabaseMoney(
      existing.received_amount,
    ) !==
      next.receivedAmount ||
    normalizeDatabaseSortOrder(
      existing.sort_order,
    ) !==
      next.sortOrder
  );
}

function mapIncomeSourceRecord({
  row,
  budgetMonth,
}: {
  row:
    CaseBudgetBudgetIncomeSourceDatabaseRow;

  budgetMonth:
    CaseBudgetBudgetMonthDatabaseRow;
}): UpdateIncomeSourceRecord | null {
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

  const budgetMonthDate =
    normalizeDatabaseDate(
      budgetMonth.budget_month,
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
    !updatedAt ||
    !budgetMonthDate
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

    monthKey:
      budgetMonthDate.slice(
        0,
        7,
      ),

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
  previous,
  next,
}: {
  monthKey:
    string;

  previous: {
    name:
      string;

    plannedAmount:
      number;

    receivedAmount:
      number;
  };

  next:
    NextIncomeSourceState;
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
    previous.plannedAmount !==
    next.plannedAmount
  ) {
    changes.push(
      `planned income to ${formatCurrency(
        next.plannedAmount,
      )}`,
    );
  }

  if (
    previous.receivedAmount !==
    next.receivedAmount
  ) {
    changes.push(
      `received income to ${formatCurrency(
        next.receivedAmount,
      )}`,
    );
  }

  if (
    changes.length ===
    0
  ) {
    return `Update "${next.name}" in the ${formatMonthLabel(
      monthKey,
    )} budget.`;
  }

  return `Update "${previous.name}" in the ${formatMonthLabel(
    monthKey,
  )} budget: ${changes.join(
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
      UpdateCaseBudgetIncomeSourceResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      UpdateCaseBudgetIncomeSourceResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): UpdateCaseBudgetIncomeSourceResult {
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
