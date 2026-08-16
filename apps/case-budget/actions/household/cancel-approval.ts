"use server";

import {
  revalidatePath,
} from "next/cache";

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
  type CancelHouseholdApprovalInput,
  type CancelHouseholdApprovalResult,
  type HouseholdApprovalActorRole,
  type HouseholdApprovalRequest,
  type HouseholdApprovalTargetReference,
  type HouseholdApprovalType,
  isHouseholdApprovalType,
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

type HouseholdApprovalDatabaseRow = {
  id:
    string;

  workspace_id:
    string;

  approval_type:
    string;

  status:
    string;

  title:
    string;

  description:
    string;

  amount:
    number | string | null;

  requested_by_user_id:
    string;

  requested_by_role:
    string | null;

  requested_at:
    string;

  target_entity_type:
    string | null;

  target_entity_id:
    string | null;

  payload:
    unknown;

  decision_by_user_id:
    string | null;

  decision_by_role:
    string | null;

  decision:
    string | null;

  decision_reason:
    string | null;

  decided_at:
    string | null;

  cancelled_by_user_id:
    string | null;

  cancelled_at:
    string | null;

  cancellation_reason:
    string | null;

  expires_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type ProfileRow = {
  id:
    string;

  display_name:
    string | null;

  email:
    string | null;
};

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const HOUSEHOLD_ACTIVITY_PATH =
  "/dashboard/household/activity";

const DASHBOARD_PATH =
  "/dashboard";

const CANCELLATION_REASON_MAX_LENGTH =
  1000;

/**
 * Cancels a pending household approval request.
 *
 * Security rules:
 *
 * - The authenticated user and active workspace are resolved server-side.
 * - The browser never supplies workspace_id.
 * - The approval must belong to the active workspace.
 * - The caller must have an active workspace membership.
 * - The requester may cancel their own pending request.
 * - Workspace owners may cancel any pending request.
 * - Workspace administrators may cancel pending requests created by
 *   members/viewers, but not requests created by another administrator
 *   or the workspace owner.
 * - Only pending requests may be cancelled.
 *
 * State transition:
 *
 * pending
 *   -> cancelled
 *
 * Cancellation never executes the protected action.
 */
export async function cancelHouseholdApproval(
  input:
    CancelHouseholdApprovalInput,
): Promise<CancelHouseholdApprovalResult> {
  try {
    const approvalId =
      normalizeOptionalText(
        input.approvalId,
      );

    if (
      !approvalId
    ) {
      return failure({
        code:
          "invalid-approval",

        message:
          "A valid approval request is required.",
      });
    }

    const reason =
      normalizeOptionalText(
        input.reason,
      );

    if (
      reason &&
      reason.length >
        CANCELLATION_REASON_MAX_LENGTH
    ) {
      return failure({
        code:
          "cancel-update-failed",

        message:
          `Cancellation reason must be ${CANCELLATION_REASON_MAX_LENGTH} characters or fewer.`,
      });
    }

    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const workspaceAdmin =
      createWorkspaceAdminClient();

    /**
     * Verify the currently active workspace.
     */
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
        "[CASE Budget Household Approval Cancel] Failed to load active workspace.",
        {
          workspaceId,

          userId,

          error:
            workspaceError,
        },
      );

      return failure({
        code:
          "permission-denied",

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
          "permission-denied",

        message:
          "The active CASE Budget workspace could not be found.",
      });
    }

    if (
      !workspace.is_active
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "Approval requests cannot be cancelled while this workspace is inactive.",
      });
    }

    /**
     * Verify the caller has active access to the workspace.
     */
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
        "[CASE Budget Household Approval Cancel] Failed to verify caller membership.",
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
          "You must be an active workspace member to cancel an approval request.",
      });
    }

    const callerRole =
      resolveActorRole({
        workspaceOwnerUserId:
          workspace.owner_user_id,

        userId,

        membershipRole:
          membership.role,
      });

    if (
      !callerRole
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not determine your workspace role.",
      });
    }

    /**
     * Load the requested approval, scoped to the trusted active workspace.
     */
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
          "id",
          approvalId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .maybeSingle();

    if (
      approvalError
    ) {
      console.error(
        "[CASE Budget Household Approval Cancel] Failed to load approval request.",
        {
          approvalId,

          workspaceId,

          userId,

          error:
            approvalError,
        },
      );

      return failure({
        code:
          "approval-not-found",

        message:
          "CASE Budget could not load the selected approval request.",
      });
    }

    const approval =
      approvalData as unknown as
        | HouseholdApprovalDatabaseRow
        | null;

    if (
      !approval
    ) {
      return failure({
        code:
          "approval-not-found",

        message:
          "The selected household approval request could not be found.",
      });
    }

    if (
      approval.status !==
      "pending"
    ) {
      return failure({
        code:
          "approval-not-pending",

        message:
          getNotPendingMessage(
            approval.status,
          ),
      });
    }

    const requesterRole =
      parseActorRole(
        approval.requested_by_role,
      );

    const callerIsRequester =
      approval.requested_by_user_id ===
      userId;

    const callerIsOwner =
      callerRole ===
      "owner";

    const callerIsAdmin =
      callerRole ===
      "admin";

    /**
     * Requesters may always cancel their own pending requests.
     */
    if (
      !callerIsRequester
    ) {
      if (
        callerIsOwner
      ) {
        // Owner may cancel any pending request.
      } else if (
        callerIsAdmin
      ) {
        /**
         * Admins may cancel Member/Viewer requests, but not requests
         * created by another Admin or by the workspace Owner.
         */
        if (
          requesterRole ===
            "owner" ||
          requesterRole ===
            "admin"
        ) {
          return failure({
            code:
              "permission-denied",

            message:
              "Administrators cannot cancel approval requests created by the workspace owner or another administrator.",
          });
        }
      } else {
        return failure({
          code:
            "permission-denied",

          message:
            "You can only cancel approval requests that you created.",
        });
      }
    }

    const cancelledAt =
      new Date().toISOString();

    /**
     * Atomic pending-only state transition.
     *
     * Including status = pending prevents a stale cancellation from
     * overwriting an approval or rejection performed at the same time.
     */
    const {
      data:
        updatedApprovalData,
      error:
        updateError,
    } =
      await workspaceAdmin
        .from(
          "case_budget_household_approvals",
        )
        .update({
          status:
            "cancelled",

          cancelled_by_user_id:
            userId,

          cancelled_at:
            cancelledAt,

          cancellation_reason:
            reason,

          updated_at:
            cancelledAt,
        })
        .eq(
          "id",
          approvalId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "status",
          "pending",
        )
        .select(
          "id,workspace_id,approval_type,status,title,description,amount,requested_by_user_id,requested_by_role,requested_at,target_entity_type,target_entity_id,payload,decision_by_user_id,decision_by_role,decision,decision_reason,decided_at,cancelled_by_user_id,cancelled_at,cancellation_reason,expires_at,created_at,updated_at",
        )
        .maybeSingle();

    if (
      updateError
    ) {
      console.error(
        "[CASE Budget Household Approval Cancel] Failed to cancel approval request.",
        {
          approvalId,

          workspaceId,

          userId,

          error:
            updateError,
        },
      );

      return failure({
        code:
          "cancel-update-failed",

        message:
          "CASE Budget could not cancel this approval request.",
      });
    }

    if (
      !updatedApprovalData
    ) {
      return failure({
        code:
          "approval-not-pending",

        message:
          "This approval request changed before the cancellation completed. Refresh the page and review its current status.",
      });
    }

    const updatedApproval =
      updatedApprovalData as unknown as HouseholdApprovalDatabaseRow;

    const profileMap =
      await loadProfileMap(
        [
          updatedApproval.requested_by_user_id,
          updatedApproval.decision_by_user_id,
          updatedApproval.cancelled_by_user_id,
        ],
      );

    const parsedApproval =
      parseApprovalRow({
        row:
          updatedApproval,

        profileMap,
      });

    if (
      !parsedApproval
    ) {
      console.error(
        "[CASE Budget Household Approval Cancel] Updated approval could not be parsed.",
        {
          approvalId,

          workspaceId,

          userId,
        },
      );

      return failure({
        code:
          "cancel-update-failed",

        message:
          "The approval was cancelled, but CASE Budget could not verify the updated record.",
      });
    }

    revalidateApprovalPaths();

    return {
      success:
        true,

      approval:
        parsedApproval,

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
          "permission-denied",

        message:
          error.message,
      });
    }

    console.error(
      "[CASE Budget Household Approval Cancel] Unexpected cancellation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not cancel the household approval request. Please try again.",
    });
  }
}

async function loadProfileMap(
  userIds:
    Array<
      string | null
    >,
): Promise<
  Map<
    string,
    ProfileRow
  >
> {
  const normalizedUserIds =
    Array.from(
      new Set(
        userIds
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
    new Map<
      string,
      ProfileRow
    >();

  if (
    normalizedUserIds.length ===
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
          normalizedUserIds,
        );

    if (
      profileError
    ) {
      console.error(
        "[CASE Budget Household Approval Cancel] Failed to load approval profiles.",
        profileError,
      );

      return profileMap;
    }

    const profiles =
      (
        profileData ??
        []
      ) as unknown as
        ProfileRow[];

    for (
      const profile of
        profiles
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
    /**
     * Profile enrichment should never prevent a successfully cancelled
     * approval request from being returned.
     */
    console.error(
      "[CASE Budget Household Approval Cancel] Unexpected profile lookup error.",
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

  const type =
    normalizeApprovalType(
      row.approval_type,
    );

  const status =
    normalizeApprovalStatus(
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
    !type ||
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

    type,

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
      parseTarget({
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
      parseDecision(
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

function resolveActorRole({
  workspaceOwnerUserId,
  userId,
  membershipRole,
}: {
  workspaceOwnerUserId:
    string;

  userId:
    string;

  membershipRole:
    WorkspaceRoleDatabaseEnum;
}): HouseholdApprovalActorRole | null {
  if (
    workspaceOwnerUserId ===
      userId
  ) {
    return "owner";
  }

  return parseActorRole(
    membershipRole,
  );
}

function normalizeApprovalType(
  value:
    unknown,
): HouseholdApprovalType | null {
  return isHouseholdApprovalType(
    value,
  )
    ? value
    : null;
}

function normalizeApprovalStatus(
  value:
    unknown,
):
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | null {
  switch (
    value
  ) {
    case "pending":
    case "approved":
    case "rejected":
    case "cancelled":
      return value;

    default:
      return null;
  }
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

function parseDecision(
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

function parseTarget({
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

function getNotPendingMessage(
  status:
    string,
) {
  switch (
    status
  ) {
    case "approved":
      return "This approval request has already been approved and cannot be cancelled.";

    case "rejected":
      return "This approval request has already been rejected and cannot be cancelled.";

    case "cancelled":
      return "This approval request has already been cancelled.";

    default:
      return "This approval request is no longer pending.";
  }
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
  const localPart =
    email
      .split(
        "@",
      )[0]
      ?.trim();

  if (
    !localPart
  ) {
    return null;
  }

  const formatted =
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

  return formatted ||
    null;
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

function revalidateApprovalPaths() {
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
      CancelHouseholdApprovalResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): CancelHouseholdApprovalResult {
  return {
    success:
      false,

    approval:
      null,

    error: {
      code,

      message,
    },
  };
}