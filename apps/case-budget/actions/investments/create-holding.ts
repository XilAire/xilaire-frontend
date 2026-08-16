"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createInvestmentHolding as createInvestmentHoldingService,
} from "@/lib/investments/investments-service";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  CreateInvestmentHoldingData,
  InvestmentHoldingData,
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

export type CreateInvestmentHoldingResult =
  | {
      success:
        true;

      holding:
        InvestmentHoldingData;

      error:
        null;
    }
  | {
      success:
        false;

      holding:
        null;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "validation-failed"
          | "account-not-found"
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
 * Creates one canonical CASE Budget investment holding in the
 * authenticated user's active workspace.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server auth.
 * - workspaceId is never accepted from the browser.
 * - the workspace must exist and be active.
 * - the caller must have active non-viewer membership.
 * - the parent investment account is verified by the service inside the
 *   authenticated workspace.
 * - market value, cost basis, unrealized gain, and unrealized gain percentage
 *   are calculated canonically in the service layer.
 * - Supabase is the source of truth.
 * - database RLS remains an additional workspace-isolation boundary.
 * - no browser-generated persistent ID is accepted or created here.
 * - no localStorage or sessionStorage is used.
 */
export async function createHolding(
  holding:
    CreateInvestmentHoldingData,
): Promise<CreateInvestmentHoldingResult> {
  if (
    !holding ||
    typeof holding !==
      "object" ||
    Array.isArray(
      holding,
    )
  ) {
    return failure({
      code:
        "validation-failed",

      message:
        "Investment holding details are required.",
    });
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
      await createInvestmentHoldingService({
        workspaceId,
        holding,
      });

    if (
      !result.success ||
      !result.data
    ) {
      const message =
        result.error ??
        "CASE Budget could not create the investment holding.";

      console.error(
        "[CASE Budget Investments] Failed to create investment holding.",
        {
          workspaceId,
          userId,
          investmentAccountId:
            holding.investmentAccountId,
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

    return {
      success:
        true,

      holding:
        cloneInvestmentHolding(
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
      "[CASE Budget Investments] Unexpected investment-holding creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the investment holding. Please try again.",
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
      "[CASE Budget Investments] Failed to load active workspace while creating an investment holding.",
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
        "Investment holdings cannot be created because this workspace is inactive.",
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
      "[CASE Budget Investments] Failed to verify workspace membership while creating an investment holding.",
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
        "You do not have active access to create investment holdings in this workspace.",
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
        "Viewers cannot create investment holdings in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function cloneInvestmentHolding(
  holding:
    InvestmentHoldingData,
): InvestmentHoldingData {
  return {
    ...holding,
  };
}

function getFailureCode(
  message:
    string,
):
  | "validation-failed"
  | "account-not-found"
  | "create-failed" {
  const normalized =
    message
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "selected investment account could not be found",
    ) ||
    normalized.includes(
      "account, holding, or workspace is no longer available",
    )
  ) {
    return "account-not-found";
  }

  if (
    normalized.includes(
      "required",
    ) ||
    normalized.includes(
      "valid investment holding type",
    ) ||
    normalized.includes(
      "cannot be negative",
    ) ||
    normalized.includes(
      "outside the allowed range",
    ) ||
    normalized.includes(
      "invalid",
    )
  ) {
    return "validation-failed";
  }

  return "create-failed";
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      CreateInvestmentHoldingResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): CreateInvestmentHoldingResult {
  return {
    success:
      false,

    holding:
      null,

    error: {
      code,
      message,
    },
  };
}
