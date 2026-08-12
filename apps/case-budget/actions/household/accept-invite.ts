"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
} from "@/types/database";

import type {
  AcceptHouseholdInviteActionState,
  AcceptHouseholdInviteInput,
} from "@/types/household/accept-invite";

type WorkspaceMembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  status:
    WorkspaceMembershipStatusDatabaseEnum;

  joined_at:
    string | null;

  invitation_expires_at:
    string | null;
};

type WorkspaceRow = {
  id:
    string;

  name:
    string;

  is_active:
    boolean;
};

const MINIMUM_PASSWORD_LENGTH =
  8;

const DEFAULT_REDIRECT_PATH =
  "/dashboard";

/**
 * React useActionState-compatible action.
 *
 * The client form submits FormData. This adapter extracts the password
 * values and passes them into the strongly typed invitation acceptance
 * function.
 */
export async function acceptHouseholdInviteAction(
  _previousState:
    AcceptHouseholdInviteActionState,

  formData:
    FormData,
): Promise<AcceptHouseholdInviteActionState> {
  const password =
    getFormDataString(
      formData,
      "password",
    );

  const confirmPassword =
    getFormDataString(
      formData,
      "confirmPassword",
    );

  return acceptHouseholdInvite({
    password,
    confirmPassword,
  });
}

/**
 * Completes an invited CASE Budget household member's account setup.
 *
 * Security model:
 *
 * - requireCaseBudgetUser() verifies the authenticated Supabase user.
 * - The authenticated session client is used to update that user's password.
 * - A trusted server-side workspace admin client is used only for the
 *   controlled invitation membership lookup and activation.
 *
 * This is important because normal workspace RLS may intentionally prevent
 * an authenticated user from reading a membership whose status is "invited".
 */
export async function acceptHouseholdInvite(
  input:
    AcceptHouseholdInviteInput,
): Promise<AcceptHouseholdInviteActionState> {
  try {
    const password =
      normalizePassword(
        input.password,
      );

    const confirmPassword =
      normalizePassword(
        input.confirmPassword,
      );

    const validationError =
      validatePasswords({
        password,
        confirmPassword,
      });

    if (
      validationError
    ) {
      return createErrorState(
        validationError,
      );
    }

    /**
     * Authenticate the invitee through the normal CASE Budget session.
     *
     * This gives us:
     *
     * - the trusted authenticated user ID
     * - the authenticated Supabase client required to update the user's
     *   own Auth password
     */
    const {
      userId,
      supabase,
    } =
      await requireCaseBudgetUser();

    /**
     * Use the trusted server-side workspace client for invitation data.
     *
     * Do not use the normal authenticated client for the pending invitation
     * query because workspace RLS may hide membership rows whose status is
     * still "invited".
     */
    const workspaceAdmin =
      createWorkspaceAdminClient();

    /**
     * Locate the newest pending invitation for this exact authenticated user.
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
          [
            "id",
            "workspace_id",
            "user_id",
            "status",
            "joined_at",
            "invitation_expires_at",
          ].join(
            ",",
          ),
        )
        .eq(
          "user_id",
          userId,
        )
        .eq(
          "status",
          "invited",
        )
        .order(
          "invited_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to load pending invitation.",
        {
          userId,

          error:
            membershipError,
        },
      );

      return createErrorState(
        "We could not verify your household invitation. Please try again.",
      );
    }

    const membership =
      parseMembershipRow(
        membershipData,
      );

    if (
      !membership
    ) {
      console.error(
        "[CASE Budget Household Invite] No pending invitation was found for authenticated user.",
        {
          userId,
        },
      );

      return createErrorState(
        "No pending household invitation was found for this account.",
      );
    }

    /**
     * Defense-in-depth check.
     *
     * The database query already requires user_id = authenticated userId,
     * but we explicitly verify it before any Auth or membership state change.
     */
    if (
      membership.user_id !==
      userId
    ) {
      console.error(
        "[CASE Budget Household Invite] Invitation user mismatch.",
        {
          authenticatedUserId:
            userId,

          membershipUserId:
            membership.user_id,

          membershipId:
            membership.id,

          workspaceId:
            membership.workspace_id,
        },
      );

      return createErrorState(
        "This household invitation does not belong to the currently signed-in account.",
      );
    }

    if (
      membership.status !==
      "invited"
    ) {
      return createErrorState(
        "This household invitation is no longer pending.",
      );
    }

    if (
      isInvitationExpired(
        membership.invitation_expires_at,
      )
    ) {
      return createErrorState(
        "This household invitation has expired. Ask the workspace owner to send you a new invitation.",
      );
    }

    /**
     * Load the destination workspace using the trusted workspace client.
     *
     * A newly invited user may not yet have RLS permission to read the
     * workspace until their membership becomes active.
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
          [
            "id",
            "name",
            "is_active",
          ].join(
            ",",
          ),
        )
        .eq(
          "id",
          membership.workspace_id,
        )
        .maybeSingle();

    if (
      workspaceError
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to load invited workspace.",
        {
          userId,

          workspaceId:
            membership.workspace_id,

          error:
            workspaceError,
        },
      );

      return createErrorState(
        "We could not load the household workspace for this invitation.",
      );
    }

    const workspace =
      parseWorkspaceRow(
        workspaceData,
      );

    if (
      !workspace
    ) {
      return createErrorState(
        "The household workspace associated with this invitation could not be found.",
      );
    }

    if (
      !workspace.is_active
    ) {
      return createErrorState(
        "The household workspace associated with this invitation is no longer active.",
      );
    }

    /**
     * Establish a permanent password through the authenticated user's
     * Supabase Auth session.
     *
     * We deliberately do NOT use the admin client for this operation.
     * The invitee should set their own password through their authenticated
     * invite session.
     */
    const updateUserResult =
      await supabase.auth.updateUser({
        password,
      });

    if (
      updateUserResult.error
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to establish invitee password.",
        {
          userId,

          error:
            updateUserResult.error,
        },
      );

      return createErrorState(
        getPasswordUpdateErrorMessage(
          updateUserResult.error.message,
        ),
      );
    }

    const updatedUser =
      updateUserResult.data.user;

    /**
     * Verify Supabase updated the same user that owns the invitation.
     */
    if (
      !updatedUser
    ) {
      console.error(
        "[CASE Budget Household Invite] Password update returned no authenticated user.",
        {
          userId,
        },
      );

      return createErrorState(
        "CASE Budget could not verify your account after creating your password. Please reopen the invitation and try again.",
      );
    }

    if (
      updatedUser.id !==
      userId
    ) {
      console.error(
        "[CASE Budget Household Invite] Auth user changed during invitation acceptance.",
        {
          authenticatedUserId:
            userId,

          updatedUserId:
            updatedUser.id,

          membershipUserId:
            membership.user_id,

          workspaceId:
            membership.workspace_id,
        },
      );

      return createErrorState(
        "CASE Budget could not verify your invitation account. Please sign out, reopen the invitation email, and try again.",
      );
    }

    const joinedAt =
      new Date().toISOString();

    /**
     * Activate only the exact invitation we already verified.
     *
     * We require:
     *
     * - membership ID
     * - authenticated user ID
     * - invited workspace ID
     * - existing status = invited
     *
     * This prevents activating another membership or reusing a membership
     * whose state changed while the request was in progress.
     */
    const {
      data:
        membershipUpdateData,
      error:
        membershipUpdateError,
    } =
      await workspaceAdmin
        .from(
          "workspace_members",
        )
        .update({
          status:
            "active",

          joined_at:
            joinedAt,

          updated_at:
            joinedAt,
        })
        .eq(
          "id",
          membership.id,
        )
        .eq(
          "user_id",
          userId,
        )
        .eq(
          "workspace_id",
          membership.workspace_id,
        )
        .eq(
          "status",
          "invited",
        )
        .select(
          [
            "id",
            "workspace_id",
            "user_id",
            "status",
            "joined_at",
          ].join(
            ",",
          ),
        )
        .maybeSingle();

    if (
      membershipUpdateError
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to activate household membership.",
        {
          userId,

          membershipId:
            membership.id,

          workspaceId:
            membership.workspace_id,

          error:
            membershipUpdateError,
        },
      );

      return createErrorState(
        "Your password was created, but CASE Budget could not activate your household membership. Please try again.",
      );
    }

    if (
      !membershipUpdateData
    ) {
      console.error(
        "[CASE Budget Household Invite] Pending invitation disappeared before activation.",
        {
          userId,

          membershipId:
            membership.id,

          workspaceId:
            membership.workspace_id,
        },
      );

      return createErrorState(
        "Your invitation could not be activated because its status changed. Please refresh the page and try again.",
      );
    }

    /**
     * Verify the resulting membership state before returning success.
     */
    const activatedMembership =
      getObjectRecord(
        membershipUpdateData,
      );

    const activatedStatus =
      getOptionalString(
        activatedMembership
          ?.status,
      );

    if (
      activatedStatus !==
      "active"
    ) {
      console.error(
        "[CASE Budget Household Invite] Membership update did not produce active status.",
        {
          userId,

          membershipId:
            membership.id,

          workspaceId:
            membership.workspace_id,

          resultingStatus:
            activatedStatus,
        },
      );

      return createErrorState(
        "CASE Budget could not confirm that your household membership was activated.",
      );
    }

    revalidatePath(
      "/dashboard",
    );

    revalidatePath(
      "/dashboard/household/members",
    );

    revalidatePath(
      "/dashboard/household/activity",
    );

    revalidatePath(
      "/dashboard/household/approvals",
    );

    revalidatePath(
      "/dashboard/settings",
    );

    revalidatePath(
      "/dashboard/settings/workspaces",
    );

    return {
      success:
        true,

      message:
        `Your account is ready. You now have access to ${workspace.name}.`,

      error:
        null,

      workspaceId:
        workspace.id,

      workspaceName:
        workspace.name,

      redirectTo:
        DEFAULT_REDIRECT_PATH,
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Household Invite] Unexpected invitation acceptance error.",
      error,
    );

    return createErrorState(
      "We could not complete your account setup. Please try again.",
    );
  }
}

function validatePasswords({
  password,
  confirmPassword,
}: {
  password:
    string;

  confirmPassword:
    string;
}): string | null {
  if (
    !password
  ) {
    return "Enter a password.";
  }

  if (
    password.length <
    MINIMUM_PASSWORD_LENGTH
  ) {
    return `Your password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long.`;
  }

  if (
    !/[a-z]/.test(
      password,
    )
  ) {
    return "Your password must contain at least one lowercase letter.";
  }

  if (
    !/[A-Z]/.test(
      password,
    )
  ) {
    return "Your password must contain at least one uppercase letter.";
  }

  if (
    !/[0-9]/.test(
      password,
    )
  ) {
    return "Your password must contain at least one number.";
  }

  if (
    !/[^A-Za-z0-9]/.test(
      password,
    )
  ) {
    return "Your password must contain at least one special character.";
  }

  if (
    !confirmPassword
  ) {
    return "Confirm your password.";
  }

  if (
    password !==
    confirmPassword
  ) {
    return "The passwords do not match.";
  }

  return null;
}

function normalizePassword(
  value:
    unknown,
): string {
  /**
   * Passwords are intentionally not trimmed.
   *
   * Leading or trailing spaces can legitimately be part of a user's
   * password. Modifying the value here could cause the stored password
   * to differ from the password the invitee believes they created.
   */
  return typeof value ===
    "string"
    ? value
    : "";
}

function isInvitationExpired(
  invitationExpiresAt:
    string | null,
): boolean {
  if (
    !invitationExpiresAt
  ) {
    return false;
  }

  const expiresAt =
    Date.parse(
      invitationExpiresAt,
    );

  if (
    Number.isNaN(
      expiresAt,
    )
  ) {
    /**
     * The database should always contain a valid timestamp.
     *
     * A malformed value is logged by the caller's surrounding workflow, but
     * we do not silently convert it into an expired invitation here.
     */
    return false;
  }

  return (
    expiresAt <=
    Date.now()
  );
}

function getPasswordUpdateErrorMessage(
  message:
    string,
): string {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "same password",
    )
  ) {
    return "Choose a different password for your CASE Budget account.";
  }

  if (
    normalizedMessage.includes(
      "weak",
    )
  ) {
    return "Supabase rejected this password because it is too weak. Choose a stronger password and try again.";
  }

  if (
    normalizedMessage.includes(
      "password",
    )
  ) {
    return "Supabase rejected this password. Choose a stronger password and try again.";
  }

  if (
    normalizedMessage.includes(
      "session",
    ) ||
    normalizedMessage.includes(
      "auth",
    ) ||
    normalizedMessage.includes(
      "jwt",
    ) ||
    normalizedMessage.includes(
      "token",
    )
  ) {
    return "Your invitation session is no longer valid. Open the invitation email again or ask the workspace owner for a new invitation.";
  }

  return "CASE Budget could not save your password. Please try again.";
}

function parseMembershipRow(
  value:
    unknown,
): WorkspaceMembershipRow | null {
  const record =
    getObjectRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getRequiredString(
      record.id,
    );

  const workspaceId =
    getRequiredString(
      record.workspace_id,
    );

  const userId =
    getRequiredString(
      record.user_id,
    );

  const status =
    getMembershipStatus(
      record.status,
    );

  if (
    !id ||
    !workspaceId ||
    !userId ||
    !status
  ) {
    return null;
  }

  return {
    id,

    workspace_id:
      workspaceId,

    user_id:
      userId,

    status,

    joined_at:
      getOptionalString(
        record.joined_at,
      ),

    invitation_expires_at:
      getOptionalString(
        record.invitation_expires_at,
      ),
  };
}

function parseWorkspaceRow(
  value:
    unknown,
): WorkspaceRow | null {
  const record =
    getObjectRecord(
      value,
    );

  if (
    !record
  ) {
    return null;
  }

  const id =
    getRequiredString(
      record.id,
    );

  const name =
    getRequiredString(
      record.name,
    );

  if (
    !id ||
    !name
  ) {
    return null;
  }

  return {
    id,

    name,

    is_active:
      record.is_active ===
      true,
  };
}

function getMembershipStatus(
  value:
    unknown,
): WorkspaceMembershipStatusDatabaseEnum | null {
  switch (
    value
  ) {
    case "invited":
    case "active":
    case "suspended":
    case "removed":
      return value;

    default:
      return null;
  }
}

function getRequiredString(
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

function getOptionalString(
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

function getObjectRecord(
  value:
    unknown,
): Record<
  string,
  unknown
> | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function getFormDataString(
  formData:
    FormData,

  fieldName:
    string,
): string {
  const value =
    formData.get(
      fieldName,
    );

  return typeof value ===
    "string"
    ? value
    : "";
}

function createErrorState(
  error:
    string,
): AcceptHouseholdInviteActionState {
  return {
    success:
      false,

    message:
      error,

    error,

    workspaceId:
      null,

    workspaceName:
      null,

    redirectTo:
      null,
  };
}