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
  disconnectFinancialConnection,
  FinancialConnectionRepositoryError,
  getFinancialConnectionById,
  type FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

import {
  getPlaidItemWithAccessTokenByConnectionId,
  markPlaidItemRevoked,
  PlaidItemRepositoryError,
} from "@/lib/repositories/plaid-items";

import {
  updatePlaidAccountsConnectionStatus,
  AccountRepositoryError,
} from "@/lib/repositories/accounts";

import {
  removePlaidItem,
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

/**
 * Disconnects one owned financial connection.
 *
 * Current production behavior:
 *
 * - The authenticated user and active workspace are resolved server-side.
 * - Ownership is enforced against both user_id and workspace_id.
 * - Plaid Items are revoked at Plaid before local connection state changes.
 * - An already-removed Plaid Item is treated as idempotently disconnected.
 * - Canonical CASE Budget accounts are preserved for history, but are marked
 *   inactive so they no longer behave like live provider-backed accounts.
 * - Plaid Item metadata remains stored for audit/recovery history.
 * - The financial connection is marked disconnected rather than hard-deleted.
 *
 * Removal is intentionally NOT subscription-gated. A user must always be able
 * to disconnect an existing financial-data connection even if their plan has
 * changed or their subscription is inactive.
 */
export async function DELETE(
  _request:
    NextRequest,
  context: {
    params:
      Promise<{
        connectionId:
          string;
      }>;
  },
) {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const {
      connectionId:
        rawConnectionId,
    } =
      await context.params;

    const connectionId =
      requireNonEmptyString(
        rawConnectionId,
        "connectionId",
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

    /*
     * DELETE is idempotent for a connection CASE Budget already considers
     * disconnected. Returning success allows the UI to safely retry after a
     * network interruption without creating a misleading failure state.
     */
    if (
      connection.status ===
      "disconnected"
    ) {
      return noStoreJson(
        {
          success:
            true,

          connection: {
            id:
              connection.id,

            status:
              "disconnected",
          },

          providerRemoved:
            false,

          alreadyDisconnected:
            true,
        },
        {
          status:
            200,
        },
      );
    }

    if (
      connection.provider !==
      "plaid"
    ) {
      throw new RouteError({
        code:
          "unsupported-provider",

        message:
          "This financial connection provider cannot be removed from this endpoint.",

        status:
          400,
      });
    }

    const plaidItem =
      await getPlaidItemWithAccessTokenByConnectionId({
        connectionId:
          connection.id,

        owner,
      });

    let providerRemoved =
      false;

    if (
      plaidItem &&
      !plaidItem.revokedAt
    ) {
      providerRemoved =
        await removePlaidItemIdempotently(
          plaidItem.accessToken,
        );

      await markPlaidItemRevoked(
        {
          connectionId:
            connection.id,

          owner,
        },
        new Date().toISOString(),
      );
    }

    /*
     * Preserve canonical account history but stop presenting these records as
     * active live accounts after the institution connection is removed.
     */
    await updatePlaidAccountsConnectionStatus({
      scope: {
        workspaceId,
        userId,

        connectionId:
          connection.id,
      },

      status:
        "disconnected",
    });

    const disconnectedConnection =
      await disconnectFinancialConnection({
        connectionId:
          connection.id,

        owner,
      });

    return noStoreJson(
      {
        success:
          true,

        connection: {
          id:
            disconnectedConnection.id,

          status:
            disconnectedConnection.status,

          health:
            disconnectedConnection.health,

          disconnectedAt:
            disconnectedConnection.disconnectedAt,
        },

        providerRemoved,

        alreadyDisconnected:
          false,
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

/**
 * Removes the Item from Plaid.
 *
 * ITEM_NOT_FOUND and invalid-token states are treated as an already-completed
 * provider removal. This makes disconnect behavior safe when the institution
 * or user has already revoked the Item directly at Plaid.
 */
async function removePlaidItemIdempotently(
  accessToken:
    string,
) {
  try {
    await removePlaidItem(
      accessToken,
    );

    return true;
  } catch (
    error
  ) {
    if (
      error instanceof
        PlaidServiceError &&
      (
        error.code ===
          "item-not-found" ||
        error.code ===
          "invalid-token"
      )
    ) {
      return false;
    }

    throw error;
  }
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
    "Unexpected financial connection removal error.",
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
          "CASE Budget could not remove the financial connection.",
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
      return "The financial connection request is invalid.";

    case "not-found":
      return "The requested financial connection could not be found.";

    case "ownership-mismatch":
      return "The financial connection does not belong to this user and workspace.";

    case "duplicate-connection":
      return "A duplicate financial connection already exists.";

    case "database-error":
      return "CASE Budget could not update the financial connection.";

    case "unknown":
    default:
      return "CASE Budget could not remove the financial connection.";
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
      return "Plaid credential storage is not configured correctly.";

    case "invalid-input":
      return "The stored Plaid Item request is invalid.";

    case "not-found":
      return "The stored Plaid Item could not be found.";

    case "ownership-mismatch":
      return "The Plaid Item does not belong to this user and workspace.";

    case "duplicate-item":
      return "A duplicate Plaid Item already exists.";

    case "encryption-error":
      return "CASE Budget could not securely access the stored Plaid credential.";

    case "database-error":
      return "CASE Budget could not update the stored Plaid Item.";

    case "unknown":
    default:
      return "CASE Budget could not update the stored Plaid Item.";
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

function getSafeAccountRepositoryMessage(
  error:
    AccountRepositoryError,
) {
  switch (
    error.code
  ) {
    case "configuration-error":
      return "The account database is not configured correctly.";

    case "invalid-input":
      return "The account update request is invalid.";

    case "not-found":
      return "A connected account could not be found.";

    case "ownership-mismatch":
      return "A connected account does not belong to this connection.";

    case "duplicate-account":
      return "A duplicate connected account already exists.";

    case "database-error":
      return "CASE Budget could not update the connected accounts.";

    case "unknown":
    default:
      return "CASE Budget could not update the connected accounts.";
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

function getSafePlaidErrorMessage(
  error:
    PlaidServiceError,
) {
  switch (
    error.code
  ) {
    case "invalid-request":
    case "invalid-input":
      return "Plaid rejected the connection removal request.";

    case "invalid-token":
    case "item-not-found":
      return "The Plaid connection has already been removed.";

    case "item-login-required":
      return "The financial institution requires the user to reconnect before this operation can be completed.";

    case "institution-unavailable":
      return "The financial institution is temporarily unavailable.";

    case "product-not-ready":
      return "The requested Plaid product is not ready yet.";

    case "rate-limited":
      return "Plaid is temporarily limiting requests. Please try again shortly.";

    case "configuration-error":
      return "The Plaid server configuration is incomplete or invalid.";

    case "provider-error":
      return "Plaid is temporarily unavailable.";

    case "unknown":
    default:
      return "CASE Budget could not remove the Plaid connection.";
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

    case "configuration-error":
      return 503;

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
      "invalid-input",

    message:
      `${fieldName} is required.`,

    status:
      400,
  });
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
  init: {
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
