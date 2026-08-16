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
  CaseBudgetDebtDatabaseUpdate,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import {
  isDebtStatus,
  isDebtType,
} from "@/types/debt";

import type {
  DebtData,
} from "@/types/debt";

const DEBTS_PATH =
  "/dashboard/debts";

export type ArchiveDebtInput = {
  debtId:
    string;

  /**
   * true  = archive
   * false = restore
   *
   * Omitted values default to true so callers that previously used
   * deleteDebt(debtId) can migrate naturally to archiveDebt({ debtId }).
   */
  archived?:
    boolean;
};

export type ArchiveDebtResult =
  | {
      success:
        true;

      debt:
        DebtData;

      archived:
        boolean;
    }
  | {
      success:
        false;

      error:
        string;
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

/**
 * Local archive-aware row shape.
 *
 * The three archive columns were added after the initial strongly typed debt
 * table definition. Keeping the extension here allows this action to compile
 * safely while apps/case-budget/types/database.ts is updated in the next
 * schema-typing step.
 */
type ArchiveAwareDebtDatabaseRow =
  CaseBudgetDebtDatabaseRow & {
    is_archived:
      boolean;

    archived_at:
      string | null;

    archived_by_user_id:
      string | null;
  };

type ArchiveAwareDebtDatabaseUpdate =
  CaseBudgetDebtDatabaseUpdate & {
    is_archived:
      boolean;

    archived_at:
      string | null;

    archived_by_user_id:
      string | null;

    updated_by_user_id:
      string;

    updated_at:
      string;
  };

/**
 * Soft-archives or restores one canonical debt record.
 *
 * Production rules:
 *
 * - The active workspace is resolved only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The debt is loaded by BOTH id and workspace_id.
 * - The caller must have an active non-viewer workspace membership.
 * - Archiving NEVER deletes the debt row.
 * - Archiving NEVER deletes case_budget_debt_payments history.
 * - paid-off and archived remain separate concepts.
 * - Restoring preserves the debt's existing active/paid-off status.
 * - archived_by_user_id always comes from authenticated server state.
 * - updated_by_user_id always comes from authenticated server state.
 * - updated_at optimistic concurrency prevents stale archive/restore actions
 *   from silently overwriting a newer debt mutation.
 * - The UPDATE is constrained by id, workspace_id, and the previously loaded
 *   updated_at value.
 * - Supabase is the only persistence layer.
 * - No localStorage is read or written.
 */
export async function archiveDebt(
  input:
    ArchiveDebtInput,
): Promise<ArchiveDebtResult> {
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

  const shouldArchive =
    input.archived ??
    true;

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

    /**
     * Make an already-satisfied request idempotent.
     *
     * Returning the canonical row avoids unnecessary writes and keeps archive
     * actions safe when a UI retries after a network interruption.
     */
    if (
      existingRow.is_archived ===
      shouldArchive
    ) {
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

      return {
        success:
          true,

        debt:
          existingDebt,

        archived:
          existingRow.is_archived,
      };
    }

    const now =
      new Date().toISOString();

    const updateValues:
      ArchiveAwareDebtDatabaseUpdate = {
        is_archived:
          shouldArchive,

        archived_at:
          shouldArchive
            ? now
            : null,

        archived_by_user_id:
          shouldArchive
            ? userId
            : null,

        updated_by_user_id:
          userId,

        updated_at:
          now,
      };

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
        .update(
          updateValues,
        )
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
          "id,workspace_id,created_by_user_id,updated_by_user_id,name,lender,debt_type,original_balance,current_balance,interest_rate,minimum_payment,due_day,status,created_at,updated_at,is_archived,archived_at,archived_by_user_id",
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Debts] Failed to archive or restore debt.",
        {
          workspaceId,
          userId,
          debtId,
          shouldArchive,
          error,
        },
      );

      return failure(
        shouldArchive
          ? "CASE Budget could not archive the debt."
          : "CASE Budget could not restore the debt.",
      );
    }

    if (
      !data
    ) {
      const conflictMessage =
        await determineArchiveConflict({
          workspaceId,
          debtId,
          expectedUpdatedAt:
            existingRow.updated_at,
        });

      return failure(
        conflictMessage,
      );
    }

    const updatedRow =
      data as unknown as
        ArchiveAwareDebtDatabaseRow;

    if (
      updatedRow.is_archived !==
      shouldArchive
    ) {
      console.error(
        "[CASE Budget Debts] Archive state did not match requested state.",
        {
          workspaceId,
          userId,
          debtId,
          requestedArchived:
            shouldArchive,
          returnedArchived:
            updatedRow.is_archived,
        },
      );

      return failure(
        "CASE Budget could not confirm the debt archive state.",
      );
    }

    const debt =
      mapDebtRow({
        row:
          updatedRow,
        workspaceId,
      });

    if (
      !debt
    ) {
      console.error(
        "[CASE Budget Debts] Archived/restored debt row could not be mapped.",
        {
          workspaceId,
          userId,
          debtId,
          shouldArchive,
        },
      );

      return failure(
        shouldArchive
          ? "The debt was archived, but CASE Budget could not read the saved record."
          : "The debt was restored, but CASE Budget could not read the saved record.",
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

      archived:
        updatedRow.is_archived,
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
      "[CASE Budget Debts] Unexpected archive-debt error.",
      error,
    );

    return failure(
      "CASE Budget could not change the debt archive state. Please try again.",
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
      "[CASE Budget Debts] Failed to load workspace while archiving debt.",
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
        "Debt archive changes are unavailable because this workspace is inactive.",
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
      "[CASE Budget Debts] Failed to verify membership while archiving debt.",
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
        "You do not have active access to change debts in this workspace.",
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
        "Viewers cannot archive or restore debts in this workspace.",
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
      "[CASE Budget Debts] Failed to load debt before archive/restore.",
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

async function determineArchiveConflict({
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
        "id,updated_at,is_archived",
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
      "[CASE Budget Debts] Failed to verify archive conflict.",
      {
        workspaceId,
        debtId,
        error,
      },
    );

    return "The debt archive state could not be changed. Refresh the page and try again.";
  }

  const current =
    data as unknown as
      | {
          id:
            string;

          updated_at:
            string;

          is_archived:
            boolean;
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
    return "This debt changed while you were working with it. Refresh the page and try again.";
  }

  return "The debt archive state could not be changed. Refresh the page and try again.";
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
): ArchiveDebtResult {
  return {
    success:
      false,

    error:
      message,
  };
}
