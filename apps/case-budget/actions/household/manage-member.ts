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
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  initialHouseholdMemberManagementActionState,
  isHouseholdMemberManagementAction,
  type HouseholdMemberManagementAction,
  type HouseholdMemberManagementActionState,
  type ManageHouseholdMemberResult,
} from "@/types/household/member-management";

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
    WorkspaceMembershipStatusDatabaseEnum;

  invited_by:
    string | null;

  invited_at:
    string | null;

  invitation_expires_at:
    string | null;

  joined_at:
    string | null;

  suspended_at:
    string | null;

  suspended_by:
    string | null;

  suspension_reason:
    string | null;

  removed_at:
    string | null;

  removed_by:
    string | null;

  removal_reason:
    string | null;

  member_label:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type UpdatedWorkspaceMembershipRow = {
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

type MembershipUpdate = {
  status:
    WorkspaceMembershipStatusDatabaseEnum;

  suspended_at?:
    string | null;

  suspended_by?:
    string | null;

  suspension_reason?:
    string | null;

  removed_at?:
    string | null;

  removed_by?:
    string | null;

  removal_reason?:
    string | null;

  invitation_expires_at?:
    string | null;

  updated_at:
    string;
};

const HOUSEHOLD_MEMBERS_PATH =
  "/dashboard/household/members";

const HOUSEHOLD_ACTIVITY_PATH =
  "/dashboard/household/activity";

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const WORKSPACE_SETTINGS_PATH =
  "/dashboard/settings/workspaces";

const DASHBOARD_PATH =
  "/dashboard";

const REASON_MAX_LENGTH =
  500;

/**
 * Securely manages an existing CASE Budget workspace membership.
 *
 * Supported actions:
 *
 * remove
 * - Revokes workspace access.
 * - Changes membership status to "removed".
 * - The user may be invited again later.
 *
 * block
 * - Revokes workspace access.
 * - Changes membership status to "suspended".
 * - A suspended membership is treated as blocked by the invitation flow.
 * - The user cannot be invited again until the membership is unblocked.
 *
 * unblock
 * - Clears the suspension.
 * - Changes the membership to "removed".
 * - Does NOT automatically restore workspace access.
 * - The user may be invited again afterward.
 *
 * Security rules:
 *
 * - The active workspace is resolved from trusted server state.
 * - Only active workspace owners/admins can manage memberships.
 * - The workspace owner cannot be removed or blocked.
 * - Users cannot manage their own membership through this action.
 * - Administrators cannot remove/block/unblock another administrator.
 * - Only the workspace owner can manage administrators.
 */
export async function manageHouseholdMember({
  membershipId,
  action,
  reason,
}: {
  membershipId:
    string;

  action:
    HouseholdMemberManagementAction;

  reason?:
    string;
}): Promise<ManageHouseholdMemberResult> {
  try {
    const normalizedMembershipId =
      normalizeRequiredText(
        membershipId,
      );

    if (
      !normalizedMembershipId
    ) {
      return failure({
        code:
          "invalid-membership",

        message:
          "A valid workspace membership is required.",
      });
    }

    if (
      !isHouseholdMemberManagementAction(
        action,
      )
    ) {
      return failure({
        code:
          "invalid-action",

        message:
          "Select a valid member-management action.",
      });
    }

    const normalizedReason =
      normalizeOptionalText(
        reason,
      );

    if (
      normalizedReason &&
      normalizedReason.length >
        REASON_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-action",

        message:
          `The reason must be ${REASON_MAX_LENGTH} characters or fewer.`,
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
     * Load the active workspace using the trusted workspace ID from
     * requireCaseBudgetServerAuth().
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
          "id, owner_user_id, is_active",
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
        "[CASE Budget Household Member Management] Failed to load workspace.",
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
          "permission-denied",

        message:
          "Members cannot be managed while this workspace is inactive.",
      });
    }

    /**
     * Verify the calling user's permissions inside the active workspace.
     */
    const {
      data:
        callerMembershipData,
      error:
        callerMembershipError,
    } =
      await workspaceAdmin
        .from(
          "workspace_members",
        )
        .select(
          "id, workspace_id, user_id, role, status, invited_by, invited_at, invitation_expires_at, joined_at, suspended_at, suspended_by, suspension_reason, removed_at, removed_by, removal_reason, member_label, created_at, updated_at",
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
      callerMembershipError
    ) {
      console.error(
        "[CASE Budget Household Member Management] Failed to verify caller membership.",
        {
          workspaceId,

          userId,

          error:
            callerMembershipError,
        },
      );

      return failure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not verify your workspace permissions.",
      });
    }

    const callerMembership =
      callerMembershipData as unknown as
        | WorkspaceMembershipRow
        | null;

    const callerIsOwner =
      workspace.owner_user_id ===
        userId ||
      (
        callerMembership?.role ===
          "owner" &&
        callerMembership.status ===
          "active"
      );

    const callerIsAdmin =
      callerMembership?.role ===
        "admin" &&
      callerMembership.status ===
        "active";

    if (
      !callerIsOwner &&
      !callerIsAdmin
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "Only workspace owners and administrators can manage members.",
      });
    }

    /**
     * Load the target membership.
     *
     * workspace_id is included in the query so a membership ID from another
     * workspace can never be managed through the current workspace.
     */
    const {
      data:
        targetMembershipData,
      error:
        targetMembershipError,
    } =
      await workspaceAdmin
        .from(
          "workspace_members",
        )
        .select(
          "id, workspace_id, user_id, role, status, invited_by, invited_at, invitation_expires_at, joined_at, suspended_at, suspended_by, suspension_reason, removed_at, removed_by, removal_reason, member_label, created_at, updated_at",
        )
        .eq(
          "id",
          normalizedMembershipId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .maybeSingle();

    if (
      targetMembershipError
    ) {
      console.error(
        "[CASE Budget Household Member Management] Failed to load target membership.",
        {
          workspaceId,

          membershipId:
            normalizedMembershipId,

          userId,

          error:
            targetMembershipError,
        },
      );

      return failure({
        code:
          "membership-not-found",

        message:
          "CASE Budget could not load the selected workspace member.",
      });
    }

    const targetMembership =
      targetMembershipData as unknown as
        | WorkspaceMembershipRow
        | null;

    if (
      !targetMembership
    ) {
      return failure({
        code:
          "membership-not-found",

        message:
          "The selected workspace membership could not be found.",
      });
    }

    /**
     * Never let a user perform this privileged flow against themselves.
     *
     * A future "Leave workspace" flow should be separate because it has
     * different ownership and last-admin protections.
     */
    if (
      targetMembership.user_id ===
        userId
    ) {
      return failure({
        code:
          "cannot-manage-self",

        message:
          "You cannot remove or block your own workspace membership from this screen.",
      });
    }

    /**
     * Protect the actual workspace owner regardless of what the membership
     * row currently says.
     */
    if (
      targetMembership.user_id ===
        workspace.owner_user_id ||
      targetMembership.role ===
        "owner"
    ) {
      return failure({
        code:
          "cannot-manage-owner",

        message:
          "The workspace owner cannot be removed or blocked.",
      });
    }

    /**
     * Administrators may manage normal members and viewers.
     *
     * Only the workspace owner may manage another administrator.
     */
    if (
      callerIsAdmin &&
      targetMembership.role ===
        "admin"
    ) {
      return failure({
        code:
          "admin-protected",

        message:
          "Only the workspace owner can remove, block, or unblock an administrator.",
      });
    }

    const previousStatus =
      targetMembership.status;

    const now =
      new Date().toISOString();

    const membershipUpdate =
      buildMembershipUpdate({
        action,

        actorUserId:
          userId,

        targetMembership,

        reason:
          normalizedReason,

        now,
      });

    if (
      !membershipUpdate.success
    ) {
      return membershipUpdate.result;
    }

    /**
     * Include the previously loaded status in the update condition.
     *
     * This prevents overwriting a membership whose state changed between
     * the read above and this update.
     */
    const {
      data:
        updatedMembershipData,
      error:
        membershipUpdateError,
    } =
      await workspaceAdmin
        .from(
          "workspace_members",
        )
        .update(
          membershipUpdate.data,
        )
        .eq(
          "id",
          targetMembership.id,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "user_id",
          targetMembership.user_id,
        )
        .eq(
          "status",
          previousStatus,
        )
        .select(
          "id, workspace_id, user_id, role, status",
        )
        .maybeSingle();

    if (
      membershipUpdateError
    ) {
      console.error(
        "[CASE Budget Household Member Management] Failed to update membership.",
        {
          action,

          workspaceId,

          membershipId:
            targetMembership.id,

          targetUserId:
            targetMembership.user_id,

          previousStatus,

          error:
            membershipUpdateError,
        },
      );

      return failure({
        code:
          "membership-update-failed",

        message:
          getUpdateFailureMessage(
            action,
          ),
      });
    }

    if (
      !updatedMembershipData
    ) {
      console.error(
        "[CASE Budget Household Member Management] Membership state changed before update completed.",
        {
          action,

          workspaceId,

          membershipId:
            targetMembership.id,

          targetUserId:
            targetMembership.user_id,

          previousStatus,
        },
      );

      return failure({
        code:
          "membership-update-failed",

        message:
          "This member's status changed before the request completed. Refresh the page and try again.",
      });
    }

    const updatedMembership =
      updatedMembershipData as unknown as UpdatedWorkspaceMembershipRow;

    revalidateWorkspaceMemberPaths();

    return {
      success:
        true,

      data: {
        membershipId:
          updatedMembership.id,

        workspaceId:
          updatedMembership.workspace_id,

        userId:
          updatedMembership.user_id,

        role:
          updatedMembership.role,

        previousStatus,

        status:
          updatedMembership.status,

        action,

        changedAt:
          now,
      },
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
      "[CASE Budget Household Member Management] Unexpected member-management error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not update this workspace member. Please try again.",
    });
  }
}

/**
 * React useActionState-compatible adapter.
 */
export async function manageHouseholdMemberAction(
  _previousState:
    HouseholdMemberManagementActionState =
      initialHouseholdMemberManagementActionState,

  formData:
    FormData,
): Promise<HouseholdMemberManagementActionState> {
  const membershipId =
    normalizeFormDataText(
      formData.get(
        "membershipId",
      ),
    );

  const actionValue =
    normalizeFormDataText(
      formData.get(
        "action",
      ),
    );

  const reason =
    normalizeFormDataText(
      formData.get(
        "reason",
      ),
    );

  if (
    !membershipId
  ) {
    return {
      status:
        "error",

      message:
        "A workspace membership is required.",

      result:
        null,
    };
  }

  if (
    !isHouseholdMemberManagementAction(
      actionValue,
    )
  ) {
    return {
      status:
        "error",

      message:
        "Select a valid member-management action.",

      result:
        null,
    };
  }

  const result =
    await manageHouseholdMember({
      membershipId,

      action:
        actionValue,

      reason:
        reason ??
        undefined,
    });

  if (
    !result.success
  ) {
    return {
      status:
        "error",

      message:
        result.error.message,

      result:
        null,
    };
  }

  return {
    status:
      "success",

    message:
      getActionSuccessMessage(
        result.data.action,
      ),

    result:
      result.data,
  };
}

function buildMembershipUpdate({
  action,
  actorUserId,
  targetMembership,
  reason,
  now,
}: {
  action:
    HouseholdMemberManagementAction;

  actorUserId:
    string;

  targetMembership:
    WorkspaceMembershipRow;

  reason:
    string | null;

  now:
    string;
}):
  | {
      success:
        true;

      data:
        MembershipUpdate;
    }
  | {
      success:
        false;

      result:
        ManageHouseholdMemberResult;
    } {
  switch (
    action
  ) {
    case "remove": {
      if (
        targetMembership.status ===
          "removed"
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-member-state",

              message:
                "This member has already been removed from the workspace.",
            }),
        };
      }

      return {
        success:
          true,

        data: {
          status:
            "removed",

          suspended_at:
            null,

          suspended_by:
            null,

          suspension_reason:
            null,

          removed_at:
            now,

          removed_by:
            actorUserId,

          removal_reason:
            reason ??
            getDefaultRemovalReason(
              targetMembership.status,
            ),

          invitation_expires_at:
            null,

          updated_at:
            now,
        },
      };
    }

    case "block": {
      if (
        targetMembership.status ===
          "suspended"
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-member-state",

              message:
                "This member is already blocked from this workspace.",
            }),
        };
      }

      return {
        success:
          true,

        data: {
          status:
            "suspended",

          suspended_at:
            now,

          suspended_by:
            actorUserId,

          suspension_reason:
            reason ??
            "Blocked by a workspace administrator.",

          removed_at:
            null,

          removed_by:
            null,

          removal_reason:
            null,

          invitation_expires_at:
            null,

          updated_at:
            now,
        },
      };
    }

    case "unblock": {
      if (
        targetMembership.status !==
          "suspended"
      ) {
        return {
          success:
            false,

          result:
            failure({
              code:
                "invalid-member-state",

              message:
                "Only a blocked member can be unblocked.",
            }),
        };
      }

      /**
       * Unblocking intentionally does not restore workspace access.
       *
       * The membership becomes "removed". This clears the block while
       * requiring a new invitation before the user can access the
       * workspace again.
       */
      return {
        success:
          true,

        data: {
          status:
            "removed",

          suspended_at:
            null,

          suspended_by:
            null,

          suspension_reason:
            null,

          removed_at:
            now,

          removed_by:
            actorUserId,

          removal_reason:
            reason ??
            "Workspace block removed. A new invitation is required to restore access.",

          invitation_expires_at:
            null,

          updated_at:
            now,
        },
      };
    }
  }
}

function getDefaultRemovalReason(
  previousStatus:
    WorkspaceMembershipStatusDatabaseEnum,
) {
  if (
    previousStatus ===
    "invited"
  ) {
    return "Pending workspace invitation canceled.";
  }

  if (
    previousStatus ===
    "suspended"
  ) {
    return "Blocked membership removed from the workspace.";
  }

  return "Removed from the workspace by a workspace administrator.";
}

function getActionSuccessMessage(
  action:
    HouseholdMemberManagementAction,
) {
  switch (
    action
  ) {
    case "remove":
      return "The member has been removed from the workspace.";

    case "block":
      return "The member has been blocked from the workspace.";

    case "unblock":
      return "The member has been unblocked. A new invitation is required before they can regain access.";
  }
}

function getUpdateFailureMessage(
  action:
    HouseholdMemberManagementAction,
) {
  switch (
    action
  ) {
    case "remove":
      return "CASE Budget could not remove this member from the workspace.";

    case "block":
      return "CASE Budget could not block this member from the workspace.";

    case "unblock":
      return "CASE Budget could not unblock this member.";
  }
}

function revalidateWorkspaceMemberPaths() {
  revalidatePath(
    HOUSEHOLD_MEMBERS_PATH,
  );

  revalidatePath(
    HOUSEHOLD_ACTIVITY_PATH,
  );

  revalidatePath(
    HOUSEHOLD_APPROVALS_PATH,
  );

  revalidatePath(
    WORKSPACE_SETTINGS_PATH,
  );

  revalidatePath(
    DASHBOARD_PATH,
  );
}

function normalizeRequiredText(
  value:
    unknown,
) {
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

function normalizeOptionalText(
  value:
    unknown,
) {
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

function normalizeFormDataText(
  value:
    FormDataEntryValue | null,
) {
  return typeof value ===
    "string"
    ? normalizeOptionalText(
        value,
      )
    : null;
}

function failure({
  code,
  message,
}: {
  code:
    Extract<
      ManageHouseholdMemberResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;
}): ManageHouseholdMemberResult {
  return {
    success:
      false,

    error: {
      code,

      message,
    },
  };
}