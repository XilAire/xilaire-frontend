"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  deleteInvestmentAccount as deleteInvestmentAccountService,
} from "@/lib/investments/investments-service";

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

export type DeleteInvestmentAccountInput = {
  investmentAccountId:
    string;
};

export type DeleteInvestmentAccountResult =
  | {
      success:
        true;

      investmentAccountId:
        string;

      error:
        null;
    }
  | {
      success:
        false;

      investmentAccountId:
        null;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "validation-failed"
          | "delete-failed"
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
 * Deletes one CASE Budget investment account from the authenticated
 * user's active workspace.
 *
 * IMPORTANT:
 *
 * The currently confirmed public.investment_accounts schema does not
 * include is_archived / archived_at / archived_by fields.
 *
 * This action therefore follows the canonical persistence behavior
 * implemented by the existing investment service and performs a database
 * delete. It does not invent or emulate browser-side soft-delete state.
 *
 * Production guarantees:
 *
 * - userId and workspaceId come only from trusted server auth.
 * - workspaceId is never accepted from the browser.
 * - the active workspace must exist and be active.
 * - the authenticated user must have active non-viewer membership.
 * - the delete service scopes the mutation by workspaceId and account ID.
 * - database RLS remains an additional workspace-isolation boundary.
 * - no localStorage or sessionStorage is used.
 */
export async function deleteInvestmentAccount({
  investmentAccountId,
}: DeleteInvestmentAccountInput): Promise<DeleteInvestmentAccountResult> {
  const normalizedInvestmentAccountId =
    normalizeRequiredText(
      investmentAccountId,
    );

  if (
    !normalizedInvestmentAccountId
  ) {
    return failure({
      code:
        "validation-failed",

      message:
        "An investment account is required.",
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
      await deleteInvestmentAccountService({
        workspaceId,

        investmentAccountId:
          normalizedInvestmentAccountId,
      });

    if (
      !result.success
    ) {
      const message =
        result.error ??
        "CASE Budget could not delete the investment account.";

      console.error(
        "[CASE Budget Investments] Failed to delete investment account.",
        {
          workspaceId,
          userId,
          investmentAccountId:
            normalizedInvestmentAccountId,
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
      INVESTMENTS_PATH,
    );

    revalidatePath(
      DASHBOARD_PATH,
    );

    return {
      success:
        true,

      investmentAccountId:
        normalizedInvestmentAccountId,

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
      "[CASE Budget Investments] Unexpected investment-account delete error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not delete the investment account. Please try again.",
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
      "[CASE Budget Investments] Failed to load active workspace while deleting an investment account.",
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
        "Investment accounts cannot be deleted because this workspace is inactive.",
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
      "[CASE Budget Investments] Failed to verify workspace membership while deleting an investment account.",
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
        "You do not have active access to delete investment accounts in this workspace.",
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
        "Viewers cannot delete investment accounts in this workspace.",
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

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
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
      "invalid",
    )
  );
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      DeleteInvestmentAccountResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): DeleteInvestmentAccountResult {
  return {
    success:
      false,

    investmentAccountId:
      null,

    error: {
      code,
      message,
    },
  };
}
