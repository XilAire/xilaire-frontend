"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  getNetWorthSnapshots as getNetWorthSnapshotsFromService,
  type NetWorthSnapshot,
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

type GetNetWorthSnapshotsErrorCode =
  | "workspace-not-found"
  | "workspace-inactive"
  | "permission-denied"
  | "net-worth-load-failed"
  | "unexpected-error";

export type GetNetWorthSnapshotsResult =
  | {
      success: true;
      snapshots: NetWorthSnapshot[];
      error: null;
    }
  | {
      success: false;
      snapshots: NetWorthSnapshot[];
      error: {
        code: GetNetWorthSnapshotsErrorCode;
        message: string;
      };
    };

/**
 * Loads canonical CASE Budget net worth history for the authenticated
 * user's active workspace.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server auth.
 * - workspaceId is never accepted from the browser.
 * - the active workspace must exist and be active.
 * - the authenticated user must have active workspace membership.
 * - plan entitlement is enforced server-side.
 * - Supabase is the source of truth.
 * - net worth table RLS remains an additional database-enforced boundary.
 * - no localStorage or sessionStorage is involved.
 */
export async function getNetWorthSnapshots():
  Promise<GetNetWorthSnapshotsResult> {
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
      await getNetWorthSnapshotsFromService(
        workspaceId,
      );

    if (
      !result.success
    ) {
      console.error(
        "[CASE Budget Net Worth] Failed to load net worth snapshots.",
        {
          workspaceId,
          userId,
          error:
            result.error,
        },
      );

      return failure({
        code:
          "net-worth-load-failed",

        message:
          result.error ??
          "CASE Budget could not load net worth history for this workspace.",
      });
    }

    return {
      success:
        true,

      snapshots:
        result.data,

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
      "[CASE Budget Net Worth] Unexpected net worth history loading error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not load net worth history. Please try again.",
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
      code:
        | "workspace-not-found"
        | "workspace-inactive";
      message: string;
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
      "[CASE Budget Net Worth] Failed to load active workspace.",
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
        "Net Worth is unavailable because this workspace is inactive.",
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
      "[CASE Budget Net Worth] Failed to verify workspace membership.",
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
        "You do not have active access to Net Worth in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
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

function failure({
  code,
  message,
}: {
  code:
    GetNetWorthSnapshotsErrorCode;

  message: string;
}): GetNetWorthSnapshotsResult {
  return {
    success:
      false,

    snapshots:
      [],

    error: {
      code,
      message,
    },
  };
}