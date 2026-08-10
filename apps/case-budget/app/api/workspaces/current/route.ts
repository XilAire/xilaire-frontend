import "server-only";

import {
  cookies,
} from "next/headers";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE,
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";
import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
  WorkspaceTypeDatabaseEnum,
} from "@/types/database";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type EditableWorkspaceType =
  | "personal"
  | "household"
  | "business";

type WorkspaceSettingsData = {
  id:
    string;

  name:
    string;

  workspaceType:
    WorkspaceTypeDatabaseEnum;

  description:
    string | null;

  logoUrl:
    string | null;

  isActive:
    boolean;

  isOwner:
    boolean;

  role:
    WorkspaceRoleDatabaseEnum;

  membershipStatus:
    WorkspaceMembershipStatusDatabaseEnum;

  createdAt:
    string;

  updatedAt:
    string;
};

type UpdateWorkspaceRequest = {
  name:
    string;

  workspaceType:
    EditableWorkspaceType;

  description?:
    string | null;
};

type ApiSuccessResponse<
  Data,
> = {
  success:
    true;

  data:
    Data;

  error:
    null;
};

type ApiErrorResponse = {
  success:
    false;

  data:
    null;

  error: {
    code:
      string;

    message:
      string;
  };
};

type ApiResponse<
  Data,
> =
  | ApiSuccessResponse<Data>
  | ApiErrorResponse;

const WORKSPACE_NAME_MAX_LENGTH =
  80;

const WORKSPACE_DESCRIPTION_MAX_LENGTH =
  240;

const WORKSPACE_SELECT =
  "id,name,slug,workspace_type,owner_user_id,description,logo_url,is_active,created_at,updated_at" as const;

const MEMBERSHIP_SELECT =
  "id,workspace_id,user_id,role,status,member_label,created_at,updated_at" as const;

const USER_ACTIVE_MEMBERSHIP_SELECT =
  "workspace_id,created_at" as const;

const ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SECONDS =
  60 *
  60 *
  24 *
  365;

/**
 * GET /api/workspaces/current
 *
 * Returns the authenticated user's currently active CASE Budget
 * workspace and the user's membership information for that workspace.
 *
 * The active workspace ID is resolved by the existing CASE Budget
 * server-auth layer.
 */
export async function GET() {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        workspace,
      error:
        workspaceError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .select(
          WORKSPACE_SELECT,
        )
        .eq(
          "id",
          workspaceId,
        )
        .maybeSingle();

    if (
      workspaceError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-load-failed",

        message:
          "CASE Budget could not load the current workspace.",

        detail:
          workspaceError.message,
      });
    }

    if (
      !workspace
    ) {
      return createNotFoundResponse();
    }

    if (
      !workspace.is_active
    ) {
      return createForbiddenResponse(
        "The selected CASE Budget workspace is not active.",
      );
    }

    const {
      data:
        membership,
      error:
        membershipError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .select(
          MEMBERSHIP_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-membership-load-failed",

        message:
          "CASE Budget could not verify your workspace access.",

        detail:
          membershipError.message,
      });
    }

    if (
      !membership ||
      membership.status !==
        "active"
    ) {
      return createForbiddenResponse(
        "You do not have active access to this CASE Budget workspace.",
      );
    }

    return createSuccessResponse({
      workspace:
        mapWorkspaceSettingsData({
          workspace,
          membership,
          userId,
        }),
    });
  } catch (
    error
  ) {
    return createWorkspaceApiErrorResponse(
      error,
    );
  }
}

/**
 * PUT /api/workspaces/current
 *
 * Updates editable identity settings for the authenticated user's
 * currently active workspace.
 *
 * Only the workspace owner may change these settings.
 */
export async function PUT(
  request:
    NextRequest,
) {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      !isUpdateWorkspaceRequest(
        requestBody,
      )
    ) {
      return createValidationErrorResponse(
        "A valid workspace settings payload is required.",
      );
    }

    const name =
      normalizeRequiredText(
        requestBody.name,
      );

    if (
      !name
    ) {
      return createValidationErrorResponse(
        "Workspace name is required.",
      );
    }

    if (
      name.length >
      WORKSPACE_NAME_MAX_LENGTH
    ) {
      return createValidationErrorResponse(
        `Workspace name must be ${WORKSPACE_NAME_MAX_LENGTH} characters or fewer.`,
      );
    }

    const description =
      normalizeOptionalText(
        requestBody.description,
      );

    if (
      description &&
      description.length >
        WORKSPACE_DESCRIPTION_MAX_LENGTH
    ) {
      return createValidationErrorResponse(
        `Workspace description must be ${WORKSPACE_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
      );
    }

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        existingWorkspace,
      error:
        existingWorkspaceError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .select(
          WORKSPACE_SELECT,
        )
        .eq(
          "id",
          workspaceId,
        )
        .maybeSingle();

    if (
      existingWorkspaceError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-load-failed",

        message:
          "CASE Budget could not load the current workspace before saving changes.",

        detail:
          existingWorkspaceError.message,
      });
    }

    if (
      !existingWorkspace
    ) {
      return createNotFoundResponse();
    }

    if (
      !existingWorkspace.is_active
    ) {
      return createForbiddenResponse(
        "The selected CASE Budget workspace is not active.",
      );
    }

    const {
      data:
        membership,
      error:
        membershipError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .select(
          MEMBERSHIP_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-membership-load-failed",

        message:
          "CASE Budget could not verify your workspace permissions.",

        detail:
          membershipError.message,
      });
    }

    if (
      !membership ||
      membership.status !==
        "active"
    ) {
      return createForbiddenResponse(
        "You do not have active access to this CASE Budget workspace.",
      );
    }

    const isWorkspaceOwner =
      existingWorkspace.owner_user_id ===
        userId ||
      membership.role ===
        "owner";

    if (
      !isWorkspaceOwner
    ) {
      return createForbiddenResponse(
        "Only the workspace owner can change workspace settings.",
      );
    }

    const updatedAt =
      new Date().toISOString();

    const {
      data:
        updatedWorkspace,
      error:
        updateError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .update({
          name,

          workspace_type:
            requestBody.workspaceType,

          description,

          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          workspaceId,
        )
        .eq(
          "owner_user_id",
          existingWorkspace.owner_user_id,
        )
        .select(
          WORKSPACE_SELECT,
        )
        .maybeSingle();

    if (
      updateError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-save-failed",

        message:
          "CASE Budget could not save the workspace settings.",

        detail:
          updateError.message,
      });
    }

    if (
      !updatedWorkspace
    ) {
      return createNotFoundResponse();
    }

    return createSuccessResponse({
      workspace:
        mapWorkspaceSettingsData({
          workspace:
            updatedWorkspace,

          membership,

          userId,
        }),
    });
  } catch (
    error
  ) {
    return createWorkspaceApiErrorResponse(
      error,
    );
  }
}


/**
 * DELETE /api/workspaces/current
 *
 * Permanently deletes the authenticated user's currently active
 * workspace.
 *
 * Safeguards:
 *
 * - The user must be an active member.
 * - The user must own the workspace.
 * - The user must have at least one other active workspace.
 * - The request must confirm the exact workspace name.
 *
 * After deletion, another active workspace is selected and persisted
 * into the CASE Budget active-workspace cookie.
 */
export async function DELETE(
  request:
    NextRequest,
) {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      !isDeleteWorkspaceRequest(
        requestBody,
      )
    ) {
      return createValidationErrorResponse(
        "A valid workspace deletion confirmation is required.",
      );
    }

    const confirmation =
      normalizeRequiredText(
        requestBody.confirmation,
      );

    const admin =
      createWorkspaceAdminClient();

    const {
      data:
        workspace,
      error:
        workspaceError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .select(
          WORKSPACE_SELECT,
        )
        .eq(
          "id",
          workspaceId,
        )
        .maybeSingle();

    if (
      workspaceError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-load-failed",

        message:
          "CASE Budget could not load the workspace before deletion.",

        detail:
          workspaceError.message,
      });
    }

    if (
      !workspace
    ) {
      return createNotFoundResponse();
    }

    if (
      !workspace.is_active
    ) {
      return createForbiddenResponse(
        "The selected CASE Budget workspace is not active.",
      );
    }

    if (
      confirmation !==
      workspace.name
    ) {
      return createValidationErrorResponse(
        "The workspace confirmation name does not match.",
      );
    }

    const {
      data:
        membership,
      error:
        membershipError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .select(
          MEMBERSHIP_SELECT,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-membership-load-failed",

        message:
          "CASE Budget could not verify your workspace permissions.",

        detail:
          membershipError.message,
      });
    }

    if (
      !membership ||
      membership.status !==
        "active"
    ) {
      return createForbiddenResponse(
        "You do not have active access to this CASE Budget workspace.",
      );
    }

    const isWorkspaceOwner =
      workspace.owner_user_id ===
        userId ||
      membership.role ===
        "owner";

    if (
      !isWorkspaceOwner
    ) {
      return createForbiddenResponse(
        "Only the workspace owner can delete this workspace.",
      );
    }

    const {
      data:
        activeMemberships,
      error:
        activeMembershipsError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .select(
          USER_ACTIVE_MEMBERSHIP_SELECT,
        )
        .eq(
          "user_id",
          userId,
        )
        .eq(
          "status",
          "active",
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (
      activeMembershipsError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-memberships-load-failed",

        message:
          "CASE Budget could not determine your remaining workspaces.",

        detail:
          activeMembershipsError.message,
      });
    }

    const replacementCandidates =
      (
        activeMemberships ??
        []
      ).filter(
        (
          item,
        ) =>
          item.workspace_id !==
          workspaceId,
      );

    if (
      replacementCandidates.length ===
      0
    ) {
      return createConflictErrorResponse(
        "You cannot delete your last active CASE Budget workspace.",
      );
    }

    let replacementWorkspaceId:
      string | null =
      null;

    for (
      const candidate
      of replacementCandidates
    ) {
      const {
        data:
          candidateWorkspace,
        error:
          candidateWorkspaceError,
      } =
        await admin
          .from(
            "workspaces",
          )
          .select(
            "id,is_active",
          )
          .eq(
            "id",
            candidate.workspace_id,
          )
          .maybeSingle();

      if (
        candidateWorkspaceError
      ) {
        return createDatabaseErrorResponse({
          code:
            "replacement-workspace-load-failed",

          message:
            "CASE Budget could not select a replacement workspace.",

          detail:
            candidateWorkspaceError.message,
        });
      }

      if (
        candidateWorkspace?.is_active
      ) {
        replacementWorkspaceId =
          candidateWorkspace.id;

        break;
      }
    }

    if (
      !replacementWorkspaceId
    ) {
      return createConflictErrorResponse(
        "You must have another active CASE Budget workspace before deleting this one.",
      );
    }

    /*
     * Delete the workspace row first.
     *
     * If related records are protected by foreign-key constraints and
     * cascading deletion is not configured, PostgreSQL will reject this
     * operation before the workspace itself is removed. That is safer
     * than manually deleting membership rows first and potentially
     * leaving a partially deleted workspace.
     */
    const {
      error:
        workspaceDeleteError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .delete()
        .eq(
          "id",
          workspaceId,
        )
        .eq(
          "owner_user_id",
          userId,
        );

    if (
      workspaceDeleteError
    ) {
      return createDatabaseErrorResponse({
        code:
          "workspace-delete-failed",

        message:
          "CASE Budget could not delete the workspace. Related financial records may need to be removed first.",

        detail:
          workspaceDeleteError.message,
      });
    }

    /*
     * Clean up any remaining membership rows if the database does not
     * already remove them through ON DELETE CASCADE.
     */
    const {
      error:
        membershipCleanupError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .delete()
        .eq(
          "workspace_id",
          workspaceId,
        );

    if (
      membershipCleanupError
    ) {
      console.error(
        "[CASE Budget Current Workspace API] Workspace deleted but membership cleanup failed.",
        {
          workspaceId,
          detail:
            membershipCleanupError.message,
        },
      );
    }

    await setActiveWorkspaceCookie(
      replacementWorkspaceId,
    );

    return NextResponse.json<
      ApiResponse<{
        deletedWorkspaceId:
          string;

        activeWorkspaceId:
          string;
      }>
    >(
      {
        success:
          true,

        data: {
          deletedWorkspaceId:
            workspaceId,

          activeWorkspaceId:
            replacementWorkspaceId,
        },

        error:
          null,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    return createWorkspaceApiErrorResponse(
      error,
    );
  }
}

async function setActiveWorkspaceCookie(
  workspaceId:
    string,
) {
  const cookieStore =
    await cookies();

  cookieStore.set(
    CASE_BUDGET_ACTIVE_WORKSPACE_COOKIE,
    workspaceId,
    {
      httpOnly:
        false,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      maxAge:
        ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SECONDS,
    },
  );
}

function isDeleteWorkspaceRequest(
  value:
    unknown,
): value is {
  confirmation:
    string;
} {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  return (
    typeof value.confirmation ===
      "string"
  );
}

function mapWorkspaceSettingsData({
  workspace,
  membership,
  userId,
}: {
  workspace: {
    id:
      string;

    name:
      string;

    slug:
      string;

    workspace_type:
      WorkspaceTypeDatabaseEnum;

    owner_user_id:
      string;

    description:
      string | null;

    logo_url:
      string | null;

    is_active:
      boolean;

    created_at:
      string;

    updated_at:
      string;
  };

  membership: {
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

    created_at:
      string;

    updated_at:
      string;
  };

  userId:
    string;
}): WorkspaceSettingsData {
  return {
    id:
      workspace.id,

    name:
      workspace.name,

    workspaceType:
      workspace.workspace_type,

    description:
      workspace.description,

    logoUrl:
      workspace.logo_url,

    isActive:
      workspace.is_active,

    isOwner:
      workspace.owner_user_id ===
        userId ||
      membership.role ===
        "owner",

    role:
      membership.role,

    membershipStatus:
      membership.status,

    createdAt:
      workspace.created_at,

    updatedAt:
      workspace.updated_at,
  };
}

function createSuccessResponse(
  data: {
    workspace:
      WorkspaceSettingsData;
  },
) {
  return NextResponse.json<
    ApiResponse<{
      workspace:
        WorkspaceSettingsData;
    }>
  >(
    {
      success:
        true,

      data,

      error:
        null,
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

async function readJsonRequestBody(
  request:
    NextRequest,
): Promise<unknown | null> {
  const contentType =
    request.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .includes(
        "application/json",
      )
  ) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isUpdateWorkspaceRequest(
  value:
    unknown,
): value is UpdateWorkspaceRequest {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  if (
    typeof value.name !==
      "string"
  ) {
    return false;
  }

  if (
    !isEditableWorkspaceType(
      value.workspaceType,
    )
  ) {
    return false;
  }

  if (
    value.description !==
      undefined &&
    value.description !==
      null &&
    typeof value.description !==
      "string"
  ) {
    return false;
  }

  return true;
}

function isEditableWorkspaceType(
  value:
    unknown,
): value is EditableWorkspaceType {
  return (
    value ===
      "personal" ||
    value ===
      "household" ||
    value ===
      "business"
  );
}

function normalizeRequiredText(
  value:
    string,
) {
  return value.trim();
}

function normalizeOptionalText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

function createValidationErrorResponse(
  message:
    string,
) {
  return NextResponse.json<
    ApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "invalid-request",

        message,
      },
    },
    {
      status:
        400,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createForbiddenResponse(
  message:
    string,
) {
  return NextResponse.json<
    ApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "forbidden",

        message,
      },
    },
    {
      status:
        403,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createNotFoundResponse() {
  return NextResponse.json<
    ApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "workspace-not-found",

        message:
          "The active CASE Budget workspace could not be found.",
      },
    },
    {
      status:
        404,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createConflictErrorResponse(
  message:
    string,
) {
  return NextResponse.json<
    ApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "workspace-conflict",

        message,
      },
    },
    {
      status:
        409,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createDatabaseErrorResponse({
  code,
  message,
  detail,
}: {
  code:
    string;

  message:
    string;

  detail:
    string;
}) {
  console.error(
    "[CASE Budget Current Workspace API]",
    {
      code,
      message,
      detail,
    },
  );

  return NextResponse.json<
    ApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code,

        message,
      },
    },
    {
      status:
        500,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createWorkspaceApiErrorResponse(
  error:
    unknown,
) {
  if (
    error instanceof
    CaseBudgetServerAuthError
  ) {
    const {
      status,
      body,
    } =
      getCaseBudgetServerAuthErrorResponse(
        error,
      );

    return NextResponse.json<
      ApiErrorResponse
    >(
      {
        success:
          false,

        data:
          null,

        error: {
          code:
            body.error.code,

          message:
            body.error.message,
        },
      },
      {
        status,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  console.error(
    "[CASE Budget Current Workspace API] Unexpected error.",
    serializeUnknownError(
      error,
    ),
  );

  return NextResponse.json<
    ApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "unexpected-error",

        message:
          "CASE Budget could not complete the workspace request.",
      },
    },
    {
      status:
        500,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
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

      stack:
        process.env.NODE_ENV !==
          "production"
          ? error.stack ??
            null
          : null,
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
