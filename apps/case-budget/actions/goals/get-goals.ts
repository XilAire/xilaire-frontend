"use server";

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
  GetGoalsResult,
  GoalData,
} from "@/types/goal";

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
 * Loads canonical goals for the currently active CASE Budget workspace.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The workspace must exist and remain active.
 * - The caller must have an active membership in the workspace.
 * - Every goal query is explicitly filtered by workspace_id.
 * - Archived goals are excluded from the active application model.
 * - Invalid database rows are skipped rather than leaking malformed data into
 *   the client domain model.
 * - Supabase is the only persistence source.
 * - No localStorage is read or written.
 */
export async function getGoals():
  Promise<GetGoalsResult> {
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
          "workspace_id",
          workspaceId,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "status",
          {
            ascending:
              true,
          },
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          },
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Failed to load goals.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return failure(
        "CASE Budget could not load goals for this workspace.",
      );
    }

    const rows =
      (
        data ??
        []
      ) as unknown as
        CaseBudgetGoalDatabaseRow[];

    const goals:
      GoalData[] =
      [];

    for (
      const row of
        rows
    ) {
      const mapped =
        mapGoalRow({
          row,
          workspaceId,
        });

      if (
        !mapped
      ) {
        console.error(
          "[CASE Budget Goals] Skipping invalid goal row.",
          {
            workspaceId,
            goalId:
              row.id,
          },
        );

        continue;
      }

      goals.push(
        mapped,
      );
    }

    return {
      success:
        true,

      goals,
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
      "[CASE Budget Goals] Unexpected goal-loading error.",
      error,
    );

    return failure(
      "CASE Budget could not load goals. Please try again.",
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
      "[CASE Budget Goals] Failed to load active workspace.",
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
        "Goals are unavailable because this workspace is inactive.",
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
      "[CASE Budget Goals] Failed to verify workspace membership.",
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
        "You do not have active access to goals in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
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

function failure(
  message:
    string,
): GetGoalsResult {
  return {
    success:
      false,

    error:
      message,
  };
}
