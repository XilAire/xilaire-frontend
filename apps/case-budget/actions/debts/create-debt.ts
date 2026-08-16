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
  CaseBudgetDebtDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isDebtStatus,
  isDebtType,
} from "@/types/debt";

import type {
  CreateDebtData,
  CreateDebtResult,
  DebtData,
} from "@/types/debt";

const DEBTS_PATH =
  "/dashboard/debts";

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

type ValidatedCreateDebt = {
  name:
    string;

  lender:
    string | null;

  type:
    CreateDebtData[
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

type CreateDebtValidationResult =
  | {
      success:
        true;

      value:
        ValidatedCreateDebt;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof CreateDebtData,
            string
          >
        >;
    };

/**
 * Creates one canonical debt record in the currently active CASE Budget
 * workspace.
 *
 * Production rules:
 *
 * - The active workspace is resolved only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The workspace must exist and remain active.
 * - The caller must have an active workspace membership.
 * - Supabase generates the debt UUID.
 * - created_by_user_id and updated_by_user_id always come from auth.
 * - Numeric values are normalized before persistence.
 * - status is derived from current_balance:
 *     current_balance <= 0 => paid-off
 *     current_balance > 0  => active
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function createDebt(
  input:
    CreateDebtData,
): Promise<CreateDebtResult> {
  const validation =
    validateCreateDebt(
      input,
    );

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

  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

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
        .insert({
          workspace_id:
            workspaceId,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

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

          created_at:
            now,

          updated_at:
            now,
        })
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at",
        )
        .single();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Debts] Failed to create debt.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return failure(
        "CASE Budget could not create the debt.",
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
        "[CASE Budget Debts] Created debt row could not be mapped.",
        {
          workspaceId,
          userId,
          debtId:
            row?.id,
        },
      );

      return failure(
        "The debt was created, but CASE Budget could not read the saved record.",
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
      "[CASE Budget Debts] Unexpected create-debt error.",
      error,
    );

    return failure(
      "CASE Budget could not create the debt. Please try again.",
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
      "[CASE Budget Debts] Failed to load workspace while creating debt.",
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
        "Debts cannot be created because this workspace is inactive.",
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
      "[CASE Budget Debts] Failed to verify membership while creating debt.",
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
        "You do not have active access to create debts in this workspace.",
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
        "Viewers cannot create debts in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function validateCreateDebt(
  input:
    CreateDebtData,
): CreateDebtValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof CreateDebtData,
        string
      >
    > = {};

  const name =
    normalizeRequiredText(
      input.name,
    );

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

  const lender =
    normalizeOptionalText(
      input.lender,
    );

  if (
    lender &&
    lender.length >
      160
  ) {
    fieldErrors.lender =
      "Lender must be 160 characters or fewer.";
  }

  if (
    !isDebtType(
      input.type,
    )
  ) {
    fieldErrors.type =
      "Select a valid debt type.";
  }

  const originalBalance =
    normalizeNonNegativeMoney(
      input.originalBalance,
    );

  if (
    originalBalance ===
      null
  ) {
    fieldErrors.originalBalance =
      "Original balance must be zero or greater.";
  }

  const currentBalance =
    input.currentBalance ===
      undefined
      ? originalBalance
      : normalizeNonNegativeMoney(
          input.currentBalance,
        );

  if (
    currentBalance ===
      null
  ) {
    fieldErrors.currentBalance =
      "Current balance must be zero or greater.";
  }

  const interestRate =
    input.interestRate ===
      undefined
      ? 0
      : normalizeNonNegativeNumber(
          input.interestRate,
        );

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

  const minimumPayment =
    input.minimumPayment ===
      undefined
      ? 0
      : normalizeNonNegativeMoney(
          input.minimumPayment,
        );

  if (
    minimumPayment ===
      null
  ) {
    fieldErrors.minimumPayment =
      "Minimum payment must be zero or greater.";
  }

  const dueDay =
    input.dueDay ===
      undefined
      ? null
      : normalizeDueDay(
          input.dueDay,
        );

  if (
    input.dueDay !==
      undefined &&
    dueDay ===
      null
  ) {
    fieldErrors.dueDay =
      "Due day must be between 1 and 31.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !name ||
    !isDebtType(
      input.type,
    ) ||
    originalBalance ===
      null ||
    currentBalance ===
      null ||
    interestRate ===
      null ||
    minimumPayment ===
      null
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
      : "active";

  return {
    success:
      true,

    value: {
      name,

      lender,

      type:
        input.type,

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

function failure(
  message:
    string,
): CreateDebtResult {
  return {
    success:
      false,

    error:
      message,
  };
}
