"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  getInvestmentsData,
  type InvestmentsData,
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

export type GetInvestmentsResult =
  | {
      success:
        true;

      investments:
        InvestmentsData;

      error:
        null;
    }
  | {
      success:
        false;

      investments:
        InvestmentsData;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "investments-load-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const EMPTY_INVESTMENTS:
  InvestmentsData = {
    investmentAccounts:
      [],

    holdings:
      [],

    activities:
      [],

    performanceSnapshots:
      [],
  };

/**
 * Loads canonical CASE Budget investment data for the authenticated
 * user's active workspace.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server auth.
 * - workspaceId is never accepted from the browser.
 * - the active workspace must exist and be active.
 * - the authenticated user must have active workspace membership.
 * - Supabase is the source of truth.
 * - investment table RLS remains an additional database-enforced boundary.
 * - no localStorage or sessionStorage is involved.
 */
export async function getInvestments():
  Promise<GetInvestmentsResult> {
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
      await getInvestmentsData(
        workspaceId,
      );

    if (
      !result.success
    ) {
      console.error(
        "[CASE Budget Investments] Failed to load investments.",
        {
          workspaceId,
          userId,
          error:
            result.error,
        },
      );

      return failure({
        code:
          "investments-load-failed",

        message:
          result.error ??
          "CASE Budget could not load investments for this workspace.",
      });
    }

    return {
      success:
        true,

      investments: {
        investmentAccounts:
          result.data
            .investmentAccounts
            .map(
              (
                account,
              ) => ({
                ...account,
              }),
            ),

        holdings:
          result.data
            .holdings
            .map(
              (
                holding,
              ) => ({
                ...holding,
              }),
            ),

        activities:
          result.data
            .activities
            .map(
              (
                activity,
              ) => ({
                ...activity,
              }),
            ),

        performanceSnapshots:
          result.data
            .performanceSnapshots
            .map(
              (
                snapshot,
              ) => ({
                ...snapshot,
              }),
            ),
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
      "[CASE Budget Investments] Unexpected investment-loading error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not load investments. Please try again.",
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
      "[CASE Budget Investments] Failed to load active workspace.",
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
        "Investments are unavailable because this workspace is inactive.",
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
      "[CASE Budget Investments] Failed to verify workspace membership.",
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
        "You do not have active access to investments in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
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
      GetInvestmentsResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): GetInvestmentsResult {
  return {
    success:
      false,

    investments: {
      investmentAccounts: [
        ...EMPTY_INVESTMENTS.investmentAccounts,
      ],

      holdings: [
        ...EMPTY_INVESTMENTS.holdings,
      ],

      activities: [
        ...EMPTY_INVESTMENTS.activities,
      ],

      performanceSnapshots: [
        ...EMPTY_INVESTMENTS.performanceSnapshots,
      ],
    },

    error: {
      code,
      message,
    },
  };
}
