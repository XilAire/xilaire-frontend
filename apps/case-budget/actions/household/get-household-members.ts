"use server";

import {
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

export type HouseholdMemberRecord = {
  id:
    string;

  userId:
    string;

  workspaceId:
    string;

  name:
    string;

  email:
    string;

  role:
    WorkspaceRoleDatabaseEnum;

  status:
    WorkspaceMembershipStatusDatabaseEnum;

  memberLabel:
    string | null;

  isCurrentUser:
    boolean;

  invitedBy:
    string | null;

  invitedAt:
    string | null;

  invitationExpiresAt:
    string | null;

  joinedAt:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

export type GetHouseholdMembersSuccess = {
  success:
    true;

  members:
    HouseholdMemberRecord[];
};

export type GetHouseholdMembersFailure = {
  success:
    false;

  members:
    [];

  error:
    string;
};

export type GetHouseholdMembersResult =
  | GetHouseholdMembersSuccess
  | GetHouseholdMembersFailure;

type WorkspaceMemberRow = {
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

  member_label:
    string | null;

  invited_by:
    string | null;

  invited_at:
    string | null;

  invitation_expires_at:
    string | null;

  joined_at:
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

export async function getHouseholdMembers(
  workspaceId:
    string,
): Promise<GetHouseholdMembersResult> {
  try {
    const normalizedWorkspaceId =
      normalizeRequiredText(
        workspaceId,
      );

    if (
      !normalizedWorkspaceId
    ) {
      return {
        success:
          false,

        members: [],

        error:
          "A workspace is required.",
      };
    }

    const currentUser =
      await requireCaseBudgetUser();

    const currentUserId =
      getCurrentUserId(
        currentUser,
      );

    if (
      !currentUserId
    ) {
      return {
        success:
          false,

        members: [],

        error:
          "Unable to determine the current user.",
      };
    }

    const admin =
      createAdminClient();

    const {
      data:
        currentMembershipData,
      error:
        currentMembershipError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .select(
          [
            "id",
            "workspace_id",
            "user_id",
            "role",
            "status",
          ].join(
            ",",
          ),
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .eq(
          "user_id",
          currentUserId,
        )
        .eq(
          "status",
          "active",
        )
        .maybeSingle();

    if (
      currentMembershipError
    ) {
      console.error(
        "[CASE Budget Household] Failed to verify workspace membership.",
        currentMembershipError,
      );

      return {
        success:
          false,

        members: [],

        error:
          "Unable to verify your access to this workspace.",
      };
    }

    if (
      !currentMembershipData
    ) {
      return {
        success:
          false,

        members: [],

        error:
          "You do not have access to this workspace.",
      };
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
          [
            "id",
            "workspace_id",
            "user_id",
            "role",
            "status",
            "member_label",
            "invited_by",
            "invited_at",
            "invitation_expires_at",
            "joined_at",
            "created_at",
            "updated_at",
          ].join(
            ",",
          ),
        )
        .eq(
          "workspace_id",
          normalizedWorkspaceId,
        )
        .in(
          "status",
          [
            "active",
            "invited",
          ],
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (
      membershipError
    ) {
      console.error(
        "[CASE Budget Household] Failed to load workspace members.",
        membershipError,
      );

      return {
        success:
          false,

        members: [],

        error:
          "Unable to load household members.",
      };
    }

    const membershipRows =
      (
        (
          membershipData ??
          []
        ) as unknown
      ) as WorkspaceMemberRow[];

    if (
      membershipRows.length ===
      0
    ) {
      return {
        success:
          true,

        members: [],
      };
    }

    const userIds =
      Array.from(
        new Set(
          membershipRows
            .map(
              (
                membership,
              ) =>
                normalizeRequiredText(
                  membership.user_id,
                ),
            )
            .filter(
              (
                userId,
              ): userId is string =>
                Boolean(
                  userId,
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
      userIds.length >
      0
    ) {
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
            [
              "id",
              "display_name",
              "email",
            ].join(
              ",",
            ),
          )
          .in(
            "id",
            userIds,
          );

      if (
        profileError
      ) {
        console.error(
          "[CASE Budget Household] Failed to load member profiles.",
          profileError,
        );
      } else {
        const profileRows =
          (
            (
              profileData ??
              []
            ) as unknown
          ) as ProfileRow[];

        for (
          const profile of
          profileRows
        ) {
          profileMap.set(
            profile.id,
            profile,
          );
        }
      }
    }

    const members =
      membershipRows.map(
        (
          membership,
        ): HouseholdMemberRecord => {
          const profile =
            profileMap.get(
              membership.user_id,
            );

          const email =
            normalizeOptionalText(
              profile?.email,
            ) ??
            getFallbackEmail(
              membership,
            );

          const name =
            normalizeOptionalText(
              profile?.display_name,
            ) ??
            normalizeOptionalText(
              membership.member_label,
            ) ??
            getDisplayNameFromEmail(
              email,
            ) ??
            "Household member";

          return {
            id:
              membership.id,

            userId:
              membership.user_id,

            workspaceId:
              membership.workspace_id,

            name,

            email,

            role:
              membership.role,

            status:
              membership.status,

            memberLabel:
              membership.member_label,

            isCurrentUser:
              membership.user_id ===
              currentUserId,

            invitedBy:
              membership.invited_by,

            invitedAt:
              membership.invited_at,

            invitationExpiresAt:
              membership.invitation_expires_at,

            joinedAt:
              membership.joined_at,

            createdAt:
              membership.created_at,

            updatedAt:
              membership.updated_at,
          };
        },
      );

    members.sort(
      (
        first,
        second,
      ) => {
        if (
          first.isCurrentUser !==
          second.isCurrentUser
        ) {
          return first.isCurrentUser
            ? -1
            : 1;
        }

        if (
          first.role ===
            "owner" &&
          second.role !==
            "owner"
        ) {
          return -1;
        }

        if (
          second.role ===
            "owner" &&
          first.role !==
            "owner"
        ) {
          return 1;
        }

        if (
          first.status ===
            "active" &&
          second.status !==
            "active"
        ) {
          return -1;
        }

        if (
          second.status ===
            "active" &&
          first.status !==
            "active"
        ) {
          return 1;
        }

        return first.name.localeCompare(
          second.name,
        );
      },
    );

    return {
      success:
        true,

      members,
    };
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Household] Unexpected error while loading household members.",
      error,
    );

    return {
      success:
        false,

      members: [],

      error:
        "Something went wrong while loading household members.",
    };
  }
}

function getCurrentUserId(
  user:
    unknown,
): string | null {
  const record =
    getObjectRecord(
      user,
    );

  if (
    !record
  ) {
    return null;
  }

  return (
    normalizeOptionalText(
      record.id,
    ) ??
    normalizeOptionalText(
      record.userId,
    ) ??
    normalizeOptionalText(
      record.user_id,
    )
  );
}

function getFallbackEmail(
  membership:
    WorkspaceMemberRow,
): string {
  const label =
    normalizeOptionalText(
      membership.member_label,
    );

  if (
    label &&
    isEmailAddress(
      label,
    )
  ) {
    return label;
  }

  return "Invitation pending";
}

function getDisplayNameFromEmail(
  email:
    string,
): string | null {
  if (
    !isEmailAddress(
      email,
    )
  ) {
    return null;
  }

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
      );

  return (
    formatted ||
    null
  );
}

function isEmailAddress(
  value:
    string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

function normalizeRequiredText(
  value:
    unknown,
): string | null {
  return normalizeOptionalText(
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