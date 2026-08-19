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
  createPlaidLinkToken,
  createPlaidUpdateLinkToken,
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

import {
  getFinancialConnectionById,
  FinancialConnectionRepositoryError,
  type FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

import {
  getPlaidItemWithAccessTokenByConnectionId,
  PlaidItemRepositoryError,
} from "@/lib/repositories/plaid-items";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type PlaidLinkTokenMode =
  | "create"
  | "update";

type PlaidLinkTokenRequestBody = {
  mode?: PlaidLinkTokenMode;

  connectionId?: string;

  clientName?: string;

  redirectUri?: string;

  webhookUrl?: string;
};

type PlaidRequestContext = {
  userId: string;
  workspaceId: string;
};

type StoredPlaidConnection = {
  id: string;

  userId: string;
  workspaceId: string;

  provider: "plaid";

  accessToken: string;
};

/**
 * Creates a Plaid Link token for the authenticated CASE Budget user.
 *
 * Authentication is resolved from the trusted Supabase server session.
 *
 * The active workspace is resolved from the CASE Budget workspace cookie.
 * The browser never supplies user or workspace IDs through custom headers.
 */
export async function POST(
  request:
    NextRequest,
) {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    /*
     * Bank connections are a Pro-only CASE Budget capability.
     *
     * Enforcement happens on the server against the active workspace.
     * The browser is never trusted to determine whether the current
     * workspace may create or update a Plaid connection.
     *
     * resolveAuthenticatedFeatureAccess() also verifies active workspace
     * membership before resolving that workspace's subscription.
     */
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

    const context:
      PlaidRequestContext = {
        userId,
        workspaceId,
      };

    const body =
      await readRequestBody(
        request,
      );

    const mode =
      body.mode ??
      "create";

    /*
     * IMPORTANT:
     *
     * These async operations must be awaited inside this try block.
     *
     * Returning their unresolved promises directly would allow an
     * asynchronous rejection to escape the surrounding try/catch.
     * That would cause Next.js to return a generic 500 instead of
     * allowing createErrorResponse() to safely translate known
     * Plaid, repository, authentication, and route errors.
     */
    if (
      mode ===
      "update"
    ) {
      return await createUpdateModeLinkToken({
        context,
        body,
      });
    }

    return await createNewConnectionLinkToken({
      context,
      body,
    });
  } catch (
    error
  ) {
    return createErrorResponse(
      error,
    );
  }
}

async function createNewConnectionLinkToken({
  context,
  body,
}: {
  context:
    PlaidRequestContext;

  body:
    PlaidLinkTokenRequestBody;
}) {
  const result =
    await createPlaidLinkToken({
      userId:
        createPlaidClientUserId(
          context,
        ),

      clientName:
        normalizeOptionalText(
          body.clientName,
        ),

      redirectUri:
        normalizeOptionalText(
          body.redirectUri,
        ),

      webhookUrl:
        normalizeOptionalText(
          body.webhookUrl,
        ),
    });

  return noStoreJson(
    {
      linkToken:
        result.linkToken,

      expiration:
        result.expiration,

      requestId:
        result.requestId,
    },
    {
      status:
        200,
    },
  );
}

async function createUpdateModeLinkToken({
  context,
  body,
}: {
  context:
    PlaidRequestContext;

  body:
    PlaidLinkTokenRequestBody;
}) {
  const connectionId =
    requireNonEmptyString(
      body.connectionId,
      "connectionId",
    );

  const connection =
    await getStoredPlaidConnectionForUpdate({
      connectionId,
      context,
    });

  const result =
    await createPlaidUpdateLinkToken({
      userId:
        createPlaidClientUserId(
          context,
        ),

      accessToken:
        connection.accessToken,

      clientName:
        normalizeOptionalText(
          body.clientName,
        ),

      redirectUri:
        normalizeOptionalText(
          body.redirectUri,
        ),

      webhookUrl:
        normalizeOptionalText(
          body.webhookUrl,
        ),

      updateReason:
        "reauthentication",
    });

  return noStoreJson(
    {
      linkToken:
        result.linkToken,

      expiration:
        result.expiration,

      requestId:
        result.requestId,
    },
    {
      status:
        200,
    },
  );
}

/**
 * Loads and decrypts the stored Plaid access token for update mode.
 *
 * Ownership is enforced against both the authenticated user and active
 * workspace before any credential is returned.
 */
async function getStoredPlaidConnectionForUpdate({
  connectionId,
  context,
}: {
  connectionId:
    string;

  context:
    PlaidRequestContext;
}): Promise<StoredPlaidConnection> {
  const owner:
    FinancialConnectionOwner = {
      userId:
        context.userId,

      workspaceId:
        context.workspaceId,
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
        "This Plaid connection has been revoked and cannot be updated.",

      status:
        409,
    });
  }

  return {
    id:
      connection.id,

    userId:
      connection.userId,

    workspaceId:
      connection.workspaceId,

    provider:
      "plaid",

    accessToken:
      plaidItem.accessToken,
  };
}

async function readRequestBody(
  request:
    NextRequest,
): Promise<PlaidLinkTokenRequestBody> {
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
    readOptionalMode(
      parsedBody.mode,
    );

  const connectionId =
    readOptionalString({
      value:
        parsedBody.connectionId,

      fieldName:
        "connectionId",

      maximumLength:
        200,
    });

  const clientName =
    readOptionalString({
      value:
        parsedBody.clientName,

      fieldName:
        "clientName",

      maximumLength:
        100,
    });

  const redirectUri =
    readOptionalAbsoluteUrl({
      value:
        parsedBody.redirectUri,

      fieldName:
        "redirectUri",
    });

  const webhookUrl =
    readOptionalAbsoluteUrl({
      value:
        parsedBody.webhookUrl,

      fieldName:
        "webhookUrl",
    });

  if (
    mode ===
      "update" &&
    !connectionId
  ) {
    throw new RouteError({
      code:
        "connection-id-required",

      message:
        "connectionId is required when mode is update.",

      status:
        400,
    });
  }

  if (
    mode !==
      "update" &&
    connectionId
  ) {
    throw new RouteError({
      code:
        "unexpected-connection-id",

      message:
        "connectionId may only be provided when mode is update.",

      status:
        400,
    });
  }

  return {
    mode,
    connectionId,
    clientName,
    redirectUri,
    webhookUrl,
  };
}

function readOptionalMode(
  value:
    unknown,
): PlaidLinkTokenMode | undefined {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    value ===
      "create" ||
    value ===
      "update"
  ) {
    return value;
  }

  throw new RouteError({
    code:
      "invalid-mode",

    message:
      'mode must be either "create" or "update".',

    status:
      400,
  });
}

function readOptionalString({
  value,
  fieldName,
  maximumLength,
}: {
  value:
    unknown;

  fieldName:
    string;

  maximumLength:
    number;
}) {
  if (
    value ===
      undefined
  ) {
    return undefined;
  }

  if (
    typeof value !==
    "string"
  ) {
    throw new RouteError({
      code:
        "invalid-field-type",

      message:
        `${fieldName} must be a string.`,

      status:
        400,
    });
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  if (
    normalizedValue.length >
    maximumLength
  ) {
    throw new RouteError({
      code:
        "field-too-long",

      message:
        `${fieldName} must be ${maximumLength} characters or fewer.`,

      status:
        400,
    });
  }

  return normalizedValue;
}

function readOptionalAbsoluteUrl({
  value,
  fieldName,
}: {
  value:
    unknown;

  fieldName:
    string;
}) {
  const normalizedValue =
    readOptionalString({
      value,
      fieldName,
      maximumLength:
        2_000,
    });

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  let parsedUrl:
    URL;

  try {
    parsedUrl =
      new URL(
        normalizedValue,
      );
  } catch {
    throw new RouteError({
      code:
        "invalid-url",

      message:
        `${fieldName} must be a valid absolute URL.`,

      status:
        400,
    });
  }

  if (
    parsedUrl.protocol !==
      "https:" &&
    !isLocalDevelopmentUrl(
      parsedUrl,
    )
  ) {
    throw new RouteError({
      code:
        "insecure-url",

      message:
        `${fieldName} must use HTTPS outside localhost development.`,

      status:
        400,
    });
  }

  return parsedUrl.toString();
}

function createPlaidClientUserId(
  context:
    PlaidRequestContext,
) {
  return [
    "case-budget",
    context.workspaceId,
    context.userId,
  ].join(
    ":",
  );
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
    "Unexpected Plaid Link token route error.",
    error,
  );

  return noStoreJson(
    {
      error: {
        code:
          "internal-server-error",

        message:
          "Unable to create a Plaid Link token.",
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
      return "This financial connection already exists.";

    case "database-error":
      return "CASE Budget could not retrieve the financial connection.";

    case "unknown":
    default:
      return "Unable to retrieve the financial connection.";
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
      return "Plaid rejected the Link token request configuration.";

    case "invalid-token":
      return "The Plaid connection credentials are no longer valid.";

    case "item-login-required":
      return "The financial institution requires the user to reconnect.";

    case "item-not-found":
      return "The requested Plaid connection could not be found.";

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
      return "Unable to create a Plaid Link token.";
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

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function requireNonEmptyString(
  value:
    string | undefined,
  fieldName:
    string,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

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

function isLocalDevelopmentUrl(
  url:
    URL,
) {
  return (
    url.protocol ===
      "http:" &&
    (
      url.hostname ===
        "localhost" ||
      url.hostname ===
        "127.0.0.1" ||
      url.hostname ===
        "[::1]"
    )
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