export const ROLES = [
  "user",
  "admin",
  "super_admin",
  "master_admin",
] as const;

export type Role = typeof ROLES[number];

/**
 * Higher number = higher privilege
 */
export const ROLE_RANK: Record<Role, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
  master_admin: 4,
};

/**
 * Can actingRole modify targetRole?
 * (Used for edit / delete / role change checks)
 */
export function canEditUser(
  actingRole: Role,
  targetRole: Role
): boolean {
  return ROLE_RANK[actingRole] > ROLE_RANK[targetRole];
}

/**
 * Roles the acting user is allowed to assign
 * (Primary export used by admin UI)
 */
export function getAssignableRoles(
  actingRole: Role
): Role[] {
  return ROLES.filter(
    (role) => ROLE_RANK[role] < ROLE_RANK[actingRole]
  );
}

/**
 * Backward-compatibility alias
 * (Safe to remove later once all imports are updated)
 */
export const assignableRoles = getAssignableRoles;
