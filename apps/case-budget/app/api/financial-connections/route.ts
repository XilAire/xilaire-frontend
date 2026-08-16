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
  listFinancialConnections,
  FinancialConnectionRepositoryError,
} from "@/lib/repositories/financial-connections";

import type {
  FinancialConnectionCategory,
  FinancialConnectionStatus,
  FinancialDataProvider,
} from "@/types/financial-connection";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type FinancialConnectionsQuery = {
  provider?: FinancialDataProvider;
  category?: FinancialConnectionCategory;
  status?: FinancialConnectionStatus;
  includeDisconnected?: boolean;
};

/**
 * Returns non-secret financial connection metadata for the authenticated
 * CASE Budget user and active workspace.
 *
 * This route never reads or returns encrypted provider credentials.
 *
 * Authentication is resolved from the trusted Supabase server session.
 *
 * The active workspace is resolved from the CASE Budget workspace cookie.
 * The browser never supplies user or workspace IDs through custom headers.
 */
export async function GET(
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
     * Financial connection metadata belongs to CASE Budget's Pro-only bank
     * connection capability.
     *
     * Enforce the entitlement against the active workspace before reading
     * filters or querying connection metadata. This prevents Free and Plus
     * workspaces from bypassing UI gating and directly enumerating persisted
     * provider connections through this API.
     *
     * resolveAuthenticatedFeatureAccess() also validates active membership
     * in the supplied workspace before resolving its subscription access.
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

    const query =
      readQueryParameters(
        request,
      );

    const connections =
      await listFinancialConnections(
        {
          userId,

          workspaceId,
        },
        {
          provider:
            query.provider,

          category:
            query.category,

          status:
            query.status,

          includeDisconnected:
            query.includeDisconnected,
        },
      );

    return noStoreJson(
      {
        connections:
          connections.map(
            (
              connection,
            ) => ({
              id:
                connection.id,

              workspaceId:
                connection.workspaceId,

              userId:
                connection.userId,

              provider:
                connection.provider,

              category:
                connection.category,

              providerUserId:
                connection.providerUserId,

              providerConnectionId:
                connection.providerConnectionId,

              providerInstitutionId:
                connection.providerInstitutionId,

              institutionName:
                connection.institutionName,

              institutionLogoUrl:
                connection.institutionLogoUrl,

              displayName:
                connection.displayName,

              status:
                connection.status,

              health:
                connection.health,

              capabilities:
                connection.capabilities,

              lastSyncStatus:
                connection.lastSyncStatus,

              lastSyncTrigger:
                connection.lastSyncTrigger,

              lastSyncStartedAt:
                connection.lastSyncStartedAt,

              lastSyncCompletedAt:
                connection.lastSyncCompletedAt,

              lastSuccessfulSyncAt:
                connection.lastSuccessfulSyncAt,

              lastErrorCode:
                connection.lastErrorCode,

              lastErrorMessage:
                connection.lastErrorMessage,

              requiresReauthentication:
                connection.requiresReauthentication,

              metadata:
                connection.metadata,

              disconnectedAt:
                connection.disconnectedAt,

              createdAt:
                connection.createdAt,

              updatedAt:
                connection.updatedAt,
            }),
          ),

        count:
          connections.length,

        filters: {
          provider:
            query.provider,

          category:
            query.category,

          status:
            query.status,

          includeDisconnected:
            query.includeDisconnected,
        },
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

function readQueryParameters(
  request:
    NextRequest,
): FinancialConnectionsQuery {
  const provider =
    readOptionalProvider(
      request.nextUrl.searchParams.get(
        "provider",
      ),
    );

  const category =
    readOptionalCategory(
      request.nextUrl.searchParams.get(
        "category",
      ),
    );

  const status =
    readOptionalStatus(
      request.nextUrl.searchParams.get(
        "status",
      ),
    );

  const includeDisconnected =
    readOptionalBoolean(
      request.nextUrl.searchParams.get(
        "includeDisconnected",
      ),
      "includeDisconnected",
    );

  return {
    provider,
    category,
    status,

    includeDisconnected:
      includeDisconnected ??
      false,
  };
}

function readOptionalProvider(
  value:
    string | null,
): FinancialDataProvider | undefined {
  const normalizedValue =
    normalizeOptionalText(
      value ??
      undefined,
    );

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  if (
    normalizedValue ===
      "manual" ||
    normalizedValue ===
      "plaid" ||
    normalizedValue ===
      "snaptrade"
  ) {
    return normalizedValue;
  }

  throw new RouteError({
    code:
      "invalid-provider",

    message:
      'provider must be "manual", "plaid", or "snaptrade".',

    status:
      400,
  });
}

function readOptionalCategory(
  value:
    string | null,
): FinancialConnectionCategory | undefined {
  const normalizedValue =
    normalizeOptionalText(
      value ??
      undefined,
    );

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  if (
    normalizedValue ===
      "banking" ||
    normalizedValue ===
      "investments"
  ) {
    return normalizedValue;
  }

  throw new RouteError({
    code:
      "invalid-category",

    message:
      'category must be "banking" or "investments".',

    status:
      400,
  });
}

function readOptionalStatus(
  value:
    string | null,
): FinancialConnectionStatus | undefined {
  const normalizedValue =
    normalizeOptionalText(
      value ??
      undefined,
    );

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  if (
    normalizedValue ===
      "pending" ||
    normalizedValue ===
      "connected" ||
    normalizedValue ===
      "syncing" ||
    normalizedValue ===
      "error" ||
    normalizedValue ===
      "disconnected" ||
    normalizedValue ===
      "reauthentication-required"
  ) {
    return normalizedValue;
  }

  throw new RouteError({
    code:
      "invalid-status",

    message:
      "status is not a supported financial connection status.",

    status:
      400,
  });
}

function readOptionalBoolean(
  value:
    string | null,
  fieldName:
    string,
) {
  const normalizedValue =
    normalizeOptionalText(
      value ??
      undefined,
    )?.toLowerCase();

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  if (
    normalizedValue ===
      "true" ||
    normalizedValue ===
      "1"
  ) {
    return true;
  }

  if (
    normalizedValue ===
      "false" ||
    normalizedValue ===
      "0"
  ) {
    return false;
  }

  throw new RouteError({
    code:
      "invalid-boolean",

    message:
      `${fieldName} must be true or false.`,

    status:
      400,
  });
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
            getSafeRepositoryErrorMessage(
              error,
            ),
        },
      },
      {
        status:
          getRepositoryErrorHttpStatus(
            error,
          ),
      },
    );
  }

  console.error(
    "Unexpected financial connections route error.",
    error,
  );

  return noStoreJson(
    {
      error: {
        code:
          "internal-server-error",

        message:
          "Unable to retrieve financial connections.",
      },
    },
    {
      status:
        500,
    },
  );
}

function getSafeRepositoryErrorMessage(
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
      return "CASE Budget could not retrieve financial connections.";

    case "unknown":
    default:
      return "Unable to retrieve financial connections.";
  }
}

function getRepositoryErrorHttpStatus(
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
