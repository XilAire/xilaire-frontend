import "server-only";

import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";

import {
  after,
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  getPlaidClient,
} from "@/lib/integrations/plaid/client";

import {
  getPlaidItemMetadataByPlaidItemId,
  PlaidItemRepositoryError,
} from "@/lib/repositories/plaid-items";

import {
  syncPlaidTransactions,
  PlaidTransactionSyncServiceError,
} from "@/lib/services/plaid/transaction-sync";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const PLAID_VERIFICATION_HEADER =
  "plaid-verification";

const PLAID_WEBHOOK_ALGORITHM =
  "ES256";

const PLAID_WEBHOOK_MAX_AGE_SECONDS =
  5 * 60;

const PLAID_WEBHOOK_FUTURE_SKEW_SECONDS =
  60;

const MAX_WEBHOOK_BODY_BYTES =
  256 * 1024;

const TRANSACTIONS_WEBHOOK_TYPE =
  "TRANSACTIONS";

const SYNC_UPDATES_AVAILABLE =
  "SYNC_UPDATES_AVAILABLE";

type PlaidWebhookPayload = {
  webhook_type?:
    string;

  webhook_code?:
    string;

  item_id?:
    string;

  environment?:
    string;

  initial_update_complete?:
    boolean;

  historical_update_complete?:
    boolean;
};

type PlaidWebhookJwtHeader = {
  alg:
    string;

  kid:
    string;

  typ?:
    string;
};

type PlaidWebhookJwtClaims = {
  iat:
    number;

  request_body_sha256:
    string;
};

type PlaidWebhookVerificationKey = {
  alg:
    string;

  crv:
    string;

  kid:
    string;

  kty:
    string;

  use:
    string;

  x:
    string;

  y:
    string;

  created_at?:
    number;

  expired_at?:
    number | null;
};

/**
 * Receives authenticated Plaid webhooks.
 *
 * CASE Budget currently acts on the Transactions / SYNC_UPDATES_AVAILABLE
 * webhook because the application uses Plaid /transactions/sync.
 *
 * Plaid webhook authenticity is verified before any provider Item identifier
 * is trusted:
 *
 * 1. Read the raw request body.
 * 2. Read the Plaid-Verification JWT.
 * 3. Require ES256 and extract the JWT key ID.
 * 4. Fetch Plaid's public verification key for that key ID.
 * 5. Verify the JWT signature.
 * 6. Reject stale/replayed JWT timestamps.
 * 7. Compare the JWT request_body_sha256 claim with the exact raw body.
 *
 * The request is acknowledged promptly after verification and Item lookup.
 * The actual transaction synchronization runs through Next.js after(), which
 * allows the response to be returned while server-side work completes.
 *
 * Duplicate webhooks are safe because the transaction sync layer is
 * cursor-based and provider transaction IDs are idempotent.
 */
export async function POST(
  request:
    NextRequest,
) {
  const contentLength =
    request.headers.get(
      "content-length",
    );

  if (
    contentLength
  ) {
    const parsedLength =
      Number(
        contentLength,
      );

    if (
      Number.isFinite(
        parsedLength,
      ) &&
      parsedLength >
        MAX_WEBHOOK_BODY_BYTES
    ) {
      return noStoreJson(
        {
          success:
            false,

          error:
            "Webhook body too large.",
        },
        413,
      );
    }
  }

  const rawBody =
    await request.text();

  if (
    Buffer.byteLength(
      rawBody,
      "utf8",
    ) >
    MAX_WEBHOOK_BODY_BYTES
  ) {
    return noStoreJson(
      {
        success:
          false,

        error:
          "Webhook body too large.",
      },
      413,
    );
  }

  const verificationJwt =
    request.headers.get(
      PLAID_VERIFICATION_HEADER,
    );

  if (
    !verificationJwt
  ) {
    console.warn(
      "[CASE Budget Plaid Webhook] Missing Plaid-Verification header.",
    );

    return noStoreJson(
      {
        success:
          false,

        error:
          "Missing Plaid webhook verification.",
      },
      401,
    );
  }

  try {
    await verifyPlaidWebhook({
      rawBody,
      signedJwt:
        verificationJwt,
    });
  } catch (
    error
  ) {
    console.warn(
      "[CASE Budget Plaid Webhook] Verification failed.",
      {
        message:
          getErrorMessage(
            error,
          ),
      },
    );

    return noStoreJson(
      {
        success:
          false,

        error:
          "Invalid Plaid webhook verification.",
      },
      401,
    );
  }

  let payload:
    PlaidWebhookPayload;

  try {
    payload =
      parseWebhookPayload(
        rawBody,
      );
  } catch (
    error
  ) {
    console.warn(
      "[CASE Budget Plaid Webhook] Invalid JSON payload.",
      {
        message:
          getErrorMessage(
            error,
          ),
      },
    );

    return noStoreJson(
      {
        success:
          false,

        error:
          "Invalid webhook payload.",
      },
      400,
    );
  }

  const webhookType =
    normalizeOptionalText(
      payload.webhook_type,
    )?.toUpperCase() ??
    null;

  const webhookCode =
    normalizeOptionalText(
      payload.webhook_code,
    )?.toUpperCase() ??
    null;

  /*
   * CASE Budget uses /transactions/sync, so SYNC_UPDATES_AVAILABLE is the
   * canonical Transactions webhook. Plaid may also send older transaction
   * webhook types for compatibility; acknowledging them prevents unnecessary
   * retries while avoiding duplicate sync work.
   */
  if (
    webhookType !==
      TRANSACTIONS_WEBHOOK_TYPE ||
    webhookCode !==
      SYNC_UPDATES_AVAILABLE
  ) {
    return noStoreJson(
      {
        success:
          true,

        accepted:
          true,

        processed:
          false,

        webhookType,

        webhookCode,
      },
      200,
    );
  }

  const plaidItemId =
    normalizeOptionalText(
      payload.item_id,
    );

  if (
    !plaidItemId
  ) {
    console.warn(
      "[CASE Budget Plaid Webhook] Transactions webhook is missing item_id.",
      {
        webhookType,
        webhookCode,
      },
    );

    return noStoreJson(
      {
        success:
          false,

        error:
          "Transactions webhook is missing item_id.",
      },
      400,
    );
  }

  let item;

  try {
    item =
      await getPlaidItemMetadataByPlaidItemId({
        plaidItemId,
      });
  } catch (
    error
  ) {
    console.error(
      "[CASE Budget Plaid Webhook] Failed to resolve Plaid Item.",
      {
        plaidItemId,
        message:
          getErrorMessage(
            error,
          ),
      },
    );

    /*
     * A database failure is retryable, so return 500 and allow Plaid's normal
     * webhook retry behavior to deliver the event again.
     */
    return noStoreJson(
      {
        success:
          false,

        error:
          "Unable to resolve Plaid Item.",
      },
      500,
    );
  }

  if (
    !item
  ) {
    /*
     * The webhook is authentic, but this Item is unknown to CASE Budget.
     * Acknowledge it instead of causing Plaid to retry an event that cannot
     * ever be mapped locally.
     */
    console.warn(
      "[CASE Budget Plaid Webhook] Ignoring webhook for unknown Plaid Item.",
      {
        plaidItemId,
        webhookType,
        webhookCode,
      },
    );

    return noStoreJson(
      {
        success:
          true,

        accepted:
          true,

        processed:
          false,

        reason:
          "unknown-item",
      },
      200,
    );
  }

  if (
    item.revokedAt
  ) {
    console.info(
      "[CASE Budget Plaid Webhook] Ignoring webhook for revoked Plaid Item.",
      {
        connectionId:
          item.connectionId,

        plaidItemId:
          item.plaidItemId,
      },
    );

    return noStoreJson(
      {
        success:
          true,

        accepted:
          true,

        processed:
          false,

        reason:
          "revoked-item",
      },
      200,
    );
  }

  const owner = {
    workspaceId:
      item.workspaceId,

    userId:
      item.userId,
  };

  after(
    async () => {
      try {
        const result =
          await syncPlaidTransactions({
            connectionId:
              item.connectionId,

            owner,
          });

        console.info(
          "[CASE Budget Plaid Webhook] Transaction synchronization completed.",
          {
            connectionId:
              item.connectionId,

            plaidItemId:
              item.plaidItemId,

            environment:
              normalizeOptionalText(
                payload.environment,
              ),

            initialUpdateComplete:
              payload.initial_update_complete ??
              null,

            historicalUpdateComplete:
              payload.historical_update_complete ??
              null,

            transactionsReady:
              result.transactionsReady,

            addedCount:
              result.addedCount,

            modifiedCount:
              result.modifiedCount,

            removedCount:
              result.removedCount,

            insertedCount:
              result.insertedCount,

            updatedCount:
              result.updatedCount,

            softDeletedCount:
              result.softDeletedCount,

            skippedCount:
              result.skippedCount,

            affectedBudgetItemCount:
              result.affectedBudgetItemCount,

            pageCount:
              result.pageCount,

            paginationRestartCount:
              result.paginationRestartCount,
          },
        );
      } catch (
        error
      ) {
        logBackgroundSyncError({
          error,
          connectionId:
            item.connectionId,
          plaidItemId:
            item.plaidItemId,
        });
      }
    },
  );

  return noStoreJson(
    {
      success:
        true,

      accepted:
        true,

      processed:
        true,

      webhookType,

      webhookCode,
    },
    200,
  );
}

async function verifyPlaidWebhook({
  rawBody,
  signedJwt,
}: {
  rawBody:
    string;

  signedJwt:
    string;
}) {
  const {
    encodedHeader,
    encodedPayload,
    encodedSignature,
  } =
    splitJwt(
      signedJwt,
    );

  const header =
    decodeJsonSegment<PlaidWebhookJwtHeader>(
      encodedHeader,
      "JWT header",
    );

  if (
    header.alg !==
    PLAID_WEBHOOK_ALGORITHM
  ) {
    throw new Error(
      "Plaid webhook JWT must use ES256.",
    );
  }

  const keyId =
    requireNonEmptyText(
      header.kid,
      "Plaid webhook JWT kid",
    );

  const claims =
    decodeJsonSegment<PlaidWebhookJwtClaims>(
      encodedPayload,
      "JWT payload",
    );

  validateIssuedAt(
    claims.iat,
  );

  const key =
    await getPlaidWebhookVerificationKey(
      keyId,
    );

  if (
    key.alg !==
      PLAID_WEBHOOK_ALGORITHM ||
    key.kid !==
      keyId ||
    key.kty !==
      "EC" ||
    key.crv !==
      "P-256"
  ) {
    throw new Error(
      "Plaid webhook verification key metadata is invalid.",
    );
  }

  if (
    key.expired_at &&
    key.expired_at <=
      Math.floor(
        Date.now() /
        1000,
      )
  ) {
    throw new Error(
      "Plaid webhook verification key is expired.",
    );
  }

  const publicKey =
    createPublicKey({
      key: {
        kty:
          key.kty,

        crv:
          key.crv,

        x:
          key.x,

        y:
          key.y,
      },

      format:
        "jwk",
    });

  const signingInput =
    Buffer.from(
      `${encodedHeader}.${encodedPayload}`,
      "utf8",
    );

  const signature =
    Buffer.from(
      encodedSignature,
      "base64url",
    );

  /*
   * JWS ES256 stores ECDSA signatures as the raw r || s byte sequence.
   * Node's ieee-p1363 mode verifies that representation directly.
   */
  const validSignature =
    verifySignature(
      "sha256",
      signingInput,
      {
        key:
          publicKey,

        dsaEncoding:
          "ieee-p1363",
      },
      signature,
    );

  if (
    !validSignature
  ) {
    throw new Error(
      "Plaid webhook JWT signature is invalid.",
    );
  }

  const claimedBodyHash =
    normalizeSha256Hex(
      claims.request_body_sha256,
    );

  const actualBodyHash =
    createHash(
      "sha256",
    )
      .update(
        rawBody,
        "utf8",
      )
      .digest();

  const claimedBodyHashBuffer =
    Buffer.from(
      claimedBodyHash,
      "hex",
    );

  if (
    claimedBodyHashBuffer.length !==
      actualBodyHash.length ||
    !timingSafeEqual(
      claimedBodyHashBuffer,
      actualBodyHash,
    )
  ) {
    throw new Error(
      "Plaid webhook body hash does not match the verified JWT.",
    );
  }
}

async function getPlaidWebhookVerificationKey(
  keyId:
    string,
): Promise<PlaidWebhookVerificationKey> {
  const plaid =
    getPlaidClient();

  const response =
    await plaid.webhookVerificationKeyGet({
      key_id:
        keyId,
    });

  const key =
    response.data.key;

  if (
    !key
  ) {
    throw new Error(
      "Plaid did not return a webhook verification key.",
    );
  }

  return {
    alg:
      requireNonEmptyText(
        key.alg,
        "verification key alg",
      ),

    crv:
      requireNonEmptyText(
        key.crv,
        "verification key crv",
      ),

    kid:
      requireNonEmptyText(
        key.kid,
        "verification key kid",
      ),

    kty:
      requireNonEmptyText(
        key.kty,
        "verification key kty",
      ),

    use:
      requireNonEmptyText(
        key.use,
        "verification key use",
      ),

    x:
      requireNonEmptyText(
        key.x,
        "verification key x",
      ),

    y:
      requireNonEmptyText(
        key.y,
        "verification key y",
      ),

    created_at:
      typeof key.created_at ===
        "number"
        ? key.created_at
        : undefined,

    expired_at:
      typeof key.expired_at ===
        "number" ||
      key.expired_at ===
        null
        ? key.expired_at
        : undefined,
  };
}

function validateIssuedAt(
  issuedAt:
    unknown,
) {
  if (
    typeof issuedAt !==
      "number" ||
    !Number.isFinite(
      issuedAt,
    )
  ) {
    throw new Error(
      "Plaid webhook JWT iat is invalid.",
    );
  }

  const nowSeconds =
    Math.floor(
      Date.now() /
      1000,
    );

  if (
    issuedAt >
    nowSeconds +
      PLAID_WEBHOOK_FUTURE_SKEW_SECONDS
  ) {
    throw new Error(
      "Plaid webhook JWT was issued in the future.",
    );
  }

  if (
    nowSeconds -
      issuedAt >
    PLAID_WEBHOOK_MAX_AGE_SECONDS
  ) {
    throw new Error(
      "Plaid webhook JWT is too old.",
    );
  }
}

function splitJwt(
  signedJwt:
    string,
) {
  const parts =
    signedJwt.split(
      ".",
    );

  if (
    parts.length !==
    3
  ) {
    throw new Error(
      "Plaid webhook verification header is not a valid JWT.",
    );
  }

  const [
    encodedHeader,
    encodedPayload,
    encodedSignature,
  ] =
    parts;

  if (
    !encodedHeader ||
    !encodedPayload ||
    !encodedSignature
  ) {
    throw new Error(
      "Plaid webhook verification JWT is incomplete.",
    );
  }

  return {
    encodedHeader,
    encodedPayload,
    encodedSignature,
  };
}

function decodeJsonSegment<
  T,
>(
  encoded:
    string,
  label:
    string,
): T {
  try {
    const decoded =
      Buffer.from(
        encoded,
        "base64url",
      ).toString(
        "utf8",
      );

    return JSON.parse(
      decoded,
    ) as T;
  } catch {
    throw new Error(
      `${label} is invalid JSON.`,
    );
  }
}

function normalizeSha256Hex(
  value:
    unknown,
) {
  const normalized =
    normalizeOptionalText(
      value,
    )?.toLowerCase();

  if (
    !normalized ||
    !/^[a-f0-9]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "Plaid webhook request_body_sha256 claim is invalid.",
    );
  }

  return normalized;
}

function parseWebhookPayload(
  rawBody:
    string,
): PlaidWebhookPayload {
  const parsed =
    JSON.parse(
      rawBody,
    ) as unknown;

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throw new Error(
      "Plaid webhook body must be a JSON object.",
    );
  }

  return {
    webhook_type:
      readOptionalString(
        parsed.webhook_type,
      ),

    webhook_code:
      readOptionalString(
        parsed.webhook_code,
      ),

    item_id:
      readOptionalString(
        parsed.item_id,
      ),

    environment:
      readOptionalString(
        parsed.environment,
      ),

    initial_update_complete:
      readOptionalBoolean(
        parsed.initial_update_complete,
      ),

    historical_update_complete:
      readOptionalBoolean(
        parsed.historical_update_complete,
      ),
  };
}

function logBackgroundSyncError({
  error,
  connectionId,
  plaidItemId,
}: {
  error:
    unknown;

  connectionId:
    string;

  plaidItemId:
    string;
}) {
  if (
    error instanceof
    PlaidTransactionSyncServiceError
  ) {
    console.error(
      "[CASE Budget Plaid Webhook] Background transaction synchronization failed.",
      {
        connectionId,
        plaidItemId,
        code:
          error.code,
        operation:
          error.operation,
        providerErrorCode:
          error.providerErrorCode,
        providerRequestId:
          error.providerRequestId,
        message:
          error.message,
      },
    );

    return;
  }

  if (
    error instanceof
    PlaidItemRepositoryError
  ) {
    console.error(
      "[CASE Budget Plaid Webhook] Plaid Item repository failure during background synchronization.",
      {
        connectionId,
        plaidItemId,
        code:
          error.code,
        operation:
          error.operation,
        message:
          error.message,
      },
    );

    return;
  }

  console.error(
    "[CASE Budget Plaid Webhook] Unexpected background synchronization failure.",
    {
      connectionId,
      plaidItemId,
      message:
        getErrorMessage(
          error,
        ),
    },
  );
}

function noStoreJson(
  body:
    unknown,
  status:
    number,
) {
  return NextResponse.json(
    body,
    {
      status,

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

function requireNonEmptyText(
  value:
    unknown,
  label:
    string,
) {
  const normalized =
    normalizeOptionalText(
      value,
    );

  if (
    !normalized
  ) {
    throw new Error(
      `${label} is required.`,
    );
  }

  return normalized;
}

function readOptionalString(
  value:
    unknown,
) {
  return typeof value ===
      "string"
    ? value
    : undefined;
}

function readOptionalBoolean(
  value:
    unknown,
) {
  return typeof value ===
      "boolean"
    ? value
    : undefined;
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

function getErrorMessage(
  error:
    unknown,
) {
  return error instanceof
      Error
    ? error.message
    : String(
        error,
      );
}
