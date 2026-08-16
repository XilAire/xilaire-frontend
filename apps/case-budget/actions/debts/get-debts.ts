"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetDebtDatabaseRow,
  CaseBudgetDebtPaymentDatabaseRow,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isDebtStatus,
  isDebtType,
} from "@/types/debt";

import type {
  DebtData,
  DebtPaymentData,
  GetDebtsResult,
} from "@/types/debt";

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

/**
 * Loads canonical debt records and debt-payment history for the currently
 * active CASE Budget workspace.
 *
 * Production rules:
 *
 * - The active workspace comes from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The workspace must exist and remain active.
 * - The caller must have an active membership in the workspace.
 * - Every debt query is explicitly filtered by workspace_id.
 * - Every debt-payment query is explicitly filtered by workspace_id.
 * - Invalid database rows are skipped rather than leaking malformed data into
 *   the client domain model.
 * - Supabase is the only persistence source.
 * - No localStorage is read or written.
 */
export async function getDebts():
  Promise<GetDebtsResult> {
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

    const admin =
      createWorkspaceAdminClient();

    const [
      debtResult,
      paymentResult,
    ] =
      await Promise.all([
        admin
          .from(
            "case_budget_debts",
          )
          .select(
            "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at",
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .eq(
            "is_archived",
            false,
          )
          .order(
            "status",
            {
              ascending:
                true,
            },
          )
          .order(
            "updated_at",
            {
              ascending:
                false,
            },
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          ),

        admin
          .from(
            "case_budget_debt_payments",
          )
          .select(
            "id,workspace_id,debt_id,created_by_user_id,amount,balance_before,balance_after,payment_date,notes,created_at",
          )
          .eq(
            "workspace_id",
            workspaceId,
          )
          .order(
            "payment_date",
            {
              ascending:
                false,
            },
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          ),
      ]);

    if (
      debtResult.error
    ) {
      console.error(
        "[CASE Budget Debts] Failed to load debts.",
        {
          workspaceId,
          userId,
          error:
            debtResult.error,
        },
      );

      return failure(
        "CASE Budget could not load debts for this workspace.",
      );
    }

    if (
      paymentResult.error
    ) {
      console.error(
        "[CASE Budget Debts] Failed to load debt payments.",
        {
          workspaceId,
          userId,
          error:
            paymentResult.error,
        },
      );

      return failure(
        "CASE Budget could not load debt-payment history for this workspace.",
      );
    }

    const debtRows =
      (
        debtResult.data ??
        []
      ) as unknown as
        CaseBudgetDebtDatabaseRow[];

    const paymentRows =
      (
        paymentResult.data ??
        []
      ) as unknown as
        CaseBudgetDebtPaymentDatabaseRow[];

    const debts:
      DebtData[] =
      [];

    const validDebtIds =
      new Set<
        string
      >();

    for (
      const row of
        debtRows
    ) {
      const mapped =
        mapDebtRow({
          row,
          workspaceId,
        });

      if (
        !mapped
      ) {
        console.error(
          "[CASE Budget Debts] Skipping invalid debt row.",
          {
            workspaceId,
            debtId:
              row.id,
          },
        );

        continue;
      }

      validDebtIds.add(
        mapped.id,
      );

      debts.push(
        mapped,
      );
    }

    const payments:
      DebtPaymentData[] =
      [];

    for (
      const row of
        paymentRows
    ) {
      if (
        !validDebtIds.has(
          row.debt_id,
        )
      ) {
        console.error(
          "[CASE Budget Debts] Skipping payment whose debt is unavailable in the active workspace.",
          {
            workspaceId,
            paymentId:
              row.id,
            debtId:
              row.debt_id,
          },
        );

        continue;
      }

      const mapped =
        mapDebtPaymentRow({
          row,
          workspaceId,
        });

      if (
        !mapped
      ) {
        console.error(
          "[CASE Budget Debts] Skipping invalid debt-payment row.",
          {
            workspaceId,
            paymentId:
              row.id,
            debtId:
              row.debt_id,
          },
        );

        continue;
      }

      payments.push(
        mapped,
      );
    }

    return {
      success:
        true,

      debts,

      payments,
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
      "[CASE Budget Debts] Unexpected debt-loading error.",
      error,
    );

    return failure(
      "CASE Budget could not load debts. Please try again.",
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
      "[CASE Budget Debts] Failed to load active workspace.",
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
        "Debts are unavailable because this workspace is inactive.",
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
      "[CASE Budget Debts] Failed to verify workspace membership.",
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
        "You do not have active access to debts in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
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

function mapDebtPaymentRow({
  row,
  workspaceId,
}: {
  row:
    CaseBudgetDebtPaymentDatabaseRow;

  workspaceId:
    string;
}): DebtPaymentData | null {
  if (
    row.workspace_id !==
    workspaceId
  ) {
    return null;
  }

  const amount =
    normalizePositiveMoney(
      row.amount,
    );

  const balanceBefore =
    normalizeNonNegativeMoney(
      row.balance_before,
    );

  const balanceAfter =
    normalizeNonNegativeMoney(
      row.balance_after,
    );

  if (
    amount ===
      null ||
    balanceBefore ===
      null ||
    balanceAfter ===
      null ||
    balanceAfter >
      balanceBefore
  ) {
    return null;
  }

  const paymentDate =
    normalizeDate(
      row.payment_date,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  if (
    !paymentDate ||
    !createdAt
  ) {
    return null;
  }

  const notes =
    normalizeOptionalText(
      row.notes,
    );

  return {
    id:
      row.id,

    debtId:
      row.debt_id,

    amount,

    balanceBefore,

    balanceAfter,

    paymentDate,

    ...(notes
      ? {
          notes,
        }
      : {}),

    createdAt,
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

function normalizeDatabaseNumber(
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
    normalizeDatabaseNumber(
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

function normalizePositiveMoney(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseNumber(
      value,
    );

  if (
    normalized ===
      null ||
    normalized <=
      0
  ) {
    return null;
  }

  return roundMoney(
    normalized,
  );
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

  const normalized =
    normalizeDatabaseNumber(
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

function normalizeDate(
  value:
    unknown,
): string | null {
  const normalized =
    normalizeRequiredText(
      value,
    );

  if (
    !normalized ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${normalized}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(
      0,
      10,
    ) ===
    normalized
    ? normalized
    : null;
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
): GetDebtsResult {
  return {
    success:
      false,

    error:
      message,
  };
}
