"use server";

import {
  revalidatePath,
} from "next/cache";

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

import {
  isHouseholdApprovalPolicyType,
  type HouseholdApprovalActorRole,
  type HouseholdApprovalPolicy,
  type HouseholdApprovalPolicyInput,
  type HouseholdApprovalPolicyType,
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

export type UpdateHouseholdApprovalPolicyResult =
  | {
      success:
        true;

      policy:
        HouseholdApprovalPolicy;

      error:
        null;
    }
  | {
      success:
        false;

      policy:
        null;

      error: {
        code:
          | "invalid-policy"
          | "invalid-threshold"
          | "invalid-approver-roles"
          | "workspace-not-found"
          | "workspace-inactive"
          | "permission-denied"
          | "policy-update-failed"
          | "unexpected-error";

        message:
          string;
      };
    };

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const HOUSEHOLD_ACTIVITY_PATH =
  "/dashboard/household/activity";

const DASHBOARD_PATH =
  "/dashboard";

/**
 * Creates or updates an approval-policy row for the currently active
 * CASE Budget workspace.
 *
 * Security:
 *
 * - workspaceId is resolved from trusted server-side auth state.
 * - caller must have an active workspace membership.
 * - only Owner/Admin may update approval policy configuration.
 * - the browser never supplies workspace_id.
 * - policy rows are uniquely scoped by workspace_id + policy_type.
 */
export async function updateHouseholdApprovalPolicy(
  input:
    HouseholdApprovalPolicyInput,
): Promise<UpdateHouseholdApprovalPolicyResult> {
  try {
    const policyType =
      normalizePolicyType(
        input.type,
      );

    if (
      !policyType
    ) {
      return failure({
        code:
          "invalid-policy",

        message:
          "Select a valid household approval policy.",
      });
    }

    const thresholdResult =
      normalizeThreshold({
        policyType,

        thresholdAmount:
          input.thresholdAmount,
      });

    if (
      !thresholdResult.success
    ) {
      return failure({
        code:
          "invalid-threshold",

        message:
          thresholdResult.message,
      });
    }

    const approverRolesResult =
      normalizeApproverRoles(
        input.approverRoles,
      );

    if (
      !approverRolesResult.success
    ) {
      return failure({
        code:
          "invalid-approver-roles",

        message:
          approverRolesResult.message,
      });
    }

    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

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
        "[CASE Budget Approval Policy Update] Failed to load workspace.",
        {
          workspaceId,

          userId,

          error:
            workspaceError,
        },
      );

      return failure({
        code:
          "workspace-not-found",

        message:
          "CASE Budget could not load the active workspace.",
      });
    }

    const workspace =
      workspaceData as unknown as
        | WorkspaceRow
        | null;

    if (
      !workspace
    ) {
      return failure({
        code:
          "workspace-not-found",

        message:
          "The active CASE Budget workspace could not be found.",
      });
    }

    if (
      !workspace.is_active
    ) {
      return failure({
        code:
          "workspace-inactive",

        message:
          "Approval policies cannot be changed while this workspace is inactive.",
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
        "[CASE Budget Approval Policy Update] Failed to verify membership.",
        {
          workspaceId,

          userId,

          error:
            membershipError,
        },
      );

      return failure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not verify your workspace permissions.",
      });
    }

    const membership =
      membershipData as unknown as
        | WorkspaceMembershipRow
        | null;

    if (
      !membership
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "You must be an active workspace member to change approval policies.",
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
      actorRole !==
        "owner" &&
      actorRole !==
        "admin"
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "Only workspace owners and administrators can change approval policies.",
      });
    }

    const now =
      new Date().toISOString();

    /**
     * First inspect whether this policy already exists.
     */
    const {
      data:
        existingPolicyData,
      error:
        existingPolicyError,
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
      existingPolicyError
    ) {
      console.error(
        "[CASE Budget Approval Policy Update] Failed to inspect existing policy.",
        {
          workspaceId,

          userId,

          policyType,

          error:
            existingPolicyError,
        },
      );

      return failure({
        code:
          "policy-update-failed",

        message:
          "CASE Budget could not load the current approval policy.",
      });
    }

    let updatedPolicyData:
      ApprovalPolicyDatabaseRow | null =
      null;

    if (
      existingPolicyData
    ) {
      const existingPolicy =
        existingPolicyData as unknown as ApprovalPolicyDatabaseRow;

      const {
        data:
          updateData,
        error:
          updateError,
      } =
        await admin
          .from(
            "case_budget_household_approval_policies",
          )
          .update({
            enabled:
              Boolean(
                input.enabled,
              ),

            threshold_amount:
              thresholdResult.thresholdAmount,

            approver_roles:
              approverRolesResult.approverRoles,

            updated_by_user_id:
              userId,

            updated_at:
              now,
          })
          .eq(
            "id",
            existingPolicy.id,
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "policy_type",
            policyType,
          )
          .select(
            "id,workspace_id,policy_type,enabled,threshold_amount,approver_roles,created_by_user_id,updated_by_user_id,created_at,updated_at",
          )
          .maybeSingle();

      if (
        updateError
      ) {
        console.error(
          "[CASE Budget Approval Policy Update] Failed to update policy.",
          {
            workspaceId,

            userId,

            policyType,

            error:
              updateError,
          },
        );

        return failure({
          code:
            "policy-update-failed",

          message:
            "CASE Budget could not update the approval policy.",
        });
      }

      updatedPolicyData =
        updateData as unknown as
          | ApprovalPolicyDatabaseRow
          | null;
    } else {
      const policyId =
        crypto.randomUUID();

      const {
        data:
          insertData,
        error:
          insertError,
      } =
        await admin
          .from(
            "case_budget_household_approval_policies",
          )
          .insert({
            id:
              policyId,

            workspace_id:
              workspaceId,

            policy_type:
              policyType,

            enabled:
              Boolean(
                input.enabled,
              ),

            threshold_amount:
              thresholdResult.thresholdAmount,

            approver_roles:
              approverRolesResult.approverRoles,

            created_by_user_id:
              userId,

            updated_by_user_id:
              userId,

            created_at:
              now,

            updated_at:
              now,
          })
          .select(
            "id,workspace_id,policy_type,enabled,threshold_amount,approver_roles,created_by_user_id,updated_by_user_id,created_at,updated_at",
          )
          .maybeSingle();

      if (
        insertError
      ) {
        console.error(
          "[CASE Budget Approval Policy Update] Failed to create policy.",
          {
            workspaceId,

            userId,

            policyType,

            error:
              insertError,
          },
        );

        return failure({
          code:
            "policy-update-failed",

          message:
            "CASE Budget could not create the approval policy.",
        });
      }

      updatedPolicyData =
        insertData as unknown as
          | ApprovalPolicyDatabaseRow
          | null;
    }

    if (
      !updatedPolicyData
    ) {
      return failure({
        code:
          "policy-update-failed",

        message:
          "CASE Budget saved the policy but could not verify the updated record.",
      });
    }

    const parsedPolicy =
      parsePolicyRow(
        updatedPolicyData,
      );

    if (
      !parsedPolicy
    ) {
      console.error(
        "[CASE Budget Approval Policy Update] Saved policy could not be parsed.",
        {
          workspaceId,

          userId,

          policyType,
        },
      );

      return failure({
        code:
          "policy-update-failed",

        message:
          "CASE Budget saved the policy but could not verify the policy details.",
      });
    }

    revalidateApprovalPolicyPaths();

    return {
      success:
        true,

      policy:
        parsedPolicy,

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
      "[CASE Budget Approval Policy Update] Unexpected policy update error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update the household approval policy. Please try again.",
    });
  }
}

function normalizePolicyType(
  value:
    unknown,
): HouseholdApprovalPolicyType | null {
  return isHouseholdApprovalPolicyType(
    value,
  )
    ? value
    : null;
}

function normalizeThreshold({
  policyType,
  thresholdAmount,
}: {
  policyType:
    HouseholdApprovalPolicyType;

  thresholdAmount:
    number | null | undefined;
}):
  | {
      success:
        true;

      thresholdAmount:
        number | null;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    policyType !==
    "transaction-threshold"
  ) {
    return {
      success:
        true,

      thresholdAmount:
        null,
    };
  }

  if (
    thresholdAmount ===
      null ||
    thresholdAmount ===
      undefined
  ) {
    return {
      success:
        false,

      message:
        "Enter a transaction amount that should require approval.",
    };
  }

  if (
    typeof thresholdAmount !==
      "number" ||
    !Number.isFinite(
      thresholdAmount,
    )
  ) {
    return {
      success:
        false,

      message:
        "Transaction approval threshold must be a valid number.",
    };
  }

  if (
    thresholdAmount <
    0
  ) {
    return {
      success:
        false,

      message:
        "Transaction approval threshold cannot be negative.",
    };
  }

  return {
    success:
      true,

    thresholdAmount:
      roundCurrencyAmount(
        thresholdAmount,
      ),
  };
}

function normalizeApproverRoles(
  value:
    HouseholdApprovalActorRole[],
):
  | {
      success:
        true;

      approverRoles:
        HouseholdApprovalActorRole[];
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return {
      success:
        false,

      message:
        "Select at least one role that can approve this request.",
    };
  }

  const uniqueRoles =
    Array.from(
      new Set(
        value.filter(
          (
            role,
          ): role is HouseholdApprovalActorRole =>
            role ===
              "owner" ||
            role ===
              "admin" ||
            role ===
              "member" ||
            role ===
              "viewer",
        ),
      ),
    );

  if (
    uniqueRoles.length ===
    0
  ) {
    return {
      success:
        false,

      message:
        "Select at least one role that can approve this request.",
    };
  }

  /**
   * Owner should always remain an eligible approver.
   *
   * This prevents a policy configuration from accidentally removing the
   * workspace owner's ability to resolve protected actions.
   */
  if (
    !uniqueRoles.includes(
      "owner",
    )
  ) {
    uniqueRoles.unshift(
      "owner",
    );
  }

  return {
    success:
      true,

    approverRoles:
      uniqueRoles,
  };
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

function parsePolicyRow(
  row:
    ApprovalPolicyDatabaseRow,
): HouseholdApprovalPolicy | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const workspaceId =
    normalizeOptionalText(
      row.workspace_id,
    );

  const type =
    normalizePolicyType(
      row.policy_type,
    );

  const createdAt =
    normalizeIsoDate(
      row.created_at,
    );

  const updatedAt =
    normalizeIsoDate(
      row.updated_at,
    );

  if (
    !id ||
    !workspaceId ||
    !type ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,

    workspaceId,

    type,

    enabled:
      Boolean(
        row.enabled,
      ),

    thresholdAmount:
      parseAmount(
        row.threshold_amount,
      ),

    approverRoles:
      parseApproverRoles(
        row.approver_roles,
      ),

    createdAt,

    updatedAt,
  };
}

function parseApproverRoles(
  value:
    unknown,
): HouseholdApprovalActorRole[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [
      "owner",
    ];
  }

  const roles =
    value.filter(
      (
        role,
      ): role is HouseholdApprovalActorRole =>
        role ===
          "owner" ||
        role ===
          "admin" ||
        role ===
          "member" ||
        role ===
          "viewer",
    );

  if (
    !roles.includes(
      "owner",
    )
  ) {
    roles.unshift(
      "owner",
    );
  }

  return roles.length >
    0
    ? Array.from(
        new Set(
          roles,
        ),
      )
    : [
        "owner",
      ];
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

function normalizeIsoDate(
  value:
    unknown,
): string | null {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized
  ) {
    return null;
  }

  const parsed =
    Date.parse(
      normalized,
    );

  if (
    Number.isNaN(
      parsed,
    )
  ) {
    return null;
  }

  return new Date(
    parsed,
  ).toISOString();
}

function normalizeOptionalText(
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

function revalidateApprovalPolicyPaths() {
  revalidatePath(
    HOUSEHOLD_APPROVALS_PATH,
  );

  revalidatePath(
    HOUSEHOLD_ACTIVITY_PATH,
  );

  revalidatePath(
    DASHBOARD_PATH,
  );
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      UpdateHouseholdApprovalPolicyResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): UpdateHouseholdApprovalPolicyResult {
  return {
    success:
      false,

    policy:
      null,

    error: {
      code,

      message,
    },
  };
}