"use server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  createCaseBudgetSupabaseServerClient,
} from "@/lib/auth/server-auth";

import {
  getCurrentUser,
} from "@/lib/auth/auth-service";

import type {
  DeleteAccountActionState,
} from "@/types/account-deletion";

const REQUIRED_CONFIRMATION_TEXT =
  "DELETE";

type OwnedWorkspaceRow = {
  id:
    string;

  name:
    string;

  workspace_type:
    string;

  owner_user_id:
    string;
};

type WorkspaceMemberRow = {
  workspace_id:
    string;

  user_id:
    string;

  role:
    string;

  status:
    string;
};

export async function deleteAccountAction(
  _previousState:
    DeleteAccountActionState,

  formData:
    FormData,
): Promise<DeleteAccountActionState> {
  const confirmation =
    getFormString(
      formData,
      "confirmation",
    );

  if (
    confirmation !==
    REQUIRED_CONFIRMATION_TEXT
  ) {
    return {
      success:
        false,

      message:
        "Type DELETE exactly to permanently delete your CASE Budget account.",

      fieldErrors: {
        confirmation:
          "Enter DELETE exactly as shown.",
      },

      requiresOwnershipTransfer:
        false,
    };
  }

  try {
    /*
     * Verify the authenticated user from the trusted Supabase
     * server session.
     */
    const currentUserResult =
      await getCurrentUser();

    if (
      !currentUserResult.success
    ) {
      return {
        success:
          false,

        message:
          currentUserResult.error.message ||
          "Your CASE Budget session could not be verified. Please sign in again.",

        fieldErrors: {},

        requiresOwnershipTransfer:
          false,
      };
    }

    const user =
      currentUserResult.data;

    const userId =
      user.id;

    if (
      !userId
    ) {
      return {
        success:
          false,

        message:
          "CASE Budget could not identify the account to delete.",

        fieldErrors: {},

        requiresOwnershipTransfer:
          false,
      };
    }

    const adminSupabase =
      createAdminClient();

    /*
     * Find every active workspace currently owned by this user.
     *
     * We do not trust client-side workspace state for a destructive
     * operation. Ownership must be checked directly against the
     * database using the service-role client.
     */
    const {
      data:
        ownedWorkspaceData,
      error:
        ownedWorkspaceError,
    } =
      await adminSupabase
        .from(
          "workspaces",
        )
        .select(
          [
            "id",
            "name",
            "workspace_type",
            "owner_user_id",
          ].join(
            ",",
          ),
        )
        .eq(
          "owner_user_id",
          userId,
        )
        .eq(
          "is_active",
          true,
        );

    if (
      ownedWorkspaceError
    ) {
      console.error(
        "[CASE Budget Account Deletion] Failed to inspect workspace ownership.",
        {
          userId,

          error: {
            code:
              ownedWorkspaceError.code,

            message:
              ownedWorkspaceError.message,
          },
        },
      );

      return {
        success:
          false,

        message:
          "CASE Budget could not verify your workspace ownership. Your account was not deleted.",

        fieldErrors: {},

        requiresOwnershipTransfer:
          false,
      };
    }

    const ownedWorkspaces =
      parseOwnedWorkspaces(
        ownedWorkspaceData,
      );

    /*
     * Inspect active members of every owned workspace.
     *
     * Shared workspaces cannot be orphaned by deleting their owner.
     */
    if (
      ownedWorkspaces.length >
      0
    ) {
      const ownedWorkspaceIds =
        ownedWorkspaces.map(
          (
            workspace,
          ) =>
            workspace.id,
        );

      const {
        data:
          memberData,
        error:
          memberError,
      } =
        await adminSupabase
          .from(
            "workspace_members",
          )
          .select(
            [
              "workspace_id",
              "user_id",
              "role",
              "status",
            ].join(
              ",",
            ),
          )
          .in(
            "workspace_id",
            ownedWorkspaceIds,
          )
          .eq(
            "status",
            "active",
          );

      if (
        memberError
      ) {
        console.error(
          "[CASE Budget Account Deletion] Failed to inspect workspace members.",
          {
            userId,

            workspaceIds:
              ownedWorkspaceIds,

            error: {
              code:
                memberError.code,

              message:
                memberError.message,
            },
          },
        );

        return {
          success:
            false,

          message:
            "CASE Budget could not verify your workspace memberships. Your account was not deleted.",

          fieldErrors: {},

          requiresOwnershipTransfer:
            false,
        };
      }

      const activeMembers =
        parseWorkspaceMembers(
          memberData,
        );

      const workspacesRequiringTransfer =
        ownedWorkspaces.filter(
          (
            workspace,
          ) => {
            const members =
              activeMembers.filter(
                (
                  member,
                ) =>
                  member.workspace_id ===
                  workspace.id,
              );

            const otherActiveMembers =
              members.filter(
                (
                  member,
                ) =>
                  member.user_id !==
                  userId,
              );

            /*
             * A non-personal workspace should never disappear as a
             * side effect of deleting its current owner.
             *
             * A personal workspace also requires review if another
             * active member somehow exists.
             */
            return (
              workspace.workspace_type !==
                "personal" ||
              otherActiveMembers.length >
                0
            );
          },
        );

      if (
        workspacesRequiringTransfer.length >
        0
      ) {
        return {
          success:
            false,

          message:
            buildOwnershipTransferMessage(
              workspacesRequiringTransfer,
            ),

          fieldErrors: {},

          requiresOwnershipTransfer:
            true,
        };
      }
    }

    /*
     * Delete the Supabase Auth user using the service-role client.
     *
     * IMPORTANT:
     *
     * We intentionally do NOT manually delete arbitrary application
     * tables one at a time from this Server Action.
     *
     * User/profile/workspace cleanup should be enforced by the
     * database's foreign-key cascade rules or by a future dedicated
     * transactional deletion RPC.
     *
     * That prevents a partially deleted account if one table fails
     * halfway through the operation.
     */
    const {
      error:
        deleteUserError,
    } =
      await adminSupabase.auth.admin.deleteUser(
        userId,
      );

    if (
      deleteUserError
    ) {
      console.error(
        "[CASE Budget Account Deletion] Supabase Auth user deletion failed.",
        {
          userId,

          error: {
            name:
              deleteUserError.name,

            message:
              deleteUserError.message,

            status:
              deleteUserError.status,
          },
        },
      );

      return {
        success:
          false,

        message:
          getSafeDeleteUserErrorMessage(
            deleteUserError.message,
          ),

        fieldErrors: {},

        requiresOwnershipTransfer:
          false,
      };
    }

    /*
     * Attempt to clear the browser's current CASE Budget auth
     * cookies after the administrative user deletion.
     *
     * The account has already been deleted at this point, so a
     * sign-out failure should not cause us to report that deletion
     * itself failed.
     */
    try {
      const authenticatedSupabase =
        await createCaseBudgetSupabaseServerClient();

      await authenticatedSupabase.auth.signOut();
    } catch (
      signOutError
    ) {
      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.warn(
          "[CASE Budget Account Deletion] Account was deleted but the current session could not be explicitly signed out.",
          {
            userId,

            error:
              serializeUnknownError(
                signOutError,
              ),
          },
        );
      }
    }

    return {
      success:
        true,

      message:
        "Your CASE Budget account was permanently deleted.",

      fieldErrors: {},

      requiresOwnershipTransfer:
        false,
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Account Deletion] Unexpected account deletion error.",
      {
        error:
          serializeUnknownError(
            error,
          ),
      },
    );

    return {
      success:
        false,

      message:
        getUnknownErrorMessage(
          error,
          "CASE Budget could not delete your account. No further changes were made.",
        ),

      fieldErrors: {},

      requiresOwnershipTransfer:
        false,
    };
  }
}

function parseOwnedWorkspaces(
  value:
    unknown,
): OwnedWorkspaceRow[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item,
      ) => {
        if (
          !isRecord(
            item,
          )
        ) {
          return null;
        }

        const id =
          getRequiredString(
            item.id,
          );

        const name =
          getRequiredString(
            item.name,
          );

        const workspaceType =
          getRequiredString(
            item.workspace_type,
          );

        const ownerUserId =
          getRequiredString(
            item.owner_user_id,
          );

        if (
          !id ||
          !name ||
          !workspaceType ||
          !ownerUserId
        ) {
          return null;
        }

        return {
          id,

          name,

          workspace_type:
            workspaceType,

          owner_user_id:
            ownerUserId,
        };
      },
    )
    .filter(
      (
        workspace,
      ): workspace is OwnedWorkspaceRow =>
        workspace !==
        null,
    );
}

function parseWorkspaceMembers(
  value:
    unknown,
): WorkspaceMemberRow[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item,
      ) => {
        if (
          !isRecord(
            item,
          )
        ) {
          return null;
        }

        const workspaceId =
          getRequiredString(
            item.workspace_id,
          );

        const userId =
          getRequiredString(
            item.user_id,
          );

        const role =
          getRequiredString(
            item.role,
          );

        const status =
          getRequiredString(
            item.status,
          );

        if (
          !workspaceId ||
          !userId ||
          !role ||
          !status
        ) {
          return null;
        }

        return {
          workspace_id:
            workspaceId,

          user_id:
            userId,

          role,

          status,
        };
      },
    )
    .filter(
      (
        member,
      ): member is WorkspaceMemberRow =>
        member !==
        null,
    );
}

function buildOwnershipTransferMessage(
  workspaces:
    OwnedWorkspaceRow[],
) {
  if (
    workspaces.length ===
    1
  ) {
    return `You are the owner of "${workspaces[0].name}". Transfer ownership or remove the shared workspace before deleting your CASE Budget account.`;
  }

  return `You own ${workspaces.length} shared workspaces. Transfer ownership or remove those workspaces before deleting your CASE Budget account.`;
}

function getSafeDeleteUserErrorMessage(
  message:
    string,
) {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "foreign key",
    ) ||
    normalizedMessage.includes(
      "violates foreign key",
    )
  ) {
    return "CASE Budget could not delete the account because application data still references this user. Your account remains active.";
  }

  if (
    normalizedMessage.includes(
      "not found",
    )
  ) {
    return "The CASE Budget authentication account could not be found.";
  }

  if (
    normalizedMessage.includes(
      "permission",
    ) ||
    normalizedMessage.includes(
      "unauthorized",
    )
  ) {
    return "CASE Budget is not currently authorized to perform account deletion. Your account was not deleted.";
  }

  return "CASE Budget could not permanently delete your account. Your account remains active.";
}

function getFormString(
  formData:
    FormData,

  key:
    string,
) {
  const value =
    formData.get(
      key,
    );

  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function getRequiredString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue ||
    null;
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

function serializeUnknownError(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return {
      name:
        error.name,

      message:
        error.message,
    };
  }

  if (
    typeof error ===
    "string"
  ) {
    return {
      message:
        error,
    };
  }

  return {
    message:
      "Unknown error",
  };
}

function getUnknownErrorMessage(
  error:
    unknown,

  fallbackMessage:
    string,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return fallbackMessage;
}