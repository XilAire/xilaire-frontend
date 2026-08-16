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
  CreateGoalData,
  CreateGoalResult,
  GoalData,
} from "@/types/goal";

const GOALS_PATH =
  "/dashboard/goals";

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

type ValidatedCreateGoal = {
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

type CreateGoalValidationResult =
  | {
      success:
        true;

      value:
        ValidatedCreateGoal;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof CreateGoalData,
            string
          >
        >;
    };

/**
 * Creates one canonical goal record in the currently active CASE Budget
 * workspace.
 *
 * Production rules:
 *
 * - The active workspace is resolved only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The workspace must exist and remain active.
 * - The caller must have an active non-viewer workspace membership.
 * - Supabase generates the goal UUID.
 * - created_by_user_id and updated_by_user_id always come from auth.
 * - current_amount defaults to zero.
 * - target_amount must be greater than zero.
 * - If current_amount >= target_amount, status is always completed.
 * - Archived state is never supplied by the create UI.
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function createGoal(
  input:
    CreateGoalData,
): Promise<CreateGoalResult> {
  const validation =
    validateCreateGoal(
      input,
    );

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
        .insert({
          workspace_id:
            workspaceId,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

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
          "id,workspace_id,created_by_user_id,updated_by_user_id,name,current_amount,target_amount,target_date,status,notes,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
        )
        .single();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Failed to create goal.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return failure(
        "CASE Budget could not create the goal.",
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
        "[CASE Budget Goals] Created goal row could not be mapped.",
        {
          workspaceId,
          userId,
          goalId:
            row?.id,
        },
      );

      return failure(
        "The goal was created, but CASE Budget could not read the saved record.",
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
      "[CASE Budget Goals] Unexpected create-goal error.",
      error,
    );

    return failure(
      "CASE Budget could not create the goal. Please try again.",
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
      "[CASE Budget Goals] Failed to load workspace while creating goal.",
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
        "Goals cannot be created because this workspace is inactive.",
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
      "[CASE Budget Goals] Failed to verify membership while creating goal.",
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
        "You do not have active access to create goals in this workspace.",
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
        "Viewers cannot create goals in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function validateCreateGoal(
  input:
    CreateGoalData,
): CreateGoalValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof CreateGoalData,
        string
      >
    > = {};

  const name =
    normalizeRequiredText(
      input.name,
    );

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

  const currentAmount =
    input.currentAmount ===
      undefined
      ? 0
      : normalizeNonNegativeMoney(
          input.currentAmount,
        );

  if (
    currentAmount ===
      null
  ) {
    fieldErrors.currentAmount =
      "Current amount must be zero or greater.";
  }

  const targetAmount =
    normalizePositiveMoney(
      input.targetAmount,
    );

  if (
    targetAmount ===
      null
  ) {
    fieldErrors.targetAmount =
      "Target amount must be greater than zero.";
  }

  const targetDate =
    input.targetDate ===
      undefined ||
    input.targetDate ===
      ""
      ? null
      : normalizeDate(
          input.targetDate,
        );

  if (
    input.targetDate !==
      undefined &&
    input.targetDate !==
      "" &&
    targetDate ===
      null
  ) {
    fieldErrors.targetDate =
      "Enter a valid target date.";
  }

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  if (
    notes &&
    notes.length >
      2000
  ) {
    fieldErrors.notes =
      "Notes must be 2,000 characters or fewer.";
  }

  const requestedStatus =
    input.status ??
    "active";

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

  const status:
    GoalData[
      "status"
    ] =
    currentAmount >=
      targetAmount
      ? "completed"
      : requestedStatus ===
          "completed"
        ? "active"
        : requestedStatus;

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
): CreateGoalResult {
  return {
    success:
      false,

    error:
      message,
  };
}
