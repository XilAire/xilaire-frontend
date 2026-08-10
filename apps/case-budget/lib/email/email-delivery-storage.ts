import "server-only";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

export type EmailDeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped";

export type EmailDeliveryCategory =
  | "authentication"
  | "billing"
  | "notification"
  | "marketing"
  | "system";

export type EmailDeliveryRecord = {
  id:
    string;

  workspaceId:
    string | null;

  userId:
    string;

  billId:
    string | null;

  category:
    string;

  template:
    string;

  deliveryKey:
    string;

  recipientEmail:
    string;

  provider:
    string;

  providerMessageId:
    string | null;

  status:
    EmailDeliveryStatus;

  scheduledFor:
    string | null;

  sentAt:
    string | null;

  failedAt:
    string | null;

  errorCode:
    string | null;

  errorMessage:
    string | null;

  metadata:
    Record<
      string,
      unknown
    >;

  createdAt:
    string;

  updatedAt:
    string;
};

export type ReserveEmailDeliveryInput = {
  workspaceId?:
    string | null;

  userId:
    string;

  billId?:
    string | null;

  category:
    EmailDeliveryCategory | string;

  template:
    string;

  deliveryKey:
    string;

  recipientEmail:
    string;

  scheduledFor?:
    string | null;

  metadata?:
    Record<
      string,
      unknown
    >;
};

export type ReserveEmailDeliveryResult =
  | {
      reserved:
        true;

      alreadyExists:
        false;

      delivery:
        EmailDeliveryRecord;
    }
  | {
      reserved:
        false;

      alreadyExists:
        true;

      delivery:
        EmailDeliveryRecord;
    };

export type MarkEmailDeliverySentInput = {
  deliveryId:
    string;

  providerMessageId?:
    string | null;

  sentAt?:
    string;
};

export type MarkEmailDeliveryFailedInput = {
  deliveryId:
    string;

  errorCode?:
    string | null;

  errorMessage?:
    string | null;

  failedAt?:
    string;
};

export type MarkEmailDeliverySkippedInput = {
  deliveryId:
    string;

  reason?:
    string | null;
};

export type GetEmailDeliveryByKeyInput = {
  deliveryKey:
    string;
};

export type HasEmailDeliveryInput = {
  deliveryKey:
    string;

  statuses?:
    EmailDeliveryStatus[];
};

export type EmailDeliveryStorageErrorCode =
  | "invalid-input"
  | "not-found"
  | "database-error"
  | "unknown";

export class EmailDeliveryStorageError extends Error {
  readonly code:
    EmailDeliveryStorageErrorCode;

  readonly operation:
    string;

  readonly causeCode:
    string | null;

  constructor({
    message,
    code,
    operation,
    causeCode,
    cause,
  }: {
    message:
      string;

    code:
      EmailDeliveryStorageErrorCode;

    operation:
      string;

    causeCode?:
      string | null;

    cause?:
      unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "EmailDeliveryStorageError";

    this.code =
      code;

    this.operation =
      operation;

    this.causeCode =
      causeCode ??
      null;
  }
}

type EmailDeliveryRow = {
  id:
    string;

  workspace_id:
    string | null;

  user_id:
    string;

  bill_id:
    string | null;

  category:
    string;

  template:
    string;

  delivery_key:
    string;

  recipient_email:
    string;

  provider:
    string;

  provider_message_id:
    string | null;

  status:
    string;

  scheduled_for:
    string | null;

  sent_at:
    string | null;

  failed_at:
    string | null;

  error_code:
    string | null;

  error_message:
    string | null;

  metadata:
    unknown;

  created_at:
    string;

  updated_at:
    string;
};

type EmailDeliveryInsertRow = {
  workspace_id:
    string | null;

  user_id:
    string;

  bill_id:
    string | null;

  category:
    string;

  template:
    string;

  delivery_key:
    string;

  recipient_email:
    string;

  provider:
    "resend";

  status:
    "pending";

  scheduled_for:
    string | null;

  metadata:
    Record<
      string,
      unknown
    >;
};

const EMAIL_DELIVERIES_TABLE =
  "case_budget_email_deliveries";

const POSTGRES_UNIQUE_VIOLATION =
  "23505";

/**
 * Atomically reserves a unique email delivery.
 *
 * delivery_key has a unique database index, so two workers attempting
 * to process the same notification cannot both successfully reserve it.
 *
 * If the key already exists, this returns the existing delivery record
 * rather than throwing.
 */
export async function reserveEmailDelivery({
  workspaceId,
  userId,
  billId,
  category,
  template,
  deliveryKey,
  recipientEmail,
  scheduledFor,
  metadata = {},
}: ReserveEmailDeliveryInput):
  Promise<ReserveEmailDeliveryResult> {
  const operation =
    "reserveEmailDelivery";

  const normalizedUserId =
    requireText({
      value:
        userId,

      fieldName:
        "user ID",

      operation,
    });

  const normalizedCategory =
    requireText({
      value:
        category,

      fieldName:
        "email category",

      operation,
    });

  const normalizedTemplate =
    requireText({
      value:
        template,

      fieldName:
        "email template",

      operation,
    });

  const normalizedDeliveryKey =
    requireText({
      value:
        deliveryKey,

      fieldName:
        "delivery key",

      operation,
    });

  const normalizedRecipientEmail =
    normalizeEmail(
      recipientEmail,
    );

  if (
    !normalizedRecipientEmail
  ) {
    throw new EmailDeliveryStorageError({
      message:
        "A valid recipient email address is required.",
      code:
        "invalid-input",
      operation,
    });
  }

  const insertRow:
    EmailDeliveryInsertRow = {
      workspace_id:
        normalizeOptionalText(
          workspaceId,
        ),

      user_id:
        normalizedUserId,

      bill_id:
        normalizeOptionalText(
          billId,
        ),

      category:
        normalizedCategory,

      template:
        normalizedTemplate,

      delivery_key:
        normalizedDeliveryKey,

      recipient_email:
        normalizedRecipientEmail,

      provider:
        "resend",

      status:
        "pending",

      scheduled_for:
        normalizeOptionalTimestamp(
          scheduledFor,
        ),

      metadata:
        normalizeMetadata(
          metadata,
        ),
    };

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          EMAIL_DELIVERIES_TABLE,
        )
        .insert(
          insertRow,
        )
        .select(
          "*",
        )
        .single();

    if (
      error
    ) {
      const errorCode =
        readErrorCode(
          error,
        );

      if (
        errorCode ===
        POSTGRES_UNIQUE_VIOLATION
      ) {
        const existingDelivery =
          await getEmailDeliveryByKey({
            deliveryKey:
              normalizedDeliveryKey,
          });

        if (
          !existingDelivery
        ) {
          throw new EmailDeliveryStorageError({
            message:
              "The email delivery was already reserved, but CASE Budget could not load the existing delivery record.",
            code:
              "database-error",
            operation,
            causeCode:
              errorCode,
            cause:
              error,
          });
        }

        return {
          reserved:
            false,

          alreadyExists:
            true,

          delivery:
            existingDelivery,
        };
      }

      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not reserve the email delivery.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new EmailDeliveryStorageError({
        message:
          "CASE Budget reserved the email delivery but did not receive the saved record.",
        code:
          "database-error",
        operation,
      });
    }

    return {
      reserved:
        true,

      alreadyExists:
        false,

      delivery:
        mapEmailDeliveryRow(
          data as EmailDeliveryRow,
        ),
    };
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not reserve the email delivery.",
    });
  }
}

/**
 * Loads a delivery by its globally unique idempotency key.
 */
export async function getEmailDeliveryByKey({
  deliveryKey,
}: GetEmailDeliveryByKeyInput):
  Promise<EmailDeliveryRecord | null> {
  const operation =
    "getEmailDeliveryByKey";

  const normalizedDeliveryKey =
    requireText({
      value:
        deliveryKey,

      fieldName:
        "delivery key",

      operation,
    });

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          EMAIL_DELIVERIES_TABLE,
        )
        .select(
          "*",
        )
        .eq(
          "delivery_key",
          normalizedDeliveryKey,
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not load the email delivery.",
        error,
      });
    }

    if (
      !data
    ) {
      return null;
    }

    return mapEmailDeliveryRow(
      data as EmailDeliveryRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not load the email delivery.",
    });
  }
}

/**
 * Returns whether a delivery exists for the supplied delivery key.
 *
 * Optionally restricts the lookup to one or more delivery statuses.
 */
export async function hasEmailDelivery({
  deliveryKey,
  statuses,
}: HasEmailDeliveryInput):
  Promise<boolean> {
  const delivery =
    await getEmailDeliveryByKey({
      deliveryKey,
    });

  if (
    !delivery
  ) {
    return false;
  }

  if (
    !statuses ||
    statuses.length ===
      0
  ) {
    return true;
  }

  return statuses.includes(
    delivery.status,
  );
}

/**
 * Marks a reserved delivery as successfully sent.
 */
export async function markEmailDeliverySent({
  deliveryId,
  providerMessageId,
  sentAt = new Date().toISOString(),
}: MarkEmailDeliverySentInput):
  Promise<EmailDeliveryRecord> {
  const operation =
    "markEmailDeliverySent";

  const normalizedDeliveryId =
    requireText({
      value:
        deliveryId,

      fieldName:
        "delivery ID",

      operation,
    });

  const normalizedSentAt =
    requireTimestamp({
      value:
        sentAt,

      fieldName:
        "sent timestamp",

      operation,
    });

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          EMAIL_DELIVERIES_TABLE,
        )
        .update({
          status:
            "sent",

          provider_message_id:
            normalizeOptionalText(
              providerMessageId,
            ),

          sent_at:
            normalizedSentAt,

          failed_at:
            null,

          error_code:
            null,

          error_message:
            null,
        })
        .eq(
          "id",
          normalizedDeliveryId,
        )
        .select(
          "*",
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not mark the email delivery as sent.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new EmailDeliveryStorageError({
        message:
          "The requested email delivery could not be found.",
        code:
          "not-found",
        operation,
      });
    }

    return mapEmailDeliveryRow(
      data as EmailDeliveryRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not mark the email delivery as sent.",
    });
  }
}

/**
 * Marks a delivery attempt as failed.
 *
 * Failed records remain in the ledger so we retain an audit trail.
 * Retry behavior is controlled by the higher-level dispatcher.
 */
export async function markEmailDeliveryFailed({
  deliveryId,
  errorCode,
  errorMessage,
  failedAt = new Date().toISOString(),
}: MarkEmailDeliveryFailedInput):
  Promise<EmailDeliveryRecord> {
  const operation =
    "markEmailDeliveryFailed";

  const normalizedDeliveryId =
    requireText({
      value:
        deliveryId,

      fieldName:
        "delivery ID",

      operation,
    });

  const normalizedFailedAt =
    requireTimestamp({
      value:
        failedAt,

      fieldName:
        "failed timestamp",

      operation,
    });

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          EMAIL_DELIVERIES_TABLE,
        )
        .update({
          status:
            "failed",

          sent_at:
            null,

          failed_at:
            normalizedFailedAt,

          error_code:
            normalizeOptionalText(
              errorCode,
            ),

          error_message:
            normalizeOptionalText(
              errorMessage,
            ),
        })
        .eq(
          "id",
          normalizedDeliveryId,
        )
        .select(
          "*",
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not mark the email delivery as failed.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new EmailDeliveryStorageError({
        message:
          "The requested email delivery could not be found.",
        code:
          "not-found",
        operation,
      });
    }

    return mapEmailDeliveryRow(
      data as EmailDeliveryRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not mark the email delivery as failed.",
    });
  }
}

/**
 * Marks a reserved delivery as intentionally skipped.
 */
export async function markEmailDeliverySkipped({
  deliveryId,
  reason,
}: MarkEmailDeliverySkippedInput):
  Promise<EmailDeliveryRecord> {
  const operation =
    "markEmailDeliverySkipped";

  const normalizedDeliveryId =
    requireText({
      value:
        deliveryId,

      fieldName:
        "delivery ID",

      operation,
    });

  try {
    const {
      data,
      error,
    } =
      await createAdminClient()
        .from(
          EMAIL_DELIVERIES_TABLE,
        )
        .update({
          status:
            "skipped",

          sent_at:
            null,

          failed_at:
            null,

          error_code:
            normalizeOptionalText(
              reason
                ? "delivery-skipped"
                : null,
            ),

          error_message:
            normalizeOptionalText(
              reason,
            ),
        })
        .eq(
          "id",
          normalizedDeliveryId,
        )
        .select(
          "*",
        )
        .maybeSingle();

    if (
      error
    ) {
      throw createDatabaseError({
        operation,
        message:
          "CASE Budget could not mark the email delivery as skipped.",
        error,
      });
    }

    if (
      !data
    ) {
      throw new EmailDeliveryStorageError({
        message:
          "The requested email delivery could not be found.",
        code:
          "not-found",
        operation,
      });
    }

    return mapEmailDeliveryRow(
      data as EmailDeliveryRow,
    );
  } catch (
    error
  ) {
    throw normalizeStorageError({
      operation,
      error,
      fallbackMessage:
        "CASE Budget could not mark the email delivery as skipped.",
    });
  }
}

/**
 * Creates a deterministic idempotency key for a bill reminder.
 *
 * Each bill occurrence may produce:
 *
 * - one configured upcoming reminder;
 * - one due-today reminder;
 * - one past-due reminder.
 *
 * The bill UUID and due date keep recurring occurrences independent.
 */
export function createBillReminderDeliveryKey({
  billId,
  dueDate,
  reminderType,
  reminderTiming,
}: {
  billId:
    string;

  dueDate:
    string;

  reminderType:
    "upcoming"
    | "due-today"
    | "past-due";

  reminderTiming?:
    string;
}) {
  const normalizedBillId =
    normalizeKeyPart(
      billId,
    );

  const normalizedDueDate =
    normalizeKeyPart(
      dueDate,
    );

  const normalizedReminderType =
    normalizeKeyPart(
      reminderType,
    );

  const normalizedReminderTiming =
    reminderTiming
      ? normalizeKeyPart(
          reminderTiming,
        )
      : "none";

  if (
    !normalizedBillId ||
    !normalizedDueDate ||
    !normalizedReminderType
  ) {
    throw new EmailDeliveryStorageError({
      message:
        "A bill reminder delivery key requires a bill ID, due date, and reminder type.",
      code:
        "invalid-input",
      operation:
        "createBillReminderDeliveryKey",
    });
  }

  return [
    "bill-reminder",
    normalizedBillId,
    normalizedDueDate,
    normalizedReminderType,
    normalizedReminderTiming,
  ].join(
    ":",
  );
}

/**
 * Creates a generic deterministic delivery key for future CASE Budget
 * notification types.
 */
export function createEmailDeliveryKey(
  ...parts:
    string[]
) {
  const normalizedParts =
    parts
      .map(
        normalizeKeyPart,
      )
      .filter(
        Boolean,
      );

  if (
    normalizedParts.length ===
      0
  ) {
    throw new EmailDeliveryStorageError({
      message:
        "At least one delivery-key component is required.",
      code:
        "invalid-input",
      operation:
        "createEmailDeliveryKey",
    });
  }

  return normalizedParts.join(
    ":",
  );
}

function mapEmailDeliveryRow(
  row:
    EmailDeliveryRow,
): EmailDeliveryRecord {
  return {
    id:
      row.id,

    workspaceId:
      row.workspace_id,

    userId:
      row.user_id,

    billId:
      row.bill_id,

    category:
      row.category,

    template:
      row.template,

    deliveryKey:
      row.delivery_key,

    recipientEmail:
      row.recipient_email,

    provider:
      row.provider,

    providerMessageId:
      row.provider_message_id,

    status:
      normalizeEmailDeliveryStatus(
        row.status,
      ),

    scheduledFor:
      row.scheduled_for,

    sentAt:
      row.sent_at,

    failedAt:
      row.failed_at,

    errorCode:
      row.error_code,

    errorMessage:
      row.error_message,

    metadata:
      normalizeMetadata(
        row.metadata,
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

function normalizeEmailDeliveryStatus(
  value:
    string,
): EmailDeliveryStatus {
  switch (
    value
  ) {
    case "pending":
    case "sent":
    case "failed":
    case "skipped":
      return value;

    default:
      throw new EmailDeliveryStorageError({
        message:
          `Unsupported email delivery status "${value}".`,
        code:
          "database-error",
        operation:
          "normalizeEmailDeliveryStatus",
      });
  }
}

function normalizeMetadata(
  value:
    unknown,
): Record<
  string,
  unknown
> {
  if (
    !isRecord(
      value,
    )
  ) {
    return {};
  }

  return {
    ...value,
  };
}

function normalizeEmail(
  value:
    string,
) {
  const normalizedValue =
    value
      .trim()
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

function requireText({
  value,
  fieldName,
  operation,
}: {
  value:
    string | null | undefined;

  fieldName:
    string;

  operation:
    string;
}) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  if (
    !normalizedValue
  ) {
    throw new EmailDeliveryStorageError({
      message:
        `A valid ${fieldName} is required.`,
      code:
        "invalid-input",
      operation,
    });
  }

  return normalizedValue;
}

function requireTimestamp({
  value,
  fieldName,
  operation,
}: {
  value:
    string;

  fieldName:
    string;

  operation:
    string;
}) {
  const normalizedValue =
    normalizeOptionalTimestamp(
      value,
    );

  if (
    !normalizedValue
  ) {
    throw new EmailDeliveryStorageError({
      message:
        `A valid ${fieldName} is required.`,
      code:
        "invalid-input",
      operation,
    });
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
    : null;
}

function normalizeOptionalTimestamp(
  value:
    string | null | undefined,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  if (
    !normalizedValue
  ) {
    return null;
  }

  const parsedValue =
    new Date(
      normalizedValue,
    );

  if (
    Number.isNaN(
      parsedValue.getTime(),
    )
  ) {
    return null;
  }

  return parsedValue.toISOString();
}

function normalizeKeyPart(
  value:
    string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9._-]+/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    )
    .replace(
      /^[-.:]+|[-.:]+$/g,
      "",
    );
}

function createDatabaseError({
  operation,
  message,
  error,
}: {
  operation:
    string;

  message:
    string;

  error:
    unknown;
}) {
  return new EmailDeliveryStorageError({
    message:
      `${message} ${readErrorMessage(
        error,
      )}`.trim(),

    code:
      "database-error",

    operation,

    causeCode:
      readErrorCode(
        error,
      ),

    cause:
      error,
  });
}

function normalizeStorageError({
  operation,
  error,
  fallbackMessage,
}: {
  operation:
    string;

  error:
    unknown;

  fallbackMessage:
    string;
}) {
  if (
    error instanceof
    EmailDeliveryStorageError
  ) {
    return error;
  }

  return new EmailDeliveryStorageError({
    message:
      error instanceof
        Error
        ? error.message
        : fallbackMessage,

    code:
      "unknown",

    operation,

    cause:
      error,
  });
}

function readErrorCode(
  error:
    unknown,
) {
  if (
    !isRecord(
      error,
    )
  ) {
    return null;
  }

  const code =
    error.code;

  return typeof code ===
    "string"
    ? code
    : null;
}

function readErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return error.message.trim();
  }

  if (
    !isRecord(
      error,
    )
  ) {
    return "";
  }

  const message =
    error.message;

  return typeof message ===
      "string"
    ? message.trim()
    : "";
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
