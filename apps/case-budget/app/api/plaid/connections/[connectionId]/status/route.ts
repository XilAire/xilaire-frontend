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
  getSubscriptionAccessErrorMessage,
  getSubscriptionAccessErrorStatus,
  isSubscriptionAccessError,
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  getFinancialConnectionById,
  FinancialConnectionRepositoryError,
  type FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

import {
  getPlaidItemWithAccessTokenByConnectionId,
  PlaidItemRepositoryError,
} from "@/lib/repositories/plaid-items";

import {
  getPlaidItemStatus,
} from "@/lib/integrations/plaid/items";

import {
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

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

/**
 * Returns a safe diagnostic view of Plaid Item status for one authenticated
 * CASE Budget financial connection.
 *
 * The Plaid access token is loaded/decrypted only on the server and is never
 * returned to the browser.
 */
export async function GET(
  _request:
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

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "bank-connections",

        workspaceId,
      });

    if (
      !featureAccess
        .access
        .allowed
    ) {
      throw new RouteError({
        code:
          "bank-connections-not-available",

        message:
          "Bank connections require the CASE Budget Pro plan.",

        status:
          403,
      });
    }

    const {
      connectionId,
    } =
      await resolveRouteParams(
        context,
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
          "This financial connection is not managed by Plaid.",

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

    const plaidItem =
      await getPlaidItemWithAccessTokenByConnectionId({
        connectionId:
          connection.id,

        owner,
      });

    if (
      !plaidItem
    ) {
      throw new RouteError({
        code:
          "plaid-item-not-found",

        message:
          "The encrypted Plaid Item could not be found for this connection.",

        status:
          404,
      });
    }

    if (
      plaidItem.revokedAt
    ) {
      throw new RouteError({
        code:
          "plaid-item-revoked",

        message:
          "This Plaid connection has been revoked.",

        status:
          409,
      });
    }

    const status =
      await getPlaidItemStatus({
        accessToken:
          plaidItem.accessToken,
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

          status:
            connection.status,

          health:
            connection.health,
        },

        item: {
          plaidItemId:
            status.itemId,

          updateType:
            status.updateType,

          webhook:
            status.webhook,

          transactions:
            status.transactions,

          lastWebhook:
            status.lastWebhook,

          itemError:
            status.itemError,
        },

        requestId:
          status.requestId,
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
    isSubscriptionAccessError(
      error,
    )
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            getSubscriptionAccessErrorMessage(
              error,
            ),
        },
      },
      {
        status:
          getSubscriptionAccessErrorStatus(
            error,
          ),
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

  if (
    error instanceof
    PlaidItemRepositoryError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            getSafePlaidItemRepositoryMessage(
              error,
            ),
        },
      },
      {
        status:
          getPlaidItemRepositoryHttpStatus(
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

  console.error(
    "[CASE Budget Plaid Status] Unexpected route error.",
    getSafeUnexpectedErrorLog(
      error,
    ),
  );

  return noStoreJson(
    {
      error: {
        code:
          "internal-server-error",

        message:
          "Unable to retrieve Plaid Item status.",
      },
    },
    {
      status:
        500,
    },
  );
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
      return "CASE Budget could not read the financial connection.";

    case "unknown":
    default:
      return "Unable to read the financial connection.";
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

function getSafePlaidItemRepositoryMessage(
  error:
    PlaidItemRepositoryError,
) {
  switch (
    error.code
  ) {
    case "configuration-error":
      return "Secure Plaid credential storage is not configured correctly.";

    case "invalid-input":
      return "The Plaid connection information is invalid.";

    case "not-found":
      return "The encrypted Plaid Item could not be found.";

    case "ownership-mismatch":
      return "The Plaid Item does not belong to this user and workspace.";

    case "duplicate-item":
      return "This Plaid Item is already connected.";

    case "encryption-error":
      return "CASE Budget could not decrypt the Plaid connection securely.";

    case "database-error":
      return "CASE Budget could not retrieve the encrypted Plaid connection.";

    case "unknown":
    default:
      return "Unable to retrieve the encrypted Plaid connection.";
  }
}

function getPlaidItemRepositoryHttpStatus(
  error:
    PlaidItemRepositoryError,
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

    case "duplicate-item":
      return 409;

    case "configuration-error":
      return 503;

    case "encryption-error":
    case "database-error":
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
      return "Plaid rejected the Item status request.";

    case "invalid-token":
      return "The Plaid connection credentials are no longer valid.";

    case "item-login-required":
      return "The financial institution requires the user to reconnect.";

    case "item-not-found":
      return "The Plaid Item could not be found.";

    case "institution-unavailable":
      return "The financial institution is temporarily unavailable.";

    case "product-not-ready":
      return "The requested Plaid product is not ready yet.";

    case "rate-limited":
      return "Plaid is temporarily limiting requests. Please try again shortly.";

    case "configuration-error":
      return "The Plaid server configuration is incomplete or invalid.";

    case "provider-error":
      return "Plaid could not return the Item status at this time.";

    case "unknown":
    default:
      return "Unable to retrieve Plaid Item status.";
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

function getSafeUnexpectedErrorLog(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return {
      name:
        error.name,

      message:
        error.message,
    };
  }

  return {
    type:
      typeof error,

    message:
      "An unexpected non-Error value was thrown.",
  };
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
