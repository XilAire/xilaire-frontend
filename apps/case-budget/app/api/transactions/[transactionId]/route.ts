import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  deleteTransaction,
} from "@/actions/transactions/delete-transaction";

import {
  getTransactions,
} from "@/actions/transactions/get-transactions";

import {
  updateTransaction,
} from "@/actions/transactions/update-transaction";

import type {
  UpdateTransactionData,
} from "@/types/transaction";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params:
    | {
        transactionId:
          string;
      }
    | Promise<{
        transactionId:
          string;
      }>;
};

const MAX_REQUEST_BODY_BYTES =
  32_768;

/**
 * GET /api/transactions/[transactionId]
 *
 * Returns one canonical transaction from the authenticated active workspace.
 */
export async function GET(
  _request:
    NextRequest,
  context:
    RouteContext,
) {
  const transactionId =
    await resolveTransactionId(
      context,
    );

  if (
    !transactionId
  ) {
    return invalidTransactionIdResponse();
  }

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

  const transaction =
    result.transactions.find(
      (
        currentTransaction,
      ) =>
        currentTransaction.id ===
        transactionId,
    ) ??
    null;

  if (
    !transaction
  ) {
    return noStoreJson(
      {
        success:
          false,

        data:
          null,

        error: {
          code:
            "transaction-not-found",

          message:
            "The selected transaction could not be found in this workspace.",
        },
      },
      {
        status:
          404,
      },
    );
  }

  return noStoreJson(
    {
      success:
        true,

      data: {
        transaction,
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
 * PUT /api/transactions/[transactionId]
 *
 * Updates one canonical manual transaction.
 *
 * The route parameter is authoritative. Any body-supplied id is ignored.
 */
export async function PUT(
  request:
    NextRequest,
  context:
    RouteContext,
) {
  const transactionId =
    await resolveTransactionId(
      context,
    );

  if (
    !transactionId
  ) {
    return invalidTransactionIdResponse();
  }

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
    await updateTransaction({
      ...(
        bodyResult.body as
          Omit<
            UpdateTransactionData,
            "id"
          >
      ),

      id:
        transactionId,
    });

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
        200,
    },
  );
}

/**
 * DELETE /api/transactions/[transactionId]
 *
 * Soft-deletes one canonical manual transaction.
 */
export async function DELETE(
  _request:
    NextRequest,
  context:
    RouteContext,
) {
  const transactionId =
    await resolveTransactionId(
      context,
    );

  if (
    !transactionId
  ) {
    return invalidTransactionIdResponse();
  }

  const result =
    await deleteTransaction({
      transactionId,
    });

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
        200,
    },
  );
}

async function resolveTransactionId(
  context:
    RouteContext,
) {
  const params =
    await Promise.resolve(
      context.params,
    );

  return normalizeRequiredText(
    params.transactionId,
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

function invalidTransactionIdResponse() {
  return noStoreJson(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "invalid-transaction",

        message:
          "A valid transaction ID is required.",
      },
    },
    {
      status:
        400,
    },
  );
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
    case "transaction-deleted":
    case "transaction-already-deleted":
    case "provider-managed":
    case "account-unavailable":
    case "transfer-account-unavailable":
    case "budget-item-unavailable":
    case "budget-month-closed":
    case "budget-month-mismatch":
    case "transaction-update-conflict":
    case "transaction-delete-conflict":
      return 409;

    case "approval-check-failed":
    case "transaction-update-failed":
    case "transaction-delete-failed":
    case "budget-activity-sync-failed":
    case "transaction-rollback-failed":
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

function normalizeRequiredText(
  value:
    unknown,
) {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : null;
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
