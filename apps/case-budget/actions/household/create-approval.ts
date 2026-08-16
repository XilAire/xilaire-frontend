"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  Json,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isHouseholdApprovalType,
  type CreateHouseholdApprovalInput,
  type CreateHouseholdApprovalResult,
  type HouseholdApprovalActorRole,
  type HouseholdApprovalRequest,
  type HouseholdApprovalTargetReference,
  type HouseholdApprovalType,
} from "@/types/household/household-approval";

type WorkspaceRow = {
  id:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type WorkspaceMembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    WorkspaceRoleDatabaseEnum;

  status:
    string;
};

type InsertedApprovalRow = {
  id:
    string;

  workspace_id:
    string;

  approval_type:
    string;

  status:
    string;

  title:
    string;

  description:
    string;

  amount:
    number | string | null;

  requested_by_user_id:
    string;

  requested_by_role:
    string | null;

  requested_at:
    string;

  target_entity_type:
    string | null;

  target_entity_id:
    string | null;

  payload:
    unknown;

  decision_by_user_id:
    string | null;

  decision_by_role:
    string | null;

  decision:
    string | null;

  decision_reason:
    string | null;

  decided_at:
    string | null;

  cancelled_by_user_id:
    string | null;

  cancelled_at:
    string | null;

  cancellation_reason:
    string | null;

  expires_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

const HOUSEHOLD_APPROVALS_PATH =
  "/dashboard/household/approvals";

const HOUSEHOLD_ACTIVITY_PATH =
  "/dashboard/household/activity";

const DASHBOARD_PATH =
  "/dashboard";

const TITLE_MAX_LENGTH =
  160;

const DESCRIPTION_MAX_LENGTH =
  1000;

const TARGET_ENTITY_TYPE_MAX_LENGTH =
  120;

const TARGET_ENTITY_ID_MAX_LENGTH =
  240;

/**
 * Creates a pending household approval request inside the currently active
 * CASE Budget workspace.
 *
 * Security model:
 *
 * - The authenticated user and active workspace are resolved server-side.
 * - The client does not provide workspace_id.
 * - The caller must have an active workspace membership.
 * - The requester's role is resolved from workspace membership and stored
 *   server-side.
 * - Ownership is determined using both workspaces.owner_user_id and the
 *   membership row.
 * - Approval requests are always created with status = "pending".
 *
 * IMPORTANT:
 *
 * payload may describe the protected action, but creating an approval request
 * does NOT execute that action.
 *
 * The eventual approval decision action must re-validate the protected
 * operation before execution instead of blindly trusting this JSON payload.
 */
export async function createHouseholdApproval(
  input:
    CreateHouseholdApprovalInput,
): Promise<CreateHouseholdApprovalResult> {
  try {
    const approvalType =
      normalizeApprovalType(
        input.type,
      );

    if (
      !approvalType
    ) {
      return failure({
        code:
          "invalid-type",

        message:
          "Select a valid approval request type.",

        field:
          "type",
      });
    }

    const title =
      normalizeOptionalText(
        input.title,
      );

    if (
      !title
    ) {
      return failure({
        code:
          "invalid-title",

        message:
          "Enter a title for this approval request.",

        field:
          "title",
      });
    }

    if (
      title.length >
      TITLE_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-title",

        message:
          `Approval title must be ${TITLE_MAX_LENGTH} characters or fewer.`,

        field:
          "title",
      });
    }

    const description =
      normalizeOptionalText(
        input.description,
      );

    if (
      !description
    ) {
      return failure({
        code:
          "invalid-description",

        message:
          "Enter a description for this approval request.",

        field:
          "description",
      });
    }

    if (
      description.length >
      DESCRIPTION_MAX_LENGTH
    ) {
      return failure({
        code:
          "invalid-description",

        message:
          `Approval description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,

        field:
          "description",
      });
    }

    const amountResult =
      normalizeAmount(
        input.amount,
      );

    if (
      !amountResult.success
    ) {
      return failure({
        code:
          "invalid-amount",

        message:
          amountResult.message,

        field:
          "amount",
      });
    }

    const targetResult =
      normalizeTarget(
        input.target,
      );

    if (
      !targetResult.success
    ) {
      return failure({
        code:
          "invalid-target",

        message:
          targetResult.message,

        field:
          "target",
      });
    }

    const expirationResult =
      normalizeExpiration(
        input.expiresAt,
      );

    if (
      !expirationResult.success
    ) {
      return failure({
        code:
          "invalid-expiration",

        message:
          expirationResult.message,

        field:
          "expiresAt",
      });
    }

    const payloadResult =
      normalizePayload(
        input.payload,
      );

    if (
      !payloadResult.success
    ) {
      return failure({
        code:
          "invalid-target",

        message:
          payloadResult.message,

        field:
          "target",
      });
    }

    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const admin =
      createWorkspaceAdminClient();

    /**
     * Verify the active workspace still exists and remains active.
     */
    const {
      data:
        workspaceData,
      error:
        workspaceError,
    } =
      await admin
        .from(
          "workspaces",
        )
        .select(
          "id,owner_user_id,is_active",
        )
        .eq(
          "id",
          workspaceId,
        )
        .maybeSingle();

    if (
      workspaceError
    ) {
      console.error(
        "[CASE Budget Household Approval Create] Failed to load active workspace.",
        {
          workspaceId,

          userId,

          error:
            workspaceError,
        },
      );

      return failure({
        code:
          "workspace-not-found",

        message:
          "CASE Budget could not load the active workspace.",
      });
    }

    const workspace =
      workspaceData as unknown as
        | WorkspaceRow
        | null;

    if (
      !workspace
    ) {
      return failure({
        code:
          "workspace-not-found",

        message:
          "The active CASE Budget workspace could not be found.",
      });
    }

    if (
      !workspace.is_active
    ) {
      return failure({
        code:
          "workspace-inactive",

        message:
          "Approval requests cannot be created in an inactive workspace.",
      });
    }

    /**
     * Verify the caller is an active member of the workspace.
     *
     * All active roles may create approval requests:
     *
     * - owner
     * - admin
     * - member
     * - viewer
     *
     * Whether the user is allowed to attempt a specific protected operation
     * remains the responsibility of that operation's server-side workflow.
     */
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
          "id,workspace_id,user_id,role,status",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "user_id",
          userId,
        )
        .eq(
          "status",
          "active",
        )
        .maybeSingle();

    if (
      membershipError
    ) {
      console.error(
        "[CASE Budget Household Approval Create] Failed to verify requester membership.",
        {
          workspaceId,

          userId,

          error:
            membershipError,
        },
      );

      return failure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not verify your workspace permissions.",
      });
    }

    const membership =
      membershipData as unknown as
        | WorkspaceMembershipRow
        | null;

    if (
      !membership
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "You must be an active workspace member to create an approval request.",
      });
    }

    const requesterRole =
      resolveRequesterRole({
        workspaceOwnerUserId:
          workspace.owner_user_id,

        userId,

        membershipRole:
          membership.role,
      });

    if (
      !requesterRole
    ) {
      return failure({
        code:
          "permission-denied",

        message:
          "CASE Budget could not determine your workspace role.",
      });
    }

    const now =
      new Date().toISOString();

    const approvalId =
      crypto.randomUUID();

    const {
      data:
        insertedApprovalData,
      error:
        insertError,
    } =
      await admin
        .from(
          "case_budget_household_approvals",
        )
        .insert({
          id:
            approvalId,

          workspace_id:
            workspaceId,

          approval_type:
            approvalType,

          status:
            "pending",

          title,

          description,

          amount:
            amountResult.amount,

          requested_by_user_id:
            userId,

          requested_by_role:
            requesterRole,

          requested_at:
            now,

          target_entity_type:
            targetResult.target
              ?.entityType ??
            null,

          target_entity_id:
            targetResult.target
              ?.entityId ??
            null,

          payload:
            payloadResult.payload,

          decision_by_user_id:
            null,

          decision_by_role:
            null,

          decision:
            null,

          decision_reason:
            null,

          decided_at:
            null,

          cancelled_by_user_id:
            null,

          cancelled_at:
            null,

          cancellation_reason:
            null,

          expires_at:
            expirationResult.expiresAt,

          created_at:
            now,

          updated_at:
            now,
        })
        .select(
          "id,workspace_id,approval_type,status,title,description,amount,requested_by_user_id,requested_by_role,requested_at,target_entity_type,target_entity_id,payload,decision_by_user_id,decision_by_role,decision,decision_reason,decided_at,cancelled_by_user_id,cancelled_at,cancellation_reason,expires_at,created_at,updated_at",
        )
        .maybeSingle();

    if (
      insertError
    ) {
      console.error(
        "[CASE Budget Household Approval Create] Failed to create approval request.",
        {
          workspaceId,

          userId,

          approvalType,

          error:
            insertError,
        },
      );

      return failure({
        code:
          "request-create-failed",

        message:
          "CASE Budget could not create the approval request.",
      });
    }

    if (
      !insertedApprovalData
    ) {
      console.error(
        "[CASE Budget Household Approval Create] Approval insert returned no row.",
        {
          approvalId,

          workspaceId,

          userId,

          approvalType,
        },
      );

      return failure({
        code:
          "request-create-failed",

        message:
          "CASE Budget created the request but could not verify the approval record.",
      });
    }

    const approval =
      parseInsertedApproval({
        row:
          insertedApprovalData as unknown as InsertedApprovalRow,

        requesterRole,
      });

    if (
      !approval
    ) {
      console.error(
        "[CASE Budget Household Approval Create] Created approval could not be parsed.",
        {
          approvalId,

          workspaceId,

          userId,
        },
      );

      return failure({
        code:
          "request-create-failed",

        message:
          "CASE Budget created the request but could not verify the approval details.",
      });
    }

    revalidateApprovalPaths();

    return {
      success:
        true,

      approval,

      error:
        null,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return failure({
        code:
          error.code ===
          "workspace-required"
            ? "workspace-not-found"
            : "permission-denied",

        message:
          error.message,
      });
    }

    console.error(
      "[CASE Budget Household Approval Create] Unexpected approval creation error.",
      error,
    );

    return failure({
      code:
        "unexpected-error",

      message:
        "CASE Budget could not create the household approval request. Please try again.",
    });
  }
}

function parseInsertedApproval({
  row,
  requesterRole,
}: {
  row:
    InsertedApprovalRow;

  requesterRole:
    HouseholdApprovalActorRole;
}): HouseholdApprovalRequest | null {
  const id =
    normalizeOptionalText(
      row.id,
    );

  const workspaceId =
    normalizeOptionalText(
      row.workspace_id,
    );

  const type =
    normalizeApprovalType(
      row.approval_type,
    );

  const title =
    normalizeOptionalText(
      row.title,
    );

  const description =
    normalizeOptionalText(
      row.description,
    );

  const requestedByUserId =
    normalizeOptionalText(
      row.requested_by_user_id,
    );

  const requestedAt =
    normalizeIsoDate(
      row.requested_at,
    );

  const createdAt =
    normalizeIsoDate(
      row.created_at,
    );

  const updatedAt =
    normalizeIsoDate(
      row.updated_at,
    );

  if (
    !id ||
    !workspaceId ||
    !type ||
    row.status !==
      "pending" ||
    !title ||
    !description ||
    !requestedByUserId ||
    !requestedAt ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  const target =
    parseStoredTarget({
      entityType:
        row.target_entity_type,

      entityId:
        row.target_entity_id,
    });

  return {
    id,

    workspaceId,

    type,

    status:
      "pending",

    title,

    description,

    amount:
      parseStoredAmount(
        row.amount,
      ),

    requestedByUserId,

    requestedByName:
      null,

    requestedByRole:
      requesterRole,

    requestedAt,

    target,

    payload:
      parseStoredPayload(
        row.payload,
      ),

    decisionByUserId:
      null,

    decisionByName:
      null,

    decisionByRole:
      null,

    decision:
      null,

    decisionReason:
      null,

    decidedAt:
      null,

    cancelledByUserId:
      null,

    cancelledAt:
      null,

    cancellationReason:
      null,

    expiresAt:
      normalizeNullableIsoDate(
        row.expires_at,
      ),

    createdAt,

    updatedAt,
  };
}

function resolveRequesterRole({
  workspaceOwnerUserId,
  userId,
  membershipRole,
}: {
  workspaceOwnerUserId:
    string;

  userId:
    string;

  membershipRole:
    WorkspaceRoleDatabaseEnum;
}): HouseholdApprovalActorRole | null {
  if (
    workspaceOwnerUserId ===
      userId
  ) {
    return "owner";
  }

  switch (
    membershipRole
  ) {
    case "owner":
    case "admin":
    case "member":
    case "viewer":
      return membershipRole;

    default:
      return null;
  }
}

function normalizeApprovalType(
  value:
    unknown,
): HouseholdApprovalType | null {
  return isHouseholdApprovalType(
    value,
  )
    ? value
    : null;
}

function normalizeAmount(
  value:
    unknown,
):
  | {
      success:
        true;

      amount:
        number | null;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return {
      success:
        true,

      amount:
        null,
    };
  }

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return {
      success:
        false,

      message:
        "Approval amount must be a valid number.",
    };
  }

  if (
    value <
    0
  ) {
    return {
      success:
        false,

      message:
        "Approval amount cannot be negative.",
    };
  }

  return {
    success:
      true,

    amount:
      roundCurrencyAmount(
        value,
      ),
  };
}

function normalizeTarget(
  value:
    HouseholdApprovalTargetReference | null | undefined,
):
  | {
      success:
        true;

      target:
        HouseholdApprovalTargetReference | null;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return {
      success:
        true,

      target:
        null,
    };
  }

  const entityType =
    normalizeOptionalText(
      value.entityType,
    );

  const entityId =
    normalizeOptionalText(
      value.entityId,
    );

  if (
    !entityType ||
    !entityId
  ) {
    return {
      success:
        false,

      message:
        "Approval targets require both an entity type and entity ID.",
    };
  }

  if (
    entityType.length >
    TARGET_ENTITY_TYPE_MAX_LENGTH
  ) {
    return {
      success:
        false,

      message:
        `Approval target type must be ${TARGET_ENTITY_TYPE_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (
    entityId.length >
    TARGET_ENTITY_ID_MAX_LENGTH
  ) {
    return {
      success:
        false,

      message:
        `Approval target ID must be ${TARGET_ENTITY_ID_MAX_LENGTH} characters or fewer.`,
    };
  }

  return {
    success:
      true,

    target: {
      entityType,

      entityId,
    },
  };
}

function normalizeExpiration(
  value:
    string | null | undefined,
):
  | {
      success:
        true;

      expiresAt:
        string | null;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    value ===
      undefined ||
    value ===
      null ||
    !value.trim()
  ) {
    return {
      success:
        true,

      expiresAt:
        null,
    };
  }

  const parsed =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      parsed,
    )
  ) {
    return {
      success:
        false,

      message:
        "Approval expiration must be a valid date and time.",
    };
  }

  if (
    parsed <=
    Date.now()
  ) {
    return {
      success:
        false,

      message:
        "Approval expiration must be in the future.",
    };
  }

  return {
    success:
      true,

    expiresAt:
      new Date(
        parsed,
      ).toISOString(),
  };
}

function normalizePayload(
  value:
    Record<
      string,
      unknown
    > | null | undefined,
):
  | {
      success:
        true;

      payload:
        Json | null;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return {
      success:
        true,

      payload:
        null,
    };
  }

  try {
    const serialized =
      JSON.stringify(
        value,
      );

    if (
      serialized ===
      undefined
    ) {
      return {
        success:
          false,

        message:
          "Approval payload could not be serialized.",
      };
    }

    const parsed =
      JSON.parse(
        serialized,
      ) as Json;

    return {
      success:
        true,

      payload:
        parsed,
    };
  } catch {
    return {
      success:
        false,

      message:
        "Approval payload must contain JSON-compatible values.",
    };
  }
}

function parseStoredTarget({
  entityType,
  entityId,
}: {
  entityType:
    unknown;

  entityId:
    unknown;
}): HouseholdApprovalTargetReference | null {
  const normalizedEntityType =
    normalizeOptionalText(
      entityType,
    );

  const normalizedEntityId =
    normalizeOptionalText(
      entityId,
    );

  if (
    !normalizedEntityType ||
    !normalizedEntityId
  ) {
    return null;
  }

  return {
    entityType:
      normalizedEntityType,

    entityId:
      normalizedEntityId,
  };
}

function parseStoredPayload(
  value:
    unknown,
): Record<
  string,
  unknown
> | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function parseStoredAmount(
  value:
    unknown,
): number | null {
  if (
    typeof value ===
      "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }

  if (
    typeof value ===
      "string"
  ) {
    const normalized =
      value.trim();

    if (
      !normalized
    ) {
      return null;
    }

    const parsed =
      Number(
        normalized,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
}

function roundCurrencyAmount(
  value:
    number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function normalizeIsoDate(
  value:
    unknown,
): string | null {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized
  ) {
    return null;
  }

  const timestamp =
    Date.parse(
      normalized,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return null;
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function normalizeNullableIsoDate(
  value:
    unknown,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeIsoDate(
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

function revalidateApprovalPaths() {
  revalidatePath(
    HOUSEHOLD_APPROVALS_PATH,
  );

  revalidatePath(
    HOUSEHOLD_ACTIVITY_PATH,
  );

  revalidatePath(
    DASHBOARD_PATH,
  );
}

function failure({
  code,
  message,
  field,
}: {
  code:
    Extract<
      CreateHouseholdApprovalResult,
      {
        success:
          false;
      }
    >["error"]["code"];

  message:
    string;

  field?:
    Extract<
      CreateHouseholdApprovalResult,
      {
        success:
          false;
      }
    >["error"]["field"];
}): CreateHouseholdApprovalResult {
  return {
    success:
      false,

    approval:
      null,

    error: {
      code,

      message,

      ...(field
        ? {
            field,
          }
        : {}),
    },
  };
}