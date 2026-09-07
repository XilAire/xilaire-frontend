"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import {
  createSupabaseServerServiceClient,
} from "@/lib/supabase/serverService";
import {
  canActorAssignRole,
  canActorManageTargetRole,
  getCurrentUniversityAdminContext,
  normalizeUniversityAdminRank,
  type UniversityAdminRoleName,
} from "@/lib/university/admin-permissions";

type UpdateUniversityUserRoleInput = {
  userId: string;
  roleName: UniversityAdminRoleName;
};

export type UpdateUniversityUserRoleResult = {
  success: boolean;
  message: string;
};

type RoleRow = {
  id: string;
  name: string;
  rank: number;
};

type TargetProfileRow = {
  id: string;
  email: string | null;
  role_id: string | null;
  roles:
    | {
        name: string | null;
        rank: number | null;
      }
    | Array<{
        name: string | null;
        rank: number | null;
      }>
    | null;
};

const MANAGED_ROLE_NAMES =
  new Set<UniversityAdminRoleName>([
    "user",
    "admin",
    "super_admin",
    "master_admin",
  ]);

function singleRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined,
): T | null {
  if (
    Array.isArray(
      value,
    )
  ) {
    return (
      value[0] ??
      null
    );
  }

  return value ?? null;
}

async function countMasterAdmins(): Promise<number> {
  const service =
    createSupabaseServerServiceClient();

  const {
    data:
      masterRoles,
    error:
      roleError,
  } =
    await service
      .from(
        "roles",
      )
      .select(
        "id",
      )
      .gte(
        "rank",
        4,
      );

  if (roleError) {
    throw new Error(
      `[CASE University Admin] Unable to resolve master-admin roles: ${roleError.message}`,
    );
  }

  const roleIds =
    (
      masterRoles ??
      []
    )
      .map(
        (role) =>
          String(
            role.id,
          ),
      )
      .filter(
        Boolean,
      );

  if (
    roleIds.length === 0
  ) {
    return 0;
  }

  const {
    count,
    error:
      countError,
  } =
    await service
      .from(
        "profiles",
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        },
      )
      .in(
        "role_id",
        roleIds,
      );

  if (countError) {
    throw new Error(
      `[CASE University Admin] Unable to count master-admin accounts: ${countError.message}`,
    );
  }

  return count ?? 0;
}

export async function updateUniversityUserRoleAction(
  input: UpdateUniversityUserRoleInput,
): Promise<UpdateUniversityUserRoleResult> {
  const userId =
    String(
      input.userId ??
        "",
    ).trim();

  const roleName =
    String(
      input.roleName ??
        "",
    )
      .trim()
      .toLowerCase() as
        UniversityAdminRoleName;

  if (!userId) {
    return {
      success:
        false,
      message:
        "The user identifier is missing.",
    };
  }

  if (
    !MANAGED_ROLE_NAMES.has(
      roleName,
    )
  ) {
    return {
      success:
        false,
      message:
        "Select a valid CASE University role.",
    };
  }

  const actor =
    await getCurrentUniversityAdminContext();

  if (
    !actor.permissions
      .canChangeUserRoles
  ) {
    return {
      success:
        false,
      message:
        "You do not have permission to change CASE University user roles.",
    };
  }

  const auth =
    await createSupabaseServerClient();

  const {
    data: {
      user:
        currentUser,
    },
  } =
    await auth.auth.getUser();

  if (!currentUser) {
    return {
      success:
        false,
      message:
        "Your authenticated session could not be verified.",
    };
  }

  if (
    currentUser.id ===
    userId
  ) {
    return {
      success:
        false,
      message:
        "You cannot change your own administrative role.",
    };
  }

  const service =
    createSupabaseServerServiceClient();

  const [
    targetProfileResult,
    desiredRoleResult,
  ] =
    await Promise.all([
      service
        .from(
          "profiles",
        )
        .select(
          `
            id,
            email,
            role_id,
            roles:roles!profiles_role_id_fkey (
              name,
              rank
            )
          `,
        )
        .eq(
          "id",
          userId,
        )
        .maybeSingle(),

      service
        .from(
          "roles",
        )
        .select(
          "id,name,rank",
        )
        .eq(
          "name",
          roleName,
        )
        .maybeSingle(),
    ]);

  if (
    targetProfileResult.error
  ) {
    console.error(
      "[CASE University Admin] Unable to load target profile for role change.",
      targetProfileResult.error,
    );

    return {
      success:
        false,
      message:
        "Unable to load the selected user's profile.",
    };
  }

  if (
    !targetProfileResult.data
  ) {
    return {
      success:
        false,
      message:
        "This authentication account does not have a profile record yet, so its role cannot be changed.",
    };
  }

  if (
    desiredRoleResult.error
  ) {
    console.error(
      "[CASE University Admin] Unable to resolve requested role.",
      desiredRoleResult.error,
    );

    return {
      success:
        false,
      message:
        "Unable to resolve the requested role.",
    };
  }

  const desiredRole =
    desiredRoleResult.data as
      | RoleRow
      | null;

  if (!desiredRole) {
    return {
      success:
        false,
      message:
        `The ${roleName} role does not exist in the roles table.`,
    };
  }

  const targetProfile =
    targetProfileResult.data as unknown as
      TargetProfileRow;

  const currentTargetRole =
    singleRelation(
      targetProfile.roles,
    );

  const targetRank =
    normalizeUniversityAdminRank(
      currentTargetRole?.rank ??
        1,
    );

  const desiredRank =
    normalizeUniversityAdminRank(
      desiredRole.rank,
    );

  if (
    !canActorManageTargetRole({
      actorRank:
        actor.roleRank,
      targetRank,
    })
  ) {
    return {
      success:
        false,
      message:
        "You cannot manage an account at this administrative level.",
    };
  }

  if (
    !canActorAssignRole({
      actorRank:
        actor.roleRank,
      desiredRank,
    })
  ) {
    return {
      success:
        false,
      message:
        "You cannot assign the selected administrative role.",
    };
  }

  /*
   * Super Admin (3):
   * - may manage rank 1 and 2
   * - may assign only rank 1 and 2
   *
   * Master Admin (4+):
   * - may manage 1-4
   * - may assign 1-4
   *
   * No account may self-modify.
   */
  if (
    targetRank >= 4 &&
    desiredRank < 4
  ) {
    const masterCount =
      await countMasterAdmins();

    if (
      masterCount <= 1
    ) {
      return {
        success:
          false,
        message:
          "This is the last Master Admin account and cannot be demoted.",
      };
    }
  }

  if (
    targetProfile.role_id ===
    desiredRole.id
  ) {
    return {
      success:
        true,
      message:
        `This user is already assigned the ${desiredRole.name} role.`,
    };
  }

  const {
    error:
      updateError,
  } =
    await service
      .from(
        "profiles",
      )
      .update({
        role_id:
          desiredRole.id,
      })
      .eq(
        "id",
        userId,
      );

  if (updateError) {
    console.error(
      "[CASE University Admin] User role update failed.",
      updateError,
    );

    return {
      success:
        false,
      message:
        "Unable to update this user's role right now.",
    };
  }

  revalidatePath(
    "/admin/users",
  );

  revalidatePath(
    `/admin/users/${userId}`,
  );

  return {
    success:
      true,
    message:
      `User role changed to ${desiredRole.name.replaceAll("_", " ")} successfully.`,
  };
}
