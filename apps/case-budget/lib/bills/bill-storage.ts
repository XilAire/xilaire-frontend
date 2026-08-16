import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  BillAccountReference,
  BillAccountType,
  BillBudgetAllocation,
  BillBudgetAllocationType,
  BillBudgetItemReference,
  BillBudgetSyncMode,
  BillData,
  BillFrequency,
  BillPaymentMethod,
  BillReminderTiming,
  BillStatus,
} from "@/types/bill";

export type BillStorageScope = {
  userId:
    string;

  workspaceId:
    string;
};

export type ListBillsInput =
  BillStorageScope;

export type GetBillInput =
  BillStorageScope & {
    billId:
      string;
  };

export type CreateBillInput =
  BillStorageScope & {
    bill:
      BillData;
  };

export type UpdateBillInput =
  BillStorageScope & {
    bill:
      BillData;
  };

export type DeleteBillInput =
  BillStorageScope & {
    billId:
      string;
  };

export type BillStorageErrorCode =
  | "invalid-input"
  | "not-found"
  | "ownership-mismatch"
  | "database-error"
  | "unknown";

export class BillStorageError extends Error {
  readonly code:
    BillStorageErrorCode;

  readonly operation:
    string;

  readonly causeCode:
    string | null;

  constructor({
    message,
    code,
    operation,
    causeCode,
    cause,
  }: {
    message:
      string;

    code:
      BillStorageErrorCode;

    operation:
      string;

    causeCode?:
      string | null;

    cause?:
      unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "BillStorageError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode ??
      null;
  }
}

type CaseBudgetBillRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  name:
    string;

  payee:
    string | null;

  amount:
    number | string;

  due_date:
    string;

  status:
    string;

  frequency:
    string;

  payment_method:
    string;

  account_id:
    string | null;

  account_name:
    string | null;

  account_type:
    string | null;

  budget_item_id:
    string | null;

  budget_item_name:
    string | null;

  budget_category_id:
    string | null;

  budget_category_name:
    string | null;

  budget_sync_enabled:
    boolean;

  budget_sync_mode:
    string;

  budget_sync_last_synced_at:
    string | null;

  budget_allocations:
    unknown;

  reminder_enabled:
    boolean;

  reminder_timing:
    string;

  note:
    string | null;

  paid_date:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type CaseBudgetBillInsertRow = {
  workspace_id:
    string;

  user_id:
    string;

  name:
    string;

  payee:
    string | null;

  amount:
    number;

  due_date:
    string;

  status:
    BillStatus;

  frequency:
    BillFrequency;

  payment_method:
    BillPaymentMethod;

  account_id:
    string | null;

  account_name:
    string | null;

  account_type:
    BillAccountType | null;

  budget_item_id:
    string | null;

  budget_item_name:
    string | null;

  budget_category_id:
    string | null;

  budget_category_name:
    string | null;

  budget_sync_enabled:
    boolean;

  budget_sync_mode:
    BillBudgetSyncMode;

  budget_sync_last_synced_at:
    string | null;

  budget_allocations:
    BillBudgetAllocation[];

  reminder_enabled:
    boolean;

  reminder_timing:
    BillReminderTiming;

  note:
    string | null;

  paid_date:
    string | null;
};

type CaseBudgetBillUpdateRow =
  Omit<
    CaseBudgetBillInsertRow,
    | "workspace_id"
    | "user_id"
  >;

const CASE_BUDGET_BILLS_TABLE =
  "case_budget_bills";

/**
 * Loads every bill belonging to one CASE Budget workspace.
 *
 * The service-role client bypasses RLS, so every query is explicitly
 * scoped to both workspace_id and user_id.
 */
export async function listBills({
  userId,
  workspaceId,
}: ListBillsInput):
  Promise<BillData[]> {
  const operation =
    "listBills";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .order(
          "due_date",
          {
            ascending:
              true,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not load bills.",
        error,
      });
    }

    if (
      !Array.isArray(
        data,
      )
    ) {
      return [];
    }

    return data.map(
      (
        row,
      ) =>
        mapBillRowToBillData(
          row as CaseBudgetBillRow,
        ),
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not load bills.",
    });
  }
}

/**
 * Loads one bill while enforcing user/workspace ownership.
 */
export async function getBill({
  userId,
  workspaceId,
  billId,
}: GetBillInput):
  Promise<BillData | null> {
  const operation =
    "getBill";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  const normalizedBillId =
    normalizeRequiredText(
      billId,
    );

  if (
    !normalizedBillId
  ) {
    throw new BillStorageError({
      message:
        "A valid bill ID is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "id",
          normalizedBillId,
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not load the bill.",
        error,
      });
    }

    if (
      !data
    ) {
      return null;
    }

    return mapBillRowToBillData(
      data as CaseBudgetBillRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not load the bill.",
    });
  }
}

/**
 * Creates one CASE Budget bill.
 *
 * Supabase generates the canonical UUID. The client-supplied BillData
 * ID is never persisted into the primary-key column.
 */
export async function createBill({
  userId,
  workspaceId,
  bill,
}: CreateBillInput):
  Promise<BillData> {
  const operation =
    "createBill";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  validateBill({
    bill,
    operation,
  });

  const insertRow =
    mapBillDataToInsertRow({
      bill,
      scope,
    });

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .insert(
          insertRow,
        )
        .select(
          "*",
        )
        .single();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not create the bill.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new BillStorageError({
        message:
          "CASE Budget created the bill but did not receive the saved record.",
        code:
          "database-error",
        operation,
      });
    }

    return mapBillRowToBillData(
      data as CaseBudgetBillRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not create the bill.",
    });
  }
}

/**
 * Updates one existing CASE Budget bill.
 *
 * user_id and workspace_id are never changed by this operation.
 */
export async function updateBill({
  userId,
  workspaceId,
  bill,
}: UpdateBillInput):
  Promise<BillData> {
  const operation =
    "updateBill";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  validateBill({
    bill,
    operation,
  });

  const normalizedBillId =
    normalizeRequiredText(
      bill.id,
    );

  if (
    !normalizedBillId
  ) {
    throw new BillStorageError({
      message:
        "A valid bill ID is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  const updateRow =
    mapBillDataToUpdateRow(
      bill,
    );

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .update(
          updateRow,
        )
        .eq(
          "id",
          normalizedBillId,
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .select(
          "*",
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not update the bill.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new BillStorageError({
        message:
          "The requested CASE Budget bill could not be found.",
        code:
          "not-found",
        operation,
      });
    }

    return mapBillRowToBillData(
      data as CaseBudgetBillRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not update the bill.",
    });
  }
}

/**
 * Deletes one bill belonging to the supplied user/workspace.
 */
export async function deleteBill({
  userId,
  workspaceId,
  billId,
}: DeleteBillInput):
  Promise<void> {
  const operation =
    "deleteBill";

  const scope =
    normalizeStorageScope({
      userId,
      workspaceId,
      operation,
    });

  const normalizedBillId =
    normalizeRequiredText(
      billId,
    );

  if (
    !normalizedBillId
  ) {
    throw new BillStorageError({
      message:
        "A valid bill ID is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .delete()
        .eq(
          "id",
          normalizedBillId,
        )
        .eq(
          "workspace_id",
          scope.workspaceId,
        )
        .eq(
          "user_id",
          scope.userId,
        )
        .select(
          "id",
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not delete the bill.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new BillStorageError({
        message:
          "The requested CASE Budget bill could not be found.",
        code:
          "not-found",
        operation,
      });
    }
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not delete the bill.",
    });
  }
}

/**
 * Loads every reminder-enabled unpaid bill across all CASE Budget
 * users/workspaces.
 *
 * This is deliberately server-only and intended for the scheduled
 * bill-reminder processor.
 *
 * Do not expose this function directly to browser code.
 */
export async function listReminderCandidateBills():
  Promise<
    {
      bill:
        BillData;

      userId:
        string;

      workspaceId:
        string;
    }[]
  > {
  const operation =
    "listReminderCandidateBills";

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          CASE_BUDGET_BILLS_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "reminder_enabled",
          true,
        )
        .neq(
          "status",
          "paid",
        )
        .order(
          "due_date",
          {
            ascending:
              true,
          },
        );

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not load bill-reminder candidates.",
        error,
      });
    }

    if (
      !Array.isArray(
        data,
      )
    ) {
      return [];
    }

    return data.map(
      (
        value,
      ) => {
        const row =
          value as CaseBudgetBillRow;

        return {
          bill:
            mapBillRowToBillData(
              row,
            ),

          userId:
            row.user_id,

          workspaceId:
            row.workspace_id,
        };
      },
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not load bill-reminder candidates.",
    });
  }
}

function mapBillDataToInsertRow({
  bill,
  scope,
}: {
  bill:
    BillData;

  scope:
    BillStorageScope;
}): CaseBudgetBillInsertRow {
  const common =
    mapBillDataToDatabaseValues(
      bill,
    );

  return {
    workspace_id:
      scope.workspaceId,

    user_id:
      scope.userId,

    ...common,
  };
}

function mapBillDataToUpdateRow(
  bill:
    BillData,
): CaseBudgetBillUpdateRow {
  return mapBillDataToDatabaseValues(
    bill,
  );
}

function mapBillDataToDatabaseValues(
  bill:
    BillData,
): CaseBudgetBillUpdateRow {
  return {
    name:
      bill.name.trim(),

    payee:
      normalizeOptionalText(
        bill.payee,
      ),

    amount:
      normalizeAmount(
        bill.amount,
      ),

    due_date:
      normalizeDateOnly(
        bill.dueDate,
      ),

    status:
      normalizeBillStatus(
        bill.status,
      ),

    frequency:
      normalizeBillFrequency(
        bill.frequency,
      ),

    payment_method:
      normalizePaymentMethod(
        bill.paymentMethod,
      ),

    account_id:
      normalizeOptionalText(
        bill.account?.id,
      ),

    account_name:
      normalizeOptionalText(
        bill.account?.name,
      ),

    account_type:
      bill.account
        ? normalizeAccountType(
            bill.account.type,
          )
        : null,

    budget_item_id:
      normalizeOptionalText(
        bill.budgetItem?.id,
      ),

    budget_item_name:
      normalizeOptionalText(
        bill.budgetItem?.name,
      ),

    budget_category_id:
      normalizeOptionalText(
        bill.budgetItem
          ?.categoryId,
      ),

    budget_category_name:
      normalizeOptionalText(
        bill.budgetItem
          ?.categoryName,
      ),

    budget_sync_enabled:
      bill.budgetSync
        ?.enabled ??
      false,

    budget_sync_mode:
      normalizeBudgetSyncMode(
        bill.budgetSync?.mode ??
        "manual",
      ),

    budget_sync_last_synced_at:
      normalizeOptionalTimestamp(
        bill.budgetSync
          ?.lastSyncedAt,
      ),

    budget_allocations:
      normalizeBudgetAllocationsForStorage(
        bill.budgetAllocations,
      ),

    reminder_enabled:
      Boolean(
        bill.reminder
          ?.enabled,
      ),

    reminder_timing:
      normalizeReminderTiming(
        bill.reminder
          ?.timing ??
        "3-days",
      ),

    note:
      normalizeOptionalText(
        bill.note,
      ),

    paid_date:
      bill.status ===
        "paid"
        ? normalizeDateOnly(
            bill.paidDate ??
            bill.dueDate,
          )
        : null,
  };
}

function mapBillRowToBillData(
  row:
    CaseBudgetBillRow,
): BillData {
  const account =
    mapAccountReference(
      row,
    );

  const budgetItem =
    mapBudgetItemReference(
      row,
    );

  const budgetAllocations =
    normalizeBudgetAllocationsFromStorage(
      row.budget_allocations,
    );

  return {
    id:
      row.id,

    name:
      row.name,

    ...(row.payee
      ? {
          payee:
            row.payee,
        }
      : {}),

    amount:
      normalizeDatabaseAmount(
        row.amount,
      ),

    dueDate:
      row.due_date,

    status:
      normalizeBillStatus(
        row.status,
      ),

    frequency:
      normalizeBillFrequency(
        row.frequency,
      ),

    paymentMethod:
      normalizePaymentMethod(
        row.payment_method,
      ),

    ...(account
      ? {
          account,
        }
      : {}),

    ...(budgetItem
      ? {
          budgetItem,
        }
      : {}),

    budgetSync: {
      enabled:
        Boolean(
          row.budget_sync_enabled,
        ),

      mode:
        normalizeBudgetSyncMode(
          row.budget_sync_mode,
        ),

      ...(row
        .budget_sync_last_synced_at
        ? {
            lastSyncedAt:
              row
                .budget_sync_last_synced_at,
          }
        : {}),
    },

    budgetAllocations,

    reminder: {
      enabled:
        Boolean(
          row.reminder_enabled,
        ),

      timing:
        normalizeReminderTiming(
          row.reminder_timing,
        ),
    },

    ...(row.note
      ? {
          note:
            row.note,
        }
      : {}),

    ...(row.paid_date
      ? {
          paidDate:
            row.paid_date,
        }
      : {}),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function mapAccountReference(
  row:
    CaseBudgetBillRow,
): BillAccountReference | undefined {
  const accountId =
    normalizeOptionalText(
      row.account_id,
    );

  const accountName =
    normalizeOptionalText(
      row.account_name,
    );

  const accountType =
    normalizeOptionalText(
      row.account_type,
    );

  if (
    !accountId ||
    !accountName ||
    !accountType
  ) {
    return undefined;
  }

  return {
    id:
      accountId,

    name:
      accountName,

    type:
      normalizeAccountType(
        accountType,
      ),
  };
}

function mapBudgetItemReference(
  row:
    CaseBudgetBillRow,
): BillBudgetItemReference | undefined {
  const id =
    normalizeOptionalText(
      row.budget_item_id,
    );

  const name =
    normalizeOptionalText(
      row.budget_item_name,
    );

  const categoryId =
    normalizeOptionalText(
      row.budget_category_id,
    );

  const categoryName =
    normalizeOptionalText(
      row.budget_category_name,
    );

  if (
    !id ||
    !name ||
    !categoryId ||
    !categoryName
  ) {
    return undefined;
  }

  return {
    id,
    name,
    categoryId,
    categoryName,
  };
}

function normalizeBudgetAllocationsForStorage(
  allocations:
    BillBudgetAllocation[] | undefined,
): BillBudgetAllocation[] {
  if (
    !Array.isArray(
      allocations,
    )
  ) {
    return [];
  }

  return allocations
    .map(
      (
        allocation,
      ) =>
        normalizeBudgetAllocation(
          allocation,
        ),
    )
    .filter(
      (
        allocation,
      ): allocation is BillBudgetAllocation =>
        allocation !==
        null,
    );
}

function normalizeBudgetAllocationsFromStorage(
  value:
    unknown,
): BillBudgetAllocation[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        allocation,
      ) =>
        parseBudgetAllocation(
          allocation,
        ),
    )
    .filter(
      (
        allocation,
      ): allocation is BillBudgetAllocation =>
        allocation !==
        null,
    );
}

function normalizeBudgetAllocation(
  allocation:
    BillBudgetAllocation,
): BillBudgetAllocation | null {
  const id =
    normalizeRequiredText(
      allocation.id,
    );

  const budgetItemId =
    normalizeRequiredText(
      allocation
        .budgetItem
        ?.id,
    );

  const budgetItemName =
    normalizeRequiredText(
      allocation
        .budgetItem
        ?.name,
    );

  const categoryId =
    normalizeRequiredText(
      allocation
        .budgetItem
        ?.categoryId,
    );

  const categoryName =
    normalizeRequiredText(
      allocation
        .budgetItem
        ?.categoryName,
    );

  if (
    !id ||
    !budgetItemId ||
    !budgetItemName ||
    !categoryId ||
    !categoryName ||
    !Number.isFinite(
      allocation.value,
    )
  ) {
    return null;
  }

  const allocationType =
    normalizeBudgetAllocationType(
      allocation.allocationType,
    );

  if (
    allocation.value < 0 ||
    (
      allocationType ===
        "percentage" &&
      allocation.value > 100
    )
  ) {
    return null;
  }

  const createdAt =
    normalizeOptionalTimestamp(
      allocation.createdAt,
    );

  const updatedAt =
    normalizeOptionalTimestamp(
      allocation.updatedAt,
    );

  return {
    id,

    budgetItem: {
      id:
        budgetItemId,

      name:
        budgetItemName,

      categoryId,

      categoryName,
    },

    allocationType,

    value:
      allocation.value,

    ...(createdAt
      ? {
          createdAt,
        }
      : {}),

    ...(updatedAt
      ? {
          updatedAt,
        }
      : {}),
  };
}

function parseBudgetAllocation(
  value:
    unknown,
): BillBudgetAllocation | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const budgetItem =
    value.budgetItem;

  if (
    !isRecord(
      budgetItem,
    )
  ) {
    return null;
  }

  const id =
    readRequiredString(
      value.id,
    );

  const budgetItemId =
    readRequiredString(
      budgetItem.id,
    );

  const budgetItemName =
    readRequiredString(
      budgetItem.name,
    );

  const categoryId =
    readRequiredString(
      budgetItem.categoryId,
    );

  const categoryName =
    readRequiredString(
      budgetItem.categoryName,
    );

  const numericValue =
    readFiniteNumber(
      value.value,
    );

  if (
    !id ||
    !budgetItemId ||
    !budgetItemName ||
    !categoryId ||
    !categoryName ||
    numericValue ===
      null
  ) {
    return null;
  }

  const allocationType =
    normalizeBudgetAllocationType(
      readOptionalString(
        value.allocationType,
      ) ??
      "fixed",
    );

  if (
    numericValue < 0 ||
    (
      allocationType ===
        "percentage" &&
      numericValue > 100
    )
  ) {
    return null;
  }

  return {
    id,

    budgetItem: {
      id:
        budgetItemId,

      name:
        budgetItemName,

      categoryId,

      categoryName,
    },

    allocationType,

    value:
      numericValue,

    ...(readOptionalString(
      value.createdAt,
    )
      ? {
          createdAt:
            readOptionalString(
              value.createdAt,
            ),
        }
      : {}),

    ...(readOptionalString(
      value.updatedAt,
    )
      ? {
          updatedAt:
            readOptionalString(
              value.updatedAt,
            ),
        }
      : {}),
  };
}

function validateBill({
  bill,
  operation,
}: {
  bill:
    BillData;

  operation:
    string;
}) {
  if (
    !bill ||
    typeof bill !==
      "object"
  ) {
    throw new BillStorageError({
      message:
        "A valid bill is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  if (
    !normalizeRequiredText(
      bill.name,
    )
  ) {
    throw new BillStorageError({
      message:
        "A bill name is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  if (
    !Number.isFinite(
      bill.amount,
    ) ||
    bill.amount <
      0
  ) {
    throw new BillStorageError({
      message:
        "Bill amount must be a valid non-negative number.",
      code:
        "invalid-input",
      operation,
    });
  }

  normalizeDateOnly(
    bill.dueDate,
  );

  normalizeBillStatus(
    bill.status,
  );

  normalizeBillFrequency(
    bill.frequency,
  );

  normalizePaymentMethod(
    bill.paymentMethod,
  );

  normalizeReminderTiming(
    bill.reminder
      ?.timing ??
    "3-days",
  );

  if (
    bill.status ===
      "paid" &&
    !bill.paidDate
  ) {
    throw new BillStorageError({
      message:
        "A paid bill must include a paid date.",
      code:
        "invalid-input",
      operation,
    });
  }
}

function normalizeStorageScope({
  userId,
  workspaceId,
  operation,
}: BillStorageScope & {
  operation:
    string;
}): BillStorageScope {
  const normalizedUserId =
    normalizeRequiredText(
      userId,
    );

  const normalizedWorkspaceId =
    normalizeRequiredText(
      workspaceId,
    );

  if (
    !normalizedUserId
  ) {
    throw new BillStorageError({
      message:
        "A valid user ID is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  if (
    !normalizedWorkspaceId
  ) {
    throw new BillStorageError({
      message:
        "A valid workspace ID is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  return {
    userId:
      normalizedUserId,

    workspaceId:
      normalizedWorkspaceId,
  };
}

function normalizeBillStatus(
  value:
    string,
): BillStatus {
  switch (
    value
  ) {
    case "upcoming":
    case "due-soon":
    case "due-today":
    case "past-due":
    case "paid":
      return value;

    default:
      throw new BillStorageError({
        message:
          `Unsupported bill status "${value}".`,
        code:
          "invalid-input",
        operation:
          "normalizeBillStatus",
      });
  }
}

function normalizeBillFrequency(
  value:
    string,
): BillFrequency {
  switch (
    value
  ) {
    case "weekly":
    case "biweekly":
    case "monthly":
    case "quarterly":
    case "semiannual":
    case "annual":
    case "one-time":
      return value;

    default:
      throw new BillStorageError({
        message:
          `Unsupported bill frequency "${value}".`,
        code:
          "invalid-input",
        operation:
          "normalizeBillFrequency",
      });
  }
}

function normalizePaymentMethod(
  value:
    string,
): BillPaymentMethod {
  switch (
    value
  ) {
    case "manual":
    case "autopay":
      return value;

    default:
      throw new BillStorageError({
        message:
          `Unsupported bill payment method "${value}".`,
        code:
          "invalid-input",
        operation:
          "normalizePaymentMethod",
      });
  }
}

function normalizeAccountType(
  value:
    string,
): BillAccountType {
  switch (
    value
  ) {
    case "checking":
    case "savings":
    case "credit-card":
    case "cash":
    case "investment":
    case "loan":
    case "other":
      return value;

    default:
      throw new BillStorageError({
        message:
          `Unsupported bill account type "${value}".`,
        code:
          "invalid-input",
        operation:
          "normalizeAccountType",
      });
  }
}

function normalizeBudgetSyncMode(
  value:
    string,
): BillBudgetSyncMode {
  switch (
    value
  ) {
    case "manual":
    case "suggest":
    case "automatic":
      return value;

    default:
      throw new BillStorageError({
        message:
          `Unsupported budget sync mode "${value}".`,
        code:
          "invalid-input",
        operation:
          "normalizeBudgetSyncMode",
      });
  }
}

function normalizeBudgetAllocationType(
  value:
    string,
): BillBudgetAllocationType {
  switch (
    value
  ) {
    case "fixed":
    case "percentage":
      return value;

    default:
      return "fixed";
  }
}

function normalizeReminderTiming(
  value:
    string,
): BillReminderTiming {
  switch (
    value
  ) {
    case "same-day":
    case "1-day":
    case "3-days":
    case "5-days":
    case "7-days":
    case "14-days":
      return value;

    default:
      throw new BillStorageError({
        message:
          `Unsupported bill reminder timing "${value}".`,
        code:
          "invalid-input",
        operation:
          "normalizeReminderTiming",
      });
  }
}

function normalizeAmount(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    throw new BillStorageError({
      message:
        "Bill amount must be a finite number.",
      code:
        "invalid-input",
      operation:
        "normalizeAmount",
    });
  }

  return Number(
    value.toFixed(
      2,
    ),
  );
}

function normalizeDatabaseAmount(
  value:
    number | string,
) {
  const numericValue =
    typeof value ===
      "number"
      ? value
      : Number(
          value,
        );

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    throw new BillStorageError({
      message:
        "The stored bill contains an invalid amount.",
      code:
        "database-error",
      operation:
        "mapBillRowToBillData",
    });
  }

  return numericValue;
}

function normalizeDateOnly(
  value:
    string,
) {
  const normalizedValue =
    normalizeRequiredText(
      value,
    );

  if (
    !normalizedValue
  ) {
    throw new BillStorageError({
      message:
        "A bill date is required.",
      code:
        "invalid-input",
      operation:
        "normalizeDateOnly",
    });
  }

  const dateOnly =
    normalizedValue.slice(
      0,
      10,
    );

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      dateOnly,
    );

  if (
    !match
  ) {
    throw new BillStorageError({
      message:
        `Invalid bill date "${value}".`,
      code:
        "invalid-input",
      operation:
        "normalizeDateOnly",
    });
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  const day =
    Number(
      match[3],
    );

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month -
        1 ||
    date.getDate() !==
      day
  ) {
    throw new BillStorageError({
      message:
        `Invalid bill date "${value}".`,
      code:
        "invalid-input",
      operation:
        "normalizeDateOnly",
    });
  }

  return dateOnly;
}

function normalizeOptionalTimestamp(
  value:
    string | undefined,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  if (
    !normalizedValue
  ) {
    return null;
  }

  const parsedDate =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return parsedDate.toISOString();
}

function normalizeRequiredText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue ??
    "";
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

function readRequiredString(
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

  return normalizedValue ||
    null;
}

function readOptionalString(
  value:
    unknown,
) {
  return readRequiredString(
    value,
  ) ??
    undefined;
}

function readFiniteNumber(
  value:
    unknown,
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string"
  ) {
    const numericValue =
      Number(
        value,
      );

    return Number.isFinite(
      numericValue,
    )
      ? numericValue
      : null;
  }

  return null;
}

function createDatabaseError({
  operation,
  message,
  error,
}: {
  operation:
    string;

  message:
    string;

  error:
    unknown;
}) {
  return new BillStorageError({
    message:
      `${message} ${readErrorMessage(
        error,
      )}`.trim(),

    code:
      "database-error",

    operation,

    causeCode:
      readErrorCode(
        error,
      ),

    cause:
      error,
  });
}

function normalizeStorageError({
  operation,
  error,
  fallbackMessage,
}: {
  operation:
    string;

  error:
    unknown;

  fallbackMessage:
    string;
}) {
  if (
    error instanceof
    BillStorageError
  ) {
    return error;
  }

  return new BillStorageError({
    message:
      error instanceof
        Error
        ? error.message
        : fallbackMessage,

    code:
      "unknown",

    operation,

    cause:
      error,
  });
}

function readErrorCode(
  error:
    unknown,
) {
  if (
    !isRecord(
      error,
    )
  ) {
    return null;
  }

  const code =
    error.code;

  return typeof code ===
    "string"
    ? code
    : null;
}

function readErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return error.message.trim();
  }

  if (
    !isRecord(
      error,
    )
  ) {
    return "";
  }

  const message =
    error.message;

  return typeof message ===
      "string"
    ? message.trim()
    : "";
}