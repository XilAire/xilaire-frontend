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
  updatePlaidItemWebhook,
} from "@/lib/integrations/plaid/items";

import {
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const CASE_BUDGET_PRODUCTION_ORIGIN =
  "https://www.casebudgets.com";

const CASE_BUDGET_PLAID_WEBHOOK_PATH =
  "/api/plaid/webhook";

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
 * Updates the webhook URL for one existing, authenticated Plaid Item.
 *
 * This endpoint exists specifically for Items that were created before
 * CASE Budget began registering its transaction webhook during Link token
 * creation.
 *
 * Security:
 *
 * - The authenticated Supabase user and active workspace are resolved
 *   server-side.
 * - The financial connection must belong to that user/workspace.
 * - The connection must be managed by Plaid.
 * - The encrypted Plaid access token is loaded and decrypted only on the
 *   server.
 * - The browser cannot choose an arbitrary webhook URL.
 * - Production always registers CASE Budget's canonical HTTPS webhook.
 *
 * This route does not return the Plaid access token.
 */
export async function POST(
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
          "This Plaid connection has been disconnected and cannot update its webhook.",

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
          "This Plaid connection has been revoked and cannot update its webhook.",

        status:
          409,
      });
    }

    const webhookUrl =
      getCanonicalPlaidWebhookUrl();

    const result =
      await updatePlaidItemWebhook({
        accessToken:
          plaidItem.accessToken,

        webhookUrl,
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
            plaidItem.plaidItemId,
        },

        webhook: {
          updated:
            result.updated,

          url:
            result.webhookUrl,
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

function getCanonicalPlaidWebhookUrl() {
  return new URL(
    CASE_BUDGET_PLAID_WEBHOOK_PATH,
    CASE_BUDGET_PRODUCTION_ORIGIN,
  ).toString();
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
            error.code
              .toLowerCase()
              .replaceAll(
                "_",
                "-",
              ),

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
    "[CASE Budget Plaid Webhook Update] Unexpected route error.",
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
          "Unable to update the Plaid webhook.",
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
      return "Plaid rejected the webhook update request.";

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
      return "Plaid could not update the webhook at this time.";

    case "unknown":
    default:
      return "Unable to update the Plaid webhook.";
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
