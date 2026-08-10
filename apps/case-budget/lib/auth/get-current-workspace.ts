import "server-only";

import {
  cache,
} from "react";

import {
  getCurrentUser,
} from "@/lib/auth/get-current-user";
import {
  createClient,
} from "@/lib/supabase/server";

export type WorkspaceType =
  | "personal"
  | "household"
  | "business"
  | "organization";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";

export type WorkspaceMembershipStatus =
  | "invited"
  | "active"
  | "suspended"
  | "removed";

export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string;
  workspaceType: WorkspaceType;
  ownerUserId: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  membership: {
    id: string;
    userId: string;
    role: WorkspaceRole;
    status: WorkspaceMembershipStatus;
    memberLabel: string | null;
    joinedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type CurrentWorkspaceResult = {
  workspace: CurrentWorkspace | null;
  workspaces: CurrentWorkspace[];
  isAuthenticated: boolean;
  isProvisioned: boolean;
  error: string | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  workspace_type: WorkspaceType;
  owner_user_id: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type WorkspaceMembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  status: WorkspaceMembershipStatus;
  member_label: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
};

const WORKSPACE_SELECT = [
  "id",
  "name",
  "slug",
  "workspace_type",
  "owner_user_id",
  "description",
  "logo_url",
  "is_active",
  "created_at",
  "updated_at",
].join(",");

const MEMBERSHIP_SELECT = [
  "id",
  "workspace_id",
  "user_id",
  "role",
  "status",
  "member_label",
  "joined_at",
  "created_at",
  "updated_at",
].join(",");

export const getCurrentWorkspace =
  cache(
    async (
      requestedWorkspaceId?: string | null,
    ): Promise<CurrentWorkspaceResult> => {
      const currentUserResult =
        await getCurrentUser();

      if (
        !currentUserResult.isAuthenticated ||
        !currentUserResult.user
      ) {
        return {
          workspace: null,
          workspaces: [],
          isAuthenticated: false,
          isProvisioned: false,
          error:
            currentUserResult.error,
        };
      }

      try {
        const supabase =
          await createClient();

        const {
          data: membershipData,
          error: membershipError,
        } =
          await supabase
            .from(
              "workspace_members",
            )
            .select(
              MEMBERSHIP_SELECT,
            )
            .eq(
              "user_id",
              currentUserResult.user.id,
            )
            .eq(
              "status",
              "active",
            );

        if (membershipError) {
          return {
            workspace: null,
            workspaces: [],
            isAuthenticated: true,
            isProvisioned: false,
            error:
              normalizeWorkspaceError(
                membershipError.message,
              ),
          };
        }

        const memberships =
          parseMembershipRows(
            membershipData,
          );

        if (
          memberships.length === 0
        ) {
          return {
            workspace: null,
            workspaces: [],
            isAuthenticated: true,
            isProvisioned: false,
            error: null,
          };
        }

        const workspaceIds =
          memberships.map(
            (
              membership,
            ) =>
              membership.workspace_id,
          );

        const {
          data: workspaceData,
          error: workspaceError,
        } =
          await supabase
            .from(
              "workspaces",
            )
            .select(
              WORKSPACE_SELECT,
            )
            .in(
              "id",
              workspaceIds,
            )
            .eq(
              "is_active",
              true,
            );

        if (workspaceError) {
          return {
            workspace: null,
            workspaces: [],
            isAuthenticated: true,
            isProvisioned: true,
            error:
              normalizeWorkspaceError(
                workspaceError.message,
              ),
          };
        }

        const workspaceRows =
          parseWorkspaceRows(
            workspaceData,
          );

        const membershipByWorkspaceId =
          new Map<
            string,
            WorkspaceMembershipRow
          >();

        for (
          const membership
          of memberships
        ) {
          membershipByWorkspaceId.set(
            membership.workspace_id,
            membership,
          );
        }

        const workspaces =
          workspaceRows
            .map(
              (
                workspace,
              ) => {
                const membership =
                  membershipByWorkspaceId.get(
                    workspace.id,
                  );

                if (!membership) {
                  return null;
                }

                return mapCurrentWorkspace(
                  workspace,
                  membership,
                );
              },
            )
            .filter(
              (
                workspace,
              ): workspace is CurrentWorkspace =>
                workspace !== null,
            )
            .sort(
              compareWorkspaces,
            );

        if (
          workspaces.length === 0
        ) {
          return {
            workspace: null,
            workspaces: [],
            isAuthenticated: true,
            isProvisioned: false,
            error: null,
          };
        }

        const normalizedRequestedWorkspaceId =
          requestedWorkspaceId
            ?.trim() ||
          null;

        const requestedWorkspace =
          normalizedRequestedWorkspaceId
            ? workspaces.find(
                (
                  workspace,
                ) =>
                  workspace.id ===
                  normalizedRequestedWorkspaceId,
              ) ?? null
            : null;

        const selectedWorkspace =
          requestedWorkspace ??
          findPreferredWorkspace(
            workspaces,
            currentUserResult.user.id,
          );

        return {
          workspace:
            selectedWorkspace,
          workspaces,
          isAuthenticated: true,
          isProvisioned: true,
          error: null,
        };
      } catch (error) {
        return {
          workspace: null,
          workspaces: [],
          isAuthenticated: true,
          isProvisioned: false,
          error:
            getUnknownErrorMessage(
              error,
            ),
        };
      }
    },
  );

export const getDefaultWorkspace =
  cache(
    async (): Promise<CurrentWorkspace | null> => {
      const result =
        await getCurrentWorkspace();

      return result.workspace;
    },
  );

export const getCurrentWorkspaceById =
  cache(
    async (
      workspaceId: string,
    ): Promise<CurrentWorkspace | null> => {
      const normalizedWorkspaceId =
        workspaceId.trim();

      if (!normalizedWorkspaceId) {
        return null;
      }

      const result =
        await getCurrentWorkspace(
          normalizedWorkspaceId,
        );

      if (
        result.workspace?.id !==
        normalizedWorkspaceId
      ) {
        return null;
      }

      return result.workspace;
    },
  );

export const getCurrentWorkspaceId =
  cache(
    async (): Promise<string | null> => {
      const workspace =
        await getDefaultWorkspace();

      return workspace?.id ?? null;
    },
  );

export const getAvailableWorkspaces =
  cache(
    async (): Promise<CurrentWorkspace[]> => {
      const result =
        await getCurrentWorkspace();

      return result.workspaces;
    },
  );

export const getCurrentWorkspaceRole =
  cache(
    async (): Promise<WorkspaceRole | null> => {
      const workspace =
        await getDefaultWorkspace();

      return (
        workspace?.membership.role ??
        null
      );
    },
  );

export const isCurrentWorkspaceOwner =
  cache(
    async (): Promise<boolean> => {
      const role =
        await getCurrentWorkspaceRole();

      return role === "owner";
    },
  );

export const isCurrentWorkspaceAdmin =
  cache(
    async (): Promise<boolean> => {
      const role =
        await getCurrentWorkspaceRole();

      return (
        role === "owner" ||
        role === "admin"
      );
    },
  );

export const canEditCurrentWorkspace =
  cache(
    async (): Promise<boolean> => {
      const role =
        await getCurrentWorkspaceRole();

      return (
        role === "owner" ||
        role === "admin" ||
        role === "member"
      );
    },
  );

function parseWorkspaceRows(
  value: unknown,
): WorkspaceRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      parseWorkspaceRow,
    )
    .filter(
      (
        workspace,
      ): workspace is WorkspaceRow =>
        workspace !== null,
    );
}

function parseWorkspaceRow(
  value: unknown,
): WorkspaceRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    getRequiredString(
      value.id,
    );

  const name =
    getRequiredString(
      value.name,
    );

  const slug =
    getRequiredString(
      value.slug,
    );

  const workspaceType =
    getWorkspaceType(
      value.workspace_type,
    );

  const ownerUserId =
    getRequiredString(
      value.owner_user_id,
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
    !id ||
    !name ||
    !slug ||
    !workspaceType ||
    !ownerUserId ||
    !createdAt ||
    !updatedAt ||
    typeof value.is_active !==
      "boolean"
  ) {
    return null;
  }

  return {
    id,
    name,
    slug,
    workspace_type:
      workspaceType,
    owner_user_id:
      ownerUserId,
    description:
      getNullableString(
        value.description,
      ),
    logo_url:
      getNullableString(
        value.logo_url,
      ),
    is_active:
      value.is_active,
    created_at:
      createdAt,
    updated_at:
      updatedAt,
  };
}

function parseMembershipRows(
  value: unknown,
): WorkspaceMembershipRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      parseMembershipRow,
    )
    .filter(
      (
        membership,
      ): membership is WorkspaceMembershipRow =>
        membership !== null,
    );
}

function parseMembershipRow(
  value: unknown,
): WorkspaceMembershipRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    getRequiredString(
      value.id,
    );

  const workspaceId =
    getRequiredString(
      value.workspace_id,
    );

  const userId =
    getRequiredString(
      value.user_id,
    );

  const role =
    getWorkspaceRole(
      value.role,
    );

  const status =
    getMembershipStatus(
      value.status,
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
    !id ||
    !workspaceId ||
    !userId ||
    !role ||
    !status ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    workspace_id:
      workspaceId,
    user_id:
      userId,
    role,
    status,
    member_label:
      getNullableString(
        value.member_label,
      ),
    joined_at:
      getNullableString(
        value.joined_at,
      ),
    created_at:
      createdAt,
    updated_at:
      updatedAt,
  };
}

function mapCurrentWorkspace(
  workspace: WorkspaceRow,
  membership: WorkspaceMembershipRow,
): CurrentWorkspace {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    workspaceType:
      workspace.workspace_type,
    ownerUserId:
      workspace.owner_user_id,
    description:
      workspace.description,
    logoUrl:
      workspace.logo_url,
    isActive:
      workspace.is_active,
    createdAt:
      workspace.created_at,
    updatedAt:
      workspace.updated_at,
    membership: {
      id: membership.id,
      userId:
        membership.user_id,
      role:
        membership.role,
      status:
        membership.status,
      memberLabel:
        membership.member_label,
      joinedAt:
        membership.joined_at,
      createdAt:
        membership.created_at,
      updatedAt:
        membership.updated_at,
    },
  };
}

function findPreferredWorkspace(
  workspaces: CurrentWorkspace[],
  userId: string,
) {
  const ownedPersonalWorkspace =
    workspaces.find(
      (
        workspace,
      ) =>
        workspace.ownerUserId ===
          userId &&
        workspace.workspaceType ===
          "personal" &&
        workspace.membership.role ===
          "owner",
    );

  if (ownedPersonalWorkspace) {
    return ownedPersonalWorkspace;
  }

  const ownedWorkspace =
    workspaces.find(
      (
        workspace,
      ) =>
        workspace.membership.role ===
        "owner",
    );

  if (ownedWorkspace) {
    return ownedWorkspace;
  }

  const administeredWorkspace =
    workspaces.find(
      (
        workspace,
      ) =>
        workspace.membership.role ===
        "admin",
    );

  if (administeredWorkspace) {
    return administeredWorkspace;
  }

  return workspaces[0] ?? null;
}

function compareWorkspaces(
  first: CurrentWorkspace,
  second: CurrentWorkspace,
) {
  const roleDifference =
    getRolePriority(
      first.membership.role,
    ) -
    getRolePriority(
      second.membership.role,
    );

  if (roleDifference !== 0) {
    return roleDifference;
  }

  if (
    first.workspaceType ===
      "personal" &&
    second.workspaceType !==
      "personal"
  ) {
    return -1;
  }

  if (
    first.workspaceType !==
      "personal" &&
    second.workspaceType ===
      "personal"
  ) {
    return 1;
  }

  return first.name.localeCompare(
    second.name,
    undefined,
    {
      sensitivity: "base",
    },
  );
}

function getRolePriority(
  role: WorkspaceRole,
) {
  switch (role) {
    case "owner":
      return 0;

    case "admin":
      return 1;

    case "member":
      return 2;

    case "viewer":
      return 3;

    default:
      return 4;
  }
}

function getWorkspaceType(
  value: unknown,
): WorkspaceType | null {
  if (
    value === "personal" ||
    value === "household" ||
    value === "business" ||
    value === "organization"
  ) {
    return value;
  }

  return null;
}

function getWorkspaceRole(
  value: unknown,
): WorkspaceRole | null {
  if (
    value === "owner" ||
    value === "admin" ||
    value === "member" ||
    value === "viewer"
  ) {
    return value;
  }

  return null;
}

function getMembershipStatus(
  value: unknown,
): WorkspaceMembershipStatus | null {
  if (
    value === "invited" ||
    value === "active" ||
    value === "suspended" ||
    value === "removed"
  ) {
    return value;
  }

  return null;
}

function normalizeWorkspaceError(
  message: string,
) {
  const normalizedMessage =
    message
      .trim()
      .toLowerCase();

  if (
    normalizedMessage.includes(
      "row-level security",
    ) ||
    normalizedMessage.includes(
      "permission denied",
    )
  ) {
    return "Your CASE Budget workspaces could not be loaded because access was denied.";
  }

  if (
    normalizedMessage.includes(
      "relation",
    ) &&
    normalizedMessage.includes(
      "does not exist",
    )
  ) {
    return "The CASE Budget workspace tables are not available.";
  }

  return (
    message.trim() ||
    "Unable to load the current CASE Budget workspace."
  );
}

function getUnknownErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return (
      error.message.trim() ||
      "Unable to load the current CASE Budget workspace."
    );
  }

  return "Unable to load the current CASE Budget workspace.";
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