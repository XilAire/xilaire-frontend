"use server";

import {
  revalidatePath,
} from "next/cache";

import type {
  User,
} from "@supabase/supabase-js";

import {
  sendWorkspaceInvitationEmail,
} from "@/lib/auth/auth-email-service";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createAdminClient,
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import {
  HOUSEHOLD_INVITATION_EXPIRATION_HOURS,
  initialInviteHouseholdMemberActionState,
  isHouseholdInvitationRole,
  type HouseholdInvitationRole,
  type InviteHouseholdMemberActionState,
  type InviteHouseholdMemberInput,
  type InviteHouseholdMemberResult,
} from "@/types/household/invitation";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
  WorkspaceTypeDatabaseEnum,
} from "@/types/database";

type WorkspaceRow = {
  id:
    string;

  name:
    string;

  workspace_type:
    WorkspaceTypeDatabaseEnum;

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

type WorkspaceMembershipInsertRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    HouseholdInvitationRole;

  status:
    "invited";

  invited_by:
    string;

  invited_at:
    string;

  invitation_expires_at:
    string;

  joined_at:
    null;

  suspended_at:
    null;

  suspended_by:
    null;

  suspension_reason:
    null;

  removed_at:
    null;

  removed_by:
    null;

  removal_reason:
    null;

  member_label:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type WorkspaceMembershipUpdateRow = {
  role:
    HouseholdInvitationRole;

  status:
    "invited";

  invited_by:
    string;

  invited_at:
    string;

  invitation_expires_at:
    string;

  joined_at:
    null;

  suspended_at:
    null;

  suspended_by:
    null;

  suspension_reason:
    null;

  removed_at:
    null;

  removed_by:
    null;

  removal_reason:
    null;

  member_label:
    string | null;

  updated_at:
    string;
};

type ExistingAuthUserResult = {
  user:
    User | null;

  error:
    Error | null;
};

const HOUSEHOLD_MEMBERS_PATH =
  "/dashboard/household/members";

const ACCEPT_INVITE_PATH =
  "/accept-invite";

const DISPLAY_NAME_MAX_LENGTH =
  120;

const MEMBER_LABEL_MAX_LENGTH =
  80;

const AUTH_USER_PAGE_SIZE =
  200;

const MAX_AUTH_USER_PAGES =
  50;

const DEFAULT_APP_URL =
  "http://localhost:3004";

/**
 * Securely invites a user into the currently active CASE Budget workspace.
 *
 * Important:
 *
 * - The current user and workspace are resolved from trusted server state.
 * - Only active workspace owners and administrators may invite members.
 * - Ownership cannot be granted through this flow.
 * - Invitations are represented by workspace_members rows with
 *   status = "invited".
 * - CASE Budget's existing branded Supabase invitation-email flow is reused.
 * - The invitee's real display name is stored in Supabase Auth metadata.
 */
export async function inviteHouseholdMember(
  input:
    InviteHouseholdMemberInput,
): Promise<InviteHouseholdMemberResult> {
  try {
    const normalizedDisplayName =
      normalizeOptionalText(
        input.displayName,
      );

    if (
      !normalizedDisplayName
    ) {
      return failure({
        code:
          "invalid-display-name",

        message:
          "Enter the member's name.",

        field:
          "displayName",
      });
    }

    if (
      normalizedDisplayName.length >
        DISPLAY_NAME_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-display-name",

        message:
          `Member name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,

        field:
          "displayName",
      });
    }

    const normalizedEmail =
      normalizeEmail(
        input.email,
      );

    if (
      !normalizedEmail
    ) {
      return failure({
        code:
          "invalid-email",

        message:
          "Enter a valid email address.",

        field:
          "email",
      });
    }

    if (
      !isHouseholdInvitationRole(
        input.role,
      )
    ) {
      return failure({
        code:
          "invalid-role",

        message:
          "Select a valid household role.",

        field:
          "role",
      });
    }

    const normalizedMemberLabel =
      normalizeOptionalText(
        input.memberLabel,
      );

    if (
      normalizedMemberLabel &&
      normalizedMemberLabel.length >
        MEMBER_LABEL_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-role",

        message:
          `Member label must be ${MEMBER_LABEL_MAX_LENGTH} characters or fewer.`,

        field:
          "memberLabel",
      });
    }

    const {
      user,
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const currentUserEmail =
      normalizeEmail(
        user.email,
      );

    if (
      currentUserEmail &&
      currentUserEmail ===
        normalizedEmail
    ) {
      return failure({
        code:
          "cannot-invite-self",

        message:
          "You cannot invite your own account to this workspace.",

        field:
          "email",
      });
    }

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
          "id,name,workspace_type,owner_user_id,is_active",
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
        "[CASE Budget Household Invite] Failed to load workspace.",
        workspaceError,
      );

      return failure({
        code:
          "workspace-not-found",

        message:
          "CASE Budget could not load the active workspace.",
      });
    }

    const workspace =
      workspaceData as
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
          "Members cannot be invited to an inactive workspace.",
      });
    }

    if (
      !isShareableWorkspaceType(
        workspace.workspace_type,
      )
    ) {
      return failure({
        code:
          "workspace-not-shareable",

        message:
          "This workspace type does not support member invitations.",
      });
    }

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
          "id,workspace_id,user_id,role,status,invited_by,invited_at,invitation_expires_at,joined_at,suspended_at,suspended_by,suspension_reason,removed_at,removed_by,removal_reason,member_label,created_at,updated_at",
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
        "[CASE Budget Household Invite] Failed to verify inviter membership.",
        callerMembershipError,
      );

      return failure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not verify your workspace permissions.",
      });
    }

    const callerMembership =
      callerMembershipData as
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
          "Only workspace owners and administrators can invite members.",
      });
    }

    /**
     * If this email already belongs to a Supabase Auth user, inspect the
     * existing workspace membership before generating another invitation.
     */
    const existingAuthUserResult =
      await findAuthUserByEmail(
        normalizedEmail,
      );

    if (
      existingAuthUserResult.error
    ) {
      console.error(
        "[CASE Budget Household Invite] Could not inspect existing Auth users.",
        existingAuthUserResult.error,
      );
    }

    const existingAuthUser =
      existingAuthUserResult.user;

    if (
      existingAuthUser?.id ===
        userId
    ) {
      return failure({
        code:
          "cannot-invite-self",

        message:
          "You cannot invite your own account to this workspace.",

        field:
          "email",
      });
    }

    let existingMembership:
      WorkspaceMembershipRow | null =
      null;

    if (
      existingAuthUser
    ) {
      const existingMembershipResult =
        await getWorkspaceMembership({
          workspaceId,

          userId:
            existingAuthUser.id,
        });

      if (
        existingMembershipResult.error
      ) {
        console.error(
          "[CASE Budget Household Invite] Failed to inspect existing membership.",
          existingMembershipResult.error,
        );

        return failure({
          code:
            "unexpected-error",

          message:
            "CASE Budget could not verify whether this user already belongs to the workspace.",
        });
      }

      existingMembership =
        existingMembershipResult.membership;

      const existingMembershipFailure =
        getExistingMembershipFailure(
          existingMembership,
        );

      if (
        existingMembershipFailure
      ) {
        return existingMembershipFailure;
      }
    }

    const now =
      new Date();

    const invitedAt =
      now.toISOString();

    const invitationExpiresAt =
      new Date(
        now.getTime() +
          HOUSEHOLD_INVITATION_EXPIRATION_HOURS *
            60 *
            60 *
            1000,
      ).toISOString();

    const inviterName =
      getUserDisplayName(
        user,
      );

    const redirectTo =
      buildInvitationRedirectUrl();

    /**
     * Store the person's actual name in the Supabase Auth user metadata.
     *
     * Multiple conventional keys are intentionally populated because
     * different parts of Supabase and CASE Budget may read different
     * metadata conventions.
     */
    const invitationResult =
      await sendWorkspaceInvitationEmail({
        email:
          normalizedEmail,

        inviterName,

        workspaceName:
          workspace.name,

        redirectTo,

        expiresInHours:
          HOUSEHOLD_INVITATION_EXPIRATION_HOURS,

        metadata: {
          app:
            "case-budget",

          display_name:
            normalizedDisplayName,

          full_name:
            normalizedDisplayName,

          name:
            normalizedDisplayName,

          workspace_id:
            workspaceId,

          workspace_name:
            workspace.name,

          workspace_role:
            input.role,

          invited_by:
            userId,
        },
      });

    if (
      !invitationResult.success
    ) {
      console.error(
        "[CASE Budget Household Invite] Invitation email flow failed.",
        invitationResult.error,
      );

      return failure({
        code:
          "invite-email-failed",

        message:
          invitationResult.error.message ||
          "CASE Budget could not send the workspace invitation.",
      });
    }

    const invitedUserId =
      normalizeOptionalText(
        invitationResult.data
          .userId,
      ) ??
      normalizeOptionalText(
        invitationResult.data
          .user?.id,
      );

    if (
      !invitedUserId
    ) {
      return failure({
        code:
          "invite-user-missing",

        message:
          "The invitation email was created, but CASE Budget could not determine the invited user account.",
      });
    }

    if (
      invitedUserId ===
      userId
    ) {
      return failure({
        code:
          "cannot-invite-self",

        message:
          "You cannot invite your own account to this workspace.",

        field:
          "email",
      });
    }

    /**
     * Ensure the invited Auth user's metadata contains the display name.
     *
     * This also covers invitation-service implementations where the
     * generated invite user is returned before metadata is reflected in
     * the Auth user record.
     */
    const authMetadataResult =
      await updateInvitedUserMetadata({
        userId:
          invitedUserId,

        displayName:
          normalizedDisplayName,

        workspaceId,

        workspaceName:
          workspace.name,

        workspaceRole:
          input.role,

        invitedBy:
          userId,
      });

    if (
      authMetadataResult
    ) {
      console.error(
        "[CASE Budget Household Invite] Failed to update invited Auth user metadata.",
        authMetadataResult,
      );
    }

    /**
     * If the invite link created a previously unknown Supabase Auth user,
     * inspect membership again now that we have its user ID.
     */
    if (
      !existingMembership
    ) {
      const membershipAfterInvite =
        await getWorkspaceMembership({
          workspaceId,

          userId:
            invitedUserId,
        });

      if (
        membershipAfterInvite.error
      ) {
        console.error(
          "[CASE Budget Household Invite] Failed to inspect invited membership after Auth invite creation.",
          membershipAfterInvite.error,
        );

        return failure({
          code:
            "unexpected-error",

          message:
            "The invitation email was sent, but CASE Budget could not verify the workspace membership.",
        });
      }

      existingMembership =
        membershipAfterInvite.membership;

      const existingMembershipFailure =
        getExistingMembershipFailure(
          existingMembership,
        );

      if (
        existingMembershipFailure
      ) {
        return existingMembershipFailure;
      }
    }

    /**
     * member_label is a household relationship/description such as:
     *
     * Spouse
     * Parent
     * Advisor
     *
     * It is intentionally not populated from the user's workspace role.
     */
    const memberLabel:
      string | null =
      normalizedMemberLabel ??
      null;

    let membershipId:
      string;

    if (
      existingMembership
    ) {
      membershipId =
        existingMembership.id;

      const membershipUpdate:
        WorkspaceMembershipUpdateRow = {
        role:
          input.role,

        status:
          "invited",

        invited_by:
          userId,

        invited_at:
          invitedAt,

        invitation_expires_at:
          invitationExpiresAt,

        joined_at:
          null,

        suspended_at:
          null,

        suspended_by:
          null,

        suspension_reason:
          null,

        removed_at:
          null,

        removed_by:
          null,

        removal_reason:
          null,

        member_label:
          memberLabel,

        updated_at:
          invitedAt,
      };

      const {
        error:
          membershipUpdateError,
      } =
        await workspaceAdmin
          .from(
            "workspace_members",
          )
          .update(
            membershipUpdate,
          )
          .eq(
            "id",
            existingMembership.id,
          );

      if (
        membershipUpdateError
      ) {
        console.error(
          "[CASE Budget Household Invite] Failed to reactivate membership as invited.",
          membershipUpdateError,
        );

        return failure({
          code:
            "membership-update-failed",

          message:
            "The invitation email was sent, but CASE Budget could not update the pending workspace membership.",
        });
      }
    } else {
      membershipId =
        crypto.randomUUID();

      const membershipInsert:
        WorkspaceMembershipInsertRow = {
        id:
          membershipId,

        workspace_id:
          workspaceId,

        user_id:
          invitedUserId,

        role:
          input.role,

        status:
          "invited",

        invited_by:
          userId,

        invited_at:
          invitedAt,

        invitation_expires_at:
          invitationExpiresAt,

        joined_at:
          null,

        suspended_at:
          null,

        suspended_by:
          null,

        suspension_reason:
          null,

        removed_at:
          null,

        removed_by:
          null,

        removal_reason:
          null,

        member_label:
          memberLabel,

        created_at:
          invitedAt,

        updated_at:
          invitedAt,
      };

      const {
        error:
          membershipInsertError,
      } =
        await workspaceAdmin
          .from(
            "workspace_members",
          )
          .insert(
            membershipInsert,
          );

      if (
        membershipInsertError
      ) {
        console.error(
          "[CASE Budget Household Invite] Failed to create invited workspace membership.",
          membershipInsertError,
        );

        return failure({
          code:
            "membership-create-failed",

          message:
            "The invitation email was sent, but CASE Budget could not create the pending workspace membership.",
        });
      }
    }

    revalidatePath(
      HOUSEHOLD_MEMBERS_PATH,
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success:
        true,

      data: {
        membershipId,

        userId:
          invitedUserId,

        workspaceId,

        displayName:
          normalizedDisplayName,

        email:
          normalizedEmail,

        role:
          input.role,

        status:
          "invited",

        invitedAt,

        invitationExpiresAt,

        emailId:
          invitationResult.data
            .emailId,
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
      "[CASE Budget Household Invite] Unexpected invitation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not send the household invitation. Please try again.",
    });
  }
}

/**
 * Form-action adapter for InviteMemberModal.
 */
export async function inviteHouseholdMemberAction(
  _previousState:
    InviteHouseholdMemberActionState =
      initialInviteHouseholdMemberActionState,

  formData:
    FormData,
): Promise<InviteHouseholdMemberActionState> {
  const displayName =
    normalizeFormDataText(
      formData.get(
        "displayName",
      ),
    );

  const email =
    normalizeFormDataText(
      formData.get(
        "email",
      ),
    );

  const roleValue =
    normalizeFormDataText(
      formData.get(
        "role",
      ),
    );

  const memberLabel =
    normalizeFormDataText(
      formData.get(
        "memberLabel",
      ),
    );

  if (
    !displayName
  ) {
    return {
      status:
        "error",

      message:
        "Enter the name of the person you want to invite.",

      fieldErrors: {
        displayName:
          "Member name is required.",
      },

      invitation:
        null,
    };
  }

  if (
    displayName.length >
    DISPLAY_NAME_MAX_LENGTH
  ) {
    return {
      status:
        "error",

      message:
        "Enter a shorter member name.",

      fieldErrors: {
        displayName:
          `Member name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
      },

      invitation:
        null,
    };
  }

  if (
    !email
  ) {
    return {
      status:
        "error",

      message:
        "Enter the email address of the person you want to invite.",

      fieldErrors: {
        email:
          "Email address is required.",
      },

      invitation:
        null,
    };
  }

  if (
    !isHouseholdInvitationRole(
      roleValue,
    )
  ) {
    return {
      status:
        "error",

      message:
        "Select a valid workspace role.",

      fieldErrors: {
        role:
          "Select Administrator, Member, or Viewer.",
      },

      invitation:
        null,
    };
  }

  const result =
    await inviteHouseholdMember({
      displayName,

      email,

      role:
        roleValue,

      memberLabel:
        memberLabel ??
        undefined,
    });

  if (
    !result.success
  ) {
    const fieldErrors:
      InviteHouseholdMemberActionState["fieldErrors"] =
      {};

    if (
      result.error.field
    ) {
      fieldErrors[
        result.error.field
      ] =
        result.error.message;
    }

    return {
      status:
        "error",

      message:
        result.error.message,

      fieldErrors,

      invitation:
        null,
    };
  }

  return {
    status:
      "success",

    message:
      `Invitation sent to ${result.data.displayName} at ${result.data.email}.`,

    fieldErrors: {},

    invitation:
      result.data,
  };
}

async function getWorkspaceMembership({
  workspaceId,
  userId,
}: {
  workspaceId:
    string;

  userId:
    string;
}): Promise<{
  membership:
    WorkspaceMembershipRow | null;

  error:
    Error | null;
}> {
  try {
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
          "id,workspace_id,user_id,role,status,invited_by,invited_at,invitation_expires_at,joined_at,suspended_at,suspended_by,suspension_reason,removed_at,removed_by,removal_reason,member_label,created_at,updated_at",
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
      return {
        membership:
          null,

        error:
          new Error(
            error.message,
          ),
      };
    }

    return {
      membership:
        (
          data as
            | WorkspaceMembershipRow
            | null
        ) ??
        null,

      error:
        null,
    };
  } catch (
    error
  ) {
    return {
      membership:
        null,

      error:
        error instanceof
        Error
          ? error
          : new Error(
              "Unknown workspace membership lookup error.",
            ),
    };
  }
}

async function updateInvitedUserMetadata({
  userId,
  displayName,
  workspaceId,
  workspaceName,
  workspaceRole,
  invitedBy,
}: {
  userId:
    string;

  displayName:
    string;

  workspaceId:
    string;

  workspaceName:
    string;

  workspaceRole:
    HouseholdInvitationRole;

  invitedBy:
    string;
}): Promise<Error | null> {
  try {
    const admin =
      createAdminClient();

    const {
      data:
        currentUserResult,
      error:
        currentUserError,
    } =
      await admin.auth.admin.getUserById(
        userId,
      );

    if (
      currentUserError
    ) {
      return new Error(
        currentUserError.message,
      );
    }

    const existingMetadata =
      currentUserResult.user
        ?.user_metadata ??
      {};

    const {
      error:
        updateError,
    } =
      await admin.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            ...existingMetadata,

            app:
              "case-budget",

            display_name:
              displayName,

            full_name:
              displayName,

            name:
              displayName,

            workspace_id:
              workspaceId,

            workspace_name:
              workspaceName,

            workspace_role:
              workspaceRole,

            invited_by:
              invitedBy,
          },
        },
      );

    if (
      updateError
    ) {
      return new Error(
        updateError.message,
      );
    }

    return null;
  } catch (
    error
  ) {
    return error instanceof
      Error
      ? error
      : new Error(
          "Unknown Auth metadata update error.",
        );
  }
}

function getExistingMembershipFailure(
  membership:
    WorkspaceMembershipRow | null,
): InviteHouseholdMemberResult | null {
  if (
    !membership
  ) {
    return null;
  }

  if (
    membership.status ===
    "active"
  ) {
    return failure({
      code:
        "already-member",

      message:
        "This user is already an active member of the workspace.",

      field:
        "email",
    });
  }

  if (
    membership.status ===
    "suspended"
  ) {
    return failure({
      code:
        "already-member",

      message:
        "This user already belongs to the workspace but is currently suspended. Restore the existing membership instead of sending a new invitation.",

      field:
        "email",
    });
  }

  if (
    membership.status ===
      "invited" &&
    !isInvitationExpired(
      membership.invitation_expires_at,
    )
  ) {
    return failure({
      code:
        "invitation-already-pending",

      message:
        "A workspace invitation is already pending for this user.",

      field:
        "email",
    });
  }

  return null;
}

async function findAuthUserByEmail(
  email:
    string,
): Promise<ExistingAuthUserResult> {
  try {
    const admin =
      createAdminClient();

    for (
      let page =
        1;
      page <=
      MAX_AUTH_USER_PAGES;
      page +=
      1
    ) {
      const {
        data,
        error,
      } =
        await admin.auth.admin.listUsers({
          page,

          perPage:
            AUTH_USER_PAGE_SIZE,
        });

      if (
        error
      ) {
        return {
          user:
            null,

          error:
            new Error(
              error.message,
            ),
        };
      }

      const users =
        data.users ??
        [];

      const match =
        users.find(
          (
            candidate,
          ) =>
            normalizeEmail(
              candidate.email,
            ) ===
            email,
        ) ??
        null;

      if (
        match
      ) {
        return {
          user:
            match,

          error:
            null,
        };
      }

      if (
        users.length <
        AUTH_USER_PAGE_SIZE
      ) {
        break;
      }
    }

    return {
      user:
        null,

      error:
        null,
    };
  } catch (
    error
  ) {
    return {
      user:
        null,

      error:
        error instanceof
        Error
          ? error
          : new Error(
              "Unknown Auth user lookup error.",
            ),
    };
  }
}

function isShareableWorkspaceType(
  workspaceType:
    WorkspaceTypeDatabaseEnum,
) {
  return (
    workspaceType ===
      "personal" ||
    workspaceType ===
      "household" ||
    workspaceType ===
      "business"
  );
}

function isInvitationExpired(
  expiresAt:
    string | null,
) {
  if (
    !expiresAt
  ) {
    return true;
  }

  const expirationTime =
    Date.parse(
      expiresAt,
    );

  if (
    Number.isNaN(
      expirationTime,
    )
  ) {
    return true;
  }

  return (
    expirationTime <=
    Date.now()
  );
}

function buildInvitationRedirectUrl() {
  const configuredAppUrl =
    normalizeOptionalText(
      process.env
        .NEXT_PUBLIC_CASE_BUDGET_APP_URL,
    ) ??
    DEFAULT_APP_URL;

  const normalizedAppUrl =
    configuredAppUrl.replace(
      /\/+$/,
      "",
    );

  const redirectUrl =
    new URL(
      "/callback",
      normalizedAppUrl,
    );

  redirectUrl.searchParams.set(
    "next",
    ACCEPT_INVITE_PATH,
  );

  return redirectUrl.toString();
}

function getUserDisplayName(
  user:
    User,
) {
  const metadata =
    user.user_metadata ??
    {};

  const displayName =
    normalizeOptionalText(
      metadata.display_name,
    );

  if (
    displayName
  ) {
    return displayName;
  }

  const fullName =
    normalizeOptionalText(
      metadata.full_name,
    );

  if (
    fullName
  ) {
    return fullName;
  }

  const name =
    normalizeOptionalText(
      metadata.name,
    );

  if (
    name
  ) {
    return name;
  }

  const firstName =
    normalizeOptionalText(
      metadata.first_name,
    );

  const lastName =
    normalizeOptionalText(
      metadata.last_name,
    );

  const combinedName =
    [
      firstName,
      lastName,
    ]
      .filter(
        Boolean,
      )
      .join(
        " ",
      )
      .trim();

  if (
    combinedName
  ) {
    return combinedName;
  }

  return (
    normalizeEmail(
      user.email,
    ) ??
    "A CASE Budget member"
  );
}

function normalizeEmail(
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
    value
      .trim()
      .toLowerCase();

  if (
    !normalized ||
    normalized.length >
      320
  ) {
    return null;
  }

  const atIndex =
    normalized.indexOf(
      "@",
    );

  if (
    atIndex <=
      0 ||
    atIndex ===
      normalized.length -
        1
  ) {
    return null;
  }

  const domain =
    normalized.slice(
      atIndex +
        1,
    );

  if (
    !domain.includes(
      ".",
    )
  ) {
    return null;
  }

  return normalized;
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
  field,
}: {
  code:
    Extract<
      InviteHouseholdMemberResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      InviteHouseholdMemberResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): InviteHouseholdMemberResult {
  return {
    success:
      false,

    error: {
      code,

      message,

      ...(field
        ? {
            field,
          }
        : {}),
    },
  };
}