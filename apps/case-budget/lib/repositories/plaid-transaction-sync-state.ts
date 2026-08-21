import "server-only";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

export type PlaidTransactionSyncState = {
  plaidItemDatabaseId: string;
  connectionId: string;
  workspaceId: string;
  userId: string;
  plaidItemId: string;
  cursor: string | null;
  initialSyncCompletedAt: string | null;
  lastSyncedAt: string | null;
  revokedAt: string | null;
};

export type PlaidTransactionSyncStateLookup = {
  connectionId: string;
  owner: FinancialConnectionOwner;
};

export type UpdatePlaidTransactionSyncStateInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;
  cursor: string;
  completedAt?: string;
};

export type ResetPlaidTransactionSyncStateInput = {
  connectionId: string;
  owner: FinancialConnectionOwner;
};

export type PlaidTransactionSyncStateRepositoryErrorCode =
  | "invalid-input"
  | "not-found"
  | "revoked"
  | "database-error"
  | "unknown";

export class PlaidTransactionSyncStateRepositoryError extends Error {
  readonly code:
    PlaidTransactionSyncStateRepositoryErrorCode;

  readonly operation:
    string;

  readonly causeCode?:
    string;

  constructor({
    message,
    code,
    operation,
    causeCode,
    cause,
  }: {
    message: string;
    code:
      PlaidTransactionSyncStateRepositoryErrorCode;
    operation: string;
    causeCode?: string;
    cause?: unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "PlaidTransactionSyncStateRepositoryError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode;
  }
}

type PlaidItemSyncStateRow = {
  id: string;
  connection_id: string;
  workspace_id: string;
  user_id: string;
  plaid_item_id: string;
  transactions_sync_cursor:
    string | null;
  transactions_initial_sync_completed_at:
    string | null;
  transactions_last_synced_at:
    string | null;
  revoked_at:
    string | null;
};

const PLAID_ITEMS_TABLE =
  "plaid_items";

const SYNC_STATE_SELECT = [
  "id",
  "connection_id",
  "workspace_id",
  "user_id",
  "plaid_item_id",
  "transactions_sync_cursor",
  "transactions_initial_sync_completed_at",
  "transactions_last_synced_at",
  "revoked_at",
].join(
  ",",
);

/**
 * Loads durable Plaid /transactions/sync state for one owned connection.
 *
 * Security rules:
 *
 * - connection_id is scoped to the authenticated workspace and user supplied
 *   by trusted server-side code.
 * - No access token is selected or returned.
 * - Revoked Items remain readable so callers can report an explicit revoked
 *   state rather than confusing it with a missing record.
 */
export async function getPlaidTransactionSyncState({
  connectionId,
  owner,
}: PlaidTransactionSyncStateLookup): Promise<
  PlaidTransactionSyncState | null
> {
  const operation =
    "getPlaidTransactionSyncState";

  const normalized =
    normalizeLookup({
      connectionId,
      owner,
      operation,
    });

  try {
    const admin =
      createWorkspaceAdminClient();

    const {
      data,
      error,
    } =
      await admin
        .from(
          PLAID_ITEMS_TABLE,
        )
        .select(
          SYNC_STATE_SELECT,
        )
        .eq(
          "connection_id",
          normalized.connectionId,
        )
        .eq(
          "workspace_id",
          normalized.workspaceId,
        )
        .eq(
          "user_id",
          normalized.userId,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw mapDatabaseError({
        error,
        operation,
        fallbackMessage:
          "CASE Budget could not load Plaid transaction synchronization state.",
      });
    }

    if (
      !data
    ) {
      return null;
    }

    return mapRow(
      data as unknown as
        PlaidItemSyncStateRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError({
      error,
      operation,
      fallbackMessage:
        "CASE Budget could not load Plaid transaction synchronization state.",
    });
  }
}

/**
 * Persists the next Plaid cursor only after a complete synchronization batch
 * has been successfully applied by the caller.
 *
 * The initial-sync timestamp is set once and never moved forward afterward.
 * The last-sync timestamp is updated after every successful completed batch.
 */
export async function completePlaidTransactionSync({
  connectionId,
  owner,
  cursor,
  completedAt,
}: UpdatePlaidTransactionSyncStateInput): Promise<
  PlaidTransactionSyncState
> {
  const operation =
    "completePlaidTransactionSync";

  const normalized =
    normalizeLookup({
      connectionId,
      owner,
      operation,
    });

  const normalizedCursor =
    requireNonEmptyString(
      cursor,
      "cursor",
      operation,
    );

  const normalizedCompletedAt =
    normalizeTimestamp(
      completedAt,
      operation,
    );

  try {
    const existing =
      await getRequiredState({
        connectionId:
          normalized.connectionId,
        owner: {
          workspaceId:
            normalized.workspaceId,
          userId:
            normalized.userId,
        },
        operation,
      });

    if (
      existing.revokedAt
    ) {
      throw new PlaidTransactionSyncStateRepositoryError({
        message:
          "The Plaid Item has been revoked and cannot update transaction synchronization state.",

        code:
          "revoked",

        operation,
      });
    }

    const admin =
      createWorkspaceAdminClient();

    const updateRow = {
      transactions_sync_cursor:
        normalizedCursor,

      transactions_initial_sync_completed_at:
        existing.initialSyncCompletedAt ??
        normalizedCompletedAt,

      transactions_last_synced_at:
        normalizedCompletedAt,

      updated_at:
        normalizedCompletedAt,
    };

    const {
      data,
      error,
    } =
      await admin
        .from(
          PLAID_ITEMS_TABLE,
        )
        .update(
          updateRow,
        )
        .eq(
          "id",
          existing.plaidItemDatabaseId,
        )
        .eq(
          "connection_id",
          normalized.connectionId,
        )
        .eq(
          "workspace_id",
          normalized.workspaceId,
        )
        .eq(
          "user_id",
          normalized.userId,
        )
        .is(
          "revoked_at",
          null,
        )
        .select(
          SYNC_STATE_SELECT,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw mapDatabaseError({
        error,
        operation,
        fallbackMessage:
          "CASE Budget could not save Plaid transaction synchronization state.",
      });
    }

    if (
      !data
    ) {
      throw new PlaidTransactionSyncStateRepositoryError({
        message:
          "The Plaid Item could not be updated because it is missing, revoked, or no longer belongs to this workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return mapRow(
      data as unknown as
        PlaidItemSyncStateRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError({
      error,
      operation,
      fallbackMessage:
        "CASE Budget could not save Plaid transaction synchronization state.",
    });
  }
}

/**
 * Clears the incremental cursor so the next transaction synchronization starts
 * from Plaid's initial sync position again.
 *
 * This is intentionally separate from normal synchronization and should only
 * be used by an explicit repair/rebuild workflow.
 */
export async function resetPlaidTransactionSyncState({
  connectionId,
  owner,
}: ResetPlaidTransactionSyncStateInput): Promise<
  PlaidTransactionSyncState
> {
  const operation =
    "resetPlaidTransactionSyncState";

  const normalized =
    normalizeLookup({
      connectionId,
      owner,
      operation,
    });

  try {
    const existing =
      await getRequiredState({
        connectionId:
          normalized.connectionId,
        owner: {
          workspaceId:
            normalized.workspaceId,
          userId:
            normalized.userId,
        },
        operation,
      });

    if (
      existing.revokedAt
    ) {
      throw new PlaidTransactionSyncStateRepositoryError({
        message:
          "The Plaid Item has been revoked and cannot reset transaction synchronization state.",

        code:
          "revoked",

        operation,
      });
    }

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
          PLAID_ITEMS_TABLE,
        )
        .update({
          transactions_sync_cursor:
            null,

          transactions_initial_sync_completed_at:
            null,

          transactions_last_synced_at:
            null,

          updated_at:
            now,
        })
        .eq(
          "id",
          existing.plaidItemDatabaseId,
        )
        .eq(
          "connection_id",
          normalized.connectionId,
        )
        .eq(
          "workspace_id",
          normalized.workspaceId,
        )
        .eq(
          "user_id",
          normalized.userId,
        )
        .is(
          "revoked_at",
          null,
        )
        .select(
          SYNC_STATE_SELECT,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw mapDatabaseError({
        error,
        operation,
        fallbackMessage:
          "CASE Budget could not reset Plaid transaction synchronization state.",
      });
    }

    if (
      !data
    ) {
      throw new PlaidTransactionSyncStateRepositoryError({
        message:
          "The Plaid Item could not be reset because it is missing, revoked, or no longer belongs to this workspace.",

        code:
          "not-found",

        operation,
      });
    }

    return mapRow(
      data as unknown as
        PlaidItemSyncStateRow,
    );
  } catch (
    error
  ) {
    throw normalizeRepositoryError({
      error,
      operation,
      fallbackMessage:
        "CASE Budget could not reset Plaid transaction synchronization state.",
    });
  }
}

async function getRequiredState({
  connectionId,
  owner,
  operation,
}: {
  connectionId:
    string;

  owner:
    FinancialConnectionOwner;

  operation:
    string;
}) {
  const state =
    await getPlaidTransactionSyncState({
      connectionId,
      owner,
    });

  if (
    !state
  ) {
    throw new PlaidTransactionSyncStateRepositoryError({
      message:
        "The Plaid Item could not be found for this financial connection.",

      code:
        "not-found",

      operation,
    });
  }

  return state;
}

function mapRow(
  row:
    PlaidItemSyncStateRow,
): PlaidTransactionSyncState {
  return {
    plaidItemDatabaseId:
      row.id,

    connectionId:
      row.connection_id,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    plaidItemId:
      row.plaid_item_id,

    cursor:
      row.transactions_sync_cursor,

    initialSyncCompletedAt:
      row.transactions_initial_sync_completed_at,

    lastSyncedAt:
      row.transactions_last_synced_at,

    revokedAt:
      row.revoked_at,
  };
}

function normalizeLookup({
  connectionId,
  owner,
  operation,
}: {
  connectionId:
    unknown;

  owner:
    FinancialConnectionOwner;

  operation:
    string;
}) {
  const normalizedConnectionId =
    requireNonEmptyString(
      connectionId,
      "connectionId",
      operation,
    );

  const normalizedWorkspaceId =
    requireNonEmptyString(
      owner?.workspaceId,
      "owner.workspaceId",
      operation,
    );

  const normalizedUserId =
    requireNonEmptyString(
      owner?.userId,
      "owner.userId",
      operation,
    );

  return {
    connectionId:
      normalizedConnectionId,

    workspaceId:
      normalizedWorkspaceId,

    userId:
      normalizedUserId,
  };
}

function normalizeTimestamp(
  value:
    unknown,
  operation:
    string,
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return new Date().toISOString();
  }

  if (
    typeof value !==
    "string"
  ) {
    throw new PlaidTransactionSyncStateRepositoryError({
      message:
        "completedAt must be a valid ISO timestamp.",

      code:
        "invalid-input",

      operation,
    });
  }

  const normalized =
    value.trim();

  const parsed =
    new Date(
      normalized,
    );

  if (
    !normalized ||
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new PlaidTransactionSyncStateRepositoryError({
      message:
        "completedAt must be a valid ISO timestamp.",

      code:
        "invalid-input",

      operation,
    });
  }

  return parsed.toISOString();
}

function requireNonEmptyString(
  value:
    unknown,
  label:
    string,
  operation:
    string,
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new PlaidTransactionSyncStateRepositoryError({
      message:
        `${label} is required.`,

      code:
        "invalid-input",

      operation,
    });
  }

  const normalized =
    value.trim();

  if (
    !normalized
  ) {
    throw new PlaidTransactionSyncStateRepositoryError({
      message:
        `${label} is required.`,

      code:
        "invalid-input",

      operation,
    });
  }

  return normalized;
}

function mapDatabaseError({
  error,
  operation,
  fallbackMessage,
}: {
  error:
    unknown;

  operation:
    string;

  fallbackMessage:
    string;
}) {
  const record =
    toRecord(
      error,
    );

  return new PlaidTransactionSyncStateRepositoryError({
    message:
      getOptionalString(
        record?.message,
      ) ??
      fallbackMessage,

    code:
      "database-error",

    operation,

    causeCode:
      getOptionalString(
        record?.code,
      ),

    cause:
      error,
  });
}

function normalizeRepositoryError({
  error,
  operation,
  fallbackMessage,
}: {
  error:
    unknown;

  operation:
    string;

  fallbackMessage:
    string;
}) {
  if (
    error instanceof
    PlaidTransactionSyncStateRepositoryError
  ) {
    return error;
  }

  return new PlaidTransactionSyncStateRepositoryError({
    message:
      fallbackMessage,

    code:
      "unknown",

    operation,

    cause:
      error,
  });
}

function toRecord(
  value:
    unknown,
): Record<
  string,
  unknown
> | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function getOptionalString(
  value:
    unknown,
) {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : undefined;
}
