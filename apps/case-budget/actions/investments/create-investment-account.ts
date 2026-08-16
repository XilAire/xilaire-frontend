"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createInvestmentAccount as createInvestmentAccountService,
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
  CreateInvestmentAccountData,
  InvestmentAccountData,
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

export type CreateInvestmentAccountResult =
  | {
      success:
        true;

      account:
        InvestmentAccountData;

      error:
        null;
    }
  | {
      success:
        false;

      account:
        null;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "validation-failed"
          | "create-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const INVESTMENTS_PATH =
  "/dashboard/investments";

const DASHBOARD_PATH =
  "/dashboard";

/**
 * Creates one canonical CASE Budget investment account in the authenticated
 * user's active workspace.
 *
 * Production guarantees:
 *
 * - workspaceId is resolved only from trusted server auth.
 * - userId is resolved only from trusted server auth.
 * - the browser cannot select or spoof workspace ownership.
 * - the workspace must exist and be active.
 * - the caller must have active non-viewer membership.
 * - Supabase is the source of truth.
 * - database RLS remains an additional workspace-isolation boundary.
 * - the service performs canonical investment-field validation.
 * - no browser-generated persistent ID is accepted or created here.
 * - no localStorage or sessionStorage is used.
 */
export async function createInvestmentAccount(
  account:
    CreateInvestmentAccountData,
): Promise<CreateInvestmentAccountResult> {
  if (
    !account ||
    typeof account !==
      "object" ||
    Array.isArray(
      account,
    )
  ) {
    return failure({
      code:
        "validation-failed",

      message:
        "Investment account details are required.",
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
      await createInvestmentAccountService({
        workspaceId,
        account,
      });

    if (
      !result.success ||
      !result.data
    ) {
      const message =
        result.error ??
        "CASE Budget could not create the investment account.";

      console.error(
        "[CASE Budget Investments] Failed to create investment account.",
        {
          workspaceId,
          userId,
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
            : "create-failed",

        message,
      });
    }

    revalidatePath(
      INVESTMENTS_PATH,
    );

    revalidatePath(
      DASHBOARD_PATH,
    );

    return {
      success:
        true,

      account:
        cloneInvestmentAccount(
          result.data,
        ),

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
      "[CASE Budget Investments] Unexpected investment-account creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the investment account. Please try again.",
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
      "[CASE Budget Investments] Failed to load active workspace while creating an investment account.",
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
        "Investment accounts cannot be created because this workspace is inactive.",
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
      "[CASE Budget Investments] Failed to verify workspace membership while creating an investment account.",
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
        "You do not have active access to create investment accounts in this workspace.",
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
        "Viewers cannot create investment accounts in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function cloneInvestmentAccount(
  account:
    InvestmentAccountData,
): InvestmentAccountData {
  return {
    ...account,
  };
}

function isValidationMessage(
  message:
    string,
) {
  const normalized =
    message
      .trim()
      .toLowerCase();

  return (
    normalized.includes(
      "required",
    ) ||
    normalized.includes(
      "valid investment account type",
    ) ||
    normalized.includes(
      "valid investment connection status",
    ) ||
    normalized.includes(
      "cannot be negative",
    ) ||
    normalized.includes(
      "outside the allowed range",
    )
  );
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
      CreateInvestmentAccountResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): CreateInvestmentAccountResult {
  return {
    success:
      false,

    account:
      null,

    error: {
      code,
      message,
    },
  };
}
