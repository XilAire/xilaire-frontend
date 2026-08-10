import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  plaidAccountSyncStore,
  AccountRepositoryError,
} from "@/lib/repositories/accounts";

import {
  getFinancialConnectionById,
  FinancialConnectionRepositoryError,
  type FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

import {
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

import {
  syncPlaidAccounts,
  PlaidAccountSyncError,
  type PlaidAccountSyncMode,
} from "@/lib/services/plaid/account-sync";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params:
    | {
        connectionId:
          string;
      }
    | Promise<{
        connectionId:
          string;
      }>;
};

type PlaidSyncRequestBody = {
  mode?:
    PlaidAccountSyncMode;

  accountIds?:
    string[];
};

const MAX_REQUEST_BODY_BYTES =
  32_768;

/**
 * Synchronizes Plaid accounts for one owned financial connection.
 *
 * Authentication is resolved from the trusted Supabase server session.
 *
 * The active workspace is resolved from the CASE Budget workspace cookie.
 * The browser never supplies user or workspace IDs through custom headers.
 */
export async function POST(
  request:
    NextRequest,
  context:
    RouteContext,
) {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const {
      connectionId,
    } =
      await resolveRouteParams(
        context,
      );

    const body =
      await readRequestBody(
        request,
      );

    const owner:
      FinancialConnectionOwner = {
        userId,

        workspaceId,
      };

    const connection =
      await getFinancialConnectionById({
        connectionId,
        owner,
      });

    if (
      !connection
    ) {
      throw new RouteError({
        code:
          "connection-not-found",

        message:
          "The financial connection could not be found.",

        status:
          404,
      });
    }

    if (
      connection.provider !==
      "plaid"
    ) {
      throw new RouteError({
        code:
          "invalid-provider",

        message:
          "This connection is not managed by Plaid.",

        status:
          400,
      });
    }

    if (
      connection.status ===
      "disconnected"
    ) {
      throw new RouteError({
        code:
          "connection-disconnected",

        message:
          "This Plaid connection has been disconnected.",

        status:
          409,
      });
    }

    if (
      connection.requiresReauthentication
    ) {
      throw new RouteError({
        code:
          "connection-requires-reauthentication",

        message:
          "This Plaid connection must be reconnected before accounts can be synchronized.",

        status:
          409,
      });
    }

    const result =
      await syncPlaidAccounts({
        connectionId:
          connection.id,

        owner,

        institutionName:
          connection.institutionName,

        trigger:
          "manual",

        mode:
          body.mode ??
          "standard",

        accountIds:
          body.accountIds,

        store:
          plaidAccountSyncStore,
      });

    return noStoreJson(
      {
        connection: {
          id:
            connection.id,

          institutionName:
            connection.institutionName,

          provider:
            connection.provider,
        },

        sync: {
          mode:
            result.mode,

          trigger:
            result.trigger,

          startedAt:
            result.startedAt,

          completedAt:
            result.completedAt,

          receivedAccountCount:
            result.receivedAccountCount,

          selectedAccountCount:
            result.selectedAccountCount,

          createdCount:
            result.createdCount,

          updatedCount:
            result.updatedCount,

          unchangedCount:
            result.unchangedCount,

          deactivatedCount:
            result.deactivatedCount,

          skippedCount:
            result.skippedCount,

          createdAccountIds:
            result.createdAccountIds,

          updatedAccountIds:
            result.updatedAccountIds,

          unchangedAccountIds:
            result.unchangedAccountIds,

          deactivatedAccountIds:
            result.deactivatedAccountIds,

          skippedProviderAccountIds:
            result.skippedProviderAccountIds,
        },

        item: {
          plaidItemId:
            result.plaidItemId,

          institutionId:
            result.institutionId,
        },

        requestId:
          result.requestId,
      },
      {
        status:
          200,
      },
    );
  } catch (
    error
  ) {
    return createErrorResponse(
      error,
    );
  }
}

async function resolveRouteParams(
  context:
    RouteContext,
) {
  const params =
    await Promise.resolve(
      context.params,
    );

  return {
    connectionId:
      requireNonEmptyString(
        params.connectionId,
        "connectionId",
      ),
  };
}

async function readRequestBody(
  request:
    NextRequest,
): Promise<PlaidSyncRequestBody> {
  const contentLength =
    request.headers.get(
      "content-length",
    );

  if (
    contentLength ===
      null ||
    contentLength ===
      "0"
  ) {
    return {};
  }

  const parsedContentLength =
    Number(
      contentLength,
    );

  if (
    Number.isFinite(
      parsedContentLength,
    ) &&
    parsedContentLength >
      MAX_REQUEST_BODY_BYTES
  ) {
    throw new RouteError({
      code:
        "request-body-too-large",

      message:
        "The Plaid synchronization request body is too large.",

      status:
        413,
    });
  }

  const contentType =
    request.headers.get(
      "content-type",
    ) ??
    "";

  if (
    !contentType
      .toLowerCase()
      .includes(
        "application/json",
      )
  ) {
    throw new RouteError({
      code:
        "invalid-content-type",

      message:
        "Content-Type must be application/json.",

      status:
        415,
    });
  }

  let parsedBody:
    unknown;

  try {
    parsedBody =
      await request.json();
  } catch {
    throw new RouteError({
      code:
        "invalid-json",

      message:
        "The request body must contain valid JSON.",

      status:
        400,
    });
  }

  if (
    !isPlainObject(
      parsedBody,
    )
  ) {
    throw new RouteError({
      code:
        "invalid-request-body",

      message:
        "The request body must be a JSON object.",

      status:
        400,
    });
  }

  const mode =
    readOptionalSyncMode(
      parsedBody.mode,
    );

  const accountIds =
    readOptionalAccountIds(
      parsedBody.accountIds,
    );

  if (
    mode !==
      "fresh-balances" &&
    accountIds &&
    accountIds.length >
      0
  ) {
    throw new RouteError({
      code:
        "account-ids-require-fresh-balances",

      message:
        "accountIds may only be used with mode fresh-balances.",

      status:
        400,
    });
  }

  return {
    mode,
    accountIds,
  };
}

function readOptionalSyncMode(
  value:
    unknown,
):
  PlaidAccountSyncMode | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    value ===
      "standard" ||
    value ===
      "fresh-balances"
  ) {
    return value;
  }

  throw new RouteError({
    code:
      "invalid-sync-mode",

    message:
      'mode must be either "standard" or "fresh-balances".',

    status:
      400,
  });
}

function readOptionalAccountIds(
  value:
    unknown,
) {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Array.isArray(
      value,
    )
  ) {
    throw new RouteError({
      code:
        "invalid-account-ids",

      message:
        "accountIds must be an array of strings.",

      status:
        400,
    });
  }

  if (
    value.length >
    250
  ) {
    throw new RouteError({
      code:
        "too-many-account-ids",

      message:
        "accountIds cannot contain more than 250 entries.",

      status:
        400,
    });
  }

  const normalizedAccountIds =
    value.map(
      (
        accountId,
        index,
      ) => {
        if (
          typeof accountId !==
          "string"
        ) {
          throw new RouteError({
            code:
              "invalid-account-id",

            message:
              `accountIds[${index}] must be a string.`,

            status:
              400,
          });
        }

        return requireNonEmptyString(
          accountId,
          `accountIds[${index}]`,
        );
      },
    );

  const uniqueAccountIds =
    [
      ...new Set(
        normalizedAccountIds,
      ),
    ];

  if (
    uniqueAccountIds.length !==
    normalizedAccountIds.length
  ) {
    throw new RouteError({
      code:
        "duplicate-account-id",

      message:
        "accountIds cannot contain duplicate values.",

      status:
        400,
    });
  }

  return uniqueAccountIds;
}

function createErrorResponse(
  error:
    unknown,
) {
  if (
    error instanceof
    CaseBudgetServerAuthError
  ) {
    const authErrorResponse =
      getCaseBudgetServerAuthErrorResponse(
        error,
      );

    return noStoreJson(
      authErrorResponse.body,
      {
        status:
          authErrorResponse.status,
      },
    );
  }

  if (
    error instanceof
    RouteError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            error.message,
        },
      },
      {
        status:
          error.status,
      },
    );
  }

  if (
    error instanceof
    PlaidAccountSyncError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            error.message,

          requestId:
            error.providerRequestId,
        },
      },
      {
        status:
          getPlaidAccountSyncHttpStatus(
            error,
          ),
      },
    );
  }

  if (
    error instanceof
    PlaidServiceError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            getSafePlaidErrorMessage(
              error,
            ),

          requestId:
            error.requestId,
        },
      },
      {
        status:
          getPlaidErrorHttpStatus(
            error,
          ),
      },
    );
  }

  if (
    error instanceof
    AccountRepositoryError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            getSafeAccountRepositoryMessage(
              error,
            ),
        },
      },
      {
        status:
          getAccountRepositoryHttpStatus(
            error,
          ),
      },
    );
  }

  if (
    error instanceof
    FinancialConnectionRepositoryError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            getSafeFinancialConnectionRepositoryMessage(
              error,
            ),
        },
      },
      {
        status:
          getFinancialConnectionRepositoryHttpStatus(
            error,
          ),
      },
    );
  }

  console.error(
    "Unexpected Plaid connection sync route error.",
    error,
  );

  return noStoreJson(
    {
      error: {
        code:
          "internal-server-error",

        message:
          "Unable to synchronize the Plaid connection.",
      },
    },
    {
      status:
        500,
    },
  );
}

function getPlaidAccountSyncHttpStatus(
  error:
    PlaidAccountSyncError,
) {
  switch (
    error.code
  ) {
    case "invalid-input":
      return 400;

    case "plaid-item-not-found":
      return 404;

    case "store-read-failed":
    case "store-write-failed":
      return 500;

    case "provider-error":
      return 502;

    case "unknown":
    default:
      return 500;
  }
}

function getSafePlaidErrorMessage(
  error:
    PlaidServiceError,
) {
  switch (
    error.code
  ) {
    case "invalid-request":
    case "invalid-input":
      return "Plaid rejected the account synchronization request.";

    case "invalid-token":
      return "The Plaid connection credentials are no longer valid.";

    case "item-login-required":
      return "The financial institution requires the user to reconnect.";

    case "item-not-found":
      return "The Plaid Item could not be found.";

    case "institution-unavailable":
      return "The financial institution is temporarily unavailable.";

    case "product-not-ready":
      return "The requested Plaid account data is not ready yet.";

    case "rate-limited":
      return "Plaid is temporarily limiting requests. Please try again shortly.";

    case "configuration-error":
      return "Plaid account synchronization is not configured correctly.";

    case "provider-error":
      return "Plaid is temporarily unavailable.";

    case "unknown":
    default:
      return "Unable to synchronize the Plaid connection.";
  }
}

function getPlaidErrorHttpStatus(
  error:
    PlaidServiceError,
) {
  switch (
    error.code
  ) {
    case "invalid-request":
    case "invalid-input":
    case "configuration-error":
      return 400;

    case "invalid-token":
      return 401;

    case "item-login-required":
      return 409;

    case "item-not-found":
      return 404;

    case "product-not-ready":
      return 409;

    case "rate-limited":
      return 429;

    case "institution-unavailable":
    case "provider-error":
      return 503;

    case "unknown":
    default:
      return error.statusCode &&
        error.statusCode >=
          400 &&
        error.statusCode <=
          599
        ? error.statusCode
        : 500;
  }
}

function getSafeAccountRepositoryMessage(
  error:
    AccountRepositoryError,
) {
  switch (
    error.code
  ) {
    case "configuration-error":
      return "The CASE Budget account database is not configured correctly.";

    case "invalid-input":
      return "The account synchronization data is invalid.";

    case "not-found":
      return "The CASE Budget account could not be found.";

    case "ownership-mismatch":
      return "The account does not belong to this user and workspace.";

    case "duplicate-account":
      return "This Plaid account already exists in CASE Budget.";

    case "database-error":
      return "CASE Budget could not save the synchronized accounts.";

    case "unknown":
    default:
      return "Unable to save synchronized accounts.";
  }
}

function getAccountRepositoryHttpStatus(
  error:
    AccountRepositoryError,
) {
  switch (
    error.code
  ) {
    case "invalid-input":
      return 400;

    case "ownership-mismatch":
      return 403;

    case "not-found":
      return 404;

    case "duplicate-account":
      return 409;

    case "configuration-error":
      return 503;

    case "database-error":
    case "unknown":
    default:
      return 500;
  }
}

function getSafeFinancialConnectionRepositoryMessage(
  error:
    FinancialConnectionRepositoryError,
) {
  switch (
    error.code
  ) {
    case "configuration-error":
      return "The financial connection database is not configured correctly.";

    case "invalid-input":
      return "The financial connection information is invalid.";

    case "not-found":
      return "The financial connection could not be found.";

    case "ownership-mismatch":
      return "The financial connection does not belong to this user and workspace.";

    case "duplicate-connection":
      return "This financial connection already exists.";

    case "database-error":
      return "CASE Budget could not read or update the financial connection.";

    case "unknown":
    default:
      return "Unable to read or update the financial connection.";
  }
}

function getFinancialConnectionRepositoryHttpStatus(
  error:
    FinancialConnectionRepositoryError,
) {
  switch (
    error.code
  ) {
    case "invalid-input":
      return 400;

    case "ownership-mismatch":
      return 403;

    case "not-found":
      return 404;

    case "duplicate-connection":
      return 409;

    case "configuration-error":
      return 503;

    case "database-error":
    case "unknown":
    default:
      return 500;
  }
}

function noStoreJson(
  body:
    unknown,
  init:
    {
      status:
        number;
    },
) {
  return NextResponse.json(
    body,
    {
      status:
        init.status,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",

        Pragma:
          "no-cache",

        Expires:
          "0",
      },
    },
  );
}

function requireNonEmptyString(
  value:
    string,
  fieldName:
    string,
) {
  const normalizedValue =
    value?.trim();

  if (
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new RouteError({
    code:
      "required-field-missing",

    message:
      `${fieldName} is required.`,

    status:
      400,
  });
}

function isPlainObject(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
}

class RouteError extends Error {
  readonly code:
    string;

  readonly status:
    number;

  constructor({
    code,
    message,
    status,
  }: {
    code:
      string;

    message:
      string;

    status:
      number;
  }) {
    super(
      message,
    );

    this.name =
      "RouteError";

    this.code =
      code;

    this.status =
      status;
  }
}
