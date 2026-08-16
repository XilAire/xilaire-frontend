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
  ContributeToGoalData,
  ContributeToGoalResult,
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

type ValidatedContribution = {
  goalId:
    string;

  amount:
    number;
};

type ContributionValidationResult =
  | {
      success:
        true;

      value:
        ValidatedContribution;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof ContributeToGoalData,
            string
          >
        >;
    };

/**
 * Adds money to or removes money from one canonical goal.
 *
 * Production rules:
 *
 * - Positive amounts increase current_amount.
 * - Negative amounts decrease current_amount.
 * - Zero is rejected.
 * - The resulting current_amount is clamped to zero.
 * - If current_amount >= target_amount, status becomes completed.
 * - If a previously completed goal falls below target, status becomes active.
 * - Paused goals remain paused unless the contribution completes the goal.
 * - Archived goals cannot receive contributions.
 * - The caller must have active non-viewer workspace membership.
 * - Active workspace and user identity come only from trusted server auth.
 * - The UPDATE is constrained by id, workspace_id, is_archived=false, and
 *   previously loaded updated_at for optimistic concurrency.
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function contributeToGoal(
  input:
    ContributeToGoalData,
): Promise<ContributeToGoalResult> {
  const validation =
    validateContribution(
      input,
    );

  if (
    !validation.success
  ) {
    return {
      success:
        false,

      error:
        "Review the contribution and try again.",

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

    const validated =
      validation.value;

    const existingResult =
      await loadGoal({
        workspaceId,
        goalId:
          validated.goalId,
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
      return failure(
        "CASE Budget could not read the existing goal.",
      );
    }

    const nextCurrentAmount =
      roundMoney(
        Math.max(
          0,
          existingGoal.currentAmount +
            validated.amount,
        ),
      );

    let nextStatus:
      GoalData[
        "status"
      ];

    if (
      nextCurrentAmount >=
      existingGoal.targetAmount
    ) {
      nextStatus =
        "completed";
    } else if (
      existingGoal.status ===
      "paused"
    ) {
      nextStatus =
        "paused";
    } else {
      nextStatus =
        "active";
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
          current_amount:
            nextCurrentAmount,

          status:
            nextStatus,

          updated_by_user_id:
            userId,

          updated_at:
            now,
        })
        .eq(
          "id",
          validated.goalId,
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
        "[CASE Budget Goals] Failed to apply goal contribution.",
        {
          workspaceId,
          userId,
          goalId:
            validated.goalId,
          amount:
            validated.amount,
          error,
        },
      );

      return failure(
        "CASE Budget could not update the goal balance.",
      );
    }

    if (
      !data
    ) {
      const conflictMessage =
        await determineContributionConflict({
          workspaceId,
          goalId:
            validated.goalId,
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
      return failure(
        "The contribution was saved, but CASE Budget could not read the updated goal.",
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
      "[CASE Budget Goals] Unexpected contribute-to-goal error.",
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
      "[CASE Budget Goals] Failed to load workspace while contributing to goal.",
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
        "Goal contributions are unavailable because this workspace is inactive.",
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
      "[CASE Budget Goals] Failed to verify membership while contributing to goal.",
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
        "Viewers cannot contribute to goals in this workspace.",
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
      "[CASE Budget Goals] Failed to load goal before contribution.",
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

async function determineContributionConflict({
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
      "[CASE Budget Goals] Failed to verify contribution conflict.",
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
    return "This goal changed before the contribution could be saved. Refresh the page and try again.";
  }

  return "The goal could not be updated. Refresh the page and try again.";
}

function validateContribution(
  input:
    ContributeToGoalData,
): ContributionValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof ContributeToGoalData,
        string
      >
    > = {};

  const goalId =
    normalizeRequiredText(
      input.goalId,
    );

  if (
    !goalId
  ) {
    fieldErrors.goalId =
      "A goal is required.";
  }

  const amount =
    normalizeContributionAmount(
      input.amount,
    );

  if (
    amount ===
      null
  ) {
    fieldErrors.amount =
      "Contribution amount must be a non-zero number.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !goalId ||
    amount ===
      null
  ) {
    return {
      success:
        false,

      fieldErrors,
    };
  }

  return {
    success:
      true,

    value: {
      goalId,

      amount,
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

function normalizeContributionAmount(
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
    normalized ===
      0
  ) {
    return null;
  }

  const rounded =
    roundMoney(
      normalized,
    );

  return rounded ===
    0
    ? null
    : rounded;
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
): ContributeToGoalResult {
  return {
    success:
      false,

    error:
      message,
  };
}
