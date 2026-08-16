"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  deleteNetWorthSnapshot as deleteNetWorthSnapshotService,
} from "@/lib/net-worth/net-worth-service";

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

export type DeleteNetWorthSnapshotInput = {
  snapshotId:
    string;
};

type DeleteNetWorthSnapshotErrorCode =
  | "workspace-not-found"
  | "workspace-inactive"
  | "permission-denied"
  | "validation-failed"
  | "delete-failed"
  | "unexpected-error";

export type DeleteNetWorthSnapshotResult =
  | {
      success:
        true;

      snapshotId:
        string;

      error:
        null;
    }
  | {
      success:
        false;

      snapshotId:
        null;

      error: {
        code:
          DeleteNetWorthSnapshotErrorCode;

        message:
          string;
      };
    };

const NET_WORTH_PATH =
  "/dashboard/net-worth";

const DASHBOARD_PATH =
  "/dashboard";

const REPORTS_PATH =
  "/dashboard/reports";

/**
 * Deletes a canonical CASE Budget net worth snapshot from the authenticated
 * user's active workspace.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server auth.
 * - workspaceId is never accepted from the browser.
 * - only the snapshot ID is accepted from the caller.
 * - the Net Worth plan entitlement is enforced server-side.
 * - the active workspace must exist and be active.
 * - the authenticated user must have active non-viewer membership.
 * - deletion remains scoped to both snapshot ID and authenticated workspace.
 * - Supabase remains the persistent source of truth.
 * - database RLS remains an additional workspace-isolation boundary.
 * - Reports is revalidated because it consumes Net Worth history.
 * - no localStorage or sessionStorage is used.
 */
export async function deleteNetWorthSnapshot({
  snapshotId,
}: DeleteNetWorthSnapshotInput): Promise<DeleteNetWorthSnapshotResult> {
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
        "A net worth snapshot is required.",
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
          "net-worth",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          getNetWorthFeatureAccessMessage({
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
      await deleteNetWorthSnapshotService(
        normalizedSnapshotId,
        workspaceId,
      );

    if (
      !result.success
    ) {
      const message =
        result.error ??
        "CASE Budget could not delete the net worth snapshot.";

      console.error(
        "[CASE Budget Net Worth] Failed to delete net worth snapshot.",
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
          isValidationMessage(
            message,
          )
            ? "validation-failed"
            : "delete-failed",

        message,
      });
    }

    revalidatePath(
      NET_WORTH_PATH,
    );

    revalidatePath(
      DASHBOARD_PATH,
    );

    revalidatePath(
      REPORTS_PATH,
    );

    return {
      success:
        true,

      snapshotId:
        normalizedSnapshotId,

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
      "[CASE Budget Net Worth] Unexpected net worth snapshot deletion error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not delete the net worth snapshot. Please try again.",
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
      "[CASE Budget Net Worth] Failed to load active workspace while deleting a snapshot.",
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
        "Net Worth snapshots cannot be deleted because this workspace is inactive.",
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
      "[CASE Budget Net Worth] Failed to verify workspace membership while deleting a snapshot.",
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
        "You do not have active access to delete Net Worth snapshots in this workspace.",
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
        "Viewers cannot delete Net Worth snapshots in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
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

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

function getNetWorthFeatureAccessMessage({
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
      return "Net Worth is unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Net Worth requires the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Net Worth requires the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Net Worth requires the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Net Worth requires the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Net Worth is not available for the current workspace subscription.";
    }
  }
}

function isValidationMessage(
  message:
    string,
) {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  return (
    normalizedMessage.includes(
      "required",
    ) ||
    normalizedMessage.includes(
      "invalid",
    ) ||
    normalizedMessage.includes(
      "snapshot",
    )
  );
}

function failure({
  code,
  message,
}: {
  code:
    DeleteNetWorthSnapshotErrorCode;

  message:
    string;
}): DeleteNetWorthSnapshotResult {
  return {
    success:
      false,

    snapshotId:
      null,

    error: {
      code,
      message,
    },
  };
}