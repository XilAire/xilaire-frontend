"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createAdminClient,
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isHouseholdApprovalStatus,
  isHouseholdApprovalType,
  type HouseholdApprovalActorRole,
  type HouseholdApprovalListResult,
  type HouseholdApprovalRequest,
  type HouseholdApprovalStatus,
  type HouseholdApprovalSummary,
  type HouseholdApprovalTargetReference,
  type HouseholdApprovalType,
} from "@/types/household/household-approval";

type WorkspaceRow = {
  id: string;
  owner_user_id: string;
  is_active: boolean;
};

type WorkspaceMembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRoleDatabaseEnum;
  status: string;
};

type HouseholdApprovalDatabaseRow = {
  id: string;
  workspace_id: string;
  approval_type: string;
  status: string;
  title: string;
  description: string;
  amount: number | string | null;
  requested_by_user_id: string;
  requested_by_role: string | null;
  requested_at: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  payload: unknown;
  decision_by_user_id: string | null;
  decision_by_role: string | null;
  decision: string | null;
  decision_reason: string | null;
  decided_at: string | null;
  cancelled_by_user_id: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

const EMPTY_SUMMARY: HouseholdApprovalSummary = {
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  cancelledCount: 0,
  totalCount: 0,
};

/**
 * Loads household approval requests for the currently active CASE Budget
 * workspace.
 *
 * Security model:
 *
 * - workspaceId comes from trusted server auth state, never from the browser.
 * - the caller must have an active workspace membership.
 * - approval rows are scoped to that trusted workspaceId.
 * - the strict workspace admin client is used for workspace-domain tables.
 * - the broader admin client is used only to enrich user IDs from profiles.
 */
export async function getHouseholdApprovals():
  Promise<HouseholdApprovalListResult> {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const workspaceAdmin =
      createWorkspaceAdminClient();

    const {
      data:
        workspaceData,
      error:
        workspaceError,
    } =
      await workspaceAdmin
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
        "[CASE Budget Household Approvals] Failed to load active workspace.",
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
        "Approvals are unavailable because this workspace is inactive.",
      );
    }

    const {
      data:
        membershipData,
      error:
        membershipError,
    } =
      await workspaceAdmin
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
        "[CASE Budget Household Approvals] Failed to verify workspace membership.",
        {
          workspaceId,
          userId,
          error:
            membershipError,
        },
      );

      return failure(
        "CASE Budget could not verify your access to this workspace.",
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
        "You do not have access to approvals for this workspace.",
      );
    }

    const {
      data:
        approvalData,
      error:
        approvalError,
    } =
      await workspaceAdmin
        .from(
          "case_budget_household_approvals",
        )
        .select(
          "id,workspace_id,approval_type,status,title,description,amount,requested_by_user_id,requested_by_role,requested_at,target_entity_type,target_entity_id,payload,decision_by_user_id,decision_by_role,decision,decision_reason,decided_at,cancelled_by_user_id,cancelled_at,cancellation_reason,expires_at,created_at,updated_at",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .order(
          "requested_at",
          {
            ascending:
              false,
          },
        );

    if (
      approvalError
    ) {
      console.error(
        "[CASE Budget Household Approvals] Failed to load approval requests.",
        {
          workspaceId,
          userId,
          error:
            approvalError,
        },
      );

      return failure(
        "CASE Budget could not load household approval requests.",
      );
    }

    const approvalRows =
      (
        approvalData ??
        []
      ) as unknown as
        HouseholdApprovalDatabaseRow[];

    if (
      approvalRows.length ===
      0
    ) {
      return {
        success:
          true,

        approvals: [],

        summary: {
          ...EMPTY_SUMMARY,
        },

        error:
          null,
      };
    }

    const userIds =
      Array.from(
        new Set(
          approvalRows
            .flatMap(
              (
                approval,
              ) => [
                approval.requested_by_user_id,
                approval.decision_by_user_id,
                approval.cancelled_by_user_id,
              ],
            )
            .map(
              normalizeOptionalText,
            )
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value,
                ),
            ),
        ),
      );

    const profileMap =
      await loadProfileMap(
        userIds,
      );

    const approvals:
      HouseholdApprovalRequest[] =
      [];

    for (
      const row of
        approvalRows
    ) {
      const parsedApproval =
        parseApprovalRow({
          row,
          profileMap,
        });

      if (
        !parsedApproval
      ) {
        console.error(
          "[CASE Budget Household Approvals] Skipping malformed approval row.",
          {
            approvalId:
              row.id,
            workspaceId:
              row.workspace_id,
          },
        );

        continue;
      }

      approvals.push(
        parsedApproval,
      );
    }

    return {
      success:
        true,

      approvals,

      summary:
        buildApprovalSummary(
          approvals,
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
      console.error(
        "[CASE Budget Household Approvals] Authorization failure.",
        {
          code:
            error.code,
          message:
            error.message,
        },
      );

      return failure(
        error.message,
      );
    }

    console.error(
      "[CASE Budget Household Approvals] Unexpected error while loading approvals.",
      error,
    );

    return failure(
      "Something went wrong while loading household approvals.",
    );
  }
}

/**
 * Profile enrichment deliberately uses createAdminClient(), not
 * createWorkspaceAdminClient().
 *
 * WorkspaceDatabase is intentionally strict and contains only workspace-domain
 * relations. profiles belongs to the broader CASE Budget schema.
 */
async function loadProfileMap(
  userIds:
    string[],
): Promise<
  Map<
    string,
    ProfileRow
  >
> {
  const profileMap =
    new Map<
      string,
      ProfileRow
    >();

  if (
    userIds.length ===
    0
  ) {
    return profileMap;
  }

  try {
    const admin =
      createAdminClient();

    const {
      data:
        profileData,
      error:
        profileError,
    } =
      await admin
        .from(
          "profiles",
        )
        .select(
          "id,display_name,email",
        )
        .in(
          "id",
          userIds,
        );

    if (
      profileError
    ) {
      console.error(
        "[CASE Budget Household Approvals] Failed to load approval-user profiles.",
        profileError,
      );

      return profileMap;
    }

    const profileRows =
      (
        profileData ??
        []
      ) as unknown as
        ProfileRow[];

    for (
      const profile of
        profileRows
    ) {
      const id =
        normalizeOptionalText(
          profile.id,
        );

      if (
        !id
      ) {
        continue;
      }

      profileMap.set(
        id,
        profile,
      );
    }
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Household Approvals] Unexpected profile lookup error.",
      error,
    );
  }

  return profileMap;
}

function parseApprovalRow({
  row,
  profileMap,
}: {
  row:
    HouseholdApprovalDatabaseRow;

  profileMap:
    Map<
      string,
      ProfileRow
    >;
}): HouseholdApprovalRequest | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const workspaceId =
    normalizeOptionalText(
      row.workspace_id,
    );

  const approvalType =
    parseApprovalType(
      row.approval_type,
    );

  const status =
    parseApprovalStatus(
      row.status,
    );

  const title =
    normalizeOptionalText(
      row.title,
    );

  const description =
    normalizeOptionalText(
      row.description,
    );

  const requestedByUserId =
    normalizeOptionalText(
      row.requested_by_user_id,
    );

  const requestedAt =
    normalizeIsoDate(
      row.requested_at,
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
    !approvalType ||
    !status ||
    !title ||
    !description ||
    !requestedByUserId ||
    !requestedAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const requestedByProfile =
    profileMap.get(
      requestedByUserId,
    );

  const decisionByUserId =
    normalizeOptionalText(
      row.decision_by_user_id,
    );

  const decisionByProfile =
    decisionByUserId
      ? profileMap.get(
          decisionByUserId,
        )
      : undefined;

  const cancelledByUserId =
    normalizeOptionalText(
      row.cancelled_by_user_id,
    );

  return {
    id,

    workspaceId,

    type:
      approvalType,

    status,

    title,

    description,

    amount:
      parseAmount(
        row.amount,
      ),

    requestedByUserId,

    requestedByName:
      getProfileDisplayName(
        requestedByProfile,
      ),

    requestedByRole:
      parseActorRole(
        row.requested_by_role,
      ),

    requestedAt,

    target:
      parseApprovalTarget({
        entityType:
          row.target_entity_type,

        entityId:
          row.target_entity_id,
      }),

    payload:
      parsePayload(
        row.payload,
      ),

    decisionByUserId,

    decisionByName:
      getProfileDisplayName(
        decisionByProfile,
      ),

    decisionByRole:
      parseActorRole(
        row.decision_by_role,
      ),

    decision:
      parseApprovalDecision(
        row.decision,
      ),

    decisionReason:
      normalizeOptionalText(
        row.decision_reason,
      ),

    decidedAt:
      normalizeNullableIsoDate(
        row.decided_at,
      ),

    cancelledByUserId,

    cancelledAt:
      normalizeNullableIsoDate(
        row.cancelled_at,
      ),

    cancellationReason:
      normalizeOptionalText(
        row.cancellation_reason,
      ),

    expiresAt:
      normalizeNullableIsoDate(
        row.expires_at,
      ),

    createdAt,

    updatedAt,
  };
}

function parseApprovalType(
  value:
    unknown,
): HouseholdApprovalType | null {
  return isHouseholdApprovalType(
    value,
  )
    ? value
    : null;
}

function parseApprovalStatus(
  value:
    unknown,
): HouseholdApprovalStatus | null {
  return isHouseholdApprovalStatus(
    value,
  )
    ? value
    : null;
}

function parseApprovalDecision(
  value:
    unknown,
):
  | "approve"
  | "reject"
  | null {
  if (
    value ===
      "approve" ||
    value ===
      "reject"
  ) {
    return value;
  }

  return null;
}

function parseActorRole(
  value:
    unknown,
): HouseholdApprovalActorRole | null {
  switch (
    value
  ) {
    case "owner":
    case "admin":
    case "member":
    case "viewer":
      return value;

    default:
      return null;
  }
}

function parseApprovalTarget({
  entityType,
  entityId,
}: {
  entityType:
    unknown;

  entityId:
    unknown;
}): HouseholdApprovalTargetReference | null {
  const normalizedEntityType =
    normalizeOptionalText(
      entityType,
    );

  const normalizedEntityId =
    normalizeOptionalText(
      entityId,
    );

  if (
    !normalizedEntityType ||
    !normalizedEntityId
  ) {
    return null;
  }

  return {
    entityType:
      normalizedEntityType,

    entityId:
      normalizedEntityId,
  };
}

function parsePayload(
  value:
    unknown,
): Record<
  string,
  unknown
> | null {
  return isRecord(
    value,
  )
    ? value
    : null;
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

function getProfileDisplayName(
  profile:
    ProfileRow | undefined,
): string | null {
  if (
    !profile
  ) {
    return null;
  }

  const displayName =
    normalizeOptionalText(
      profile.display_name,
    );

  if (
    displayName
  ) {
    return displayName;
  }

  const email =
    normalizeOptionalText(
      profile.email,
    );

  return email
    ? getDisplayNameFromEmail(
        email,
      )
    : null;
}

function getDisplayNameFromEmail(
  email:
    string,
): string | null {
  const atIndex =
    email.indexOf(
      "@",
    );

  if (
    atIndex <=
    0
  ) {
    return null;
  }

  const localPart =
    email
      .slice(
        0,
        atIndex,
      )
      .trim();

  if (
    !localPart
  ) {
    return null;
  }

  const formattedName =
    localPart
      .replace(
        /[._-]+/g,
        " ",
      )
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .map(
        (
          part,
        ) =>
          `${part
            .charAt(
              0,
            )
            .toUpperCase()}${part.slice(
            1,
          )}`,
      )
      .join(
        " ",
      )
      .trim();

  return formattedName ||
    null;
}

function buildApprovalSummary(
  approvals:
    HouseholdApprovalRequest[],
): HouseholdApprovalSummary {
  let pendingCount =
    0;

  let approvedCount =
    0;

  let rejectedCount =
    0;

  let cancelledCount =
    0;

  for (
    const approval of
      approvals
  ) {
    switch (
      approval.status
    ) {
      case "pending":
        pendingCount +=
          1;

        break;

      case "approved":
        approvedCount +=
          1;

        break;

      case "rejected":
        rejectedCount +=
          1;

        break;

      case "cancelled":
        cancelledCount +=
          1;

        break;
    }
  }

  return {
    pendingCount,
    approvedCount,
    rejectedCount,
    cancelledCount,
    totalCount:
      approvals.length,
  };
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

  const timestamp =
    Date.parse(
      normalized,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return null;
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeNullableIsoDate(
  value:
    unknown,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeIsoDate(
    value,
  );
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

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function failure(
  message:
    string,
): HouseholdApprovalListResult {
  return {
    success:
      false,

    approvals: [],

    summary: {
      ...EMPTY_SUMMARY,
    },

    error:
      message,
  };
}
