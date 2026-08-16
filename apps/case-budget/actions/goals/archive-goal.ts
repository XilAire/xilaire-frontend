"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetGoalDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isGoalStatus,
} from "@/types/goal";

import type {
  ArchiveGoalResult,
  GoalData,
} from "@/types/goal";

const GOALS_PATH =
  "/dashboard/goals";

export type ArchiveGoalInput = {
  goalId:
    string;

  /**
   * true  = archive
   * false = restore
   *
   * Omitted values default to true so the existing deleteGoal UI can migrate
   * naturally to archive semantics without permanently deleting financial
   * history.
   */
  archived?:
    boolean;
};

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

/**
 * Soft-archives or restores one canonical goal record.
 *
 * Production rules:
 *
 * - The active workspace is resolved only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The goal is loaded by BOTH id and workspace_id.
 * - The caller must have an active non-viewer workspace membership.
 * - Archiving NEVER deletes the goal row.
 * - archived_by_user_id always comes from authenticated server state.
 * - updated_by_user_id always comes from authenticated server state.
 * - Restoring clears archive audit fields.
 * - updated_at optimistic concurrency prevents stale archive/restore actions
 *   from silently overwriting a newer goal mutation.
 * - The UPDATE is constrained by id, workspace_id, and the previously loaded
 *   updated_at value.
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function archiveGoal(
  input:
    ArchiveGoalInput,
): Promise<ArchiveGoalResult> {
  const goalId =
    normalizeRequiredText(
      input.goalId,
    );

  if (
    !goalId
  ) {
    return failure(
      "A goal is required.",
    );
  }

  const shouldArchive =
    input.archived ??
    true;

  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();


    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "goals",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure(
        getGoalsFeatureAccessMessage({
          reason:
            featureAccess.access.reason,

          requiredPlan:
            featureAccess.access.requiredPlan,
        }),
      );
    }

    const workspaceResult =
      await loadWorkspace({
        workspaceId,
      });

    if (
      !workspaceResult.success
    ) {
      return failure(
        workspaceResult.message,
      );
    }

    const membershipResult =
      await loadMembership({
        workspaceId,
        userId,
      });

    if (
      !membershipResult.success
    ) {
      return failure(
        membershipResult.message,
      );
    }

    const existingResult =
      await loadGoal({
        workspaceId,
        goalId,
      });

    if (
      !existingResult.success
    ) {
      return failure(
        existingResult.message,
      );
    }

    const existingRow =
      existingResult.row;

    /**
     * Make already-satisfied requests idempotent.
     */
    if (
      existingRow.is_archived ===
      shouldArchive
    ) {
      const existingGoal =
        mapGoalRow({
          row:
            existingRow,
          workspaceId,
          allowArchived:
            true,
        });

      if (
        !existingGoal
      ) {
        return failure(
          "CASE Budget could not read the goal.",
        );
      }

      return {
        success:
          true,

        goal:
          existingGoal,

        archived:
          existingRow.is_archived,
      };
    }

    const now =
      new Date().toISOString();

    const admin =
      createWorkspaceAdminClient();

    const {
      data,
      error,
    } =
      await admin
        .from(
          "case_budget_goals",
        )
        .update({
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

          updated_by_user_id:
            userId,

          updated_at:
            now,
        })
        .eq(
          "id",
          goalId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "updated_at",
          existingRow.updated_at,
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,name,current_amount,target_amount,target_date,status,notes,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Failed to archive or restore goal.",
        {
          workspaceId,
          userId,
          goalId,
          shouldArchive,
          error,
        },
      );

      return failure(
        shouldArchive
          ? "CASE Budget could not archive the goal."
          : "CASE Budget could not restore the goal.",
      );
    }

    if (
      !data
    ) {
      const conflictMessage =
        await determineArchiveConflict({
          workspaceId,
          goalId,
          expectedUpdatedAt:
            existingRow.updated_at,
        });

      return failure(
        conflictMessage,
      );
    }

    const updatedRow =
      data as unknown as
        CaseBudgetGoalDatabaseRow;

    if (
      updatedRow.is_archived !==
      shouldArchive
    ) {
      console.error(
        "[CASE Budget Goals] Archive state did not match requested state.",
        {
          workspaceId,
          userId,
          goalId,
          requestedArchived:
            shouldArchive,
          returnedArchived:
            updatedRow.is_archived,
        },
      );

      return failure(
        "CASE Budget could not confirm the goal archive state.",
      );
    }

    const goal =
      mapGoalRow({
        row:
          updatedRow,
        workspaceId,
        allowArchived:
          true,
      });

    if (
      !goal
    ) {
      console.error(
        "[CASE Budget Goals] Archived/restored goal row could not be mapped.",
        {
          workspaceId,
          userId,
          goalId,
          shouldArchive,
        },
      );

      return failure(
        shouldArchive
          ? "The goal was archived, but CASE Budget could not read the saved record."
          : "The goal was restored, but CASE Budget could not read the saved record.",
      );
    }

    revalidatePath(
      GOALS_PATH,
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success:
        true,

      goal,

      archived:
        updatedRow.is_archived,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return failure(
        error.message,
      );
    }

    console.error(
      "[CASE Budget Goals] Unexpected archive-goal error.",
      error,
    );

    return failure(
      "CASE Budget could not change the goal archive state. Please try again.",
    );
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
      "[CASE Budget Goals] Failed to load workspace while archiving goal.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success:
        false,

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

      message:
        "Goal archive changes are unavailable because this workspace is inactive.",
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
      "[CASE Budget Goals] Failed to verify membership while archiving goal.",
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
        "CASE Budget could not verify your workspace access.",
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
        "You do not have active access to change goals in this workspace.",
    };
  }

  if (
    membership.role ===
      "viewer"
  ) {
    return {
      success:
        false,

      message:
        "Viewers cannot archive or restore goals in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadGoal({
  workspaceId,
  goalId,
}: {
  workspaceId:
    string;

  goalId:
    string;
}):
  Promise<
    | {
        success:
          true;

        row:
          CaseBudgetGoalDatabaseRow;
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
        "case_budget_goals",
      )
      .select(
        "id,workspace_id,created_by_user_id,updated_by_user_id,name,current_amount,target_amount,target_date,status,notes,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
      )
      .eq(
        "id",
        goalId,
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
      "[CASE Budget Goals] Failed to load goal before archive/restore.",
      {
        workspaceId,
        goalId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the goal.",
    };
  }

  const row =
    data as unknown as
      | CaseBudgetGoalDatabaseRow
      | null;

  if (
    !row
  ) {
    return {
      success:
        false,

      message:
        "The goal could not be found in the active workspace.",
    };
  }

  return {
    success:
      true,

    row,
  };
}

async function determineArchiveConflict({
  workspaceId,
  goalId,
  expectedUpdatedAt,
}: {
  workspaceId:
    string;

  goalId:
    string;

  expectedUpdatedAt:
    string;
}): Promise<string> {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "case_budget_goals",
      )
      .select(
        "id,updated_at,is_archived",
      )
      .eq(
        "id",
        goalId,
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
      "[CASE Budget Goals] Failed to verify archive conflict.",
      {
        workspaceId,
        goalId,
        error,
      },
    );

    return "The goal archive state could not be changed. Refresh the page and try again.";
  }

  const current =
    data as unknown as
      | {
          id:
            string;

          updated_at:
            string;

          is_archived:
            boolean;
        }
      | null;

  if (
    !current
  ) {
    return "The goal no longer exists in the active workspace.";
  }

  if (
    current.updated_at !==
    expectedUpdatedAt
  ) {
    return "This goal changed while you were working with it. Refresh the page and try again.";
  }

  return "The goal archive state could not be changed. Refresh the page and try again.";
}

function mapGoalRow({
  row,
  workspaceId,
  allowArchived,
}: {
  row:
    CaseBudgetGoalDatabaseRow;

  workspaceId:
    string;

  allowArchived:
    boolean;
}): GoalData | null {
  if (
    row.workspace_id !==
    workspaceId
  ) {
    return null;
  }

  if (
    row.is_archived &&
    !allowArchived
  ) {
    return null;
  }

  const name =
    normalizeRequiredText(
      row.name,
    );

  if (
    !name ||
    !isGoalStatus(
      row.status,
    )
  ) {
    return null;
  }

  const currentAmount =
    normalizeNonNegativeMoney(
      row.current_amount,
    );

  const targetAmount =
    normalizePositiveMoney(
      row.target_amount,
    );

  if (
    currentAmount ===
      null ||
    targetAmount ===
      null
  ) {
    return null;
  }

  const targetDate =
    normalizeOptionalDate(
      row.target_date,
    );

  if (
    row.target_date !==
      null &&
    targetDate ===
      null
  ) {
    return null;
  }

  const notes =
    normalizeOptionalText(
      row.notes,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      row.updated_at,
    );

  if (
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id:
      row.id,

    name,

    currentAmount,

    targetAmount,

    ...(targetDate
      ? {
          targetDate,
        }
      : {}),

    status:
      row.status,

    ...(notes
      ? {
          notes,
        }
      : {}),

    createdAt,

    updatedAt,
  };
}

function normalizeRequiredText(
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

function normalizeOptionalText(
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

  return normalizeRequiredText(
    value,
  );
}

function normalizeDatabaseNumber(
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
      ? value
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
      ? parsed
      : null;
  }

  return null;
}

function normalizeNonNegativeMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseNumber(
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

  return roundMoney(
    normalized,
  );
}

function normalizePositiveMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseNumber(
      value,
    );

  if (
    normalized ===
      null ||
    normalized <=
      0
  ) {
    return null;
  }

  return roundMoney(
    normalized,
  );
}

function normalizeOptionalDate(
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

  return normalizeDate(
    value,
  );
}

function normalizeDate(
  value:
    unknown,
): string | null {
  const normalized =
    normalizeRequiredText(
      value,
    );

  if (
    !normalized ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${normalized}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(
      0,
      10,
    ) ===
    normalized
    ? normalized
    : null;
}

function roundMoney(
  value:
    number,
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function getGoalsFeatureAccessMessage({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  switch (
    reason
  ) {
    case "inactive-subscription":
      return "Goals are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Goals require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Goals require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Goals require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Goals require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Goals are not available for the current workspace subscription.";
    }
  }
}

function failure(
  message:
    string,
): ArchiveGoalResult {
  return {
    success:
      false,

    error:
      message,
  };
}
