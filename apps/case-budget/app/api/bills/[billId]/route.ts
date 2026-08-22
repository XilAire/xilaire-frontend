import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  createTransaction,
} from "@/actions/transactions/create-transaction";

import {
  deleteTransaction,
} from "@/actions/transactions/delete-transaction";

import {
  BillStorageError,
  deleteBill,
  getBill,
  updateBill,
} from "@/lib/bills/bill-storage";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import type {
  BillData,
} from "@/types/bill";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type BillsApiSuccessResponse<
  Data,
> = {
  success:
    true;

  data:
    Data;

  error:
    null;
};

type BillsApiErrorResponse = {
  success:
    false;

  data:
    null;

  error: {
    code:
      string;

    message:
      string;
  };
};

type BillsApiResponse<
  Data,
> =
  | BillsApiSuccessResponse<Data>
  | BillsApiErrorResponse;

type BillRouteContext = {
  params:
    Promise<{
      billId:
        string;
    }>;
};

type UpdateBillRequestBody = {
  bill:
    BillData;
};

/**
 * GET /api/bills/[billId]
 *
 * Returns one bill belonging to the authenticated user and active
 * CASE Budget workspace.
 */
export async function GET(
  _request:
    NextRequest,
  context:
    BillRouteContext,
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
          "bills",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return createFeatureNotAvailableResponse({
        reason:
          featureAccess.access.reason,

        requiredPlan:
          featureAccess.access.requiredPlan,
      });
    }

    const {
      billId,
    } =
      await context.params;

    const normalizedBillId =
      normalizeRequiredText(
        billId,
      );

    if (
      !normalizedBillId
    ) {
      return createValidationErrorResponse(
        "A valid bill ID is required.",
      );
    }

    const bill =
      await getBill({
        userId,
        workspaceId,
        billId:
          normalizedBillId,
      });

    if (
      !bill
    ) {
      return NextResponse.json<
        BillsApiErrorResponse
      >(
        {
          success:
            false,

          data:
            null,

          error: {
            code:
              "not-found",

            message:
              "The requested CASE Budget bill could not be found.",
          },
        },
        {
          status:
            404,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json<
      BillsApiResponse<{
        bill:
          BillData;
      }>
    >(
      {
        success:
          true,

        data: {
          bill,
        },

        error:
          null,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    return createBillsApiErrorResponse(
      error,
    );
  }
}

/**
 * PUT /api/bills/[billId]
 *
 * Replaces the persisted bill values using the supplied BillData.
 *
 * When a bill transitions to paid and has both an account and budget item,
 * CASE Budget creates one canonical cleared expense and stores its ID on
 * paymentTransactionId. The persisted paymentTransactionId is authoritative
 * so stale browser payloads cannot clear the link or create duplicates.
 */
export async function PUT(
  request:
    NextRequest,
  context:
    BillRouteContext,
) {
  return handleUpdateBillRequest({
    request,
    context,
  });
}

/**
 * PATCH /api/bills/[billId]
 *
 * Supported as an alias of PUT because the current CASE Budget
 * provider works with complete BillData objects rather than partial
 * database patches.
 */
export async function PATCH(
  request:
    NextRequest,
  context:
    BillRouteContext,
) {
  return handleUpdateBillRequest({
    request,
    context,
  });
}

/**
 * DELETE /api/bills/[billId]
 *
 * Deletes one bill belonging to the authenticated user and active
 * CASE Budget workspace.
 */
export async function DELETE(
  _request:
    NextRequest,
  context:
    BillRouteContext,
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
          "bills",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return createFeatureNotAvailableResponse({
        reason:
          featureAccess.access.reason,

        requiredPlan:
          featureAccess.access.requiredPlan,
      });
    }

    const {
      billId,
    } =
      await context.params;

    const normalizedBillId =
      normalizeRequiredText(
        billId,
      );

    if (
      !normalizedBillId
    ) {
      return createValidationErrorResponse(
        "A valid bill ID is required.",
      );
    }

    await deleteBill({
      userId,
      workspaceId,
      billId:
        normalizedBillId,
    });

    return NextResponse.json<
      BillsApiResponse<{
        billId:
          string;
      }>
    >(
      {
        success:
          true,

        data: {
          billId:
            normalizedBillId,
        },

        error:
          null,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (
    error
  ) {
    return createBillsApiErrorResponse(
      error,
    );
  }
}

async function handleUpdateBillRequest({
  request,
  context,
}: {
  request:
    NextRequest;

  context:
    BillRouteContext;
}) {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "bills",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return createFeatureNotAvailableResponse({
        reason:
          featureAccess.access.reason,

        requiredPlan:
          featureAccess.access.requiredPlan,
      });
    }

    const {
      billId,
    } =
      await context.params;

    const normalizedBillId =
      normalizeRequiredText(
        billId,
      );

    if (
      !normalizedBillId
    ) {
      return createValidationErrorResponse(
        "A valid bill ID is required.",
      );
    }

    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      !isUpdateBillRequestBody(
        requestBody,
      )
    ) {
      return createValidationErrorResponse(
        "A valid bill payload is required.",
      );
    }

    const normalizedBodyBillId =
      normalizeRequiredText(
        requestBody.bill.id,
      );

    if (
      normalizedBodyBillId !==
      normalizedBillId
    ) {
      return createValidationErrorResponse(
        "The bill ID in the request body must match the bill ID in the route.",
      );
    }

    /*
     * Reload the persisted bill before every update.
     *
     * The database is authoritative for paymentTransactionId. This prevents
     * an older browser snapshot from clearing the payment link and causing a
     * duplicate expense on a later retry.
     */
    const existingBill =
      await getBill({
        userId,
        workspaceId,
        billId:
          normalizedBillId,
      });

    if (
      !existingBill
    ) {
      return NextResponse.json<
        BillsApiErrorResponse
      >(
        {
          success:
            false,

          data:
            null,

          error: {
            code:
              "not-found",

            message:
              "The requested CASE Budget bill could not be found.",
          },
        },
        {
          status:
            404,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const requestedBill:
      BillData = {
        ...requestBody.bill,

        /*
         * Never trust the browser to create, replace, or clear the canonical
         * payment transaction relationship.
         */
        ...(existingBill.paymentTransactionId
          ? {
              paymentTransactionId:
                existingBill.paymentTransactionId,
            }
          : {
              paymentTransactionId:
                undefined,
            }),
      };

    const isPaidTransition =
      existingBill.status !==
        "paid" &&
      requestedBill.status ===
        "paid";

    /*
     * Only budget-synced bills create canonical categorized expenses here.
     *
     * A bill without budget sync can still be marked paid without creating
     * a budget transaction. This preserves the existing Bills behavior for
     * reminders/tracking-only bills.
     */
    const shouldCreatePaymentTransaction =
      isPaidTransition &&
      !existingBill.paymentTransactionId &&
      requestedBill.budgetSync?.enabled ===
        true;

    if (
      !shouldCreatePaymentTransaction
    ) {
      const savedBill =
        await updateBill({
          userId,
          workspaceId,
          bill:
            requestedBill,
        });

      return createBillSuccessResponse(
        savedBill,
      );
    }

    const accountId =
      normalizeRequiredText(
        requestedBill.account?.id,
      );

    if (
      !accountId
    ) {
      return createBillPaymentErrorResponse({
        code:
          "payment-account-required",

        message:
          "Select an account before marking this budget-synced bill as paid.",

        status:
          400,
      });
    }

    const budgetItemId =
      normalizeRequiredText(
        requestedBill.budgetItem?.id,
      );

    if (
      !budgetItemId
    ) {
      return createBillPaymentErrorResponse({
        code:
          "payment-budget-item-required",

        message:
          "Select a budget item before marking this budget-synced bill as paid.",

        status:
          400,
      });
    }

    const paidDate =
      normalizeRequiredText(
        requestedBill.paidDate,
      ) ||
      normalizeRequiredText(
        requestedBill.dueDate,
      );

    if (
      !paidDate
    ) {
      return createBillPaymentErrorResponse({
        code:
          "payment-date-required",

        message:
          "A valid paid date is required before this bill can be marked paid.",

        status:
          400,
      });
    }

    const merchant =
      normalizeRequiredText(
        requestedBill.payee,
      ) ||
      normalizeRequiredText(
        requestedBill.name,
      );

    if (
      !merchant
    ) {
      return createBillPaymentErrorResponse({
        code:
          "payment-merchant-required",

        message:
          "A bill name or payee is required before this bill can be marked paid.",

        status:
          400,
      });
    }

    const paymentAmount =
      requestedBill.amountType ===
        "variable"
        ? requestedBill.paidAmount
        : requestedBill.amount;

    if (
      paymentAmount ===
        undefined ||
      !Number.isFinite(
        paymentAmount,
      ) ||
      paymentAmount <=
        0
    ) {
      return createBillPaymentErrorResponse({
        code:
          "payment-amount-required",

        message:
          requestedBill.amountType ===
            "variable"
            ? "Enter the actual amount paid before marking this variable bill as paid."
            : "A valid payment amount is required before this bill can be marked paid.",

        status:
          400,
      });
    }

    const transactionResult =
      await createTransaction({
        date:
          paidDate,

        merchant,

        note:
          buildBillPaymentTransactionNote(
            requestedBill,
          ),

        amount:
          paymentAmount,

        type:
          "expense",

        status:
          "cleared",

        accountId,

        categoryId:
          budgetItemId,
      });

    if (
      !transactionResult.success
    ) {
      return createBillPaymentErrorResponse({
        code:
          `transaction-${transactionResult.error.code}`,

        message:
          transactionResult.error.message,

        status:
          400,
      });
    }

    if (
      transactionResult.status ===
        "approval-required"
    ) {
      /*
       * createTransaction intentionally inserts no transaction when household
       * approval is required. Therefore the bill must remain unpaid and must
       * not receive a paymentTransactionId yet.
       */
      return createBillPaymentErrorResponse({
        code:
          "payment-approval-required",

        message:
          "This bill payment requires household approval. The bill was not marked paid because the expense transaction has not been created yet.",

        status:
          409,
      });
    }

    const createdTransaction =
      transactionResult.transaction;

    const billWithPayment:
      BillData = {
        ...requestedBill,

        status:
          "paid",

        paidDate,

        paidAmount:
          paymentAmount,

        paymentTransactionId:
          createdTransaction.id,
      };

    try {
      const savedBill =
        await updateBill({
          userId,
          workspaceId,
          bill:
            billWithPayment,
        });

      return createBillSuccessResponse(
        savedBill,
      );
    } catch (
      billUpdateError
    ) {
      console.error(
        "[CASE Budget Bill API] Bill update failed after payment transaction creation. Attempting transaction rollback.",
        {
          userId,
          workspaceId,

          billId:
            normalizedBillId,

          transactionId:
            createdTransaction.id,

          error:
            serializeUnknownError(
              billUpdateError,
            ),
        },
      );

      const rollbackResult =
        await deleteTransaction({
          transactionId:
            createdTransaction.id,
        });

      if (
        !rollbackResult.success ||
        rollbackResult.status !==
          "deleted"
      ) {
        console.error(
          "[CASE Budget Bill API] Payment transaction rollback failed after bill update failure.",
          {
            userId,
            workspaceId,

            billId:
              normalizedBillId,

            transactionId:
              createdTransaction.id,

            rollbackResult,
          },
        );

        return createBillPaymentErrorResponse({
          code:
            "payment-link-rollback-failed",

          message:
            "CASE Budget created the payment transaction but could not save its link to the bill or safely roll the transaction back. Refresh your data before trying again.",

          status:
            500,
        });
      }

      /*
       * The canonical delete action recalculates Budget activity after the
       * compensating delete, so it is safe to surface the original bill
       * storage error after rollback succeeds.
       */
      throw billUpdateError;
    }
  } catch (
    error
  ) {
    return createBillsApiErrorResponse(
      error,
    );
  }
}

function createBillSuccessResponse(
  bill:
    BillData,
) {
  return NextResponse.json<
    BillsApiResponse<{
      bill:
        BillData;
    }>
  >(
    {
      success:
        true,

      data: {
        bill,
      },

      error:
        null,
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createBillPaymentErrorResponse({
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
  return NextResponse.json<
    BillsApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code,
        message,
      },
    },
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function buildBillPaymentTransactionNote(
  bill:
    BillData,
) {
  const billNote =
    normalizeRequiredText(
      bill.note,
    );

  const systemNote =
    `CASE Budget bill payment: ${bill.id}`;

  return billNote
    ? `${systemNote} — ${billNote}`
    : systemNote;
}

async function readJsonRequestBody(
  request:
    NextRequest,
): Promise<unknown | null> {
  const contentType =
    request.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .includes(
        "application/json",
      )
  ) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isUpdateBillRequestBody(
  value:
    unknown,
): value is UpdateBillRequestBody {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  return isBillData(
    value.bill,
  );
}

/**
 * Performs lightweight route-boundary validation.
 *
 * bill-storage.ts remains the authoritative validator for persisted
 * bill values.
 */
function isBillData(
  value:
    unknown,
): value is BillData {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  if (
    typeof value.id !==
      "string" ||
    !value.id.trim()
  ) {
    return false;
  }

  if (
    typeof value.name !==
      "string" ||
    !value.name.trim()
  ) {
    return false;
  }

  if (
    typeof value.amount !==
      "number" ||
    !Number.isFinite(
      value.amount,
    )
  ) {
    return false;
  }

  if (
    value.amountType !==
      "fixed" &&
    value.amountType !==
      "variable"
  ) {
    return false;
  }

  if (
    value.paidAmount !==
      undefined &&
    (
      typeof value.paidAmount !==
        "number" ||
      !Number.isFinite(
        value.paidAmount,
      ) ||
      value.paidAmount <
        0
    )
  ) {
    return false;
  }

  if (
    typeof value.dueDate !==
      "string" ||
    !value.dueDate.trim()
  ) {
    return false;
  }

  if (
    typeof value.status !==
      "string"
  ) {
    return false;
  }

  if (
    typeof value.frequency !==
      "string"
  ) {
    return false;
  }

  if (
    typeof value.paymentMethod !==
      "string"
  ) {
    return false;
  }

  if (
    typeof value.createdAt !==
      "string" ||
    !value.createdAt.trim()
  ) {
    return false;
  }

  if (
    typeof value.updatedAt !==
      "string" ||
    !value.updatedAt.trim()
  ) {
    return false;
  }

  if (
    !isRecord(
      value.reminder,
    )
  ) {
    return false;
  }

  if (
    typeof value.reminder.enabled !==
      "boolean" ||
    typeof value.reminder.timing !==
      "string"
  ) {
    return false;
  }

  return true;
}

function createFeatureNotAvailableResponse({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  return NextResponse.json<
    BillsApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "feature-not-available",

        message:
          getBillsFeatureAccessMessage({
            reason,
            requiredPlan,
          }),
      },
    },
    {
      status:
        403,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function getBillsFeatureAccessMessage({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  switch (
    reason
  ) {
    case "inactive-subscription":
      return "Bills are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Bills require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Bills require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Bills require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Bills require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Bills are not available for the current workspace subscription.";
    }
  }
}

function createValidationErrorResponse(
  message:
    string,
) {
  return NextResponse.json<
    BillsApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "invalid-request",

        message,
      },
    },
    {
      status:
        400,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function createBillsApiErrorResponse(
  error:
    unknown,
) {
  if (
    error instanceof
    CaseBudgetServerAuthError
  ) {
    const {
      status,
      body,
    } =
      getCaseBudgetServerAuthErrorResponse(
        error,
      );

    return NextResponse.json<
      BillsApiErrorResponse
    >(
      {
        success:
          false,

        data:
          null,

        error: {
          code:
            body.error.code,

          message:
            body.error.message,
        },
      },
      {
        status,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  if (
    error instanceof
    BillStorageError
  ) {
    return NextResponse.json<
      BillsApiErrorResponse
    >(
      {
        success:
          false,

        data:
          null,

        error: {
          code:
            error.code,

          message:
            error.message,
        },
      },
      {
        status:
          getBillStorageHttpStatus(
            error,
          ),

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  logUnexpectedBillsApiError(
    error,
  );

  return NextResponse.json<
    BillsApiErrorResponse
  >(
    {
      success:
        false,

      data:
        null,

      error: {
        code:
          "unexpected-error",

        message:
          "CASE Budget could not complete the bill request.",
      },
    },
    {
      status:
        500,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function getBillStorageHttpStatus(
  error:
    BillStorageError,
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

    case "database-error":
    case "unknown":
    default:
      return 500;
  }
}

function normalizeRequiredText(
  value:
    string | null | undefined,
) {
  return value?.trim() ??
    "";
}

function logUnexpectedBillsApiError(
  error:
    unknown,
) {
  console.error(
    "[CASE Budget Bill API] Unexpected error.",
    serializeUnknownError(
      error,
    ),
  );
}

function serializeUnknownError(
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

      stack:
        process.env.NODE_ENV !==
          "production"
          ? error.stack ??
            null
          : null,
    };
  }

  if (
    typeof error ===
      "string"
  ) {
    return {
      message:
        error,
    };
  }

  return {
    message:
      "Unknown error",
  };
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
