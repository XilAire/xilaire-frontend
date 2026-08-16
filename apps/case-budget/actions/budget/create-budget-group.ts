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

export type CreateBudgetGroupInput = {
  monthKey:
    string;

  name:
    string;

  description?:
    string;

  sortOrder?:
    number;

  isCollapsed?:
    boolean;
};

export type CreateBudgetGroupRecord = {
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

export type CreateCaseBudgetGroupResult =
  | {
      success:
        true;

      status:
        "created";

      group:
        CreateBudgetGroupRecord;

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
          | "invalid-month"
          | "invalid-name"
          | "invalid-description"
          | "invalid-sort-order"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "approval-check-failed"
          | "budget-group-create-failed"
          | "unexpected-error";

        message:
          string;

        field?:
          | "monthKey"
          | "name"
          | "description"
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
 * Creates one canonical CASE Budget group for an existing open budget month.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server-side auth state.
 * - The client never supplies workspace_id or budget_month_id.
 * - Owner/Admin/Member may create.
 * - Viewer remains read-only.
 * - The target month must already exist.
 * - Closed months are immutable.
 * - Household budget-change approval runs before insert.
 * - If approval is required, no group row is created.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function createBudgetGroup(
  input:
    CreateBudgetGroupInput,
): Promise<CreateCaseBudgetGroupResult> {
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
          `Budget group name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`,

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
          `Budget group description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,

        field:
          "description",
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
          "Budget group sort order must be zero or greater.",

        field:
          "sortOrder",
      });
    }

    const isCollapsed =
      input.isCollapsed ??
      false;

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
          "View-only members cannot create budget groups.",
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
          "budget-month-not-found",

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
          "Budget groups cannot be added to a closed budget month.",
      });
    }

    const groupId =
      crypto.randomUUID();

    const approvalResult =
      await enforceHouseholdApproval({
        type:
          "budget",

        title:
          `Create budget group: ${name}`,

        description:
          buildApprovalDescription({
            monthKey,
            name,
            description,
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
            "create-budget-group",

          groupId,

          budgetMonthId:
            budgetMonth.id,

          monthKey,

          name,

          description,

          sortOrder,

          isCollapsed,
        },
      });

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-group creation.",
        {
          workspaceId,
          userId,
          budgetMonthId:
            budgetMonth.id,
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
          "case_budget_budget_groups",
        )
        .insert({
          id:
            groupId,

          workspace_id:
            workspaceId,

          budget_month_id:
            budgetMonth.id,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          name,

          description,

          sort_order:
            sortOrder,

          is_collapsed:
            isCollapsed,

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
          GROUP_SELECT,
        )
        .maybeSingle();

    if (
      createError
    ) {
      console.error(
        "[CASE Budget Budget] Failed to create budget group.",
        {
          workspaceId,
          userId,
          budgetMonthId:
            budgetMonth.id,
          groupId,
          error:
            createError,
        },
      );

      return failure({
        code:
          "budget-group-create-failed",

        message:
          "CASE Budget could not create the budget group.",
      });
    }

    if (
      !createdData
    ) {
      return failure({
        code:
          "budget-group-create-failed",

        message:
          "CASE Budget created the budget group but could not verify the new record.",
      });
    }

    const row =
      createdData as unknown as
        CaseBudgetBudgetGroupDatabaseRow;

    const record =
      mapBudgetGroupRecord({
        row,
        budgetMonth,
      });

    if (
      !record
    ) {
      return failure({
        code:
          "budget-group-create-failed",

        message:
          "CASE Budget created the budget group but could not normalize its details.",
      });
    }

    revalidateBudgetPaths();

    return {
      success:
        true,

      status:
        "created",

      group:
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
      "[CASE Budget Budget] Unexpected budget-group creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the budget group. Please try again.",
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
      "[CASE Budget Budget] Failed to load workspace during budget-group creation.",
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
        "Budget groups cannot be created while this workspace is inactive.",
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
      "[CASE Budget Budget] Failed to verify membership during budget-group creation.",
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
        "You do not have active access to create budget groups in this workspace.",
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
      "[CASE Budget Budget] Failed to load target month during budget-group creation.",
      {
        workspaceId,
        monthKey,
        error,
      },
    );

    return {
      success:
        false,

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

function mapBudgetGroupRecord({
  row,
  budgetMonth,
}: {
  row:
    CaseBudgetBudgetGroupDatabaseRow;

  budgetMonth:
    CaseBudgetBudgetMonthDatabaseRow;
}): CreateBudgetGroupRecord | null {
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
  name,
  description,
}: {
  monthKey:
    string;

  name:
    string;

  description:
    string | null;
}) {
  const descriptionText =
    description
      ? ` Description: ${description}`
      : "";

  return `Create budget group "${name}" in the ${formatMonthLabel(
    monthKey,
  )} budget.${descriptionText}`;
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
      CreateCaseBudgetGroupResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CreateCaseBudgetGroupResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CreateCaseBudgetGroupResult {
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
