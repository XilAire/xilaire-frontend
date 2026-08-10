import "server-only";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

import {
  processBillReminderEmails,
} from "@/lib/bills/bill-reminder-email-service";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

const CRON_SECRET_ENV_NAME =
  "CASE_BUDGET_CRON_SECRET";

const DEVELOPMENT_HEADER_NAME =
  "x-case-budget-cron-secret";

type CronAuthorizationResult =
  | {
      authorized:
        true;
    }
  | {
      authorized:
        false;

      status:
        401 | 503;

      code:
        "cron-secret-missing"
        | "cron-unauthorized";

      message:
        string;
    };

type BillReminderCronResponse = {
  success:
    boolean;

  message:
    string;

  run: {
    startedAt:
      string;

    completedAt:
      string;

    durationMs:
      number;

    totalCandidates:
      number;

    totalDue:
      number;

    sent:
      number;

    alreadyProcessed:
      number;

    notDue:
      number;

    recipientMissing:
      number;

    failed:
      number;
  } | null;

  error: {
    code:
      string;

    message:
      string;
  } | null;
};

/**
 * GET /api/cron/bill-reminders
 *
 * Runs the CASE Budget automated bill-reminder email processor.
 *
 * Intended callers:
 *
 * - Vercel Cron
 * - another trusted scheduler
 * - local/manual testing with the configured cron secret
 *
 * Authentication:
 *
 * Authorization: Bearer <CASE_BUDGET_CRON_SECRET>
 *
 * For convenience during local development, the following header is
 * also accepted:
 *
 * x-case-budget-cron-secret: <CASE_BUDGET_CRON_SECRET>
 *
 * The processor itself provides idempotency through
 * case_budget_email_deliveries, so invoking this route more than once
 * for the same bill reminder will not send duplicate email.
 */
export async function GET(
  request:
    NextRequest,
) {
  return handleBillReminderCronRequest(
    request,
  );
}

/**
 * POST is also supported so the endpoint can be invoked manually from
 * trusted tooling without changing the processing implementation.
 *
 * Production schedulers can continue to use GET.
 */
export async function POST(
  request:
    NextRequest,
) {
  return handleBillReminderCronRequest(
    request,
  );
}

async function handleBillReminderCronRequest(
  request:
    NextRequest,
) {
  const requestStartedAt =
    Date.now();

  const authorization =
    authorizeCronRequest(
      request,
    );

  if (
    !authorization.authorized
  ) {
    return NextResponse.json<
      BillReminderCronResponse
    >(
      {
        success:
          false,

        message:
          authorization.message,

        run:
          null,

        error: {
          code:
            authorization.code,

          message:
            authorization.message,
        },
      },
      {
        status:
          authorization.status,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const result =
      await processBillReminderEmails();

    const durationMs =
      Date.now() -
      requestStartedAt;

    const response:
      BillReminderCronResponse = {
      success:
        result.failed ===
        0,

      message:
        createCompletionMessage({
          sent:
            result.sent,

          alreadyProcessed:
            result.alreadyProcessed,

          failed:
            result.failed,

          recipientMissing:
            result.recipientMissing,
        }),

      run: {
        startedAt:
          result.startedAt,

        completedAt:
          result.completedAt,

        durationMs,

        totalCandidates:
          result.totalCandidates,

        totalDue:
          result.totalDue,

        sent:
          result.sent,

        alreadyProcessed:
          result.alreadyProcessed,

        notDue:
          result.notDue,

        recipientMissing:
          result.recipientMissing,

        failed:
          result.failed,
      },

      error:
        result.failed >
        0
          ? {
              code:
                "bill-reminder-partial-failure",

              message:
                `${result.failed} bill reminder email ${
                  result.failed ===
                  1
                    ? "delivery"
                    : "deliveries"
                } failed during this run.`,
            }
          : null,
    };

    logCronCompletion({
      request,
      result,
      durationMs,
    });

    /**
     * A partially failed batch still returns HTTP 200.
     *
     * Individual delivery failures are persisted in
     * case_budget_email_deliveries and included in the response.
     *
     * Returning 500 here would cause some cron providers to immediately
     * retry the complete batch. Although the delivery ledger protects
     * successfully reserved messages from duplicate sends, a normal 200
     * response is a better representation of a completed batch where
     * individual items may have failed independently.
     */
    return NextResponse.json(
      response,
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
    const durationMs =
      Date.now() -
      requestStartedAt;

    const errorMessage =
      readUnknownErrorMessage(
        error,
      );

    logCronFailure({
      request,
      error,
      durationMs,
    });

    return NextResponse.json<
      BillReminderCronResponse
    >(
      {
        success:
          false,

        message:
          "CASE Budget could not complete the bill-reminder email run.",

        run:
          null,

        error: {
          code:
            "bill-reminder-cron-failed",

          message:
            errorMessage,
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
}

function authorizeCronRequest(
  request:
    NextRequest,
): CronAuthorizationResult {
  const configuredSecret =
    normalizeOptionalText(
      process.env[
        CRON_SECRET_ENV_NAME
      ],
    );

  if (
    !configuredSecret
  ) {
    logCronConfigurationError();

    return {
      authorized:
        false,

      status:
        503,

      code:
        "cron-secret-missing",

      message:
        `${CRON_SECRET_ENV_NAME} is not configured.`,
    };
  }

  const bearerSecret =
    extractBearerToken(
      request.headers.get(
        "authorization",
      ),
    );

  const developmentHeaderSecret =
    normalizeOptionalText(
      request.headers.get(
        DEVELOPMENT_HEADER_NAME,
      ),
    );

  const suppliedSecret =
    bearerSecret ??
    developmentHeaderSecret;

  if (
    !suppliedSecret ||
    !constantTimeStringEquals(
      suppliedSecret,
      configuredSecret,
    )
  ) {
    logUnauthorizedCronRequest(
      request,
    );

    return {
      authorized:
        false,

      status:
        401,

      code:
        "cron-unauthorized",

      message:
        "The CASE Budget bill-reminder cron request is not authorized.",
    };
  }

  return {
    authorized:
      true,
  };
}

function extractBearerToken(
  authorizationHeader:
    string | null,
) {
  const normalizedHeader =
    normalizeOptionalText(
      authorizationHeader,
    );

  if (
    !normalizedHeader
  ) {
    return null;
  }

  const match =
    /^Bearer\s+(.+)$/i.exec(
      normalizedHeader,
    );

  if (
    !match
  ) {
    return null;
  }

  return normalizeOptionalText(
    match[1],
  );
}

/**
 * Performs a simple timing-resistant comparison without requiring a
 * Node crypto Buffer conversion.
 *
 * Both values are traversed completely before a final equality result
 * is returned.
 */
function constantTimeStringEquals(
  first:
    string,
  second:
    string,
) {
  const firstLength =
    first.length;

  const secondLength =
    second.length;

  const comparisonLength =
    Math.max(
      firstLength,
      secondLength,
    );

  let difference =
    firstLength ^
    secondLength;

  for (
    let index =
      0;
    index <
    comparisonLength;
    index +=
      1
  ) {
    const firstCode =
      index <
      firstLength
        ? first.charCodeAt(
            index,
          )
        : 0;

    const secondCode =
      index <
      secondLength
        ? second.charCodeAt(
            index,
          )
        : 0;

    difference |=
      firstCode ^
      secondCode;
  }

  return difference ===
    0;
}

function createCompletionMessage({
  sent,
  alreadyProcessed,
  failed,
  recipientMissing,
}: {
  sent:
    number;

  alreadyProcessed:
    number;

  failed:
    number;

  recipientMissing:
    number;
}) {
  if (
    failed >
      0
  ) {
    return `CASE Budget completed the bill-reminder email run with ${failed} failed ${
      failed ===
      1
        ? "delivery"
        : "deliveries"
    }.`;
  }

  if (
    sent >
      0
  ) {
    return `CASE Budget sent ${sent} bill reminder ${
      sent ===
      1
        ? "email"
        : "emails"
    }.`;
  }

  if (
    alreadyProcessed >
      0
  ) {
    return `CASE Budget found ${alreadyProcessed} bill reminder ${
      alreadyProcessed ===
      1
        ? "delivery"
        : "deliveries"
    } that had already been processed.`;
  }

  if (
    recipientMissing >
      0
  ) {
    return `CASE Budget found ${recipientMissing} bill reminder ${
      recipientMissing ===
      1
        ? "recipient"
        : "recipients"
    } without a deliverable email address.`;
  }

  return "CASE Budget completed the bill-reminder email run. No reminder emails were due.";
}

function logCronCompletion({
  request,
  result,
  durationMs,
}: {
  request:
    NextRequest;

  result:
    Awaited<
      ReturnType<
        typeof processBillReminderEmails
      >
    >;

  durationMs:
    number;
}) {
  if (
    process.env.NODE_ENV ===
      "production"
  ) {
    return;
  }

  console.info(
    "[CASE Budget Cron] Bill reminder email run completed.",
    {
      pathname:
        request.nextUrl.pathname,

      method:
        request.method,

      durationMs,

      totalCandidates:
        result.totalCandidates,

      totalDue:
        result.totalDue,

      sent:
        result.sent,

      alreadyProcessed:
        result.alreadyProcessed,

      notDue:
        result.notDue,

      recipientMissing:
        result.recipientMissing,

      failed:
        result.failed,
    },
  );
}

function logCronFailure({
  request,
  error,
  durationMs,
}: {
  request:
    NextRequest;

  error:
    unknown;

  durationMs:
    number;
}) {
  console.error(
    "[CASE Budget Cron] Bill reminder email run failed.",
    {
      pathname:
        request.nextUrl.pathname,

      method:
        request.method,

      durationMs,

      error:
        serializeUnknownError(
          error,
        ),
    },
  );
}

function logUnauthorizedCronRequest(
  request:
    NextRequest,
) {
  if (
    process.env.NODE_ENV ===
      "production"
  ) {
    return;
  }

  console.warn(
    "[CASE Budget Cron] Unauthorized bill reminder request.",
    {
      pathname:
        request.nextUrl.pathname,

      method:
        request.method,

      hasAuthorizationHeader:
        Boolean(
          request.headers.get(
            "authorization",
          ),
        ),

      hasDevelopmentSecretHeader:
        Boolean(
          request.headers.get(
            DEVELOPMENT_HEADER_NAME,
          ),
        ),
    },
  );
}

function logCronConfigurationError() {
  console.error(
    `[CASE Budget Cron] ${CRON_SECRET_ENV_NAME} is not configured.`,
  );
}

function normalizeOptionalText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

function readUnknownErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
      Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
      "string"
  ) {
    return error;
  }

  return "An unexpected CASE Budget bill-reminder cron error occurred.";
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