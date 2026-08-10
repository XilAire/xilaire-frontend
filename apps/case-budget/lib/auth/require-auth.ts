import "server-only";

import {
  redirect,
} from "next/navigation";

import type {
  User,
} from "@supabase/supabase-js";

import {
  getCurrentProfile,
  type CurrentProfile,
} from "@/lib/auth/get-current-profile";
import {
  getCurrentUser,
} from "@/lib/auth/get-current-user";
import {
  getCurrentWorkspace,
  type CurrentWorkspace,
} from "@/lib/auth/get-current-workspace";

const DEFAULT_SIGN_IN_PATH =
  "/sign-in";

const DEFAULT_INACTIVE_ACCOUNT_PATH =
  "/account-disabled";

const DEFAULT_PROVISIONING_PATH =
  "/account/setup";

export type RequireAuthOptions = {
  redirectTo?: string;
  requireActiveProfile?: boolean;
  requireProvisionedProfile?: boolean;
  requireWorkspace?: boolean;
  requestedWorkspaceId?: string | null;
};

export type AuthenticatedContext = {
  user: User;
  profile: CurrentProfile | null;
  workspace: CurrentWorkspace | null;
  workspaces: CurrentWorkspace[];
};

export async function requireAuth(
  options: RequireAuthOptions = {},
): Promise<AuthenticatedContext> {
  const {
    redirectTo,
    requireActiveProfile = true,
    requireProvisionedProfile = true,
    requireWorkspace = true,
    requestedWorkspaceId,
  } = options;

  const currentUserResult =
    await getCurrentUser();

  if (
    !currentUserResult
      .isAuthenticated ||
    !currentUserResult.user
  ) {
    redirect(
      buildSignInPath(
        redirectTo,
      ),
    );
  }

  const user =
    currentUserResult.user;

  const currentProfileResult =
    await getCurrentProfile();

  if (
    requireProvisionedProfile &&
    !currentProfileResult.profile
  ) {
    redirect(
      DEFAULT_PROVISIONING_PATH,
    );
  }

  const profile =
    currentProfileResult.profile;

  if (
    requireActiveProfile &&
    profile &&
    !profile.isActive
  ) {
    redirect(
      DEFAULT_INACTIVE_ACCOUNT_PATH,
    );
  }

  if (!requireWorkspace) {
    return {
      user,
      profile,
      workspace: null,
      workspaces: [],
    };
  }

  const currentWorkspaceResult =
    await getCurrentWorkspace(
      requestedWorkspaceId,
    );

  if (
    !currentWorkspaceResult.workspace
  ) {
    redirect(
      DEFAULT_PROVISIONING_PATH,
    );
  }

  return {
    user,
    profile,
    workspace:
      currentWorkspaceResult.workspace,
    workspaces:
      currentWorkspaceResult.workspaces,
  };
}

export async function requireUser(): Promise<User> {
  const context =
    await requireAuth({
      requireActiveProfile: false,
      requireProvisionedProfile: false,
      requireWorkspace: false,
    });

  return context.user;
}

export async function requireProfile(): Promise<CurrentProfile> {
  const context =
    await requireAuth({
      requireWorkspace: false,
    });

  if (!context.profile) {
    redirect(
      DEFAULT_PROVISIONING_PATH,
    );
  }

  return context.profile;
}

export async function requireWorkspace(
  requestedWorkspaceId?: string | null,
): Promise<CurrentWorkspace> {
  const context =
    await requireAuth({
      requestedWorkspaceId,
    });

  if (!context.workspace) {
    redirect(
      DEFAULT_PROVISIONING_PATH,
    );
  }

  return context.workspace;
}

export async function requireWorkspaceEditor(
  requestedWorkspaceId?: string | null,
): Promise<AuthenticatedContext> {
  const context =
    await requireAuth({
      requestedWorkspaceId,
    });

  const role =
    context.workspace
      ?.membership.role;

  const canEdit =
    role === "owner" ||
    role === "admin" ||
    role === "member";

  if (!canEdit) {
    redirect(
      "/dashboard",
    );
  }

  return context;
}

export async function requireWorkspaceAdmin(
  requestedWorkspaceId?: string | null,
): Promise<AuthenticatedContext> {
  const context =
    await requireAuth({
      requestedWorkspaceId,
    });

  const role =
    context.workspace
      ?.membership.role;

  const canAdminister =
    role === "owner" ||
    role === "admin";

  if (!canAdminister) {
    redirect(
      "/dashboard",
    );
  }

  return context;
}

export async function requireWorkspaceOwner(
  requestedWorkspaceId?: string | null,
): Promise<AuthenticatedContext> {
  const context =
    await requireAuth({
      requestedWorkspaceId,
    });

  const role =
    context.workspace
      ?.membership.role;

  if (role !== "owner") {
    redirect(
      "/dashboard",
    );
  }

  return context;
}

function buildSignInPath(
  redirectTo?: string,
) {
  const safeRedirectPath =
    getSafeRedirectPath(
      redirectTo,
    );

  if (!safeRedirectPath) {
    return DEFAULT_SIGN_IN_PATH;
  }

  const searchParams =
    new URLSearchParams();

  searchParams.set(
    "next",
    safeRedirectPath,
  );

  return `${DEFAULT_SIGN_IN_PATH}?${searchParams.toString()}`;
}

function getSafeRedirectPath(
  value?: string,
) {
  if (!value) {
    return null;
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue ||
    !normalizedValue.startsWith(
      "/",
    ) ||
    normalizedValue.startsWith(
      "//",
    ) ||
    normalizedValue.includes(
      "\\",
    )
  ) {
    return null;
  }

  return normalizedValue;
}