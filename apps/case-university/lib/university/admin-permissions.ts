import "server-only";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

export type UniversityAdminRoleName =
  | "user"
  | "power_user"
  | "admin"
  | "super_admin"
  | "master_admin";

export type UniversityAdminPermissions = {
  canAccessAdmin: boolean;

  canViewUsers: boolean;
  canViewUserDetails: boolean;
  canManageUsers: boolean;
  canChangeUserRoles: boolean;
  canManageAdmins: boolean;
  canManageSuperAdmins: boolean;
  canManageMasterAdmins: boolean;

  canViewCurriculum: boolean;
  canManageCurriculum: boolean;
  canManageResources: boolean;
  canManageAssessments: boolean;
  canArchiveCurriculum: boolean;
  canPublishCurriculum: boolean;
  canPermanentlyDeleteCurriculum: boolean;

  canManageBilling: boolean;
};

export type UniversityAdminContext = {
  roleName: UniversityAdminRoleName | string | null;
  roleRank: number;
  permissions: UniversityAdminPermissions;
};

export type UniversityAdminCapability =
  | keyof UniversityAdminPermissions;

const EMPTY_PERMISSIONS: UniversityAdminPermissions = {
  canAccessAdmin: false,

  canViewUsers: false,
  canViewUserDetails: false,
  canManageUsers: false,
  canChangeUserRoles: false,
  canManageAdmins: false,
  canManageSuperAdmins: false,
  canManageMasterAdmins: false,

  canViewCurriculum: false,
  canManageCurriculum: false,
  canManageResources: false,
  canManageAssessments: false,
  canArchiveCurriculum: false,
  canPublishCurriculum: false,
  canPermanentlyDeleteCurriculum: false,

  canManageBilling: false,
};

export class UniversityAdminPermissionError extends Error {
  constructor(
    capability: UniversityAdminCapability,
  ) {
    super(
      `You do not have the required CASE University administrative permission: ${capability}.`,
    );

    this.name =
      "UniversityAdminPermissionError";
  }
}

export function normalizeUniversityAdminRank(
  value: unknown,
): number {
  const rank =
    Number(value ?? 0);

  if (!Number.isFinite(rank)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(rank),
  );
}

export function roleNameFromRank(
  rank: number,
): UniversityAdminRoleName {
  if (rank >= 4) {
    return "master_admin";
  }

  if (rank === 3) {
    return "super_admin";
  }

  if (rank === 2) {
    return "admin";
  }

  if (rank === 1) {
    return "power_user";
  }

  return "user";
}

export function buildUniversityAdminPermissions(
  rankValue: unknown,
): UniversityAdminPermissions {
  const rank =
    normalizeUniversityAdminRank(
      rankValue,
    );

  /*
   * CASE University role hierarchy:
   *
   * 0 = User
   * 1 = Power User
   * 2 = Admin
   * 3 = Super Admin
   * 4 = Master Admin
   *
   * Power User intentionally receives no Admin-section capability.
   * It is an elevated learner/course-facing role only.
   */
  if (rank < 2) {
    return {
      ...EMPTY_PERMISSIONS,
    };
  }

  return {
    canAccessAdmin:
      rank >= 2,

    canViewUsers:
      rank >= 2,

    canViewUserDetails:
      rank >= 2,

    /*
     * Rank 2 Admin is intentionally read-only for users.
     * Rank 3+ may manage normal users.
     */
    canManageUsers:
      rank >= 3,

    canChangeUserRoles:
      rank >= 3,

    canManageAdmins:
      rank >= 3,

    canManageSuperAdmins:
      rank >= 4,

    canManageMasterAdmins:
      rank >= 4,

    /*
     * Curriculum hierarchy:
     *
     * Admin (2):
     *   View only.
     *
     * Super Admin (3):
     *   Create/edit/manage content, resources and assessments.
     *   Archive, permanent deletion and publish/unpublish
     *   remain protected for Master Admin only.
     *
     * Master Admin (4+):
     *   Full curriculum authority.
     */
    canViewCurriculum:
      rank >= 2,

    canManageCurriculum:
      rank >= 3,

    canManageResources:
      rank >= 3,

    canManageAssessments:
      rank >= 3,

    canArchiveCurriculum:
      rank >= 4,

    canPublishCurriculum:
      rank >= 4,

    canPermanentlyDeleteCurriculum:
      rank >= 4,

    canManageBilling:
      rank >= 4,
  };
}

export async function getCurrentUniversityAdminContext(): Promise<UniversityAdminContext> {
  const role =
    await resolveCurrentUserRole();

  const roleRank =
    normalizeUniversityAdminRank(
      role?.role_rank,
    );

  return {
    roleName:
      role?.role_name ??
      (
        roleRank > 0
          ? roleNameFromRank(
              roleRank,
            )
          : null
      ),

    roleRank,

    permissions:
      buildUniversityAdminPermissions(
        roleRank,
      ),
  };
}

export async function hasUniversityAdminCapability(
  capability: UniversityAdminCapability,
): Promise<boolean> {
  const context =
    await getCurrentUniversityAdminContext();

  return Boolean(
    context.permissions[
      capability
    ],
  );
}

export async function requireUniversityAdminCapability(
  capability: UniversityAdminCapability,
): Promise<UniversityAdminContext> {
  const context =
    await getCurrentUniversityAdminContext();

  if (
    !context.permissions[
      capability
    ]
  ) {
    throw new UniversityAdminPermissionError(
      capability,
    );
  }

  return context;
}

export function canActorManageTargetRole({
  actorRank,
  targetRank,
}: {
  actorRank: number;
  targetRank: number;
}): boolean {
  const actor =
    normalizeUniversityAdminRank(
      actorRank,
    );

  const target =
    normalizeUniversityAdminRank(
      targetRank,
    );

  if (actor < 3) {
    return false;
  }

  if (actor === 3) {
    return target < 3;
  }

  /*
   * Master Admin may manage ranks below or equal to 4.
   * Higher custom ranks are not implicitly trusted.
   */
  return target <= 4;
}

export function canActorAssignRole({
  actorRank,
  desiredRank,
}: {
  actorRank: number;
  desiredRank: number;
}): boolean {
  const actor =
    normalizeUniversityAdminRank(
      actorRank,
    );

  const desired =
    normalizeUniversityAdminRank(
      desiredRank,
    );

  if (actor < 3) {
    return false;
  }

  if (actor === 3) {
    return (
      desired >= 0 &&
      desired <= 2
    );
  }

  return (
    desired >= 0 &&
    desired <= 4
  );
}
