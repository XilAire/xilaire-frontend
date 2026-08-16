import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  BillStorageError,
  createBill,
  listBills,
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

type CreateBillRequestBody = {
  action?:
    "create";

  bill:
    BillData;
};

/**
 * GET /api/bills
 *
 * Returns every persisted bill belonging to the authenticated user
 * and active CASE Budget workspace.
 *
 * Authentication and workspace resolution are handled entirely on
 * the server through requireCaseBudgetServerAuth().
 */
export async function GET() {
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


    const bills =
      await listBills({
        userId,
        workspaceId,
      });

    return NextResponse.json<
      BillsApiResponse<{
        bills:
          BillData[];
      }>
    >(
      {
        success:
          true,

        data: {
          bills,
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
 * POST /api/bills
 *
 * Creates one persisted bill for the authenticated user's active
 * CASE Budget workspace.
 *
 * The server derives userId and workspaceId from the authenticated
 * session. Client-provided ownership identifiers are never trusted.
 *
 * Browser-local import/migration is intentionally not supported in
 * production. Supabase is the canonical persistence layer.
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


    const requestBody =
      await readJsonRequestBody(
        request,
      );

    if (
      !requestBody
    ) {
      return createValidationErrorResponse(
        "A valid JSON request body is required.",
      );
    }

    if (
      isCreateBillRequestBody(
        requestBody,
      )
    ) {
      const savedBill =
        await createBill({
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
            201,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return createValidationErrorResponse(
      "The bill request is invalid. Supply a valid bill to create.",
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

function isCreateBillRequestBody(
  value:
    unknown,
): value is CreateBillRequestBody {
  if (
    !isRecord(
      value,
    )
  ) {
    return false;
  }

  if (
    value.action !==
      undefined &&
    value.action !==
      "create"
  ) {
    return false;
  }

  return isBillData(
    value.bill,
  );
}

/**
 * Performs lightweight API-boundary validation.
 *
 * bill-storage.ts remains responsible for authoritative validation of
 * dates, statuses, reminder timing, frequency, account types, and all
 * other persisted values.
 *
 * The route only verifies enough structure to reject malformed JSON
 * before passing it into the storage layer.
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
    ) ||
    value.amount < 0
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

function logUnexpectedBillsApiError(
  error:
    unknown,
) {
  console.error(
    "[CASE Budget Bills API] Unexpected error.",
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