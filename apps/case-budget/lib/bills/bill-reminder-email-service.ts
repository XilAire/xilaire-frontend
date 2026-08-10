import "server-only";

import {
  createBillReminder,
} from "@/lib/bills/bill-reminders";

import {
  listReminderCandidateBills,
} from "@/lib/bills/bill-storage";

import {
  createBillReminderDeliveryKey,
  markEmailDeliveryFailed,
  markEmailDeliverySent,
  reserveEmailDelivery,
} from "@/lib/email/email-delivery-storage";

import {
  sendBillReminderEmail,
} from "@/lib/email";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import type {
  BillData,
  BillReminderTiming,
} from "@/types/bill";

export type BillReminderEmailProcessingStatus =
  | "sent"
  | "already-processed"
  | "not-due"
  | "recipient-missing"
  | "failed";

export type BillReminderEmailProcessingResult = {
  billId:
    string;

  userId:
    string;

  workspaceId:
    string;

  status:
    BillReminderEmailProcessingStatus;

  reminderType:
    "upcoming"
    | "due-today"
    | "past-due"
    | null;

  deliveryKey:
    string | null;

  deliveryId:
    string | null;

  providerMessageId:
    string | null;

  errorCode:
    string | null;

  errorMessage:
    string | null;
};

export type BillReminderEmailBatchResult = {
  startedAt:
    string;

  completedAt:
    string;

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

  results:
    BillReminderEmailProcessingResult[];
};

export type ProcessBillReminderEmailsInput = {
  referenceDate?:
    Date | string;

  appUrl?:
    string;
};

type BillReminderCandidate = {
  bill:
    BillData;

  userId:
    string;

  workspaceId:
    string;
};

type ReminderRecipient = {
  email:
    string;

  firstName:
    string | undefined;
};

type ProfileRow = {
  id:
    string;

  email:
    string | null;

  first_name:
    string | null;

  is_active:
    boolean;
};

const BILL_REMINDER_TEMPLATE =
  "bill-reminder";

const BILL_REMINDER_CATEGORY =
  "notification";

const DEFAULT_APP_URL =
  "http://localhost:3004";

/**
 * Processes every server-persisted CASE Budget bill that has reminders
 * enabled and has not been marked paid.
 *
 * This function is intentionally server-only.
 *
 * Expected production usage:
 *
 * - scheduled Route Handler
 * - cron job
 * - trusted background worker
 *
 * It must never be called directly from browser/client code.
 */
export async function processBillReminderEmails({
  referenceDate = new Date(),
  appUrl,
}: ProcessBillReminderEmailsInput = {}):
  Promise<BillReminderEmailBatchResult> {
  const startedAt =
    new Date().toISOString();

  const normalizedReferenceDate =
    normalizeReferenceDate(
      referenceDate,
    );

  const resolvedAppUrl =
    resolveAppUrl(
      appUrl,
    );

  const candidates =
    await listReminderCandidateBills();

  const results:
    BillReminderEmailProcessingResult[] =
      [];

  for (
    const candidate
    of candidates
  ) {
    const result =
      await processSingleBillReminderEmail({
        candidate,
        referenceDate:
          normalizedReferenceDate,
        appUrl:
          resolvedAppUrl,
      });

    results.push(
      result,
    );
  }

  const completedAt =
    new Date().toISOString();

  return {
    startedAt,

    completedAt,

    totalCandidates:
      candidates.length,

    totalDue:
      results.filter(
        (
          result,
        ) =>
          result.status !==
          "not-due",
      ).length,

    sent:
      countResultsByStatus(
        results,
        "sent",
      ),

    alreadyProcessed:
      countResultsByStatus(
        results,
        "already-processed",
      ),

    notDue:
      countResultsByStatus(
        results,
        "not-due",
      ),

    recipientMissing:
      countResultsByStatus(
        results,
        "recipient-missing",
      ),

    failed:
      countResultsByStatus(
        results,
        "failed",
      ),

    results,
  };
}

/**
 * Processes one persisted bill candidate.
 *
 * The flow is:
 *
 * 1. Ask the existing CASE Budget reminder engine whether a reminder
 *    currently qualifies.
 * 2. Resolve the recipient from the existing profiles table.
 * 3. Generate a deterministic delivery key.
 * 4. Atomically reserve the email delivery.
 * 5. Skip when another worker already reserved/sent the same reminder.
 * 6. Send through the existing CASE Budget Resend notification sender.
 * 7. Mark the delivery sent or failed.
 */
async function processSingleBillReminderEmail({
  candidate,
  referenceDate,
  appUrl,
}: {
  candidate:
    BillReminderCandidate;

  referenceDate:
    Date;

  appUrl:
    string;
}): Promise<BillReminderEmailProcessingResult> {
  const {
    bill,
    userId,
    workspaceId,
  } =
    candidate;

  const reminder =
    createBillReminder(
      bill,
      referenceDate,
    );

  if (
    !reminder
  ) {
    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "not-due",
    });
  }

  const reminderType =
    reminder.type;

  let recipient:
    ReminderRecipient | null =
      null;

  try {
    recipient =
      await resolveReminderRecipient(
        userId,
      );
  } catch (
    error
  ) {
    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "failed",

      reminderType,

      errorCode:
        "recipient-lookup-failed",

      errorMessage:
        readUnknownErrorMessage(
          error,
        ),
    });
  }

  if (
    !recipient
  ) {
    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "recipient-missing",

      reminderType,

      errorCode:
        "recipient-missing",

      errorMessage:
        "CASE Budget could not resolve an active email recipient for this bill reminder.",
    });
  }

  const deliveryKey =
    createBillReminderDeliveryKey({
      billId:
        bill.id,

      dueDate:
        bill.dueDate,

      reminderType,

      reminderTiming:
        getReminderTimingForDeliveryKey({
          bill,
          reminderType,
        }),
    });

  let reservation:
    Awaited<
      ReturnType<
        typeof reserveEmailDelivery
      >
    >;

  try {
    reservation =
      await reserveEmailDelivery({
        workspaceId,

        userId,

        billId:
          bill.id,

        category:
          BILL_REMINDER_CATEGORY,

        template:
          BILL_REMINDER_TEMPLATE,

        deliveryKey,

        recipientEmail:
          recipient.email,

        scheduledFor:
          getScheduledForTimestamp({
            bill,
            reminderDate:
              reminder.reminderDate,
          }),

        metadata: {
          billId:
            bill.id,

          billName:
            bill.name,

          billAmount:
            bill.amount,

          dueDate:
            bill.dueDate,

          reminderDate:
            reminder.reminderDate,

          reminderType,

          reminderTiming:
            bill.reminder.timing,

          daysUntilDue:
            reminder.daysUntilDue,

          isPastDue:
            reminder.isPastDue,

          isDueToday:
            reminder.isDueToday,

          workspaceId,

          userId,
        },
      });
  } catch (
    error
  ) {
    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "failed",

      reminderType,

      deliveryKey,

      errorCode:
        "delivery-reservation-failed",

      errorMessage:
        readUnknownErrorMessage(
          error,
        ),
    });
  }

  if (
    reservation.alreadyExists
  ) {
    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "already-processed",

      reminderType,

      deliveryKey,

      deliveryId:
        reservation.delivery.id,

      providerMessageId:
        reservation.delivery
          .providerMessageId,
    });
  }

  const deliveryId =
    reservation.delivery.id;

  try {
    const emailResult =
      await sendBillReminderEmail({
        to:
          recipient.email,

        firstName:
          recipient.firstName,

        billName:
          bill.name,

        amountDue:
          formatCurrency(
            bill.amount,
          ),

        dueDate:
          formatBillDueDate(
            bill.dueDate,
          ),

        accountName:
          normalizeOptionalText(
            bill.account?.name,
          ),

        paymentMethod:
          formatPaymentMethod(
            bill.paymentMethod,
          ),

        budgetItemName:
          normalizeOptionalText(
            bill.budgetItem?.name,
          ),

        billUrl:
          createBillUrl({
            appUrl,
            billId:
              bill.id,
          }),

        daysUntilDue:
          reminder.daysUntilDue,

        isOverdue:
          reminder.type ===
          "past-due",
      });

    if (
      !emailResult.success
    ) {
      await safelyMarkDeliveryFailed({
        deliveryId,

        errorCode:
          emailResult.error.code,

        errorMessage:
          emailResult.error.message,
      });

      return createProcessingResult({
        billId:
          bill.id,

        userId,

        workspaceId,

        status:
          "failed",

        reminderType,

        deliveryKey,

        deliveryId,

        errorCode:
          emailResult.error.code,

        errorMessage:
          emailResult.error.message,
      });
    }

    const providerMessageId =
      normalizeProviderMessageId(
        emailResult.data.id,
      );

    try {
      await markEmailDeliverySent({
        deliveryId,

        providerMessageId,
      });
    } catch (
      error
    ) {
      /**
       * The provider already accepted the email at this point.
       *
       * We deliberately do NOT attempt to send it again simply because
       * the local delivery-ledger update failed. The unique reservation
       * remains present and protects against duplicate delivery.
       */
      return createProcessingResult({
        billId:
          bill.id,

        userId,

        workspaceId,

        status:
          "sent",

        reminderType,

        deliveryKey,

        deliveryId,

        providerMessageId,

        errorCode:
          "delivery-ledger-update-failed",

        errorMessage:
          readUnknownErrorMessage(
            error,
          ),
      });
    }

    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "sent",

      reminderType,

      deliveryKey,

      deliveryId,

      providerMessageId,
    });
  } catch (
    error
  ) {
    const errorMessage =
      readUnknownErrorMessage(
        error,
      );

    await safelyMarkDeliveryFailed({
      deliveryId,

      errorCode:
        "bill-reminder-send-failed",

      errorMessage,
    });

    return createProcessingResult({
      billId:
        bill.id,

      userId,

      workspaceId,

      status:
        "failed",

      reminderType,

      deliveryKey,

      deliveryId,

      errorCode:
        "bill-reminder-send-failed",

      errorMessage,
    });
  }
}

/**
 * Resolves the recipient from CASE Budget's existing profiles table.
 *
 * Only active profiles are eligible for financial notification emails.
 */
async function resolveReminderRecipient(
  userId:
    string,
): Promise<ReminderRecipient | null> {
  const normalizedUserId =
    userId.trim();

  if (
    !normalizedUserId
  ) {
    return null;
  }

  const {
    data,
    error,
  } =
    await createAdminClient()
      .from(
        "profiles",
      )
      .select(
        "id,email,first_name,is_active",
      )
      .eq(
        "id",
        normalizedUserId,
      )
      .eq(
        "is_active",
        true,
      )
      .maybeSingle();

  if (
    error
  ) {
    throw new Error(
      `CASE Budget could not load the reminder recipient: ${error.message}`,
    );
  }

  if (
    !data
  ) {
    return null;
  }

  const profile =
    data as ProfileRow;

  const email =
    normalizeEmail(
      profile.email,
    );

  if (
    !email
  ) {
    return null;
  }

  return {
    email,

    firstName:
      normalizeOptionalText(
        profile.first_name,
      ),
  };
}

/**
 * For the configured pre-due reminder, reminder timing is part of the
 * idempotency key.
 *
 * Due-today and past-due messages are independent lifecycle events, so
 * they intentionally use stable fixed timing labels.
 */
function getReminderTimingForDeliveryKey({
  bill,
  reminderType,
}: {
  bill:
    BillData;

  reminderType:
    "upcoming"
    | "due-today"
    | "past-due";
}) {
  if (
    reminderType ===
    "upcoming"
  ) {
    return bill.reminder.timing;
  }

  if (
    reminderType ===
    "due-today"
  ) {
    return "due-today";
  }

  return "past-due";
}

function getScheduledForTimestamp({
  bill,
  reminderDate,
}: {
  bill:
    BillData;

  reminderDate:
    string;
}) {
  const dateValue =
    reminderDate ||
    bill.dueDate;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      dateValue,
    );

  if (
    !match
  ) {
    return null;
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  const day =
    Number(
      match[3],
    );

  const timestamp =
    new Date(
      year,
      month -
        1,
      day,
      8,
      0,
      0,
      0,
    );

  if (
    Number.isNaN(
      timestamp.getTime(),
    )
  ) {
    return null;
  }

  return timestamp.toISOString();
}

function resolveAppUrl(
  explicitAppUrl:
    string | undefined,
) {
  const configuredUrl =
    normalizeOptionalText(
      explicitAppUrl,
    ) ??
    normalizeOptionalText(
      process.env
        .NEXT_PUBLIC_CASE_BUDGET_APP_URL,
    ) ??
    DEFAULT_APP_URL;

  return configuredUrl.replace(
    /\/+$/,
    "",
  );
}

function createBillUrl({
  appUrl,
  billId,
}: {
  appUrl:
    string;

  billId:
    string;
}) {
  const encodedBillId =
    encodeURIComponent(
      billId,
    );

  return `${appUrl}/dashboard/bills?bill=${encodedBillId}`;
}

function formatCurrency(
  amount:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  ).format(
    amount,
  );
}

function formatBillDueDate(
  value:
    string,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(
      value,
    );

  if (
    !match
  ) {
    return value;
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  const day =
    Number(
      match[3],
    );

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      weekday:
        "long",

      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    },
  );
}

function formatPaymentMethod(
  paymentMethod:
    BillData["paymentMethod"],
) {
  switch (
    paymentMethod
  ) {
    case "autopay":
      return "Autopay";

    case "manual":
    default:
      return "Manual payment";
  }
}

function normalizeReferenceDate(
  value:
    Date | string,
) {
  if (
    value instanceof
    Date
  ) {
    if (
      Number.isNaN(
        value.getTime(),
      )
    ) {
      throw new Error(
        "A valid bill reminder reference date is required.",
      );
    }

    return new Date(
      value.getTime(),
    );
  }

  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    throw new Error(
      "A valid bill reminder reference date is required.",
    );
  }

  const dateOnlyMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      normalizedValue,
    );

  if (
    dateOnlyMatch
  ) {
    const year =
      Number(
        dateOnlyMatch[1],
      );

    const month =
      Number(
        dateOnlyMatch[2],
      );

    const day =
      Number(
        dateOnlyMatch[3],
      );

    const date =
      new Date(
        year,
        month -
          1,
        day,
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month -
          1 ||
      date.getDate() !==
        day
    ) {
      throw new Error(
        "A valid bill reminder reference date is required.",
      );
    }

    return date;
  }

  const parsedDate =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    throw new Error(
      "A valid bill reminder reference date is required.",
    );
  }

  return parsedDate;
}

function normalizeEmail(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value
      ?.trim()
      .toLowerCase();

  if (
    !normalizedValue ||
    !normalizedValue.includes(
      "@",
    )
  ) {
    return null;
  }

  return normalizedValue;
}

function normalizeOptionalText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeProviderMessageId(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue ||
    null;
}

async function safelyMarkDeliveryFailed({
  deliveryId,
  errorCode,
  errorMessage,
}: {
  deliveryId:
    string;

  errorCode:
    string | null | undefined;

  errorMessage:
    string | null | undefined;
}) {
  try {
    await markEmailDeliveryFailed({
      deliveryId,

      errorCode:
        normalizeNullableText(
          errorCode,
        ),

      errorMessage:
        normalizeNullableText(
          errorMessage,
        ),
    });
  } catch (
    error
  ) {
    if (
      process.env.NODE_ENV !==
      "production"
    ) {
      console.error(
        "[CASE Budget Bill Reminder] Failed to update the delivery ledger after an email failure.",
        {
          deliveryId,

          error:
            readUnknownErrorMessage(
              error,
            ),
        },
      );
    }
  }
}

function normalizeNullableText(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

function countResultsByStatus(
  results:
    BillReminderEmailProcessingResult[],
  status:
    BillReminderEmailProcessingStatus,
) {
  return results.filter(
    (
      result,
    ) =>
      result.status ===
      status,
  ).length;
}

function createProcessingResult({
  billId,
  userId,
  workspaceId,
  status,
  reminderType = null,
  deliveryKey = null,
  deliveryId = null,
  providerMessageId = null,
  errorCode = null,
  errorMessage = null,
}: {
  billId:
    string;

  userId:
    string;

  workspaceId:
    string;

  status:
    BillReminderEmailProcessingStatus;

  reminderType?:
    "upcoming"
    | "due-today"
    | "past-due"
    | null;

  deliveryKey?:
    string | null;

  deliveryId?:
    string | null;

  providerMessageId?:
    string | null;

  errorCode?:
    string | null;

  errorMessage?:
    string | null;
}): BillReminderEmailProcessingResult {
  return {
    billId,

    userId,

    workspaceId,

    status,

    reminderType,

    deliveryKey,

    deliveryId,

    providerMessageId,

    errorCode,

    errorMessage,
  };
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

  return "An unexpected CASE Budget bill-reminder email error occurred.";
}