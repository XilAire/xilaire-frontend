import "server-only";

import type {
  RemovedTransaction,
  Transaction,
  TransactionsSyncRequest,
} from "plaid";

import {
  getPlaidClient,
} from "@/lib/integrations/plaid/client";

export type PlaidTransactionSyncFetchInput = {
  accessToken:
    string;

  cursor?:
    string | null;

  count?:
    number;
};

export type PlaidTransactionSyncPageSummary = {
  requestId:
    string;

  addedCount:
    number;

  modifiedCount:
    number;

  removedCount:
    number;

  hasMore:
    boolean;

  nextCursor:
    string;
};

export type PlaidTransactionSyncFetchResult = {
  startingCursor:
    string | null;

  nextCursor:
    string | null;

  added:
    Transaction[];

  modified:
    Transaction[];

  removed:
    RemovedTransaction[];

  pages:
    PlaidTransactionSyncPageSummary[];

  pageCount:
    number;

  restartCount:
    number;
};

export class PlaidTransactionSyncFetchError extends Error {
  readonly code:
    | "invalid-input"
    | "provider-error"
    | "pagination-mutation"
    | "unexpected-error";

  readonly providerErrorCode:
    string | null;

  readonly providerRequestId:
    string | null;

  constructor({
    message,
    code,
    providerErrorCode,
    providerRequestId,
    cause,
  }: {
    message:
      string;

    code:
      PlaidTransactionSyncFetchError["code"];

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
      "PlaidTransactionSyncFetchError";

    this.code =
      code;

    this.providerErrorCode =
      providerErrorCode ??
      null;

    this.providerRequestId =
      providerRequestId ??
      null;
  }
}

const DEFAULT_PAGE_SIZE =
  500;

const MIN_PAGE_SIZE =
  1;

const MAX_PAGE_SIZE =
  500;

const MAX_PAGINATION_RESTARTS =
  3;

const MUTATION_DURING_PAGINATION_ERROR_CODE =
  "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION";

/**
 * Fetches one complete Plaid /transactions/sync change set.
 *
 * Important behavior:
 *
 * - The caller supplies the last successfully persisted cursor, or null for
 *   the first synchronization.
 * - All pages are fetched before a result is returned.
 * - The returned nextCursor is the cursor from the final successful page.
 * - Nothing is persisted in this module.
 * - If Plaid reports that the transaction stream mutated while pagination
 *   was in progress, the partial page set is discarded and the entire fetch
 *   restarts from the original cursor.
 *
 * This allows the persistence/orchestration layer to apply one complete
 * provider patch and only then commit the returned nextCursor.
 */
export async function getPlaidTransactionUpdates({
  accessToken,
  cursor,
  count,
}: PlaidTransactionSyncFetchInput):
  Promise<PlaidTransactionSyncFetchResult> {
  const normalizedAccessToken =
    requireNonEmptyString(
      accessToken,
      "accessToken",
    );

  const startingCursor =
    normalizeOptionalCursor(
      cursor,
    );

  const pageSize =
    normalizePageSize(
      count,
    );

  let restartCount =
    0;

  while (
    restartCount <=
    MAX_PAGINATION_RESTARTS
  ) {
    try {
      return await fetchCompleteTransactionChangeSet({
        accessToken:
          normalizedAccessToken,

        startingCursor,

        pageSize,

        restartCount,
      });
    } catch (
      error
    ) {
      if (
        !isPaginationMutationError(
          error,
        )
      ) {
        throw normalizePlaidSyncFetchError(
          error,
        );
      }

      if (
        restartCount >=
        MAX_PAGINATION_RESTARTS
      ) {
        const providerError =
          readPlaidError(
            error,
          );

        throw new PlaidTransactionSyncFetchError({
          code:
            "pagination-mutation",

          message:
            "Plaid changed the transaction stream repeatedly while CASE Budget was paging through updates. The sync should be retried.",

          providerErrorCode:
            providerError.errorCode,

          providerRequestId:
            providerError.requestId,

          cause:
            error,
        });
      }

      restartCount +=
        1;
    }
  }

  throw new PlaidTransactionSyncFetchError({
    code:
      "unexpected-error",

    message:
      "CASE Budget could not complete the Plaid transaction synchronization.",
  });
}

async function fetchCompleteTransactionChangeSet({
  accessToken,
  startingCursor,
  pageSize,
  restartCount,
}: {
  accessToken:
    string;

  startingCursor:
    string | null;

  pageSize:
    number;

  restartCount:
    number;
}): Promise<PlaidTransactionSyncFetchResult> {
  const plaid =
    getPlaidClient();

  const added:
    Transaction[] =
    [];

  const modified:
    Transaction[] =
    [];

  const removed:
    RemovedTransaction[] =
    [];

  const pages:
    PlaidTransactionSyncPageSummary[] =
    [];

  let currentCursor =
    startingCursor;

  let nextCursor:
    string | null =
    startingCursor;

  let hasMore =
    true;

  while (
    hasMore
  ) {
    const request:
      TransactionsSyncRequest = {
        access_token:
          accessToken,

        count:
          pageSize,

        ...(currentCursor
          ? {
              cursor:
                currentCursor,
            }
          : {}),
      };

    const response =
      await plaid.transactionsSync(
        request,
      );

    const data =
      response.data;

    added.push(
      ...data.added,
    );

    modified.push(
      ...data.modified,
    );

    removed.push(
      ...data.removed,
    );

    const responseCursor =
      normalizeOptionalCursor(
        data.next_cursor,
      );

    hasMore =
      data.has_more;

    /*
     * Plaid documents that /transactions/sync may return an empty
     * next_cursor when transaction data is not ready yet. This is a valid
     * initialization response and activates future transaction update
     * webhooks. It must not be treated as an application error.
     */
    if (
      !responseCursor
    ) {
      if (
        hasMore
      ) {
        throw new PlaidTransactionSyncFetchError({
          code:
            "provider-error",

          message:
            "Plaid returned has_more=true without a usable transaction cursor.",

          providerRequestId:
            data.request_id,
        });
      }

      nextCursor =
        null;

      break;
    }

    nextCursor =
      responseCursor;

    pages.push({
      requestId:
        data.request_id,

      addedCount:
        data.added.length,

      modifiedCount:
        data.modified.length,

      removedCount:
        data.removed.length,

      hasMore,

      nextCursor:
        responseCursor,
    });

    currentCursor =
      responseCursor;
  }

  return {
    startingCursor,

    nextCursor,

    added,

    modified,

    removed,

    pages,

    pageCount:
      pages.length,

    restartCount,
  };
}

function normalizePageSize(
  value:
    number | undefined,
) {
  if (
    value ===
    undefined
  ) {
    return DEFAULT_PAGE_SIZE;
  }

  if (
    !Number.isInteger(
      value,
    ) ||
    value <
      MIN_PAGE_SIZE ||
    value >
      MAX_PAGE_SIZE
  ) {
    throw new PlaidTransactionSyncFetchError({
      code:
        "invalid-input",

      message:
        `Plaid transaction sync count must be an integer between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}.`,
    });
  }

  return value;
}

function normalizeOptionalCursor(
  value:
    string | null | undefined,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

function requireNonEmptyString(
  value:
    unknown,
  fieldName:
    string,
) {
  if (
    typeof value !==
    "string" ||
    value.trim().length ===
      0
  ) {
    throw new PlaidTransactionSyncFetchError({
      code:
        "invalid-input",

      message:
        `A valid ${fieldName} is required for Plaid transaction synchronization.`,
    });
  }

  return value.trim();
}

function isPaginationMutationError(
  error:
    unknown,
) {
  return (
    readPlaidError(
      error,
    ).errorCode ===
    MUTATION_DURING_PAGINATION_ERROR_CODE
  );
}

function normalizePlaidSyncFetchError(
  error:
    unknown,
) {
  if (
    error instanceof
    PlaidTransactionSyncFetchError
  ) {
    return error;
  }

  const providerError =
    readPlaidError(
      error,
    );

  if (
    providerError.errorCode
  ) {
    return new PlaidTransactionSyncFetchError({
      code:
        "provider-error",

      message:
        providerError.errorMessage ??
        "Plaid could not return transaction updates.",

      providerErrorCode:
        providerError.errorCode,

      providerRequestId:
        providerError.requestId,

      cause:
        error,
    });
  }

  return new PlaidTransactionSyncFetchError({
    code:
      "unexpected-error",

    message:
      error instanceof
        Error
        ? error.message
        : "CASE Budget could not retrieve Plaid transaction updates.",

    cause:
      error,
  });
}

function readPlaidError(
  error:
    unknown,
): {
  errorCode:
    string | null;

  errorMessage:
    string | null;

  requestId:
    string | null;
} {
  if (
    !isRecord(
      error,
    )
  ) {
    return {
      errorCode:
        null,

      errorMessage:
        null,

      requestId:
        null,
    };
  }

  const response =
    isRecord(
      error.response,
    )
      ? error.response
      : null;

  const responseData =
    response &&
    isRecord(
      response.data,
    )
      ? response.data
      : null;

  const directData =
    isRecord(
      error.data,
    )
      ? error.data
      : null;

  const source =
    responseData ??
    directData ??
    error;

  return {
    errorCode:
      readOptionalString(
        source.error_code,
      ),

    errorMessage:
      readOptionalString(
        source.error_message,
      ),

    requestId:
      readOptionalString(
        source.request_id,
      ),
  };
}

function readOptionalString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
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
