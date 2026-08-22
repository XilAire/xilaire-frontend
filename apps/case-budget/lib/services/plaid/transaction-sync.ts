import "server-only";

import type {
  Transaction,
} from "plaid";

import {
  getPlaidTransactionUpdates,
} from "@/lib/integrations/plaid/transactions";

import {
  getPlaidItemWithAccessTokenByConnectionId,
} from "@/lib/repositories/plaid-items";

import {
  completePlaidTransactionSync,
  getPlaidTransactionSyncState,
} from "@/lib/repositories/plaid-transaction-sync-state";

import {
  recalculateBudgetActivity,
} from "@/lib/transactions/budget-activity-sync";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetTransactionDatabaseInsert,
  CaseBudgetTransactionDatabaseRow,
  CaseBudgetTransactionDatabaseUpdate,
  CaseBudgetTransactionStatusDatabaseEnum,
  CaseBudgetTransactionTypeDatabaseEnum,
} from "@/types/database";

export type SyncPlaidTransactionsInput = {
  connectionId:
    string;

  owner: {
    workspaceId:
      string;

    userId:
      string;
  };
};

export type SyncPlaidTransactionsResult = {
  connectionId:
    string;

  plaidItemId:
    string;

  startedAt:
    string;

  completedAt:
    string;

  previousCursor:
    string | null;

  nextCursor:
    string | null;

  transactionsReady:
    boolean;

  addedCount:
    number;

  modifiedCount:
    number;

  removedCount:
    number;

  insertedCount:
    number;

  updatedCount:
    number;

  softDeletedCount:
    number;

  skippedCount:
    number;

  affectedBudgetItemCount:
    number;

  pageCount:
    number;

  paginationRestartCount:
    number;
};

export type PlaidTransactionSyncServiceErrorCode =
  | "invalid-input"
  | "item-not-found"
  | "item-revoked"
  | "account-map-failed"
  | "transaction-write-failed"
  | "transaction-delete-failed"
  | "budget-sync-failed"
  | "cursor-save-failed"
  | "provider-error"
  | "unknown";

export class PlaidTransactionSyncServiceError extends Error {
  readonly code:
    PlaidTransactionSyncServiceErrorCode;

  readonly operation:
    string;

  readonly providerErrorCode:
    string | null;

  readonly providerRequestId:
    string | null;

  constructor({
    message,
    code,
    operation,
    providerErrorCode,
    providerRequestId,
    cause,
  }: {
    message:
      string;

    code:
      PlaidTransactionSyncServiceErrorCode;

    operation:
      string;

    providerErrorCode?:
      string | null;

    providerRequestId?:
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
      "PlaidTransactionSyncServiceError";

    this.code =
      code;

    this.operation =
      operation;

    this.providerErrorCode =
      providerErrorCode ??
      null;

    this.providerRequestId =
      providerRequestId ??
      null;
  }
}

type AccountMapRow = {
  id:
    string;

  provider_account_id:
    string | null;

  is_active:
    boolean;

  is_archived:
    boolean;
};

type ExistingTransactionLookupRow = Pick<
  CaseBudgetTransactionDatabaseRow,
  | "id"
  | "budget_item_id"
  | "provider_transaction_id"
  | "provider_pending_transaction_id"
  | "is_deleted"
>;

type ApplyTransactionResult = {
  status:
    | "inserted"
    | "updated"
    | "skipped";

  budgetItemIds:
    string[];
};

type SoftDeleteResult = {
  deleted:
    boolean;

  budgetItemIds:
    string[];
};

const TRANSACTIONS_TABLE =
  "case_budget_transactions";

const ACCOUNTS_TABLE =
  "case_budget_accounts";

const PROVIDER =
  "plaid";

const TRANSACTION_LOOKUP_SELECT = [
  "id",
  "budget_item_id",
  "provider_transaction_id",
  "provider_pending_transaction_id",
  "is_deleted",
].join(
  ",",
);

/**
 * Imports the complete Plaid /transactions/sync patch for one owned financial
 * connection into CASE Budget's canonical transaction ledger.
 *
 * Invariants:
 *
 * - Plaid access tokens never leave server-only code.
 * - The durable Plaid cursor is advanced only after every database mutation
 *   and budget-activity recalculation succeeds.
 * - Plaid transaction IDs are idempotent through the database unique index.
 * - Existing user budget categorization is preserved during provider updates.
 * - Pending -> posted replacement carries the pending transaction's budget
 *   category to the posted transaction and soft-deletes the pending row.
 * - Provider removals are soft deletes; history is never hard-deleted here.
 * - Only canonical CASE Budget accounts mapped to the provider account ID may
 *   receive imported transactions.
 */
export async function syncPlaidTransactions({
  connectionId,
  owner,
}: SyncPlaidTransactionsInput):
  Promise<SyncPlaidTransactionsResult> {
  const operation =
    "syncPlaidTransactions";

  const normalizedConnectionId =
    requireText(
      connectionId,
      "connectionId",
      operation,
    );

  const workspaceId =
    requireText(
      owner?.workspaceId,
      "owner.workspaceId",
      operation,
    );

  const userId =
    requireText(
      owner?.userId,
      "owner.userId",
      operation,
    );

  const startedAt =
    new Date().toISOString();

  try {
    const [
      item,
      syncState,
    ] =
      await Promise.all([
        getPlaidItemWithAccessTokenByConnectionId({
          connectionId:
            normalizedConnectionId,

          owner: {
            workspaceId,
            userId,
          },
        }),

        getPlaidTransactionSyncState({
          connectionId:
            normalizedConnectionId,

          owner: {
            workspaceId,
            userId,
          },
        }),
      ]);

    if (
      !item ||
      !syncState
    ) {
      throw new PlaidTransactionSyncServiceError({
        code:
          "item-not-found",

        operation,

        message:
          "CASE Budget could not find the Plaid Item for this financial connection.",
      });
    }

    if (
      item.revokedAt ||
      syncState.revokedAt
    ) {
      throw new PlaidTransactionSyncServiceError({
        code:
          "item-revoked",

        operation,

        message:
          "This Plaid connection has been revoked and cannot synchronize transactions.",
      });
    }

    const accountMap =
      await loadAccountMap({
        workspaceId,
        providerAccountIds:
          item.selectedAccounts
            .filter(
              (
                account,
              ) =>
                account.isSelected &&
                account.isActive,
            )
            .map(
              (
                account,
              ) =>
                account.providerAccountId,
            ),
      });

    const providerPatch =
      await getPlaidTransactionUpdates({
        accessToken:
          item.accessToken,

        cursor:
          syncState.cursor,
      });

    const affectedBudgetItemIds =
      new Set<string>();

    let insertedCount =
      0;

    let updatedCount =
      0;

    let softDeletedCount =
      0;

    let skippedCount =
      0;

    for (
      const transaction of
        providerPatch.added
    ) {
      const result =
        await applyPlaidTransaction({
          transaction,
          workspaceId,
          userId,
          accountMap,
        });

      if (
        result.status ===
        "inserted"
      ) {
        insertedCount +=
          1;
      } else if (
        result.status ===
        "updated"
      ) {
        updatedCount +=
          1;
      } else {
        skippedCount +=
          1;
      }

      addBudgetItemIds(
        affectedBudgetItemIds,
        result.budgetItemIds,
      );
    }

    for (
      const transaction of
        providerPatch.modified
    ) {
      const result =
        await applyPlaidTransaction({
          transaction,
          workspaceId,
          userId,
          accountMap,
        });

      if (
        result.status ===
        "inserted"
      ) {
        insertedCount +=
          1;
      } else if (
        result.status ===
        "updated"
      ) {
        updatedCount +=
          1;
      } else {
        skippedCount +=
          1;
      }

      addBudgetItemIds(
        affectedBudgetItemIds,
        result.budgetItemIds,
      );
    }

    for (
      const removed of
        providerPatch.removed
    ) {
      const providerTransactionId =
        normalizeOptionalText(
          removed.transaction_id,
        );

      if (
        !providerTransactionId
      ) {
        skippedCount +=
          1;

        continue;
      }

      const result =
        await softDeleteProviderTransaction({
          providerTransactionId,
          workspaceId,
          userId,
        });

      if (
        result.deleted
      ) {
        softDeletedCount +=
          1;
      } else {
        skippedCount +=
          1;
      }

      addBudgetItemIds(
        affectedBudgetItemIds,
        result.budgetItemIds,
      );
    }

    if (
      affectedBudgetItemIds.size >
      0
    ) {
      try {
        await recalculateBudgetActivity({
          userId,
          workspaceId,
          budgetItemIds: [
            ...affectedBudgetItemIds,
          ],
        });
      } catch (
        error
      ) {
        throw new PlaidTransactionSyncServiceError({
          code:
            "budget-sync-failed",

          operation,

          message:
            "Plaid transactions were written, but CASE Budget could not recalculate affected budget activity. The Plaid cursor was not advanced and the sync can be safely retried.",

          cause:
            error,
        });
      }
    }

    const completedAt =
      new Date().toISOString();

    /*
     * Plaid can legitimately return empty transaction arrays and an empty
     * next_cursor while an Item's transaction history is still being
     * prepared. That first call initializes Plaid's transaction sync/webhook
     * lifecycle, but there is no durable cursor to save yet.
     *
     * Capture the cursor in a local constant before the async persistence
     * call. TypeScript does not reliably preserve object-property narrowing
     * across await boundaries because the object could theoretically change.
     *
     * Only persist synchronization state once Plaid returns a real cursor.
     */
    const nextCursor =
      providerPatch.nextCursor;

    if (
      nextCursor
    ) {
      try {
        await completePlaidTransactionSync({
          connectionId:
            normalizedConnectionId,

          owner: {
            workspaceId,
            userId,
          },

          cursor:
            nextCursor,

          completedAt,
        });
      } catch (
        error
      ) {
        throw new PlaidTransactionSyncServiceError({
          code:
            "cursor-save-failed",

          operation,

          message:
            "CASE Budget applied Plaid transaction updates but could not save the next synchronization cursor. The sync can be safely retried.",

          cause:
            error,
        });
      }
    }

    return {
      connectionId:
        normalizedConnectionId,

      plaidItemId:
        item.plaidItemId,

      startedAt,

      completedAt,

      previousCursor:
        syncState.cursor,

      nextCursor,

      transactionsReady:
        Boolean(
          nextCursor,
        ),

      addedCount:
        providerPatch.added.length,

      modifiedCount:
        providerPatch.modified.length,

      removedCount:
        providerPatch.removed.length,

      insertedCount,

      updatedCount,

      softDeletedCount,

      skippedCount,

      affectedBudgetItemCount:
        affectedBudgetItemIds.size,

      pageCount:
        providerPatch.pageCount,

      paginationRestartCount:
        providerPatch.restartCount,
    };
  } catch (
    error
  ) {
    const normalizedError =
      normalizeServiceError(
        error,
        operation,
      );

    /*
     * Keep detailed synchronization diagnostics server-side. Never log the
     * Plaid access token or encrypted token material.
     *
     * The API route intentionally returns a safe client-facing error message,
     * while this log preserves the underlying operation/cause needed to
     * troubleshoot provider, repository, mapping, and persistence failures.
     */
    console.error(
      "[CASE Budget Plaid Transactions] Synchronization failed.",
      {
        connectionId:
          normalizedConnectionId,

        workspaceId,

        userId,

        code:
          normalizedError.code,

        operation:
          normalizedError.operation,

        providerErrorCode:
          normalizedError.providerErrorCode,

        providerRequestId:
          normalizedError.providerRequestId,

        errorName:
          error instanceof Error
            ? error.name
            : null,

        errorMessage:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),

        cause:
          error instanceof Error &&
          error.cause instanceof Error
            ? {
                name:
                  error.cause.name,

                message:
                  error.cause.message,
              }
            : null,
      },
    );

    throw normalizedError;
  }
}

async function loadAccountMap({
  workspaceId,
  providerAccountIds,
}: {
  workspaceId:
    string;

  providerAccountIds:
    string[];
}) {
  const normalizedProviderAccountIds =
    Array.from(
      new Set(
        providerAccountIds
          .map(
            normalizeOptionalText,
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(
                value,
              ),
          ),
      ),
    );

  const accountMap =
    new Map<
      string,
      AccountMapRow
    >();

  if (
    normalizedProviderAccountIds.length ===
    0
  ) {
    return accountMap;
  }

  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        ACCOUNTS_TABLE,
      )
      .select(
        "id,provider_account_id,is_active,is_archived",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "source",
        "plaid",
      )
      .eq(
        "provider",
        PROVIDER,
      )
      .in(
        "provider_account_id",
        normalizedProviderAccountIds,
      );

  if (
    error
  ) {
    throw new PlaidTransactionSyncServiceError({
      code:
        "account-map-failed",

      operation:
        "loadAccountMap",

      message:
        "CASE Budget could not load the connected accounts required for Plaid transaction synchronization.",

      cause:
        error,
    });
  }

  const rows =
    (
      data ??
      []
    ) as unknown as
      AccountMapRow[];

  for (
    const row of
      rows
  ) {
    const providerAccountId =
      normalizeOptionalText(
        row.provider_account_id,
      );

    if (
      providerAccountId
    ) {
      accountMap.set(
        providerAccountId,
        row,
      );
    }
  }

  return accountMap;
}

async function applyPlaidTransaction({
  transaction,
  workspaceId,
  userId,
  accountMap,
}: {
  transaction:
    Transaction;

  workspaceId:
    string;

  userId:
    string;

  accountMap:
    Map<
      string,
      AccountMapRow
    >;
}): Promise<ApplyTransactionResult> {
  const providerTransactionId =
    normalizeOptionalText(
      transaction.transaction_id,
    );

  const providerAccountId =
    normalizeOptionalText(
      transaction.account_id,
    );

  if (
    !providerTransactionId ||
    !providerAccountId
  ) {
    return {
      status:
        "skipped",

      budgetItemIds:
        [],
    };
  }

  const account =
    accountMap.get(
      providerAccountId,
    );

  if (
    !account ||
    !account.is_active ||
    account.is_archived
  ) {
    return {
      status:
        "skipped",

      budgetItemIds:
        [],
    };
  }

  const existing =
    await findExistingProviderTransaction({
      workspaceId,
      providerTransactionId,
    });

  const pendingProviderTransactionId =
    normalizeOptionalText(
      transaction.pending_transaction_id,
    );

  const pendingExisting =
    !existing &&
    pendingProviderTransactionId
      ? await findExistingProviderTransaction({
          workspaceId,
          providerTransactionId:
            pendingProviderTransactionId,
        })
      : null;

  const preservedBudgetItemId =
    existing?.budget_item_id ??
    pendingExisting?.budget_item_id ??
    null;

  const now =
    new Date().toISOString();

  const mapped =
    mapPlaidTransaction({
      transaction,
      workspaceId,
      userId,
      accountId:
        account.id,
      budgetItemId:
        preservedBudgetItemId,
      now,
    });

  const affectedBudgetItemIds =
    new Set<string>();

  addBudgetItemIds(
    affectedBudgetItemIds,
    [
      existing?.budget_item_id,
      pendingExisting?.budget_item_id,
      preservedBudgetItemId,
    ],
  );

  const admin =
    createWorkspaceAdminClient();

  if (
    existing
  ) {
    const updateRow:
      CaseBudgetTransactionDatabaseUpdate = {
        account_id:
          mapped.account_id,

        updated_by_user_id:
          userId,

        transaction_type:
          mapped.transaction_type,

        status:
          mapped.status,

        transaction_date:
          mapped.transaction_date,

        merchant:
          mapped.merchant,

        description:
          mapped.description,

        amount:
          mapped.amount,

        currency_code:
          mapped.currency_code,

        provider_account_id:
          mapped.provider_account_id,

        provider_pending_transaction_id:
          mapped.provider_pending_transaction_id,

        is_deleted:
          false,

        deleted_at:
          null,

        deleted_by_user_id:
          null,

        updated_at:
          now,
      };

    const {
      error,
    } =
      await admin
        .from(
          TRANSACTIONS_TABLE,
        )
        .update(
          updateRow,
        )
        .eq(
          "id",
          existing.id,
        )
        .eq(
          "workspace_id",
          workspaceId,
        );

    if (
      error
    ) {
      throw new PlaidTransactionSyncServiceError({
        code:
          "transaction-write-failed",

        operation:
          "applyPlaidTransaction",

        message:
          "CASE Budget could not update an imported Plaid transaction.",

        cause:
          error,
      });
    }

    return {
      status:
        "updated",

      budgetItemIds: [
        ...affectedBudgetItemIds,
      ],
    };
  }

  const insertRow:
    CaseBudgetTransactionDatabaseInsert = {
      ...mapped,

      budget_item_id:
        preservedBudgetItemId,
    };

  const {
    error:
      insertError,
  } =
    await admin
      .from(
        TRANSACTIONS_TABLE,
      )
      .insert(
        insertRow,
      );

  if (
    insertError
  ) {
    /*
     * A concurrent retry may have inserted the same provider transaction after
     * our lookup. Re-read it before treating the unique conflict as failure.
     */
    const concurrentExisting =
      await findExistingProviderTransaction({
        workspaceId,
        providerTransactionId,
      });

    if (
      !concurrentExisting
    ) {
      throw new PlaidTransactionSyncServiceError({
        code:
          "transaction-write-failed",

        operation:
          "applyPlaidTransaction",

        message:
          "CASE Budget could not import a Plaid transaction.",

        cause:
          insertError,
      });
    }

    addBudgetItemIds(
      affectedBudgetItemIds,
      [
        concurrentExisting.budget_item_id,
      ],
    );
  }

  if (
    pendingExisting &&
    pendingExisting.provider_transaction_id !==
      providerTransactionId
  ) {
    const pendingDeleteResult =
      await softDeleteTransactionRow({
        transactionId:
          pendingExisting.id,

        workspaceId,

        userId,

        now,
      });

    addBudgetItemIds(
      affectedBudgetItemIds,
      pendingDeleteResult.budgetItemIds,
    );
  }

  return {
    status:
      insertError
        ? "updated"
        : "inserted",

    budgetItemIds: [
      ...affectedBudgetItemIds,
    ],
  };
}

function mapPlaidTransaction({
  transaction,
  workspaceId,
  userId,
  accountId,
  budgetItemId,
  now,
}: {
  transaction:
    Transaction;

  workspaceId:
    string;

  userId:
    string;

  accountId:
    string;

  budgetItemId:
    string | null;

  now:
    string;
}): CaseBudgetTransactionDatabaseInsert {
  const amount =
    normalizeAmount(
      transaction.amount,
    );

  const transactionType =
    deriveTransactionType(
      transaction,
      amount,
    );

  const status:
    CaseBudgetTransactionStatusDatabaseEnum =
    transaction.pending
      ? "pending"
      : "cleared";

  const currencyCode =
    normalizeCurrencyCode(
      transaction.iso_currency_code,
    );

  const merchant =
    normalizeOptionalText(
      transaction.merchant_name,
    ) ??
    normalizeOptionalText(
      transaction.name,
    );

  const description =
    normalizeOptionalText(
      transaction.original_description,
    ) ??
    normalizeOptionalText(
      transaction.name,
    );

  return {
    workspace_id:
      workspaceId,

    created_by_user_id:
      userId,

    updated_by_user_id:
      userId,

    account_id:
      accountId,

    transfer_account_id:
      null,

    budget_item_id:
      budgetItemId,

    transaction_type:
      transactionType,

    status,

    source:
      "plaid",

    transaction_date:
      normalizeTransactionDate(
        transaction.date,
      ),

    merchant,

    description,

    note:
      null,

    amount:
      Math.abs(
        amount,
      ),

    currency_code:
      currencyCode,

    provider:
      PROVIDER,

    provider_transaction_id:
      transaction.transaction_id,

    provider_account_id:
      transaction.account_id,

    provider_pending_transaction_id:
      normalizeOptionalText(
        transaction.pending_transaction_id,
      ),

    is_deleted:
      false,

    deleted_at:
      null,

    deleted_by_user_id:
      null,

    reconciled_at:
      null,

    reconciled_by_user_id:
      null,

    created_at:
      now,

    updated_at:
      now,
  };
}

function deriveTransactionType(
  transaction:
    Transaction,
  amount:
    number,
): CaseBudgetTransactionTypeDatabaseEnum {
  /*
   * IMPORTANT:
   *
   * Plaid's TRANSFER_IN / TRANSFER_OUT personal-finance categories describe
   * the economic nature of a bank transaction. They do not prove that CASE
   * Budget has both sides of an internal account-to-account transfer.
   *
   * CASE Budget's database requires transaction_type = "transfer" to have a
   * valid transfer_account_id. Plaid imports currently map only the source
   * account, so classifying a Plaid category as an internal CASE Budget
   * transfer would violate case_budget_transactions_transfer_state_check.
   *
   * Until CASE Budget explicitly matches both sides of a transfer and can
   * populate transfer_account_id, provider transactions are stored according
   * to Plaid's amount direction:
   *
   *   positive amount -> money leaving the account -> expense
   *   negative amount -> money entering the account -> income
   *
   * A future transfer-matching layer can safely promote matched rows to
   * transaction_type = "transfer" and set transfer_account_id atomically.
   */
  return amount <
    0
    ? "income"
    : "expense";
}

async function findExistingProviderTransaction({
  workspaceId,
  providerTransactionId,
}: {
  workspaceId:
    string;

  providerTransactionId:
    string;
}): Promise<
  ExistingTransactionLookupRow | null
> {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        TRANSACTIONS_TABLE,
      )
      .select(
        TRANSACTION_LOOKUP_SELECT,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "provider",
        PROVIDER,
      )
      .eq(
        "provider_transaction_id",
        providerTransactionId,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new PlaidTransactionSyncServiceError({
      code:
        "transaction-write-failed",

      operation:
        "findExistingProviderTransaction",

      message:
        "CASE Budget could not look up an existing Plaid transaction.",

      cause:
        error,
    });
  }

  return (
    data ??
    null
  ) as unknown as
    ExistingTransactionLookupRow | null;
}

async function softDeleteProviderTransaction({
  providerTransactionId,
  workspaceId,
  userId,
}: {
  providerTransactionId:
    string;

  workspaceId:
    string;

  userId:
    string;
}): Promise<SoftDeleteResult> {
  const existing =
    await findExistingProviderTransaction({
      workspaceId,
      providerTransactionId,
    });

  if (
    !existing ||
    existing.is_deleted
  ) {
    return {
      deleted:
        false,

      budgetItemIds:
        existing?.budget_item_id
          ? [
              existing.budget_item_id,
            ]
          : [],
    };
  }

  return softDeleteTransactionRow({
    transactionId:
      existing.id,

    workspaceId,

    userId,

    now:
      new Date().toISOString(),
  });
}

async function softDeleteTransactionRow({
  transactionId,
  workspaceId,
  userId,
  now,
}: {
  transactionId:
    string;

  workspaceId:
    string;

  userId:
    string;

  now:
    string;
}): Promise<SoftDeleteResult> {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        TRANSACTIONS_TABLE,
      )
      .update({
        is_deleted:
          true,

        deleted_at:
          now,

        deleted_by_user_id:
          userId,

        updated_by_user_id:
          userId,

        updated_at:
          now,
      })
      .eq(
        "id",
        transactionId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .select(
        TRANSACTION_LOOKUP_SELECT,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new PlaidTransactionSyncServiceError({
      code:
        "transaction-delete-failed",

      operation:
        "softDeleteTransactionRow",

      message:
        "CASE Budget could not remove a Plaid transaction that the provider marked as removed.",

      cause:
        error,
    });
  }

  const row =
    (
      data ??
      null
    ) as unknown as
      ExistingTransactionLookupRow | null;

  return {
    deleted:
      Boolean(
        row,
      ),

    budgetItemIds:
      row?.budget_item_id
        ? [
            row.budget_item_id,
          ]
        : [],
  };
}

function addBudgetItemIds(
  target:
    Set<string>,
  values:
    Array<
      string | null | undefined
    >,
) {
  for (
    const value of
      values
  ) {
    const normalized =
      normalizeOptionalText(
        value,
      );

    if (
      normalized
    ) {
      target.add(
        normalized,
      );
    }
  }
}

function normalizeAmount(
  value:
    unknown,
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    throw new PlaidTransactionSyncServiceError({
      code:
        "provider-error",

      operation:
        "normalizeAmount",

      message:
        "Plaid returned a transaction with an invalid amount.",
    });
  }

  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

function normalizeCurrencyCode(
  value:
    unknown,
) {
  const normalized =
    normalizeOptionalText(
      value,
    )?.toUpperCase();

  if (
    normalized &&
    /^[A-Z]{3}$/.test(
      normalized,
    )
  ) {
    return normalized;
  }

  return "USD";
}

function normalizeTransactionDate(
  value:
    unknown,
) {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    throw new PlaidTransactionSyncServiceError({
      code:
        "provider-error",

      operation:
        "normalizeTransactionDate",

      message:
        "Plaid returned a transaction with an invalid transaction date.",
    });
  }

  return normalized;
}

function requireText(
  value:
    unknown,
  fieldName:
    string,
  operation:
    string,
) {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized
  ) {
    throw new PlaidTransactionSyncServiceError({
      code:
        "invalid-input",

      operation,

      message:
        `${fieldName} is required.`,
    });
  }

  return normalized;
}

function normalizeOptionalText(
  value:
    unknown,
) {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
}

function normalizeServiceError(
  error:
    unknown,
  operation:
    string,
) {
  if (
    error instanceof
    PlaidTransactionSyncServiceError
  ) {
    return error;
  }

  const record =
    isRecord(
      error,
    )
      ? error
      : null;

  const providerErrorCode =
    normalizeOptionalText(
      record?.providerErrorCode,
    );

  const providerRequestId =
    normalizeOptionalText(
      record?.providerRequestId,
    );

  if (
    providerErrorCode
  ) {
    return new PlaidTransactionSyncServiceError({
      code:
        "provider-error",

      operation,

      message:
        error instanceof
          Error
          ? error.message
          : "Plaid could not synchronize transactions.",

      providerErrorCode,

      providerRequestId,

      cause:
        error,
    });
  }

  return new PlaidTransactionSyncServiceError({
    code:
      "unknown",

    operation,

    message:
      error instanceof
        Error
        ? error.message
        : "CASE Budget could not synchronize Plaid transactions.",

    cause:
      error,
  });
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
      null
  );
}
