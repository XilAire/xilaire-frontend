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
  id: string;
  owner_user_id: string;
  is_active: boolean;
};

type MembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRoleDatabaseEnum;
  status: WorkspaceMembershipStatusDatabaseEnum;
};

export type ArchiveBudgetGroupInput = {
  groupId: string;
  archived?: boolean;
};

export type ArchiveBudgetGroupRecord = {
  id: string;
  workspaceId: string;
  budgetMonthId: string;
  monthKey: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isCollapsed: boolean;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  group: BudgetCategoryGroupData;
};

export type ArchiveCaseBudgetGroupResult =
  | {
      success: true;
      status: "archived" | "restored";
      group: ArchiveBudgetGroupRecord;
      approvalRequired: false;
      approval: null;
      error: null;
    }
  | {
      success: true;
      status: "approval-required";
      group: null;
      approvalRequired: true;
      approval: HouseholdApprovalRequest;
      error: null;
    }
  | {
      success: false;
      status: "error";
      group: null;
      approvalRequired: false;
      approval: null;
      error: {
        code:
          | "invalid-group"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "budget-group-not-found"
          | "budget-month-not-found"
          | "budget-month-closed"
          | "group-not-empty"
          | "approval-check-failed"
          | "budget-group-archive-conflict"
          | "budget-group-archive-failed"
          | "unexpected-error";
        message: string;
        field?: "groupId";
      };
    };

const BUDGET_PATH = "/dashboard/budget";
const DASHBOARD_PATH = "/dashboard";
const HOUSEHOLD_APPROVALS_PATH = "/dashboard/household/approvals";

const GROUP_SELECT = [
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
].join(",");

const MONTH_SELECT = [
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
].join(",");

/**
 * Soft-archives or restores one CASE Budget group.
 *
 * Production rules:
 * - The active workspace is resolved from trusted server auth state.
 * - The client never supplies workspace_id or budget_month_id.
 * - Owner/Admin/Member may archive or restore.
 * - Viewer remains read-only.
 * - The group must belong to the active workspace.
 * - The parent budget month must exist and remain open.
 * - Archiving is intentionally blocked while the group contains active
 *   budget items. This avoids silently hiding active allocations.
 * - Restoring the group does not automatically restore archived items.
 * - Household budget-change approval runs before mutation.
 * - If approval is required, no database mutation occurs.
 * - updated_at optimistic concurrency protects against stale changes.
 * - Supabase is the only persistence layer.
 * - No localStorage is involved.
 */
export async function archiveBudgetGroup(
  input: ArchiveBudgetGroupInput,
): Promise<ArchiveCaseBudgetGroupResult> {
  try {
    const groupId = normalizeOptionalText(input.groupId);

    if (!groupId) {
      return failure({
        code: "invalid-group",
        message: "A valid budget group is required.",
        field: "groupId",
      });
    }

    const shouldArchive = input.archived ?? true;

    const {
      userId,
      workspaceId,
    } = await requireCaseBudgetServerAuth();

    const workspaceResult = await loadWorkspace({
      workspaceId,
    });

    if (!workspaceResult.success) {
      return failure({
        code: workspaceResult.code,
        message: workspaceResult.message,
      });
    }

    const membershipResult = await loadMembership({
      workspaceId,
      userId,
    });

    if (!membershipResult.success) {
      return failure({
        code: "permission-denied",
        message: membershipResult.message,
      });
    }

    if (membershipResult.membership.role === "viewer") {
      return failure({
        code: "permission-denied",
        message:
          "View-only members cannot archive or restore budget groups.",
      });
    }

    const admin = createWorkspaceAdminClient();

    const {
      data: existingData,
      error: existingError,
    } = await admin
      .from("case_budget_budget_groups")
      .select(GROUP_SELECT)
      .eq("id", groupId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (existingError) {
      console.error(
        "[CASE Budget Budget] Failed to load budget group for archival.",
        {
          workspaceId,
          userId,
          groupId,
          error: existingError,
        },
      );

      return failure({
        code: "budget-group-not-found",
        message: "CASE Budget could not load the selected budget group.",
      });
    }

    const existing = existingData as unknown as
      | CaseBudgetBudgetGroupDatabaseRow
      | null;

    if (!existing) {
      return failure({
        code: "budget-group-not-found",
        message:
          "The selected budget group could not be found in this workspace.",
      });
    }

    const monthResult = await loadBudgetMonthById({
      workspaceId,
      budgetMonthId: existing.budget_month_id,
    });

    if (!monthResult.success) {
      return failure({
        code: "budget-month-not-found",
        message: monthResult.message,
      });
    }

    const budgetMonth = monthResult.month;

    if (budgetMonth.is_closed) {
      return failure({
        code: "budget-month-closed",
        message:
          "Budget groups cannot be archived or restored in a closed budget month.",
      });
    }

    /*
     * Idempotent behavior:
     * if the group is already in the requested state, return it without
     * creating another approval request or issuing another write.
     */
    if (Boolean(existing.is_archived) === shouldArchive) {
      const record = mapBudgetGroupRecord({
        row: existing,
        budgetMonth,
      });

      if (!record) {
        return failure({
          code: "budget-group-archive-failed",
          message:
            "CASE Budget could not verify the current budget-group state.",
        });
      }

      return {
        success: true,
        status: shouldArchive ? "archived" : "restored",
        group: record,
        approvalRequired: false,
        approval: null,
        error: null,
      };
    }

    /*
     * A group is structural. Archiving a group while active budget items
     * still reference it would make those items disappear from the normal
     * active-group UI while leaving the allocations active in Supabase.
     *
     * Require the items to be archived/moved first instead of cascading
     * silently from this action.
     */
    if (shouldArchive) {
      const activeItemsResult = await countActiveBudgetItems({
        workspaceId,
        budgetMonthId: existing.budget_month_id,
        groupId,
      });

      if (!activeItemsResult.success) {
        return failure({
          code: "budget-group-archive-failed",
          message: activeItemsResult.message,
        });
      }

      if (activeItemsResult.count > 0) {
        return failure({
          code: "group-not-empty",
          message:
            "This budget group still contains active budget items. Move or archive those items before archiving the group.",
        });
      }
    }

    const monthKey =
      normalizeDatabaseDate(budgetMonth.budget_month)?.slice(0, 7) ?? null;

    if (!monthKey) {
      return failure({
        code: "budget-month-not-found",
        message: "CASE Budget could not verify the budget group month.",
      });
    }

    const approvalResult = await enforceHouseholdApproval({
      type: "budget",

      title: shouldArchive
        ? `Archive budget group: ${existing.name}`
        : `Restore budget group: ${existing.name}`,

      description: buildApprovalDescription({
        monthKey,
        name: existing.name,
        shouldArchive,
      }),

      amount: null,

      target: {
        entityType: "budget-group",
        entityId: groupId,
      },

      payload: {
        operation: shouldArchive
          ? "archive-budget-group"
          : "restore-budget-group",

        groupId,
        budgetMonthId: existing.budget_month_id,
        monthKey,

        previous: {
          isArchived: existing.is_archived,
          archivedAt: existing.archived_at,
          archivedByUserId: existing.archived_by_user_id,
          updatedAt: existing.updated_at,
        },

        requested: {
          isArchived: shouldArchive,
        },
      },
    });

    if (!approvalResult.success) {
      console.error(
        "[CASE Budget Budget] Approval enforcement failed during budget-group archival.",
        {
          workspaceId,
          userId,
          groupId,
          shouldArchive,
          error: approvalResult.error,
        },
      );

      return failure({
        code: "approval-check-failed",
        message: approvalResult.error.message,
      });
    }

    if (approvalResult.requiresApproval) {
      return {
        success: true,
        status: "approval-required",
        group: null,
        approvalRequired: true,
        approval: approvalResult.approval,
        error: null,
      };
    }

    const now = new Date().toISOString();

    const {
      data: updatedData,
      error: updateError,
    } = await admin
      .from("case_budget_budget_groups")
      .update({
        updated_by_user_id: userId,
        is_archived: shouldArchive,
        archived_at: shouldArchive ? now : null,
        archived_by_user_id: shouldArchive ? userId : null,
        updated_at: now,
      })
      .eq("id", groupId)
      .eq("workspace_id", workspaceId)
      .eq("budget_month_id", existing.budget_month_id)
      .eq("is_archived", Boolean(existing.is_archived))
      .eq("updated_at", existing.updated_at)
      .select(GROUP_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error(
        "[CASE Budget Budget] Failed to change budget-group archival state.",
        {
          workspaceId,
          userId,
          groupId,
          shouldArchive,
          error: updateError,
        },
      );

      return failure({
        code: "budget-group-archive-failed",
        message: shouldArchive
          ? "CASE Budget could not archive the budget group."
          : "CASE Budget could not restore the budget group.",
      });
    }

    if (!updatedData) {
      return failure({
        code: "budget-group-archive-conflict",
        message:
          "This budget group changed before the archival update completed. Refresh the budget and try again.",
      });
    }

    const updatedRow =
      updatedData as unknown as CaseBudgetBudgetGroupDatabaseRow;

    const record = mapBudgetGroupRecord({
      row: updatedRow,
      budgetMonth,
    });

    if (!record) {
      return failure({
        code: "budget-group-archive-failed",
        message: shouldArchive
          ? "CASE Budget archived the budget group but could not verify its updated state."
          : "CASE Budget restored the budget group but could not verify its updated state.",
      });
    }

    revalidateBudgetPaths();

    return {
      success: true,
      status: shouldArchive ? "archived" : "restored",
      group: record,
      approvalRequired: false,
      approval: null,
      error: null,
    };
  } catch (error) {
    if (error instanceof CaseBudgetServerAuthError) {
      return failure({
        code:
          error.code === "workspace-required"
            ? "workspace-not-found"
            : "permission-denied",
        message: error.message,
      });
    }

    console.error(
      "[CASE Budget Budget] Unexpected budget-group archival error.",
      error,
    );

    return failure({
      code: "unexpected-error",
      message:
        "CASE Budget could not change the budget-group archival state. Please try again.",
    });
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId: string;
}): Promise<
  | {
      success: true;
      workspace: WorkspaceRow;
    }
  | {
      success: false;
      code: "workspace-not-found" | "workspace-inactive";
      message: string;
    }
> {
  const admin = createWorkspaceAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("workspaces")
    .select("id,owner_user_id,is_active")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error(
      "[CASE Budget Budget] Failed to load workspace during budget-group archival.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success: false,
      code: "workspace-not-found",
      message: "CASE Budget could not load the active workspace.",
    };
  }

  const workspace = data as unknown as WorkspaceRow | null;

  if (!workspace) {
    return {
      success: false,
      code: "workspace-not-found",
      message: "The active CASE Budget workspace could not be found.",
    };
  }

  if (!workspace.is_active) {
    return {
      success: false,
      code: "workspace-inactive",
      message:
        "Budget groups cannot be archived or restored while this workspace is inactive.",
    };
  }

  return {
    success: true,
    workspace,
  };
}

async function loadMembership({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<
  | {
      success: true;
      membership: MembershipRow;
    }
  | {
      success: false;
      message: string;
    }
> {
  const admin = createWorkspaceAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("workspace_members")
    .select("id,workspace_id,user_id,role,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[CASE Budget Budget] Failed to verify membership during budget-group archival.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success: false,
      message: "CASE Budget could not verify your workspace permissions.",
    };
  }

  const membership = data as unknown as MembershipRow | null;

  if (!membership || membership.status !== "active") {
    return {
      success: false,
      message:
        "You do not have active access to archive or restore budget groups in this workspace.",
    };
  }

  return {
    success: true,
    membership,
  };
}

async function loadBudgetMonthById({
  workspaceId,
  budgetMonthId,
}: {
  workspaceId: string;
  budgetMonthId: string;
}): Promise<
  | {
      success: true;
      month: CaseBudgetBudgetMonthDatabaseRow;
    }
  | {
      success: false;
      message: string;
    }
> {
  const admin = createWorkspaceAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("case_budget_budget_months")
    .select(MONTH_SELECT)
    .eq("id", budgetMonthId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error(
      "[CASE Budget Budget] Failed to load parent month during budget-group archival.",
      {
        workspaceId,
        budgetMonthId,
        error,
      },
    );

    return {
      success: false,
      message: "CASE Budget could not load the budget group's month.",
    };
  }

  const month =
    data as unknown as CaseBudgetBudgetMonthDatabaseRow | null;

  if (!month) {
    return {
      success: false,
      message: "The budget group's month could not be found.",
    };
  }

  return {
    success: true,
    month,
  };
}

async function countActiveBudgetItems({
  workspaceId,
  budgetMonthId,
  groupId,
}: {
  workspaceId: string;
  budgetMonthId: string;
  groupId: string;
}): Promise<
  | {
      success: true;
      count: number;
    }
  | {
      success: false;
      message: string;
    }
> {
  const admin = createWorkspaceAdminClient();

  const {
    count,
    error,
  } = await admin
    .from("case_budget_budget_items")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("workspace_id", workspaceId)
    .eq("budget_month_id", budgetMonthId)
    .eq("budget_group_id", groupId)
    .eq("is_archived", false);

  if (error) {
    console.error(
      "[CASE Budget Budget] Failed to check active items before budget-group archival.",
      {
        workspaceId,
        budgetMonthId,
        groupId,
        error,
      },
    );

    return {
      success: false,
      message:
        "CASE Budget could not verify whether this budget group contains active items.",
    };
  }

  return {
    success: true,
    count: count ?? 0,
  };
}

function mapBudgetGroupRecord({
  row,
  budgetMonth,
}: {
  row: CaseBudgetBudgetGroupDatabaseRow;
  budgetMonth: CaseBudgetBudgetMonthDatabaseRow;
}): ArchiveBudgetGroupRecord | null {
  const id = normalizeOptionalText(row.id);
  const workspaceId = normalizeOptionalText(row.workspace_id);
  const budgetMonthId = normalizeOptionalText(row.budget_month_id);
  const name = normalizeOptionalText(row.name);
  const budgetMonthDate = normalizeDatabaseDate(budgetMonth.budget_month);
  const createdAt = normalizeIsoTimestamp(row.created_at);
  const updatedAt = normalizeIsoTimestamp(row.updated_at);

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

  const description = normalizeOptionalText(row.description);

  const group: BudgetCategoryGroupData = {
    id,
    name,
    ...(description
      ? {
          description,
        }
      : {}),
    categories: [],
  };

  return {
    id,
    workspaceId,
    budgetMonthId,
    monthKey: budgetMonthDate.slice(0, 7),
    name,
    description,
    sortOrder: normalizeDatabaseSortOrder(row.sort_order),
    isCollapsed: Boolean(row.is_collapsed),
    isArchived: Boolean(row.is_archived),
    archivedAt: normalizeNullableIsoTimestamp(row.archived_at),
    createdAt,
    updatedAt,
    group,
  };
}

function buildApprovalDescription({
  monthKey,
  name,
  shouldArchive,
}: {
  monthKey: string;
  name: string;
  shouldArchive: boolean;
}) {
  const action = shouldArchive ? "Archive" : "Restore";

  return `${action} budget group "${name}" in the ${formatMonthLabel(
    monthKey,
  )} budget.`;
}

function normalizeDatabaseSortOrder(
  value: unknown,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(value),
  );
}

function normalizeDatabaseDate(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const [
    yearText,
    monthText,
    dayText,
  ] = normalized.split("-");

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
}

function normalizeIsoTimestamp(
  value: unknown,
): string | null {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function normalizeNullableIsoTimestamp(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return normalizeIsoTimestamp(value);
}

function normalizeOptionalText(
  value: unknown,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized
    ? normalized
    : null;
}

function formatMonthLabel(
  monthKey: string,
) {
  const [
    yearText,
    monthText,
  ] = monthKey.split("-");

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(
    new Date(
      Date.UTC(
        Number(yearText),
        Number(monthText) - 1,
        1,
      ),
    ),
  );
}

function revalidateBudgetPaths() {
  revalidatePath(BUDGET_PATH);
  revalidatePath(DASHBOARD_PATH);
  revalidatePath(HOUSEHOLD_APPROVALS_PATH);
}

function failure({
  code,
  message,
  field,
}: {
  code: Extract<
    ArchiveCaseBudgetGroupResult,
    {
      success: false;
    }
  >["error"]["code"];

  message: string;

  field?: Extract<
    ArchiveCaseBudgetGroupResult,
    {
      success: false;
    }
  >["error"]["field"];
}): ArchiveCaseBudgetGroupResult {
  return {
    success: false,
    status: "error",
    group: null,
    approvalRequired: false,
    approval: null,
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
