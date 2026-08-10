import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

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
 * The bill ID in the route is authoritative. If the body contains a
 * different bill.id, the request is rejected.
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

    const savedBill =
      await updateBill({
        userId,
        workspaceId,
        bill:
          requestBody.bill,
      });

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
          bill:
            savedBill,
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