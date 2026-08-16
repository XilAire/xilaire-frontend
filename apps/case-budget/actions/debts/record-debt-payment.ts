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
  RecordDebtPaymentData,
  RecordDebtPaymentResult,
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

type ArchiveAwareDebtDatabaseRow =
  CaseBudgetDebtDatabaseRow & {
    is_archived:
      boolean;

    archived_at:
      string | null;

    archived_by_user_id:
      string | null;
  };

type ValidatedPaymentInput = {
  debtId:
    string;

  amount:
    number;

  paymentDate:
    string;

  notes:
    string | null;
};

type ValidationResult =
  | {
      success:
        true;

      value:
        ValidatedPaymentInput;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof RecordDebtPaymentData,
            string
          >
        >;
    };

/**
 * Records one debt payment and updates the canonical debt balance.
 *
 * Production rules:
 *
 * - Active workspace comes from trusted server auth state.
 * - The browser never supplies workspace_id or user_id.
 * - The caller must have active non-viewer workspace membership.
 * - The debt must belong to the authenticated active workspace.
 * - Archived debts cannot accept new payments.
 * - Payments must be greater than zero.
 * - Payments cannot exceed the current debt balance.
 * - balance_before and balance_after are calculated on the server.
 * - A zero resulting balance automatically marks the debt paid-off.
 * - A positive resulting balance keeps the debt active.
 * - Payment history is immutable after insertion.
 * - The debt update uses updated_at optimistic concurrency.
 * - If payment insertion fails after the debt update, the debt update is
 *   rolled back to its previous balance/status before an error is returned.
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function recordDebtPayment(
  input:
    RecordDebtPaymentData,
): Promise<RecordDebtPaymentResult> {
  const validation =
    validatePaymentInput(
      input,
    );

  if (
    !validation.success
  ) {
    return {
      success:
        false,

      error:
        "Review the payment details and try again.",

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

    const validated =
      validation.value;

    const existingResult =
      await loadDebt({
        workspaceId,
        debtId:
          validated.debtId,
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

    if (
      existingRow.is_archived
    ) {
      return failure(
        "Archived debts cannot accept new payments. Restore the debt first.",
      );
    }

    const existingDebt =
      mapDebtRow({
        row:
          existingRow,
        workspaceId,
      });

    if (
      !existingDebt
    ) {
      return failure(
        "CASE Budget could not read the debt.",
      );
    }

    if (
      existingDebt.currentBalance <=
      0
    ) {
      return failure(
        "This debt is already paid off.",
      );
    }

    if (
      validated.amount >
      existingDebt.currentBalance
    ) {
      return {
        success:
          false,

        error:
          "The payment cannot be greater than the current debt balance.",

        fieldErrors: {
          amount:
            "Enter an amount that is less than or equal to the current balance.",
        },
      };
    }

    const balanceBefore =
      existingDebt.currentBalance;

    const balanceAfter =
      roundMoney(
        Math.max(
          0,
          balanceBefore -
            validated.amount,
        ),
      );

    const nextStatus:
      DebtData[
        "status"
      ] =
      balanceAfter <=
        0
        ? "paid-off"
        : "active";

    const now =
      new Date().toISOString();

    const admin =
      createWorkspaceAdminClient();

    /**
     * First update the canonical debt using optimistic concurrency.
     *
     * This guarantees the payment amount was calculated against the latest
     * balance that we loaded. If another write changed the debt first, this
     * update affects zero rows and we stop before inserting history.
     */
    const {
      data:
        updatedDebtData,
      error:
        updateDebtError,
    } =
      await admin
        .from(
          "case_budget_debts",
        )
        .update({
          current_balance:
            balanceAfter,

          status:
            nextStatus,

          updated_by_user_id:
            userId,

          updated_at:
            now,
        })
        .eq(
          "id",
          validated.debtId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "updated_at",
          existingRow.updated_at,
        )
        .eq(
          "is_archived",
          false,
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at,is_archived,archived_at,archived_by_user_id",
        )
        .maybeSingle();

    if (
      updateDebtError
    ) {
      console.error(
        "[CASE Budget Debts] Failed to update debt balance while recording payment.",
        {
          workspaceId,
          userId,
          debtId:
            validated.debtId,
          error:
            updateDebtError,
        },
      );

      return failure(
        "CASE Budget could not update the debt balance.",
      );
    }

    if (
      !updatedDebtData
    ) {
      return failure(
        "This debt changed before the payment could be saved. Refresh the page and try again.",
      );
    }

    const updatedDebtRow =
      updatedDebtData as unknown as
        ArchiveAwareDebtDatabaseRow;

    const {
      data:
        paymentData,
      error:
        paymentError,
    } =
      await admin
        .from(
          "case_budget_debt_payments",
        )
        .insert({
          workspace_id:
            workspaceId,

          debt_id:
            validated.debtId,

          created_by_user_id:
            userId,

          amount:
            validated.amount,

          balance_before:
            balanceBefore,

          balance_after:
            balanceAfter,

          payment_date:
            validated.paymentDate,

          notes:
            validated.notes,

          created_at:
            now,
        })
        .select(
          "id,workspace_id,debt_id,created_by_user_id,amount,balance_before,balance_after,payment_date,notes,created_at",
        )
        .single();

    if (
      paymentError
    ) {
      console.error(
        "[CASE Budget Debts] Failed to insert debt payment. Attempting rollback.",
        {
          workspaceId,
          userId,
          debtId:
            validated.debtId,
          error:
            paymentError,
        },
      );

      const rollbackResult =
        await rollbackDebtAfterPaymentInsertFailure({
          workspaceId,
          userId,
          debtId:
            validated.debtId,
          expectedUpdatedAt:
            updatedDebtRow.updated_at,
          previousBalance:
            balanceBefore,
          previousStatus:
            existingDebt.status,
          previousUpdatedAt:
            existingRow.updated_at,
        });

      if (
        !rollbackResult.success
      ) {
        console.error(
          "[CASE Budget Debts] CRITICAL: payment insert failed and debt rollback also failed.",
          {
            workspaceId,
            userId,
            debtId:
              validated.debtId,
            paymentError,
            rollbackError:
              rollbackResult.error,
          },
        );

        return failure(
          "The payment could not be saved and CASE Budget could not automatically restore the prior balance. Refresh the page before making another change.",
        );
      }

      return failure(
        "CASE Budget could not save the debt payment. The prior balance was restored.",
      );
    }

    const debt =
      mapDebtRow({
        row:
          updatedDebtRow,
        workspaceId,
      });

    if (
      !debt
    ) {
      return failure(
        "The payment was saved, but CASE Budget could not read the updated debt.",
      );
    }

    const paymentRow =
      paymentData as unknown as
        CaseBudgetDebtPaymentDatabaseRow;

    const payment =
      mapPaymentRow({
        row:
          paymentRow,
        workspaceId,
      });

    if (
      !payment
    ) {
      return failure(
        "The payment was saved, but CASE Budget could not read the payment history record.",
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

      payment,
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
      "[CASE Budget Debts] Unexpected record-debt-payment error.",
      error,
    );

    return failure(
      "CASE Budget could not record the payment. Please try again.",
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
      "[CASE Budget Debts] Failed to load workspace while recording payment.",
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
        "Debt payments are unavailable because this workspace is inactive.",
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
      "[CASE Budget Debts] Failed to verify membership while recording payment.",
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
        "You do not have active access to record debt payments in this workspace.",
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
        "Viewers cannot record debt payments in this workspace.",
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
          ArchiveAwareDebtDatabaseRow;
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
        "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at,is_archived,archived_at,archived_by_user_id",
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
      "[CASE Budget Debts] Failed to load debt before recording payment.",
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
      | ArchiveAwareDebtDatabaseRow
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

async function rollbackDebtAfterPaymentInsertFailure({
  workspaceId,
  userId,
  debtId,
  expectedUpdatedAt,
  previousBalance,
  previousStatus,
  previousUpdatedAt,
}: {
  workspaceId:
    string;

  userId:
    string;

  debtId:
    string;

  expectedUpdatedAt:
    string;

  previousBalance:
    number;

  previousStatus:
    DebtData[
      "status"
    ];

  previousUpdatedAt:
    string;
}):
  Promise<
    | {
        success:
          true;
      }
    | {
        success:
          false;

        error:
          unknown;
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
      .update({
        current_balance:
          previousBalance,

        status:
          previousStatus,

        updated_by_user_id:
          userId,

        updated_at:
          previousUpdatedAt,
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
        expectedUpdatedAt,
      )
      .select(
        "id",
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    return {
      success:
        false,

      error:
        error ??
        new Error(
          "Rollback affected zero rows.",
        ),
    };
  }

  return {
    success:
      true,
  };
}

function validatePaymentInput(
  input:
    RecordDebtPaymentData,
): ValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof RecordDebtPaymentData,
        string
      >
    > = {};

  const debtId =
    normalizeRequiredText(
      input.debtId,
    );

  if (
    !debtId
  ) {
    fieldErrors.debtId =
      "A debt is required.";
  }

  const amount =
    normalizePositiveMoney(
      input.amount,
    );

  if (
    amount ===
      null
  ) {
    fieldErrors.amount =
      "Payment amount must be greater than zero.";
  }

  const paymentDate =
    input.paymentDate ===
      undefined
      ? todayDateString()
      : normalizeDate(
          input.paymentDate,
        );

  if (
    !paymentDate
  ) {
    fieldErrors.paymentDate =
      "Enter a valid payment date.";
  }

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  if (
    notes &&
    notes.length >
      1000
  ) {
    fieldErrors.notes =
      "Payment notes must be 1,000 characters or fewer.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !debtId ||
    amount ===
      null ||
    !paymentDate
  ) {
    return {
      success:
        false,

      fieldErrors,
    };
  }

  return {
    success:
      true,

    value: {
      debtId,

      amount,

      paymentDate,

      notes,
    },
  };
}

function mapDebtRow({
  row,
  workspaceId,
}: {
  row:
    ArchiveAwareDebtDatabaseRow;

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

function mapPaymentRow({
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

function normalizePositiveMoney(
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
    normalized <=
      0
  ) {
    return null;
  }

  return roundMoney(
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

function todayDateString():
  string {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
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
): RecordDebtPaymentResult {
  return {
    success:
      false,

    error:
      message,
  };
}
