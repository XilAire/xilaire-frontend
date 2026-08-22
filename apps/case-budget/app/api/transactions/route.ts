import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createTransaction,
} from "@/actions/transactions/create-transaction";

import {
  getTransactions,
} from "@/actions/transactions/get-transactions";

import type {
  CreateTransactionData,
} from "@/types/transaction";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const MAX_REQUEST_BODY_BYTES =
  32_768;

/**
 * GET /api/transactions
 *
 * Returns the canonical, non-deleted transactions for the authenticated
 * user's active CASE Budget workspace.
 */
export async function GET() {
  const result =
    await getTransactions();

  if (
    !result.success
  ) {
    return noStoreJson(
      {
        success:
          false,

        data:
          null,

        error:
          result.error,
      },
      {
        status:
          getTransactionErrorStatus(
            result.error.code,
          ),
      },
    );
  }

  return noStoreJson(
    {
      success:
        true,

      data: {
        transactions:
          result.transactions,

        summary:
          result.summary,
      },

      error:
        null,
    },
    {
      status:
        200,
    },
  );
}

/**
 * POST /api/transactions
 *
 * Creates one canonical manual transaction.
 *
 * The active workspace is resolved by the underlying server action from
 * trusted authentication state. workspaceId/userId are intentionally not
 * accepted from the request body.
 */
export async function POST(
  request:
    NextRequest,
) {
  const bodyResult =
    await readJsonObject(
      request,
    );

  if (
    !bodyResult.success
  ) {
    return bodyResult.response;
  }

  const result =
    await createTransaction(
      bodyResult.body as
        CreateTransactionData,
    );

  if (
    !result.success
  ) {
    return noStoreJson(
      {
        success:
          false,

        data:
          null,

        error:
          result.error,
      },
      {
        status:
          getTransactionErrorStatus(
            result.error.code,
          ),
      },
    );
  }

  if (
    result.approvalRequired
  ) {
    return noStoreJson(
      {
        success:
          true,

        data: {
          status:
            result.status,

          transaction:
            null,

          approvalRequired:
            true,

          approval:
            result.approval,
        },

        error:
          null,
      },
      {
        status:
          202,
      },
    );
  }

  return noStoreJson(
    {
      success:
        true,

      data: {
        status:
          result.status,

        transaction:
          result.transaction,

        approvalRequired:
          false,

        approval:
          null,
      },

      error:
        null,
    },
    {
      status:
        201,
    },
  );
}

async function readJsonObject(
  request:
    NextRequest,
):
  Promise<
    | {
        success:
          true;

        body:
          Record<
            string,
            unknown
          >;
      }
    | {
        success:
          false;

        response:
          NextResponse;
      }
  > {
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
        MAX_REQUEST_BODY_BYTES
    ) {
      return {
        success:
          false,

        response:
          noStoreJson(
            {
              success:
                false,

              data:
                null,

              error: {
                code:
                  "request-body-too-large",

                message:
                  "The transaction request body is too large.",
              },
            },
            {
              status:
                413,
            },
          ),
      };
    }
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
    return {
      success:
        false,

      response:
        noStoreJson(
          {
            success:
              false,

            data:
              null,

            error: {
              code:
                "invalid-content-type",

              message:
                "Content-Type must be application/json.",
            },
          },
          {
            status:
              415,
          },
        ),
    };
  }

  let parsed:
    unknown;

  try {
    parsed =
      await request.json();
  } catch {
    return {
      success:
        false,

      response:
        noStoreJson(
          {
            success:
              false,

            data:
              null,

            error: {
              code:
                "invalid-json",

              message:
                "The request body must contain valid JSON.",
            },
          },
          {
            status:
              400,
          },
        ),
    };
  }

  if (
    !isRecord(
      parsed,
    )
  ) {
    return {
      success:
        false,

      response:
        noStoreJson(
          {
            success:
              false,

            data:
              null,

            error: {
              code:
                "invalid-request-body",

              message:
                "The request body must be a JSON object.",
            },
          },
          {
            status:
              400,
          },
        ),
    };
  }

  return {
    success:
      true,

    body:
      parsed,
  };
}

function getTransactionErrorStatus(
  code:
    string,
) {
  switch (
    code
  ) {
    case "permission-denied":
      return 403;

    case "feature-not-available":
      return 403;

    case "workspace-not-found":
    case "transaction-not-found":
    case "account-not-found":
    case "transfer-account-not-found":
    case "budget-item-not-found":
      return 404;

    case "workspace-inactive":
    case "account-unavailable":
    case "transfer-account-unavailable":
    case "budget-item-unavailable":
    case "budget-month-closed":
    case "budget-month-mismatch":
      return 409;

    case "approval-check-failed":
    case "transaction-create-failed":
    case "budget-activity-sync-failed":
    case "transaction-rollback-failed":
    case "transaction-load-failed":
    case "reference-load-failed":
    case "unexpected-error":
      return 500;

    default:
      return 400;
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
      null &&
    !Array.isArray(
      value,
    )
  );
}
