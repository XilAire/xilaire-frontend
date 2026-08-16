"use server";

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
  HOUSEHOLD_APPROVAL_POLICY_TYPES,
  type HouseholdApprovalActorRole,
  type HouseholdApprovalPolicy,
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

export type GetHouseholdApprovalPoliciesResult =
  | {
      success:
        true;

      policies:
        HouseholdApprovalPolicy[];

      canManagePolicies:
        boolean;

      error:
        null;
    }
  | {
      success:
        false;

      policies:
        [];

      canManagePolicies:
        false;

      error:
        string;
    };

/**
 * Loads approval-policy configuration for the currently active workspace.
 *
 * Security:
 *
 * - workspaceId comes from trusted server auth state.
 * - caller must have an active workspace membership.
 * - all policies are scoped to the active workspace.
 * - Owner/Admin may manage policy configuration.
 * - Member/Viewer may read policy configuration but cannot modify it.
 */
export async function getHouseholdApprovalPolicies():
  Promise<GetHouseholdApprovalPoliciesResult> {
  try {
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
        "[CASE Budget Approval Policies] Failed to load workspace.",
        {
          workspaceId,

          userId,

          error:
            workspaceError,
        },
      );

      return failure(
        "CASE Budget could not load the active workspace.",
      );
    }

    const workspace =
      workspaceData as unknown as
        | WorkspaceRow
        | null;

    if (
      !workspace
    ) {
      return failure(
        "The active CASE Budget workspace could not be found.",
      );
    }

    if (
      !workspace.is_active
    ) {
      return failure(
        "Approval policies are unavailable because this workspace is inactive.",
      );
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
        "[CASE Budget Approval Policies] Failed to verify membership.",
        {
          workspaceId,

          userId,

          error:
            membershipError,
        },
      );

      return failure(
        "CASE Budget could not verify your workspace access.",
      );
    }

    const membership =
      membershipData as unknown as
        | WorkspaceMembershipRow
        | null;

    if (
      !membership
    ) {
      return failure(
        "You do not have access to approval policies for this workspace.",
      );
    }

    const actorRole =
      resolveActorRole({
        ownerUserId:
          workspace.owner_user_id,

        userId,

        membershipRole:
          membership.role,
      });

    const canManagePolicies =
      actorRole ===
        "owner" ||
      actorRole ===
        "admin";

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
        .order(
          "policy_type",
          {
            ascending:
              true,
          },
        );

    if (
      policyError
    ) {
      console.error(
        "[CASE Budget Approval Policies] Failed to load policies.",
        {
          workspaceId,

          userId,

          error:
            policyError,
        },
      );

      return failure(
        "CASE Budget could not load household approval policies.",
      );
    }

    const policyRows =
      (
        policyData ??
        []
      ) as unknown as
        ApprovalPolicyDatabaseRow[];

    const policyMap =
      new Map<
        HouseholdApprovalPolicyType,
        HouseholdApprovalPolicy
      >();

    for (
      const row of
        policyRows
    ) {
      const parsed =
        parsePolicyRow(
          row,
        );

      if (
        !parsed
      ) {
        continue;
      }

      policyMap.set(
        parsed.type,
        parsed,
      );
    }

    /**
     * Return all known policy types even if a row has not been created yet.
     *
     * Missing rows are represented as disabled defaults so the UI can render
     * a complete and stable control surface.
     */
    const policies =
      HOUSEHOLD_APPROVAL_POLICY_TYPES.map(
        (
          type,
        ): HouseholdApprovalPolicy => {
          const existing =
            policyMap.get(
              type,
            );

          if (
            existing
          ) {
            return existing;
          }

          return {
            id:
              "",

            workspaceId,

            type,

            enabled:
              false,

            thresholdAmount:
              type ===
                "transaction-threshold"
                ? 500
                : null,

            approverRoles: [
              "owner",
            ],

            createdAt:
              "",

            updatedAt:
              "",
          };
        },
      );

    return {
      success:
        true,

      policies,

      canManagePolicies,

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
      return failure(
        error.message,
      );
    }

    console.error(
      "[CASE Budget Approval Policies] Unexpected policy-loading error.",
      error,
    );

    return failure(
      "Something went wrong while loading household approval policies.",
    );
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
    parsePolicyType(
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

function parsePolicyType(
  value:
    unknown,
): HouseholdApprovalPolicyType | null {
  switch (
    value
  ) {
    case "transaction-threshold":
    case "budget-change":
    case "bill-change":
    case "goal-change":
    case "account-change":
    case "member-change":
    case "security-change":
      return value;

    default:
      return null;
  }
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

  return roles.length >
    0
    ? roles
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
    const parsed =
      Number(
        value,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
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

function failure(
  message:
    string,
): GetHouseholdApprovalPoliciesResult {
  return {
    success:
      false,

    policies: [],

    canManagePolicies:
      false,

    error:
      message,
  };
}