import "server-only";

import {
  cache,
} from "react";
import {
  redirect,
} from "next/navigation";

import type {
  User,
} from "@supabase/supabase-js";

import {
  requireAuth,
} from "@/lib/auth/require-auth";
import type {
  CurrentProfile,
} from "@/lib/auth/get-current-profile";
import type {
  CurrentWorkspace,
} from "@/lib/auth/get-current-workspace";
import {
  createClient,
} from "@/lib/supabase/server";

const DEFAULT_UNAUTHORIZED_PATH =
  "/dashboard";

const DEFAULT_ADMIN_PATH =
  "/admin";

export type PlatformRole =
  | "user"
  | "support_admin"
  | "platform_admin"
  | "master_admin";

export type PlatformRoleRecord = {
  userId: string;
  role: PlatformRole;
  isActive: boolean;
  grantedBy: string | null;
  grantReason: string | null;
  grantedAt: string;
  deactivatedAt: string | null;
  deactivatedBy: string | null;
  deactivationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminContext = {
  user: User;
  profile: CurrentProfile;
  workspace: CurrentWorkspace | null;
  workspaces: CurrentWorkspace[];
  platformRole: PlatformRoleRecord;
  isSupportAdmin: boolean;
  isPlatformAdmin: boolean;
  isMasterAdmin: boolean;
};

export type RequireAdminOptions = {
  redirectTo?: string;
  requireWorkspace?: boolean;
  requestedWorkspaceId?: string | null;
};

type PlatformRoleRow = {
  user_id: string;
  role: PlatformRole;
  is_active: boolean;
  granted_by: string | null;
  grant_reason: string | null;
  granted_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
};

const PLATFORM_ROLE_SELECT = [
  "user_id",
  "role",
  "is_active",
  "granted_by",
  "grant_reason",
  "granted_at",
  "deactivated_at",
  "deactivated_by",
  "deactivation_reason",
  "created_at",
  "updated_at",
].join(",");

export const getCurrentPlatformRole =
  cache(
    async (
      userId: string,
    ): Promise<PlatformRoleRecord | null> => {
      const normalizedUserId =
        userId.trim();

      if (!normalizedUserId) {
        return null;
      }

      const supabase =
        await createClient();

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "platform_user_roles",
          )
          .select(
            PLATFORM_ROLE_SELECT,
          )
          .eq(
            "user_id",
            normalizedUserId,
          )
          .eq(
            "is_active",
            true,
          )
          .maybeSingle();

      if (error || !data) {
        return null;
      }

      const roleRow =
        parsePlatformRoleRow(
          data,
        );

      if (!roleRow) {
        return null;
      }

      return mapPlatformRoleRow(
        roleRow,
      );
    },
  );

export async function requireAdmin(
  options: RequireAdminOptions = {},
): Promise<AdminContext> {
  const {
    redirectTo =
      DEFAULT_UNAUTHORIZED_PATH,
    requireWorkspace = false,
    requestedWorkspaceId,
  } = options;

  const authenticatedContext =
    await requireAuth({
      redirectTo:
        DEFAULT_ADMIN_PATH,
      requireActiveProfile: true,
      requireProvisionedProfile: true,
      requireWorkspace,
      requestedWorkspaceId,
    });

  if (!authenticatedContext.profile) {
    redirect(
      redirectTo,
    );
  }

  const platformRole =
    await getCurrentPlatformRole(
      authenticatedContext.user.id,
    );

  if (
    !platformRole ||
    !isAdministrativeRole(
      platformRole.role,
    )
  ) {
    redirect(
      redirectTo,
    );
  }

  return {
    user:
      authenticatedContext.user,
    profile:
      authenticatedContext.profile,
    workspace:
      authenticatedContext.workspace,
    workspaces:
      authenticatedContext.workspaces,
    platformRole,
    isSupportAdmin:
      platformRole.role ===
        "support_admin" ||
      platformRole.role ===
        "platform_admin" ||
      platformRole.role ===
        "master_admin",
    isPlatformAdmin:
      platformRole.role ===
        "platform_admin" ||
      platformRole.role ===
        "master_admin",
    isMasterAdmin:
      platformRole.role ===
      "master_admin",
  };
}

export async function requireSupportAdmin(
  options: RequireAdminOptions = {},
): Promise<AdminContext> {
  return requireAdmin(
    options,
  );
}

export async function requirePlatformAdmin(
  options: RequireAdminOptions = {},
): Promise<AdminContext> {
  const context =
    await requireAdmin(
      options,
    );

  if (
    context.platformRole.role !==
      "platform_admin" &&
    context.platformRole.role !==
      "master_admin"
  ) {
    redirect(
      options.redirectTo ??
        DEFAULT_UNAUTHORIZED_PATH,
    );
  }

  return context;
}

export async function requireMasterAdmin(
  options: RequireAdminOptions = {},
): Promise<AdminContext> {
  const context =
    await requireAdmin(
      options,
    );

  if (
    context.platformRole.role !==
    "master_admin"
  ) {
    redirect(
      options.redirectTo ??
        DEFAULT_UNAUTHORIZED_PATH,
    );
  }

  return context;
}

export async function isCurrentUserAdmin() {
  const context =
    await requireAuth({
      requireActiveProfile: false,
      requireProvisionedProfile: false,
      requireWorkspace: false,
    });

  const platformRole =
    await getCurrentPlatformRole(
      context.user.id,
    );

  if (!platformRole) {
    return false;
  }

  return isAdministrativeRole(
    platformRole.role,
  );
}

export async function isCurrentUserPlatformAdmin() {
  const context =
    await requireAuth({
      requireActiveProfile: false,
      requireProvisionedProfile: false,
      requireWorkspace: false,
    });

  const platformRole =
    await getCurrentPlatformRole(
      context.user.id,
    );

  if (!platformRole) {
    return false;
  }

  return (
    platformRole.role ===
      "platform_admin" ||
    platformRole.role ===
      "master_admin"
  );
}

export async function isCurrentUserMasterAdmin() {
  const context =
    await requireAuth({
      requireActiveProfile: false,
      requireProvisionedProfile: false,
      requireWorkspace: false,
    });

  const platformRole =
    await getCurrentPlatformRole(
      context.user.id,
    );

  return (
    platformRole?.role ===
    "master_admin"
  );
}

function parsePlatformRoleRow(
  value: unknown,
): PlatformRoleRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const userId =
    getRequiredString(
      value.user_id,
    );

  const role =
    getPlatformRole(
      value.role,
    );

  const grantedAt =
    getRequiredString(
      value.granted_at,
    );

  const createdAt =
    getRequiredString(
      value.created_at,
    );

  const updatedAt =
    getRequiredString(
      value.updated_at,
    );

  if (
    !userId ||
    !role ||
    typeof value.is_active !==
      "boolean" ||
    !grantedAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    user_id:
      userId,
    role,
    is_active:
      value.is_active,
    granted_by:
      getNullableString(
        value.granted_by,
      ),
    grant_reason:
      getNullableString(
        value.grant_reason,
      ),
    granted_at:
      grantedAt,
    deactivated_at:
      getNullableString(
        value.deactivated_at,
      ),
    deactivated_by:
      getNullableString(
        value.deactivated_by,
      ),
    deactivation_reason:
      getNullableString(
        value.deactivation_reason,
      ),
    created_at:
      createdAt,
    updated_at:
      updatedAt,
  };
}

function mapPlatformRoleRow(
  row: PlatformRoleRow,
): PlatformRoleRecord {
  return {
    userId:
      row.user_id,
    role:
      row.role,
    isActive:
      row.is_active,
    grantedBy:
      row.granted_by,
    grantReason:
      row.grant_reason,
    grantedAt:
      row.granted_at,
    deactivatedAt:
      row.deactivated_at,
    deactivatedBy:
      row.deactivated_by,
    deactivationReason:
      row.deactivation_reason,
    createdAt:
      row.created_at,
    updatedAt:
      row.updated_at,
  };
}

function isAdministrativeRole(
  role: PlatformRole,
) {
  return (
    role ===
      "support_admin" ||
    role ===
      "platform_admin" ||
    role ===
      "master_admin"
  );
}

function getPlatformRole(
  value: unknown,
): PlatformRole | null {
  if (
    value === "user" ||
    value === "support_admin" ||
    value === "platform_admin" ||
    value === "master_admin"
  ) {
    return value;
  }

  return null;
}

function getRequiredString(
  value: unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function getNullableString(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}