"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
} from "@/types/database";

export type AcceptHouseholdInviteActionState = {
  success:
    boolean;

  message:
    string | null;

  error:
    string | null;

  workspaceId:
    string | null;

  workspaceName:
    string | null;

  redirectTo:
    string | null;
};

export type AcceptHouseholdInviteInput = {
  password:
    string;

  confirmPassword:
    string;
};

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

export const initialAcceptHouseholdInviteActionState:
  AcceptHouseholdInviteActionState = {
    success:
      false,

    message:
      null,

    error:
      null,

    workspaceId:
      null,

    workspaceName:
      null,

    redirectTo:
      null,
  };

/**
 * React useActionState adapter.
 *
 * AcceptInviteForm submits FormData, while the core invitation acceptance
 * function accepts a strongly typed object.
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
 * Flow:
 *
 * - Verify password requirements.
 * - Verify the authenticated invitation user.
 * - Locate the pending workspace membership.
 * - Verify invitation expiration.
 * - Verify the workspace is active.
 * - Save a permanent Supabase Auth password.
 * - Change workspace membership from invited to active.
 * - Record joined_at.
 * - Return the dashboard destination.
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

    /*
     * requireCaseBudgetUser() verifies the authenticated Supabase session
     * and returns both the authenticated user ID and the matching server-side
     * Supabase client.
     */
    const {
      userId,
      supabase,
    } =
      await requireCaseBudgetUser();

    /*
     * Locate the newest pending invitation for this authenticated user.
     */
    const membershipResult =
      await supabase
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
      membershipResult.error
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to load pending invitation.",
        membershipResult.error,
      );

      return createErrorState(
        "We could not verify your household invitation. Please try again.",
      );
    }

    const membership =
      parseMembershipRow(
        membershipResult.data,
      );

    if (
      !membership
    ) {
      return createErrorState(
        "No pending household invitation was found for this account.",
      );
    }

    /*
     * Explicit application-level ownership check in addition to the database
     * query filter.
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

    /*
     * Verify that the destination workspace still exists and remains active.
     */
    const workspaceResult =
      await supabase
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
      workspaceResult.error
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to load invited workspace.",
        workspaceResult.error,
      );

      return createErrorState(
        "We could not load the household workspace for this invitation.",
      );
    }

    const workspace =
      parseWorkspaceRow(
        workspaceResult.data,
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

    /*
     * The Supabase invitation link authenticated the invitee.
     *
     * Establish a permanent password so they can later sign in normally
     * using their invited email address and password.
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
        updateUserResult.error,
      );

      return createErrorState(
        getPasswordUpdateErrorMessage(
          updateUserResult.error.message,
        ),
      );
    }

    /*
     * Ensure Supabase updated the same authenticated user that owns the
     * pending invitation.
     */
    const updatedUser =
      updateUserResult.data.user;

    if (
      updatedUser &&
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
        },
      );

      return createErrorState(
        "CASE Budget could not verify your invitation account. Please sign out, reopen the invitation email, and try again.",
      );
    }

    const joinedAt =
      new Date().toISOString();

    /*
     * Activate only the exact verified membership.
     *
     * We match:
     *
     * - membership ID
     * - authenticated user ID
     * - workspace ID
     * - invited status
     *
     * so a stale or unrelated membership cannot be activated.
     */
    const membershipUpdateResult =
      await supabase
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
      membershipUpdateResult.error
    ) {
      console.error(
        "[CASE Budget Household Invite] Unable to activate household membership.",
        membershipUpdateResult.error,
      );

      return createErrorState(
        "Your password was created, but CASE Budget could not activate your household membership. Please try again.",
      );
    }

    if (
      !membershipUpdateResult.data
    ) {
      return createErrorState(
        "Your invitation could not be activated because its status changed. Please refresh the page and try again.",
      );
    }

    /*
     * Refresh areas of CASE Budget whose content depends on workspace
     * membership.
     */
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
  /*
   * Passwords intentionally are not trimmed.
   *
   * Leading or trailing spaces can legitimately be part of a password.
   * Altering the supplied value would make the stored password differ from
   * the value the user believes they created.
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