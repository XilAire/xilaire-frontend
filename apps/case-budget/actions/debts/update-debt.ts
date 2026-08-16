"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";


import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetDebtDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isDebtStatus,
  isDebtType,
} from "@/types/debt";

import type {
  DebtData,
  UpdateDebtData,
  UpdateDebtResult,
} from "@/types/debt";

const DEBTS_PATH =
  "/dashboard/debts";

export type UpdateDebtInput = {
  debtId:
    string;

  updates:
    UpdateDebtData;
};

type WorkspaceRow = {
  id:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type MembershipRow = {
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
};

type ValidatedDebtState = {
  name:
    string;

  lender:
    string | null;

  type:
    DebtData[
      "type"
    ];

  originalBalance:
    number;

  currentBalance:
    number;

  interestRate:
    number;

  minimumPayment:
    number;

  dueDay:
    number | null;

  status:
    DebtData[
      "status"
    ];
};

type DebtValidationResult =
  | {
      success:
        true;

      value:
        ValidatedDebtState;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof UpdateDebtData,
            string
          >
        >;
    };

/**
 * Updates one canonical debt record in the currently active CASE Budget
 * workspace.
 *
 * Production rules:
 *
 * - The active workspace comes only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The requested debt is loaded by BOTH id and workspace_id.
 * - The caller must have an active non-viewer membership.
 * - Immutable database ownership/audit identity fields cannot be changed by
 *   the client.
 * - Only fields present in input.updates replace existing values.
 * - Empty lender text intentionally clears lender.
 * - current_balance <= 0 always produces status = "paid-off".
 * - A positive balance preserves the requested status when valid, otherwise
 *   the existing status is preserved.
 * - updated_at optimistic concurrency prevents a stale edit from silently
 *   overwriting a newer server-side change.
 * - The UPDATE is constrained by id, workspace_id, and the previously loaded
 *   updated_at value.
 * - Supabase remains the only persistence layer.
 * - No localStorage is read or written.
 */
export async function updateDebt(
  input:
    UpdateDebtInput,
): Promise<UpdateDebtResult> {
  const debtId =
    normalizeRequiredText(
      input.debtId,
    );

  if (
    !debtId
  ) {
    return failure(
      "A debt is required.",
    );
  }

  if (
    !input.updates ||
    typeof input.updates !==
      "object" ||
    Array.isArray(
      input.updates,
    )
  ) {
    return failure(
      "Debt changes are required.",
    );
  }

  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "debts",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure(
        getDebtPayoffFeatureAccessMessage({
          reason:
            featureAccess.access.reason,

          requiredPlan:
            featureAccess.access.requiredPlan,
        }),
      );
    }


    const workspaceResult =
      await loadWorkspace({
        workspaceId,
      });

    if (
      !workspaceResult.success
    ) {
      return failure(
        workspaceResult.message,
      );
    }

    const membershipResult =
      await loadMembership({
        workspaceId,
        userId,
      });

    if (
      !membershipResult.success
    ) {
      return failure(
        membershipResult.message,
      );
    }

    const existingResult =
      await loadDebt({
        workspaceId,
        debtId,
      });

    if (
      !existingResult.success
    ) {
      return failure(
        existingResult.message,
      );
    }

    const existingRow =
      existingResult.row;

    const existingDebt =
      mapDebtRow({
        row:
          existingRow,
        workspaceId,
      });

    if (
      !existingDebt
    ) {
      console.error(
        "[CASE Budget Debts] Existing debt could not be mapped before update.",
        {
          workspaceId,
          userId,
          debtId,
        },
      );

      return failure(
        "CASE Budget could not read the existing debt.",
      );
    }

    const validation =
      validateMergedDebt({
        existing:
          existingDebt,
        updates:
          input.updates,
      });

    if (
      !validation.success
    ) {
      return {
        success:
          false,

        error:
          "Review the debt details and try again.",

        fieldErrors:
          validation.fieldErrors,
      };
    }

    const validated =
      validation.value;

    const now =
      new Date().toISOString();

    const admin =
      createWorkspaceAdminClient();

    const {
      data,
      error,
    } =
      await admin
        .from(
          "case_budget_debts",
        )
        .update({
          name:
            validated.name,

          lender:
            validated.lender,

          debt_type:
            validated.type,

          original_balance:
            validated.originalBalance,

          current_balance:
            validated.currentBalance,

          interest_rate:
            validated.interestRate,

          minimum_payment:
            validated.minimumPayment,

          due_day:
            validated.dueDay,

          status:
            validated.status,

          updated_by_user_id:
            userId,

          updated_at:
            now,
        })
        .eq(
          "id",
          debtId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "updated_at",
          existingRow.updated_at,
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at",
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Debts] Failed to update debt.",
        {
          workspaceId,
          userId,
          debtId,
          error,
        },
      );

      return failure(
        "CASE Budget could not update the debt.",
      );
    }

    if (
      !data
    ) {
      const conflictResult =
        await determineUpdateConflict({
          workspaceId,
          debtId,
          expectedUpdatedAt:
            existingRow.updated_at,
        });

      return failure(
        conflictResult,
      );
    }

    const row =
      data as unknown as
        CaseBudgetDebtDatabaseRow;

    const debt =
      mapDebtRow({
        row,
        workspaceId,
      });

    if (
      !debt
    ) {
      console.error(
        "[CASE Budget Debts] Updated debt row could not be mapped.",
        {
          workspaceId,
          userId,
          debtId,
        },
      );

      return failure(
        "The debt was updated, but CASE Budget could not read the saved record.",
      );
    }

    revalidatePath(
      DEBTS_PATH,
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success:
        true,

      debt,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return failure(
        error.message,
      );
    }

    console.error(
      "[CASE Budget Debts] Unexpected update-debt error.",
      error,
    );

    return failure(
      "CASE Budget could not update the debt. Please try again.",
    );
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId:
    string;
}):
  Promise<
    | {
        success:
          true;

        workspace:
          WorkspaceRow;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
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
    error
  ) {
    console.error(
      "[CASE Budget Debts] Failed to load workspace while updating debt.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the active workspace.",
    };
  }

  const workspace =
    data as unknown as
      | WorkspaceRow
      | null;

  if (
    !workspace
  ) {
    return {
      success:
        false,

      message:
        "The active CASE Budget workspace could not be found.",
    };
  }

  if (
    !workspace.is_active
  ) {
    return {
      success:
        false,

      message:
        "Debts cannot be updated because this workspace is inactive.",
    };
  }

  return {
    success:
      true,

    workspace,
  };
}

async function loadMembership({
  workspaceId,
  userId,
}: {
  workspaceId:
    string;

  userId:
    string;
}):
  Promise<
    | {
        success:
          true;

        membership:
          MembershipRow;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
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
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Debts] Failed to verify membership while updating debt.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not verify your workspace access.",
    };
  }

  const membership =
    data as unknown as
      | MembershipRow
      | null;

  if (
    !membership ||
    membership.status !==
      "active"
  ) {
    return {
      success:
        false,

      message:
        "You do not have active access to update debts in this workspace.",
    };
  }

  if (
    membership.role ===
      "viewer"
  ) {
    return {
      success:
        false,

      message:
        "Viewers cannot update debts in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

async function loadDebt({
  workspaceId,
  debtId,
}: {
  workspaceId:
    string;

  debtId:
    string;
}):
  Promise<
    | {
        success:
          true;

        row:
          CaseBudgetDebtDatabaseRow;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "case_budget_debts",
      )
      .select(
        "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at",
      )
      .eq(
        "id",
        debtId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Debts] Failed to load debt before update.",
      {
        workspaceId,
        debtId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the debt.",
    };
  }

  const row =
    data as unknown as
      | CaseBudgetDebtDatabaseRow
      | null;

  if (
    !row
  ) {
    return {
      success:
        false,

      message:
        "The debt could not be found in the active workspace.",
    };
  }

  return {
    success:
      true,

    row,
  };
}

async function determineUpdateConflict({
  workspaceId,
  debtId,
  expectedUpdatedAt,
}: {
  workspaceId:
    string;

  debtId:
    string;

  expectedUpdatedAt:
    string;
}): Promise<string> {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "case_budget_debts",
      )
      .select(
        "id,updated_at",
      )
      .eq(
        "id",
        debtId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Debts] Failed to verify update conflict.",
      {
        workspaceId,
        debtId,
        error,
      },
    );

    return "The debt could not be updated. Refresh the page and try again.";
  }

  const current =
    data as unknown as
      | {
          id:
            string;

          updated_at:
            string;
        }
      | null;

  if (
    !current
  ) {
    return "The debt no longer exists in the active workspace.";
  }

  if (
    current.updated_at !==
    expectedUpdatedAt
  ) {
    return "This debt changed while you were editing it. Refresh the page and try again.";
  }

  return "The debt could not be updated. Refresh the page and try again.";
}

function validateMergedDebt({
  existing,
  updates,
}: {
  existing:
    DebtData;

  updates:
    UpdateDebtData;
}): DebtValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof UpdateDebtData,
        string
      >
    > = {};

  const hasName =
    hasOwn(
      updates,
      "name",
    );

  const name =
    hasName
      ? normalizeRequiredText(
          updates.name,
        )
      : existing.name;

  if (
    !name
  ) {
    fieldErrors.name =
      "Debt name is required.";
  } else if (
    name.length >
      120
  ) {
    fieldErrors.name =
      "Debt name must be 120 characters or fewer.";
  }

  const hasLender =
    hasOwn(
      updates,
      "lender",
    );

  const lender =
    hasLender
      ? normalizeOptionalText(
          updates.lender,
        )
      : existing.lender ??
        null;

  if (
    lender &&
    lender.length >
      160
  ) {
    fieldErrors.lender =
      "Lender must be 160 characters or fewer.";
  }

  const hasType =
    hasOwn(
      updates,
      "type",
    );

  const type =
    hasType
      ? updates.type
      : existing.type;

  if (
    !isDebtType(
      type,
    )
  ) {
    fieldErrors.type =
      "Select a valid debt type.";
  }

  const hasOriginalBalance =
    hasOwn(
      updates,
      "originalBalance",
    );

  const originalBalance =
    hasOriginalBalance
      ? normalizeNonNegativeMoney(
          updates.originalBalance,
        )
      : existing.originalBalance;

  if (
    originalBalance ===
      null
  ) {
    fieldErrors.originalBalance =
      "Original balance must be zero or greater.";
  }

  const hasCurrentBalance =
    hasOwn(
      updates,
      "currentBalance",
    );

  const currentBalance =
    hasCurrentBalance
      ? normalizeNonNegativeMoney(
          updates.currentBalance,
        )
      : existing.currentBalance;

  if (
    currentBalance ===
      null
  ) {
    fieldErrors.currentBalance =
      "Current balance must be zero or greater.";
  }

  const hasInterestRate =
    hasOwn(
      updates,
      "interestRate",
    );

  const interestRate =
    hasInterestRate
      ? normalizeNonNegativeNumber(
          updates.interestRate,
        )
      : existing.interestRate;

  if (
    interestRate ===
      null
  ) {
    fieldErrors.interestRate =
      "Interest rate must be zero or greater.";
  } else if (
    interestRate >
      1000
  ) {
    fieldErrors.interestRate =
      "Interest rate must be 1,000% or less.";
  }

  const hasMinimumPayment =
    hasOwn(
      updates,
      "minimumPayment",
    );

  const minimumPayment =
    hasMinimumPayment
      ? normalizeNonNegativeMoney(
          updates.minimumPayment,
        )
      : existing.minimumPayment;

  if (
    minimumPayment ===
      null
  ) {
    fieldErrors.minimumPayment =
      "Minimum payment must be zero or greater.";
  }

  const hasDueDay =
    hasOwn(
      updates,
      "dueDay",
    );

  const dueDay =
    hasDueDay
      ? (
          updates.dueDay ===
            undefined
            ? null
            : normalizeDueDay(
                updates.dueDay,
              )
        )
      : existing.dueDay ??
        null;

  if (
    hasDueDay &&
    updates.dueDay !==
      undefined &&
    dueDay ===
      null
  ) {
    fieldErrors.dueDay =
      "Due day must be between 1 and 31.";
  }

  const hasRequestedStatus =
    hasOwn(
      updates,
      "status",
    );

  const requestedStatus =
    hasRequestedStatus
      ? updates.status
      : existing.status;

  if (
    !isDebtStatus(
      requestedStatus,
    )
  ) {
    fieldErrors.status =
      "Select a valid debt status.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !name ||
    !isDebtType(
      type,
    ) ||
    originalBalance ===
      null ||
    currentBalance ===
      null ||
    interestRate ===
      null ||
    minimumPayment ===
      null ||
    !isDebtStatus(
      requestedStatus,
    )
  ) {
    return {
      success:
        false,

      fieldErrors,
    };
  }

  const status:
    DebtData[
      "status"
    ] =
    currentBalance <=
      0
      ? "paid-off"
      : requestedStatus;

  return {
    success:
      true,

    value: {
      name,

      lender,

      type,

      originalBalance,

      currentBalance,

      interestRate,

      minimumPayment,

      dueDay,

      status,
    },
  };
}

function mapDebtRow({
  row,
  workspaceId,
}: {
  row:
    CaseBudgetDebtDatabaseRow;

  workspaceId:
    string;
}): DebtData | null {
  if (
    row.workspace_id !==
    workspaceId
  ) {
    return null;
  }

  const name =
    normalizeRequiredText(
      row.name,
    );

  if (
    !name ||
    !isDebtType(
      row.debt_type,
    ) ||
    !isDebtStatus(
      row.status,
    )
  ) {
    return null;
  }

  const originalBalance =
    normalizeNonNegativeMoney(
      row.original_balance,
    );

  const currentBalance =
    normalizeNonNegativeMoney(
      row.current_balance,
    );

  const interestRate =
    normalizeNonNegativeNumber(
      row.interest_rate,
    );

  const minimumPayment =
    normalizeNonNegativeMoney(
      row.minimum_payment,
    );

  if (
    originalBalance ===
      null ||
    currentBalance ===
      null ||
    interestRate ===
      null ||
    minimumPayment ===
      null
  ) {
    return null;
  }

  const dueDay =
    normalizeOptionalDueDay(
      row.due_day,
    );

  if (
    row.due_day !==
      null &&
    dueDay ===
      null
  ) {
    return null;
  }

  const lender =
    normalizeOptionalText(
      row.lender,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      row.updated_at,
    );

  if (
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id:
      row.id,

    name,

    ...(lender
      ? {
          lender,
        }
      : {}),

    type:
      row.debt_type,

    originalBalance,

    currentBalance,

    interestRate,

    minimumPayment,

    ...(dueDay !==
      null
      ? {
          dueDay,
        }
      : {}),

    status:
      row.status,

    createdAt,

    updatedAt,
  };
}

function hasOwn<
  ObjectType extends object,
  Key extends PropertyKey,
>(
  value:
    ObjectType,
  key:
    Key,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key,
  );
}

function normalizeRequiredText(
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

function normalizeOptionalText(
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

  return normalizeRequiredText(
    value,
  );
}

function normalizeFiniteNumber(
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

function normalizeNonNegativeNumber(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeFiniteNumber(
      value,
    );

  if (
    normalized ===
      null ||
    normalized <
      0
  ) {
    return null;
  }

  return normalized;
}

function normalizeNonNegativeMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeNonNegativeNumber(
      value,
    );

  return normalized ===
    null
    ? null
    : roundMoney(
        normalized,
      );
}

function normalizeDueDay(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeFiniteNumber(
      value,
    );

  if (
    normalized ===
      null ||
    !Number.isInteger(
      normalized,
    ) ||
    normalized <
      1 ||
    normalized >
      31
  ) {
    return null;
  }

  return normalized;
}

function normalizeOptionalDueDay(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeDueDay(
    value,
  );
}

function roundMoney(
  value:
    number,
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}


function getDebtPayoffFeatureAccessMessage({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  switch (
    reason
  ) {
    case "inactive-subscription":
      return "Debt payoff is unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Debt payoff requires the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Debt payoff requires the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Debt payoff requires the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Debt payoff requires the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Debt payoff is not available for the current workspace subscription.";
    }
  }
}

function failure(
  message:
    string,
): UpdateDebtResult {
  return {
    success:
      false,

    error:
      message,
  };
}
