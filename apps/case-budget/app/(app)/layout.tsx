import type {
  ReactNode,
} from "react";

import type {
  User,
} from "@supabase/supabase-js";

import {
  cookies,
} from "next/headers";

import {
  getInvestments,
} from "@/actions/investments/get-investments";

import AppProvider, {
  type AppUser,
  type AppWorkspace,
  type WorkspaceType as AppWorkspaceType,
} from "@/components/providers/AppProvider";

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
  type WorkspaceType as DatabaseWorkspaceType,
} from "@/lib/auth/get-current-workspace";

const ACTIVE_WORKSPACE_COOKIE_NAME =
  "case-budget-active-workspace-id";

export type AuthenticatedAppLayoutProps = {
  children:
    ReactNode;
};

export default async function AuthenticatedAppLayout({
  children,
}: AuthenticatedAppLayoutProps) {
  const [
    currentUserResult,
    currentProfileResult,
    cookieStore,
  ] =
    await Promise.all([
      getCurrentUser(),
      getCurrentProfile(),
      cookies(),
    ]);

  console.log(
    "[CASE Budget Auth Debug]",
    {
      auth: {
        isAuthenticated:
          currentUserResult.isAuthenticated,

        userId:
          currentUserResult.user?.id ??
          null,

        email:
          currentUserResult.user?.email ??
          null,

        error:
          currentUserResult.error,
      },

      profile: {
        isAuthenticated:
          currentProfileResult.isAuthenticated,

        isProvisioned:
          currentProfileResult.isProvisioned,

        profileId:
          currentProfileResult.profile?.id ??
          null,

        email:
          currentProfileResult.profile?.email ??
          null,

        displayName:
          currentProfileResult.profile?.displayName ??
          null,

        error:
          currentProfileResult.error,
      },
    },
  );

  const requestedWorkspaceId =
    cookieStore
      .get(
        ACTIVE_WORKSPACE_COOKIE_NAME,
      )
      ?.value
      ?.trim() ||
    null;

  const workspaceResult =
    await getCurrentWorkspace(
      requestedWorkspaceId,
    );

  console.log(
    "[CASE Budget Workspace Debug]",
    {
      isAuthenticated:
        workspaceResult.isAuthenticated,

      isProvisioned:
        workspaceResult.isProvisioned,

      activeWorkspaceId:
        workspaceResult.workspace?.id ??
        null,

      activeWorkspaceName:
        workspaceResult.workspace?.name ??
        null,

      workspaceCount:
        workspaceResult.workspaces.length,

      workspaceIds:
        workspaceResult.workspaces.map(
          (
            workspace,
          ) =>
            workspace.id,
        ),

      error:
        workspaceResult.error,
    },
  );

  const initialWorkspaces =
    workspaceResult.workspaces.map(
      mapCurrentWorkspaceToAppWorkspace,
    );

  const initialWorkspaceId =
    workspaceResult.workspace?.id ??
    initialWorkspaces[0]?.id ??
    "";

  /*
   * Load canonical investment state only after the active workspace has
   * been resolved.
   *
   * getInvestments() resolves authentication and workspace scope on the
   * server. The browser never supplies the workspace ID used by the
   * investment query.
   *
   * When the user switches workspaces, AppProvider updates the authoritative
   * HttpOnly workspace cookie and calls router.refresh(). This layout then
   * executes again and loads investment data for the newly active workspace.
   */
  const investmentsResult =
    await getInvestments();

  const initialUser =
    currentProfileResult.profile
      ? mapCurrentProfileToAppUser(
          currentProfileResult.profile,
        )
      : currentUserResult.user
        ? mapAuthUserToAppUser(
            currentUserResult.user,
          )
        : null;

  console.log(
    "[CASE Budget Initial User Debug]",
    initialUser
      ? {
          id:
            initialUser.id,

          email:
            initialUser.email,

          displayName:
            initialUser.displayName,

          firstName:
            initialUser.firstName ??
            null,

          lastName:
            initialUser.lastName ??
            null,
        }
      : null,
  );

  return (
    <AppProvider
      initialUser={
        initialUser
      }
      initialWorkspaceId={
        initialWorkspaceId
      }
      initialWorkspaces={
        initialWorkspaces
      }
      initialInvestments={
        investmentsResult.investments
      }
    >
      {children}
    </AppProvider>
  );
}

function mapCurrentProfileToAppUser(
  profile:
    CurrentProfile,
): AppUser {
  return {
    id:
      profile.id,

    email:
      profile.email,

    firstName:
      profile.firstName,

    lastName:
      profile.lastName,

    displayName:
      resolveDisplayName({
        displayName:
          profile.displayName,

        firstName:
          profile.firstName,

        lastName:
          profile.lastName,

        email:
          profile.email,
      }),

    avatarUrl:
      profile.avatarUrl,
  };
}

function mapAuthUserToAppUser(
  user:
    User,
): AppUser {
  const metadata =
    user.user_metadata ??
    {};

  const firstName =
    getOptionalString(
      metadata.first_name,
    );

  const lastName =
    getOptionalString(
      metadata.last_name,
    );

  const displayName =
    getOptionalString(
      metadata.display_name,
    );

  return {
    id:
      user.id,

    email:
      user.email ??
      "",

    firstName,

    lastName,

    displayName:
      resolveDisplayName({
        displayName,

        firstName,

        lastName,

        email:
          user.email ??
          "",
      }),

    avatarUrl:
      getOptionalString(
        metadata.avatar_url,
      ),
  };
}

function mapCurrentWorkspaceToAppWorkspace(
  workspace:
    CurrentWorkspace,
): AppWorkspace {
  return {
    id:
      workspace.id,

    name:
      workspace.name,

    type:
      mapWorkspaceType(
        workspace.workspaceType,
      ),

    isOwner:
      workspace.membership.role ===
      "owner",
  };
}

function mapWorkspaceType(
  workspaceType:
    DatabaseWorkspaceType,
): AppWorkspaceType {
  switch (
    workspaceType
  ) {
    case "personal":
      return "personal";

    case "household":
      return "household";

    case "business":
      return "business";

    case "organization":
      return "other";

    default:
      return "other";
  }
}

function resolveDisplayName({
  displayName,
  firstName,
  lastName,
  email,
}: {
  displayName:
    string | null;

  firstName:
    string | null;

  lastName:
    string | null;

  email:
    string;
}) {
  const normalizedDisplayName =
    displayName?.trim();

  if (
    normalizedDisplayName
  ) {
    return normalizedDisplayName;
  }

  const fullName =
    [
      firstName,
      lastName,
    ]
      .filter(
        (
          value,
        ): value is string =>
          typeof value ===
            "string" &&
          value.trim().length >
            0,
      )
      .join(
        " ",
      )
      .trim();

  if (
    fullName
  ) {
    return fullName;
  }

  const emailName =
    email
      .split(
        "@",
      )[0]
      ?.trim();

  return (
    emailName ||
    "CASE Budget User"
  );
}

function getOptionalString(
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

  return (
    normalizedValue ||
    null
  );
}