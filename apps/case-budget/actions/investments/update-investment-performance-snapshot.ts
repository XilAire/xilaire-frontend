"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  updateInvestmentPerformanceSnapshot as updateInvestmentPerformanceSnapshotService,
} from "@/lib/investments/investments-service";


import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  InvestmentPerformanceSnapshot,
  UpdateInvestmentPerformanceSnapshotData,
} from "@/types/investment";

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

export type UpdateInvestmentPerformanceSnapshotInput = {
  snapshotId:
    string;

  updates:
    UpdateInvestmentPerformanceSnapshotData;
};

export type UpdateInvestmentPerformanceSnapshotResult =
  | {
      success:
        true;

      snapshot:
        InvestmentPerformanceSnapshot;

      error:
        null;
    }
  | {
      success:
        false;

      snapshot:
        null;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "validation-failed"
          | "snapshot-not-found"
          | "update-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const INVESTMENTS_PATH =
  "/dashboard/investments";

const DASHBOARD_PATH =
  "/dashboard";

const NET_WORTH_PATH =
  "/dashboard/net-worth";

/**
 * Updates one canonical CASE Budget investment performance snapshot in the
 * authenticated user's active workspace.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server auth.
 * - workspaceId is never accepted from the browser.
 * - the active workspace must exist and be active.
 * - the authenticated user must have active non-viewer membership.
 * - the mutation is scoped by workspaceId and snapshotId.
 * - Supabase is the source of truth.
 * - database RLS remains an additional workspace-isolation boundary.
 * - daily gain and daily gain percentage remain derived service-layer values.
 * - no localStorage or sessionStorage is used.
 */
export async function updateInvestmentPerformanceSnapshot({
  snapshotId,
  updates,
}: UpdateInvestmentPerformanceSnapshotInput): Promise<UpdateInvestmentPerformanceSnapshotResult> {
  const normalizedSnapshotId =
    normalizeRequiredText(
      snapshotId,
    );

  if (
    !normalizedSnapshotId
  ) {
    return failure({
      code:
        "validation-failed",

      message:
        "An investment performance snapshot is required.",
    });
  }

  if (
    !updates ||
    typeof updates !==
      "object" ||
    Array.isArray(
      updates,
    )
  ) {
    return failure({
      code:
        "validation-failed",

      message:
        "Investment performance snapshot changes are required.",
    });
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
          "investments",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          getInvestmentsFeatureAccessMessage({
            reason:
              featureAccess.access.reason,

            requiredPlan:
              featureAccess.access.requiredPlan,
          }),
      });
    }

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

    const result =
      await updateInvestmentPerformanceSnapshotService({
        workspaceId,

        snapshotId:
          normalizedSnapshotId,

        updates,
      });

    if (
      !result.success ||
      !result.data
    ) {
      const message =
        result.error ??
        "CASE Budget could not update the investment performance snapshot.";

      console.error(
        "[CASE Budget Investments] Failed to update investment performance snapshot.",
        {
          workspaceId,
          userId,
          snapshotId:
            normalizedSnapshotId,
          error:
            result.error,
        },
      );

      return failure({
        code:
          getFailureCode(
            message,
          ),

        message,
      });
    }

    revalidatePath(
      INVESTMENTS_PATH,
    );

    revalidatePath(
      DASHBOARD_PATH,
    );

    revalidatePath(
      NET_WORTH_PATH,
    );

    return {
      success:
        true,

      snapshot: {
        ...result.data,
      },

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
      "[CASE Budget Investments] Unexpected investment-performance snapshot update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the investment performance snapshot. Please try again.",
    });
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<
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
        | "workspace-not-found"
        | "workspace-inactive";

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
      "[CASE Budget Investments] Failed to load active workspace while updating an investment performance snapshot.",
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
        "Investment performance snapshots cannot be updated because this workspace is inactive.",
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
}): Promise<
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
      "[CASE Budget Investments] Failed to verify workspace membership while updating an investment performance snapshot.",
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
        "You do not have active access to update investment performance snapshots in this workspace.",
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
        "Viewers cannot update investment performance snapshots in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function getFailureCode(
  message:
    string,
):
  | "validation-failed"
  | "snapshot-not-found"
  | "update-failed" {
  const normalized =
    message
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "snapshot could not be found",
    ) ||
    normalized.includes(
      "no longer available",
    )
  ) {
    return "snapshot-not-found";
  }

  if (
    normalized.includes(
      "required",
    ) ||
    normalized.includes(
      "valid investment performance snapshot date",
    ) ||
    normalized.includes(
      "cannot be negative",
    ) ||
    normalized.includes(
      "outside the allowed range",
    ) ||
    normalized.includes(
      "invalid",
    ) ||
    normalized.includes(
      "already exists for the selected date",
    )
  ) {
    return "validation-failed";
  }

  return "update-failed";
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


function getInvestmentsFeatureAccessMessage({
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
      return "Investments are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Investments require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Investments require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Investments require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Investments require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Investments are not available for the current workspace subscription.";
    }
  }
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      UpdateInvestmentPerformanceSnapshotResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): UpdateInvestmentPerformanceSnapshotResult {
  return {
    success:
      false,

    snapshot:
      null,

    error: {
      code,
      message,
    },
  };
}
