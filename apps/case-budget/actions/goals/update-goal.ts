"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

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
  GoalData,
  UpdateGoalData,
  UpdateGoalResult,
} from "@/types/goal";

const GOALS_PATH =
  "/dashboard/goals";

export type UpdateGoalInput = {
  goalId:
    string;

  updates:
    UpdateGoalData;
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

type ValidatedGoalState = {
  name:
    string;

  currentAmount:
    number;

  targetAmount:
    number;

  targetDate:
    string | null;

  status:
    GoalData[
      "status"
    ];

  notes:
    string | null;
};

type GoalValidationResult =
  | {
      success:
        true;

      value:
        ValidatedGoalState;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof UpdateGoalData,
            string
          >
        >;
    };

/**
 * Updates one canonical goal record in the currently active CASE Budget
 * workspace.
 *
 * Production rules:
 *
 * - The active workspace comes only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The goal is loaded by BOTH id and workspace_id.
 * - Archived goals cannot be edited through the active Goals experience.
 * - The caller must have an active non-viewer workspace membership.
 * - Immutable database ownership/audit identity fields cannot be changed by
 *   the client.
 * - Only fields present in input.updates replace existing values.
 * - Empty notes clear the stored notes field.
 * - Empty targetDate clears the stored target date.
 * - If currentAmount >= targetAmount, status is always completed.
 * - If a completed goal drops below target, it automatically becomes active
 *   unless the caller explicitly requests paused.
 * - updated_at optimistic concurrency prevents stale edits from silently
 *   overwriting a newer server-side mutation.
 * - The UPDATE is constrained by id, workspace_id, is_archived=false, and the
 *   previously loaded updated_at value.
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function updateGoal(
  input:
    UpdateGoalInput,
): Promise<UpdateGoalResult> {
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

  if (
    !input.updates ||
    typeof input.updates !==
      "object" ||
    Array.isArray(
      input.updates,
    )
  ) {
    return failure(
      "Goal changes are required.",
    );
  }

  try {
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

    const existingGoal =
      mapGoalRow({
        row:
          existingRow,
        workspaceId,
      });

    if (
      !existingGoal
    ) {
      console.error(
        "[CASE Budget Goals] Existing goal could not be mapped before update.",
        {
          workspaceId,
          userId,
          goalId,
        },
      );

      return failure(
        "CASE Budget could not read the existing goal.",
      );
    }

    const validation =
      validateMergedGoal({
        existing:
          existingGoal,
        updates:
          input.updates,
      });

    if (
      !validation.success
    ) {
      return {
        success:
          false,

        error:
          "Review the goal details and try again.",

        fieldErrors:
          validation.fieldErrors,
      };
    }

    const validated =
      validation.value;

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
          name:
            validated.name,

          current_amount:
            validated.currentAmount,

          target_amount:
            validated.targetAmount,

          target_date:
            validated.targetDate,

          status:
            validated.status,

          notes:
            validated.notes,

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
          "is_archived",
          false,
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
        "[CASE Budget Goals] Failed to update goal.",
        {
          workspaceId,
          userId,
          goalId,
          error,
        },
      );

      return failure(
        "CASE Budget could not update the goal.",
      );
    }

    if (
      !data
    ) {
      const conflictMessage =
        await determineUpdateConflict({
          workspaceId,
          goalId,
          expectedUpdatedAt:
            existingRow.updated_at,
        });

      return failure(
        conflictMessage,
      );
    }

    const row =
      data as unknown as
        CaseBudgetGoalDatabaseRow;

    const goal =
      mapGoalRow({
        row,
        workspaceId,
      });

    if (
      !goal
    ) {
      console.error(
        "[CASE Budget Goals] Updated goal row could not be mapped.",
        {
          workspaceId,
          userId,
          goalId,
        },
      );

      return failure(
        "The goal was updated, but CASE Budget could not read the saved record.",
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
      "[CASE Budget Goals] Unexpected update-goal error.",
      error,
    );

    return failure(
      "CASE Budget could not update the goal. Please try again.",
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
      "[CASE Budget Goals] Failed to load workspace while updating goal.",
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
        "Goals cannot be updated because this workspace is inactive.",
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
      "[CASE Budget Goals] Failed to verify membership while updating goal.",
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
        "You do not have active access to update goals in this workspace.",
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
        "Viewers cannot update goals in this workspace.",
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
      .eq(
        "is_archived",
        false,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Goals] Failed to load goal before update.",
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

async function determineUpdateConflict({
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
      "[CASE Budget Goals] Failed to verify update conflict.",
      {
        workspaceId,
        goalId,
        error,
      },
    );

    return "The goal could not be updated. Refresh the page and try again.";
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
    current.is_archived
  ) {
    return "This goal has been removed from the active workspace.";
  }

  if (
    current.updated_at !==
    expectedUpdatedAt
  ) {
    return "This goal changed while you were editing it. Refresh the page and try again.";
  }

  return "The goal could not be updated. Refresh the page and try again.";
}

function validateMergedGoal({
  existing,
  updates,
}: {
  existing:
    GoalData;

  updates:
    UpdateGoalData;
}): GoalValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof UpdateGoalData,
        string
      >
    > = {};

  const hasName =
    hasOwn(
      updates,
      "name",
    );

  const name =
    hasName
      ? normalizeRequiredText(
          updates.name,
        )
      : existing.name;

  if (
    !name
  ) {
    fieldErrors.name =
      "Goal name is required.";
  } else if (
    name.length >
      120
  ) {
    fieldErrors.name =
      "Goal name must be 120 characters or fewer.";
  }

  const hasCurrentAmount =
    hasOwn(
      updates,
      "currentAmount",
    );

  const currentAmount =
    hasCurrentAmount
      ? normalizeNonNegativeMoney(
          updates.currentAmount,
        )
      : existing.currentAmount;

  if (
    currentAmount ===
      null
  ) {
    fieldErrors.currentAmount =
      "Current amount must be zero or greater.";
  }

  const hasTargetAmount =
    hasOwn(
      updates,
      "targetAmount",
    );

  const targetAmount =
    hasTargetAmount
      ? normalizePositiveMoney(
          updates.targetAmount,
        )
      : existing.targetAmount;

  if (
    targetAmount ===
      null
  ) {
    fieldErrors.targetAmount =
      "Target amount must be greater than zero.";
  }

  const hasTargetDate =
    hasOwn(
      updates,
      "targetDate",
    );

  const targetDate =
    hasTargetDate
      ? (
          updates.targetDate ===
            undefined ||
          updates.targetDate ===
            ""
            ? null
            : normalizeDate(
                updates.targetDate,
              )
        )
      : existing.targetDate ??
        null;

  if (
    hasTargetDate &&
    updates.targetDate !==
      undefined &&
    updates.targetDate !==
      "" &&
    targetDate ===
      null
  ) {
    fieldErrors.targetDate =
      "Enter a valid target date.";
  }

  const hasNotes =
    hasOwn(
      updates,
      "notes",
    );

  const notes =
    hasNotes
      ? normalizeOptionalText(
          updates.notes,
        )
      : existing.notes ??
        null;

  if (
    notes &&
    notes.length >
      2000
  ) {
    fieldErrors.notes =
      "Notes must be 2,000 characters or fewer.";
  }

  const hasRequestedStatus =
    hasOwn(
      updates,
      "status",
    );

  const requestedStatus =
    hasRequestedStatus
      ? updates.status
      : existing.status;

  if (
    !isGoalStatus(
      requestedStatus,
    )
  ) {
    fieldErrors.status =
      "Select a valid goal status.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !name ||
    currentAmount ===
      null ||
    targetAmount ===
      null ||
    !isGoalStatus(
      requestedStatus,
    )
  ) {
    return {
      success:
        false,

      fieldErrors,
    };
  }

  let status:
    GoalData[
      "status"
    ];

  if (
    currentAmount >=
    targetAmount
  ) {
    status =
      "completed";
  } else if (
    requestedStatus ===
    "paused"
  ) {
    status =
      "paused";
  } else {
    status =
      "active";
  }

  return {
    success:
      true,

    value: {
      name,

      currentAmount,

      targetAmount,

      targetDate,

      status,

      notes,
    },
  };
}

function mapGoalRow({
  row,
  workspaceId,
}: {
  row:
    CaseBudgetGoalDatabaseRow;

  workspaceId:
    string;
}): GoalData | null {
  if (
    row.workspace_id !==
    workspaceId ||
    row.is_archived
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

function hasOwn<
  ObjectType extends object,
  Key extends PropertyKey,
>(
  value:
    ObjectType,
  key:
    Key,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key,
  );
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

function normalizeFiniteNumber(
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
    normalizeFiniteNumber(
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
    normalizeFiniteNumber(
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

function failure(
  message:
    string,
): UpdateGoalResult {
  return {
    success:
      false,

    error:
      message,
  };
}
