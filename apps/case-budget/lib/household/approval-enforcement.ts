import "server-only";

import {
  createHouseholdApproval,
} from "@/actions/household/create-approval";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  CreateHouseholdApprovalInput,
  HouseholdApprovalActorRole,
  HouseholdApprovalPolicyType,
  HouseholdApprovalRequest,
  HouseholdApprovalTargetReference,
  HouseholdApprovalType,
} from "@/types/household/household-approval";

type WorkspaceRow = {
  id:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type WorkspaceMembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    WorkspaceRoleDatabaseEnum;

  status:
    string;
};

type ApprovalPolicyDatabaseRow = {
  id:
    string;

  workspace_id:
    string;

  policy_type:
    string;

  enabled:
    boolean;

  threshold_amount:
    number | string | null;

  approver_roles:
    string[];

  created_by_user_id:
    string;

  updated_by_user_id:
    string;

  created_at:
    string;

  updated_at:
    string;
};

export type HouseholdApprovalEnforcementInput = {
  type:
    HouseholdApprovalType;

  title:
    string;

  description:
    string;

  amount?:
    number | null;

  target?:
    HouseholdApprovalTargetReference | null;

  payload?:
    Record<
      string,
      unknown
    > | null;

  expiresAt?:
    string | null;
};

export type HouseholdApprovalEnforcementResult =
  | {
      success:
        true;

      requiresApproval:
        false;

      mayExecute:
        true;

      policyType:
        HouseholdApprovalPolicyType | null;

      policyId:
        string | null;

      approval:
        null;

      reason:
        "policy-not-applicable" |
        "policy-disabled" |
        "threshold-not-met" |
        "owner-bypass";
    }
  | {
      success:
        true;

      requiresApproval:
        true;

      mayExecute:
        false;

      policyType:
        HouseholdApprovalPolicyType;

      policyId:
        string;

      approval:
        HouseholdApprovalRequest;

      reason:
        "approval-created";
    }
  | {
      success:
        false;

      requiresApproval:
        false;

      mayExecute:
        false;

      policyType:
        HouseholdApprovalPolicyType | null;

      policyId:
        string | null;

      approval:
        null;

      error: {
        code:
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "policy-load-failed"
          | "approval-create-failed"
          | "invalid-amount"
          | "unexpected-error";

        message:
          string;
      };
    };

/**
 * Evaluates whether a protected CASE Budget operation requires household
 * approval before execution.
 *
 * Protected server actions should call this BEFORE writing financial data.
 *
 * Expected usage:
 *
 * const enforcement =
 *   await enforceHouseholdApproval({
 *     type: "transaction",
 *     title: "Large transaction",
 *     description: "...",
 *     amount: 1250,
 *     target: {
 *       entityType: "transaction",
 *       entityId: transactionId,
 *     },
 *     payload: {
 *       ...trustedServerPayload,
 *     },
 *   });
 *
 * if (!enforcement.success) {
 *   return error;
 * }
 *
 * if (!enforcement.mayExecute) {
 *   return {
 *     success: true,
 *     approvalRequired: true,
 *     approval: enforcement.approval,
 *   };
 * }
 *
 * // Only execute the protected mutation here.
 */
export async function enforceHouseholdApproval(
  input:
    HouseholdApprovalEnforcementInput,
): Promise<HouseholdApprovalEnforcementResult> {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const policyType =
      getPolicyTypeForApprovalType(
        input.type,
      );

    /**
     * Some generic approval types do not currently map to a configurable
     * policy. Those operations may execute normally unless their individual
     * server workflow supplies another explicit protection rule.
     */
    if (
      !policyType
    ) {
      return allowExecution({
        policyType:
          null,

        policyId:
          null,

        reason:
          "policy-not-applicable",
      });
    }

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        workspaceData,
      error:
        workspaceError,
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
      workspaceError
    ) {
      console.error(
        "[CASE Budget Approval Enforcement] Failed to load workspace.",
        {
          workspaceId,

          userId,

          error:
            workspaceError,
        },
      );

      return enforcementFailure({
        code:
          "workspace-not-found",

        message:
          "CASE Budget could not load the active workspace.",

        policyType,
      });
    }

    const workspace =
      workspaceData as unknown as
        | WorkspaceRow
        | null;

    if (
      !workspace
    ) {
      return enforcementFailure({
        code:
          "workspace-not-found",

        message:
          "The active CASE Budget workspace could not be found.",

        policyType,
      });
    }

    if (
      !workspace.is_active
    ) {
      return enforcementFailure({
        code:
          "workspace-inactive",

        message:
          "Protected actions cannot be completed while this workspace is inactive.",

        policyType,
      });
    }

    const {
      data:
        membershipData,
      error:
        membershipError,
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
        .eq(
          "status",
          "active",
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      console.error(
        "[CASE Budget Approval Enforcement] Failed to verify workspace membership.",
        {
          workspaceId,

          userId,

          error:
            membershipError,
        },
      );

      return enforcementFailure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not verify your workspace permissions.",

        policyType,
      });
    }

    const membership =
      membershipData as unknown as
        | WorkspaceMembershipRow
        | null;

    if (
      !membership
    ) {
      return enforcementFailure({
        code:
          "permission-denied",

        message:
          "You do not have access to perform this action in the active workspace.",

        policyType,
      });
    }

    const actorRole =
      resolveActorRole({
        ownerUserId:
          workspace.owner_user_id,

        userId,

        membershipRole:
          membership.role,
      });

    if (
      !actorRole
    ) {
      return enforcementFailure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not determine your workspace role.",

        policyType,
      });
    }

    const {
      data:
        policyData,
      error:
        policyError,
    } =
      await admin
        .from(
          "case_budget_household_approval_policies",
        )
        .select(
          "id,workspace_id,policy_type,enabled,threshold_amount,approver_roles,created_by_user_id,updated_by_user_id,created_at,updated_at",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "policy_type",
          policyType,
        )
        .maybeSingle();

    if (
      policyError
    ) {
      console.error(
        "[CASE Budget Approval Enforcement] Failed to load approval policy.",
        {
          workspaceId,

          userId,

          policyType,

          error:
            policyError,
        },
      );

      return enforcementFailure({
        code:
          "policy-load-failed",

        message:
          "CASE Budget could not verify the approval requirements for this action.",

        policyType,
      });
    }

    const policy =
      policyData as unknown as
        | ApprovalPolicyDatabaseRow
        | null;

    /**
     * Missing policy row means the policy has never been configured and
     * therefore remains disabled.
     */
    if (
      !policy ||
      !policy.enabled
    ) {
      return allowExecution({
        policyType,

        policyId:
          policy?.id ??
          null,

        reason:
          "policy-disabled",
      });
    }

    /**
     * Owners remain the final authority for the workspace.
     *
     * Owner actions bypass approval instead of creating a request they could
     * never self-approve.
     */
    if (
      actorRole ===
      "owner"
    ) {
      return allowExecution({
        policyType,

        policyId:
          policy.id,

        reason:
          "owner-bypass",
      });
    }

    /**
     * Transaction threshold policies only require approval when the protected
     * transaction reaches or exceeds the configured threshold.
     */
    if (
      policyType ===
      "transaction-threshold"
    ) {
      const amountResult =
        normalizeAmount(
          input.amount,
        );

      if (
        !amountResult.success
      ) {
        return enforcementFailure({
          code:
            "invalid-amount",

          message:
            amountResult.message,

          policyType,

          policyId:
            policy.id,
        });
      }

      const threshold =
        parseAmount(
          policy.threshold_amount,
        );

      if (
        threshold ===
        null
      ) {
        return enforcementFailure({
          code:
            "policy-load-failed",

          message:
            "The transaction approval policy does not have a valid threshold.",

          policyType,

          policyId:
            policy.id,
        });
      }

      if (
        amountResult.amount <
        threshold
      ) {
        return allowExecution({
          policyType,

          policyId:
            policy.id,

          reason:
            "threshold-not-met",
        });
      }
    }

    const approvalInput:
      CreateHouseholdApprovalInput = {
        type:
          input.type,

        title:
          input.title,

        description:
          input.description,

        amount:
          input.amount ??
          null,

        target:
          input.target ??
          null,

        payload: {
          ...(input.payload ??
            {}),

          approvalPolicy: {
            policyId:
              policy.id,

            policyType,

            actorRole,

            evaluatedAt:
              new Date().toISOString(),
          },
        },

        expiresAt:
          input.expiresAt ??
          null,
      };

    const approvalResult =
      await createHouseholdApproval(
        approvalInput,
      );

    if (
      !approvalResult.success
    ) {
      console.error(
        "[CASE Budget Approval Enforcement] Failed to create approval request.",
        {
          workspaceId,

          userId,

          policyType,

          policyId:
            policy.id,

          error:
            approvalResult.error,
        },
      );

      return enforcementFailure({
        code:
          "approval-create-failed",

        message:
          approvalResult.error.message,

        policyType,

        policyId:
          policy.id,
      });
    }

    return {
      success:
        true,

      requiresApproval:
        true,

      mayExecute:
        false,

      policyType,

      policyId:
        policy.id,

      approval:
        approvalResult.approval,

      reason:
        "approval-created",
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return enforcementFailure({
        code:
          error.code ===
          "workspace-required"
            ? "workspace-not-found"
            : "permission-denied",

        message:
          error.message,

        policyType:
          null,
      });
    }

    console.error(
      "[CASE Budget Approval Enforcement] Unexpected enforcement error.",
      error,
    );

    return enforcementFailure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not determine whether this action requires approval.",

      policyType:
        null,
    });
  }
}

function getPolicyTypeForApprovalType(
  type:
    HouseholdApprovalType,
): HouseholdApprovalPolicyType | null {
  switch (
    type
  ) {
    case "transaction":
      return "transaction-threshold";

    case "budget":
      return "budget-change";

    case "bill":
      return "bill-change";

    case "goal":
      return "goal-change";

    case "account":
      return "account-change";

    case "member":
      return "member-change";

    case "security":
      return "security-change";

    case "other":
      return null;
  }
}

function resolveActorRole({
  ownerUserId,
  userId,
  membershipRole,
}: {
  ownerUserId:
    string;

  userId:
    string;

  membershipRole:
    WorkspaceRoleDatabaseEnum;
}): HouseholdApprovalActorRole | null {
  if (
    ownerUserId ===
      userId
  ) {
    return "owner";
  }

  switch (
    membershipRole
  ) {
    case "owner":
    case "admin":
    case "member":
    case "viewer":
      return membershipRole;

    default:
      return null;
  }
}

function normalizeAmount(
  value:
    number | null | undefined,
):
  | {
      success:
        true;

      amount:
        number;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return {
      success:
        false,

      message:
        "A transaction amount is required to evaluate the approval threshold.",
    };
  }

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return {
      success:
        false,

      message:
        "Transaction amount must be a valid number.",
    };
  }

  if (
    value <
    0
  ) {
    return {
      success:
        false,

      message:
        "Transaction amount cannot be negative.",
    };
  }

  return {
    success:
      true,

    amount:
      roundCurrencyAmount(
        value,
      ),
  };
}

function parseAmount(
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

function roundCurrencyAmount(
  value:
    number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function allowExecution({
  policyType,
  policyId,
  reason,
}: {
  policyType:
    HouseholdApprovalPolicyType | null;

  policyId:
    string | null;

  reason:
    | "policy-not-applicable"
    | "policy-disabled"
    | "threshold-not-met"
    | "owner-bypass";
}): HouseholdApprovalEnforcementResult {
  return {
    success:
      true,

    requiresApproval:
      false,

    mayExecute:
      true,

    policyType,

    policyId,

    approval:
      null,

    reason,
  };
}

function enforcementFailure({
  code,
  message,
  policyType,
  policyId = null,
}: {
  code:
    Extract<
      HouseholdApprovalEnforcementResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  policyType:
    HouseholdApprovalPolicyType | null;

  policyId?:
    string | null;
}): HouseholdApprovalEnforcementResult {
  return {
    success:
      false,

    requiresApproval:
      false,

    mayExecute:
      false,

    policyType,

    policyId,

    approval:
      null,

    error: {
      code,

      message,
    },
  };
}