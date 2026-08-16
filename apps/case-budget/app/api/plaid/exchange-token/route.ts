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
  exchangePlaidPublicToken,
  getPlaidItemStatus,
  removePlaidItem,
  PlaidServiceError,
  type PlaidItemStatus,
} from "@/lib/integrations/plaid/link";

import {
  plaidAccountSyncStore,
} from "@/lib/repositories/accounts";

import {
  createFinancialConnection,
  deleteFinancialConnection,
  FinancialConnectionRepositoryError,
  type FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

import {
  createPlaidItem,
  PlaidItemRepositoryError,
} from "@/lib/repositories/plaid-items";

import {
  PlaidAccountSyncError,
  syncPlaidAccounts,
  type PlaidAccountSyncResult,
} from "@/lib/services/plaid/account-sync";

import {
  isEncryptionConfigured,
} from "@/lib/security/encryption";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type PlaidExchangeTokenRequestBody = {
  publicToken: string;

  institution?: {
    id?: string;
    name?: string;
  };

  accounts?: {
    id: string;
    name?: string;
    mask?: string;
    type?: string;
    subtype?: string;
  }[];

  linkSessionId?: string;
};

type PlaidRequestContext = {
  userId: string;
  workspaceId: string;
};

type PersistPlaidConnectionInput = {
  workspaceId: string;
  userId: string;

  provider: "plaid";
  category: "banking";

  plaidItemId: string;
  plaidAccessToken: string;

  institutionId?: string;
  institutionName?: string;

  selectedAccounts: {
    providerAccountId: string;
    name?: string;
    mask?: string;
    type?: string;
    subtype?: string;
  }[];

  linkSessionId?: string;

  availableProducts: string[];
  billedProducts: string[];
  consentedProducts: string[];

  consentExpirationTime?: string;
  updateType?: string;

  createdAt: string;
};

type PersistedPlaidConnection = {
  id: string;

  workspaceId: string;
  userId: string;

  provider: "plaid";
  category: "banking";

  providerConnectionId: string;
  providerInstitutionId?: string;

  institutionName: string;

  status:
    | "connected"
    | "error";

  createdAt: string;
  updatedAt: string;
};

/**
 * Exchanges a short-lived Plaid public token, stores the resulting access
 * token using server-side encrypted persistence, and performs the initial
 * CASE Budget account synchronization.
 *
 * The Plaid access token is never returned to the browser.
 *
 * Authentication is resolved from the trusted Supabase server session.
 *
 * The active workspace is resolved from the CASE Budget workspace cookie.
 * The browser never supplies user or workspace IDs through custom headers.
 *
 * Successful flow:
 *
 * 1. Validate the authenticated user and active workspace.
 * 2. Validate the incoming Plaid Link payload.
 * 3. Exchange the public token for the Plaid access token and Item ID.
 * 4. Verify the newly created Plaid Item.
 * 5. Create the CASE Budget financial connection.
 * 6. Encrypt and persist the Plaid access token.
 * 7. Persist the selected Plaid accounts.
 * 8. Synchronize the selected Plaid accounts into CASE Budget.
 * 9. Return connection, Item, and synchronization information.
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
     * Enforce the entitlement against the authenticated user's active
     * workspace before accepting the Plaid public token, exchanging it,
     * persisting credentials, or synchronizing any financial accounts.
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

    const context:
      PlaidRequestContext = {
        userId,
        workspaceId,
      };

    const body =
      await readRequestBody(
        request,
      );

    assertPlaidConnectionStorageConfigured();

    const exchangeResult =
      await exchangePlaidPublicToken(
        body.publicToken,
      );

    let itemStatus:
      PlaidItemStatus;

    try {
      itemStatus =
        await getPlaidItemStatus(
          exchangeResult.accessToken,
        );
    } catch (
      error
    ) {
      await safelyRemoveUnpersistedPlaidItem(
        exchangeResult.accessToken,
      );

      throw error;
    }

    const institutionId =
      itemStatus.institutionId ??
      normalizeOptionalText(
        body.institution?.id,
      );

    const institutionName =
      normalizeOptionalText(
        body.institution?.name,
      ) ??
      "Connected institution";

    let connection:
      PersistedPlaidConnection;

    try {
      connection =
        await persistPlaidConnection({
          workspaceId:
            context.workspaceId,

          userId:
            context.userId,

          provider:
            "plaid",

          category:
            "banking",

          plaidItemId:
            exchangeResult.itemId,

          plaidAccessToken:
            exchangeResult.accessToken,

          institutionId,

          institutionName,

          selectedAccounts:
            body.accounts?.map(
              (
                account,
              ) => ({
                providerAccountId:
                  account.id,

                name:
                  normalizeOptionalText(
                    account.name,
                  ),

                mask:
                  normalizeOptionalText(
                    account.mask,
                  ),

                type:
                  normalizeOptionalText(
                    account.type,
                  ),

                subtype:
                  normalizeOptionalText(
                    account.subtype,
                  ),
              }),
            ) ??
            [],

          linkSessionId:
            normalizeOptionalText(
              body.linkSessionId,
            ),

          availableProducts:
            itemStatus.availableProducts.map(
              String,
            ),

          billedProducts:
            itemStatus.billedProducts.map(
              String,
            ),

          consentedProducts:
            itemStatus.consentedProducts.map(
              String,
            ),

          consentExpirationTime:
            itemStatus.consentExpirationTime,

          updateType:
            itemStatus.updateType,

          createdAt:
            new Date().toISOString(),
        });
    } catch (
      error
    ) {
      await safelyRemoveUnpersistedPlaidItem(
        exchangeResult.accessToken,
      );

      throw error;
    }

    const owner:
      FinancialConnectionOwner = {
      workspaceId:
        context.workspaceId,

      userId:
        context.userId,
    };

    let accountSync:
      PlaidAccountSyncResult;

    try {
      accountSync =
        await syncPlaidAccounts({
          connectionId:
            connection.id,

          owner,

          institutionName:
            connection.institutionName,

          trigger:
            "initial",

          mode:
            "standard",

          store:
            plaidAccountSyncStore,
        });
    } catch (
      error
    ) {
      /*
       * At this point the Plaid Item and financial connection have already
       * been securely persisted.
       *
       * Do not delete the Plaid Item here.
       *
       * The account-sync service records the connection sync failure and
       * preserves the connection so the user can retry without reconnecting
       * the institution.
       */
      throw error;
    }

    return noStoreJson(
      {
        connection: {
          id:
            connection.id,

          provider:
            connection.provider,

          category:
            connection.category,

          providerConnectionId:
            connection.providerConnectionId,

          providerInstitutionId:
            connection.providerInstitutionId,

          institutionName:
            connection.institutionName,

          status:
            connection.status,

          createdAt:
            connection.createdAt,

          updatedAt:
            connection.updatedAt,
        },

        item: {
          itemId:
            exchangeResult.itemId,

          institutionId,

          availableProducts:
            itemStatus.availableProducts,

          billedProducts:
            itemStatus.billedProducts,

          consentedProducts:
            itemStatus.consentedProducts,

          consentExpirationTime:
            itemStatus.consentExpirationTime,

          updateType:
            itemStatus.updateType,
        },

        sync: {
          connectionId:
            accountSync.connectionId,

          plaidItemId:
            accountSync.plaidItemId,

          institutionId:
            accountSync.institutionId,

          mode:
            accountSync.mode,

          trigger:
            accountSync.trigger,

          startedAt:
            accountSync.startedAt,

          completedAt:
            accountSync.completedAt,

          receivedAccountCount:
            accountSync.receivedAccountCount,

          selectedAccountCount:
            accountSync.selectedAccountCount,

          createdCount:
            accountSync.createdCount,

          updatedCount:
            accountSync.updatedCount,

          unchangedCount:
            accountSync.unchangedCount,

          deactivatedCount:
            accountSync.deactivatedCount,

          skippedCount:
            accountSync.skippedCount,

          createdAccountIds:
            accountSync.createdAccountIds,

          updatedAccountIds:
            accountSync.updatedAccountIds,

          unchangedAccountIds:
            accountSync.unchangedAccountIds,

          deactivatedAccountIds:
            accountSync.deactivatedAccountIds,

          skippedProviderAccountIds:
            accountSync.skippedProviderAccountIds,

          requestId:
            accountSync.requestId,
        },

        requestId:
          exchangeResult.requestId,
      },
      {
        status:
          201,
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
 * Verifies that the required server-side storage and encryption configuration
 * exists before exchanging the short-lived public token.
 *
 * This prevents creating an orphaned Plaid Item when CASE Budget cannot safely
 * persist the resulting access token.
 */
function assertPlaidConnectionStorageConfigured() {
  if (
    !isEncryptionConfigured()
  ) {
    throw new RouteError({
      code:
        "encryption-not-configured",

      message:
        "CASE Budget token encryption is not configured.",

      status:
        503,
    });
  }

  requireServerEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET",
  );

  requireServerEnvironmentVariable(
    "SUPABASE_SERVICE_ROLE_KEY_CASE_BUDGET",
  );
}

/**
 * Creates the non-secret financial connection and then stores the Plaid Item
 * access token through the encrypted Plaid Item repository.
 *
 * If encrypted secret storage fails, the financial connection metadata record
 * is deleted before the original error is rethrown.
 */
async function persistPlaidConnection(
  input:
    PersistPlaidConnectionInput,
): Promise<PersistedPlaidConnection> {
  const owner:
    FinancialConnectionOwner = {
      workspaceId:
        input.workspaceId,

      userId:
        input.userId,
    };

  const connection =
    await createFinancialConnection({
      workspaceId:
        input.workspaceId,

      userId:
        input.userId,

      provider:
        input.provider,

      category:
        input.category,

      providerConnectionId:
        input.plaidItemId,

      providerInstitutionId:
        input.institutionId,

      institutionName:
        input.institutionName ??
        "Connected institution",

      displayName:
        input.institutionName ??
        "Connected institution",

      status:
        "connected",

      health:
        "healthy",

      capabilities: [
        "accounts",
        "balances",
        "transactions",
        "recurring-transactions",
        "liabilities",
        "investments",
        "investment-holdings",
        "investment-activities",
      ],

      metadata: {
        plaidItemId:
          input.plaidItemId,

        selectedAccountCount:
          input.selectedAccounts.length,

        connectedAt:
          input.createdAt,

        linkSessionId:
          input.linkSessionId ??
          null,
      },
    });

  try {
    await createPlaidItem({
      connectionId:
        connection.id,

      workspaceId:
        input.workspaceId,

      userId:
        input.userId,

      plaidItemId:
        input.plaidItemId,

      accessToken:
        input.plaidAccessToken,

      institutionId:
        input.institutionId,

      availableProducts:
        input.availableProducts,

      billedProducts:
        input.billedProducts,

      consentedProducts:
        input.consentedProducts,

      consentExpirationTime:
        input.consentExpirationTime,

      updateType:
        input.updateType,

      selectedAccounts:
        input.selectedAccounts.map(
          (
            account,
          ) => ({
            providerAccountId:
              account.providerAccountId,

            name:
              account.name,

            mask:
              account.mask,

            type:
              account.type,

            subtype:
              account.subtype,

            isSelected:
              true,

            isActive:
              true,
          }),
        ),

      linkSessionId:
        input.linkSessionId,

      lastVerifiedAt:
        input.createdAt,
    });
  } catch (
    error
  ) {
    await safelyDeleteFinancialConnection({
      connectionId:
        connection.id,

      owner,
    });

    throw error;
  }

  return {
    id:
      connection.id,

    workspaceId:
      connection.workspaceId,

    userId:
      connection.userId,

    provider:
      "plaid",

    category:
      "banking",

    providerConnectionId:
      connection.providerConnectionId ??
      input.plaidItemId,

    providerInstitutionId:
      connection.providerInstitutionId,

    institutionName:
      connection.institutionName,

    status:
      connection.status ===
      "error"
        ? "error"
        : "connected",

    createdAt:
      connection.createdAt,

    updatedAt:
      connection.updatedAt,
  };
}

/**
 * Removes an exchanged Plaid Item when CASE Budget fails before encrypted
 * persistence has completed.
 *
 * Cleanup errors are logged but never replace the original failure.
 */
async function safelyRemoveUnpersistedPlaidItem(
  accessToken:
    string,
) {
  try {
    await removePlaidItem(
      accessToken,
    );
  } catch (
    cleanupError
  ) {
    console.error(
      "Unable to remove an unpersisted Plaid Item after token exchange failure.",
      cleanupError,
    );
  }
}

/**
 * Removes a financial connection metadata record when encrypted Plaid Item
 * persistence fails.
 */
async function safelyDeleteFinancialConnection({
  connectionId,
  owner,
}: {
  connectionId:
    string;

  owner:
    FinancialConnectionOwner;
}) {
  try {
    await deleteFinancialConnection({
      connectionId,
      owner,
    });
  } catch (
    cleanupError
  ) {
    console.error(
      "Unable to roll back the financial connection after Plaid Item persistence failed.",
      cleanupError,
    );
  }
}

function requireServerEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    value
  ) {
    return value;
  }

  throw new RouteError({
    code:
      "storage-not-configured",

    message:
      `Missing required server environment variable ${variableName}.`,

    status:
      503,
  });
}

async function readRequestBody(
  request:
    NextRequest,
): Promise<PlaidExchangeTokenRequestBody> {
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

  const publicToken =
    readRequiredString({
      value:
        parsedBody.publicToken,

      fieldName:
        "publicToken",

      maximumLength:
        2_000,
    });

  const institution =
    readOptionalInstitution(
      parsedBody.institution,
    );

  const accounts =
    readOptionalAccounts(
      parsedBody.accounts,
    );

  const linkSessionId =
    readOptionalString({
      value:
        parsedBody.linkSessionId,

      fieldName:
        "linkSessionId",

      maximumLength:
        500,
    });

  return {
    publicToken,
    institution,
    accounts,
    linkSessionId,
  };
}

function readOptionalInstitution(
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
    !isPlainObject(
      value,
    )
  ) {
    throw new RouteError({
      code:
        "invalid-institution",

      message:
        "institution must be a JSON object.",

      status:
        400,
    });
  }

  const id =
    readOptionalString({
      value:
        value.id,

      fieldName:
        "institution.id",

      maximumLength:
        200,
    });

  const name =
    readOptionalString({
      value:
        value.name,

      fieldName:
        "institution.name",

      maximumLength:
        200,
    });

  if (
    !id &&
    !name
  ) {
    return undefined;
  }

  return {
    id,
    name,
  };
}

function readOptionalAccounts(
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
        "invalid-accounts",

      message:
        "accounts must be an array.",

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
        "too-many-accounts",

      message:
        "accounts cannot contain more than 250 entries.",

      status:
        400,
    });
  }

  const accountIds =
    new Set<string>();

  return value.map(
    (
      accountValue,
      index,
    ) => {
      if (
        !isPlainObject(
          accountValue,
        )
      ) {
        throw new RouteError({
          code:
            "invalid-account",

          message:
            `accounts[${index}] must be a JSON object.`,

          status:
            400,
        });
      }

      const id =
        readRequiredString({
          value:
            accountValue.id,

          fieldName:
            `accounts[${index}].id`,

          maximumLength:
            300,
        });

      if (
        accountIds.has(
          id,
        )
      ) {
        throw new RouteError({
          code:
            "duplicate-account",

          message:
            `accounts contains duplicate account ID "${id}".`,

          status:
            400,
        });
      }

      accountIds.add(
        id,
      );

      return {
        id,

        name:
          readOptionalString({
            value:
              accountValue.name,

            fieldName:
              `accounts[${index}].name`,

            maximumLength:
              200,
          }),

        mask:
          readOptionalString({
            value:
              accountValue.mask,

            fieldName:
              `accounts[${index}].mask`,

            maximumLength:
              20,
          }),

        type:
          readOptionalString({
            value:
              accountValue.type,

            fieldName:
              `accounts[${index}].type`,

            maximumLength:
              100,
          }),

        subtype:
          readOptionalString({
            value:
              accountValue.subtype,

            fieldName:
              `accounts[${index}].subtype`,

            maximumLength:
              100,
          }),
      };
    },
  );
}

function readRequiredString({
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
  const normalizedValue =
    readOptionalString({
      value,
      fieldName,
      maximumLength,
    });

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
      undefined ||
    value ===
      null
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
    PlaidAccountSyncError
  ) {
    return noStoreJson(
      {
        error: {
          code:
            error.code,

          message:
            getSafePlaidAccountSyncErrorMessage(
              error,
            ),

          connectionId:
            error.connectionId,

          requestId:
            error.providerRequestId,
        },
      },
      {
        status:
          getPlaidAccountSyncErrorHttpStatus(
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
    "Unexpected Plaid token exchange route error.",
    error,
  );

  return noStoreJson(
    {
      error: {
        code:
          "internal-server-error",

        message:
          "Unable to connect the financial institution.",
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
      return "This financial institution is already connected.";

    case "database-error":
      return "CASE Budget could not save the financial connection.";

    case "unknown":
    default:
      return "Unable to save the financial connection.";
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
      return "The Plaid Item information is invalid.";

    case "not-found":
      return "The Plaid Item could not be found.";

    case "ownership-mismatch":
      return "The Plaid Item does not belong to this user and workspace.";

    case "duplicate-item":
      return "This Plaid Item is already connected.";

    case "encryption-error":
      return "CASE Budget could not securely encrypt the Plaid connection.";

    case "database-error":
      return "CASE Budget could not save the encrypted Plaid connection.";

    case "unknown":
    default:
      return "Unable to securely save the Plaid connection.";
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

function getSafePlaidAccountSyncErrorMessage(
  error:
    PlaidAccountSyncError,
) {
  switch (
    error.code
  ) {
    case "invalid-input":
      return "The Plaid account synchronization request is invalid.";

    case "plaid-item-not-found":
      return "The Plaid connection was saved, but its secure Item record could not be loaded for account synchronization.";

    case "store-read-failed":
      return "The Plaid connection was saved, but CASE Budget could not load the existing accounts.";

    case "store-write-failed":
      return "The Plaid connection was saved, but CASE Budget could not save the synchronized accounts.";

    case "provider-error":
      return "The Plaid connection was saved, but account data could not be synchronized from the financial institution.";

    case "unknown":
    default:
      return "The Plaid connection was saved, but the initial account synchronization failed.";
  }
}

function getPlaidAccountSyncErrorHttpStatus(
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

    case "provider-error":
      return 502;

    case "store-read-failed":
    case "store-write-failed":
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
      return "Plaid rejected the token exchange request.";

    case "invalid-token":
      return "The Plaid public token is invalid or has expired.";

    case "item-login-required":
      return "The financial institution requires the user to reconnect.";

    case "item-not-found":
      return "The Plaid connection could not be found.";

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
      return "Unable to connect the financial institution.";
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