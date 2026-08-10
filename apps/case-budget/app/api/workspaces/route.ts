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
  requireCaseBudgetUser,
} from "@/lib/auth/server-auth";
import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type CreateWorkspaceType =
  | "personal"
  | "household"
  | "business";

type CreateWorkspaceRequestBody = {
  name:
    string;

  workspaceType:
    CreateWorkspaceType;

  description?:
    string | null;

  makeActive?:
    boolean;
};

type CreatedWorkspace = {
  id:
    string;

  name:
    string;

  slug:
    string;

  type:
    CreateWorkspaceType;

  description:
    string | null;

  memberCount:
    number;

  isOwner:
    true;

  createdAt:
    string;

  updatedAt:
    string;
};

type WorkspaceInsertRow = {
  id:
    string;

  name:
    string;

  slug:
    string;

  workspace_type:
    CreateWorkspaceType;

  owner_user_id:
    string;

  description:
    string | null;

  logo_url:
    null;

  is_active:
    true;

  created_at:
    string;

  updated_at:
    string;
};

type WorkspaceMembershipInsertRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    "owner";

  status:
    "active";

  invited_by:
    null;

  invited_at:
    null;

  invitation_expires_at:
    null;

  joined_at:
    string;

  suspended_at:
    null;

  suspended_by:
    null;

  suspension_reason:
    null;

  removed_at:
    null;

  removed_by:
    null;

  removal_reason:
    null;

  member_label:
    string;

  created_at:
    string;

  updated_at:
    string;
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

const ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SECONDS =
  60 *
  60 *
  24 *
  365;

/**
 * POST /api/workspaces
 *
 * Creates a new CASE Budget workspace for the authenticated user.
 *
 * Creation includes:
 *
 * 1. A workspaces row.
 * 2. An active owner workspace_members row.
 * 3. Optionally making the new workspace the active workspace.
 *
 * The authenticated user ID is always resolved on the server.
 */
export async function POST(
  request:
    NextRequest,
) {
  let createdWorkspaceId:
    string | null =
    null;

  try {
    const {
      userId,
    } =
      await requireCaseBudgetUser();

    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      !isCreateWorkspaceRequestBody(
        requestBody,
      )
    ) {
      return createValidationErrorResponse(
        "A valid workspace request is required.",
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

    const workspaceType =
      requestBody.workspaceType;

    const makeActive =
      requestBody.makeActive !==
      false;

    const now =
      new Date().toISOString();

    const workspaceId =
      crypto.randomUUID();

    const membershipId =
      crypto.randomUUID();

    createdWorkspaceId =
      workspaceId;

    const slug =
      createWorkspaceSlug({
        name,
        workspaceId,
      });

    const workspaceRow:
      WorkspaceInsertRow = {
      id:
        workspaceId,

      name,

      slug,

      workspace_type:
        workspaceType,

      owner_user_id:
        userId,

      description,

      logo_url:
        null,

      is_active:
        true,

      created_at:
        now,

      updated_at:
        now,
    };

    const membershipRow:
      WorkspaceMembershipInsertRow = {
      id:
        membershipId,

      workspace_id:
        workspaceId,

      user_id:
        userId,

      role:
        "owner",

      status:
        "active",

      invited_by:
        null,

      invited_at:
        null,

      invitation_expires_at:
        null,

      joined_at:
        now,

      suspended_at:
        null,

      suspended_by:
        null,

      suspension_reason:
        null,

      removed_at:
        null,

      removed_by:
        null,

      removal_reason:
        null,

      member_label:
        "Owner",

      created_at:
        now,

      updated_at:
        now,
    };

    const admin =
      createWorkspaceAdminClient();

    const {
      error:
        workspaceInsertError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .insert(
          workspaceRow,
        );

    if (
      workspaceInsertError
    ) {
      createdWorkspaceId =
        null;

      return createDatabaseErrorResponse({
        code:
          "workspace-create-failed",

        message:
          "CASE Budget could not create the workspace.",

        detail:
          workspaceInsertError.message,
      });
    }

    const {
      error:
        membershipInsertError,
    } =
      await admin
        .from(
          "workspace_members",
        )
        .insert(
          membershipRow,
        );

    if (
      membershipInsertError
    ) {
      await rollbackWorkspaceCreation({
        workspaceId,
      });

      createdWorkspaceId =
        null;

      return createDatabaseErrorResponse({
        code:
          "workspace-membership-create-failed",

        message:
          "CASE Budget created the workspace but could not create the owner membership.",

        detail:
          membershipInsertError.message,
      });
    }

    const createdWorkspace:
      CreatedWorkspace = {
      id:
        workspaceId,

      name,

      slug,

      type:
        workspaceType,

      description,

      memberCount:
        1,

      isOwner:
        true,

      createdAt:
        now,

      updatedAt:
        now,
    };

    if (
      makeActive
    ) {
      await setActiveWorkspaceCookie(
        workspaceId,
      );
    }

    createdWorkspaceId =
      null;

    return NextResponse.json<
      ApiResponse<{
        workspace:
          CreatedWorkspace;

        activeWorkspaceId:
          string | null;
      }>
    >(
      {
        success:
          true,

        data: {
          workspace:
            createdWorkspace,

          activeWorkspaceId:
            makeActive
              ? workspaceId
              : null,
        },

        error:
          null,
      },
      {
        status:
          201,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    if (
      createdWorkspaceId
    ) {
      await rollbackWorkspaceCreation({
        workspaceId:
          createdWorkspaceId,
      });
    }

    return createWorkspaceApiErrorResponse(
      error,
    );
  }
}

async function rollbackWorkspaceCreation({
  workspaceId,
}: {
  workspaceId:
    string;
}) {
  try {
    const admin =
      createWorkspaceAdminClient();

    await admin
      .from(
        "workspace_members",
      )
      .delete()
      .eq(
        "workspace_id",
        workspaceId,
      );

    await admin
      .from(
        "workspaces",
      )
      .delete()
      .eq(
        "id",
        workspaceId,
      );
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Workspaces API] Workspace creation rollback failed.",
      serializeUnknownError(
        error,
      ),
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

function isCreateWorkspaceRequestBody(
  value:
    unknown,
): value is CreateWorkspaceRequestBody {
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
    !isCreateWorkspaceType(
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

  if (
    value.makeActive !==
      undefined &&
    typeof value.makeActive !==
      "boolean"
  ) {
    return false;
  }

  return true;
}

function isCreateWorkspaceType(
  value:
    unknown,
): value is CreateWorkspaceType {
  return (
    value ===
      "personal" ||
    value ===
      "household" ||
    value ===
      "business"
  );
}

function createWorkspaceSlug({
  name,
  workspaceId,
}: {
  name:
    string;

  workspaceId:
    string;
}) {
  const baseSlug =
    slugifyWorkspaceName(
      name,
    );

  const uniqueSuffix =
    workspaceId
      .replace(
        /-/g,
        "",
      )
      .slice(
        0,
        10,
      )
      .toLowerCase();

  if (
    !baseSlug
  ) {
    return `workspace-${uniqueSuffix}`;
  }

  const maxBaseLength =
    Math.max(
      1,
      70 -
        uniqueSuffix.length,
    );

  const trimmedBase =
    baseSlug
      .slice(
        0,
        maxBaseLength,
      )
      .replace(
        /-+$/g,
        "",
      );

  return `${trimmedBase}-${uniqueSuffix}`;
}

function slugifyWorkspaceName(
  value:
    string,
) {
  return value
    .normalize(
      "NFKD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
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
    "[CASE Budget Workspaces API]",
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
    "[CASE Budget Workspaces API] Unexpected workspace creation error.",
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
          "CASE Budget could not create the workspace.",
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
