import "server-only";

import type {
  ReactElement,
} from "react";

import {
  getCaseBudgetEmailSender,
  getCaseBudgetResendClient,
  type CaseBudgetEmailSender,
} from "./resend";

export type SendCaseBudgetEmailInput = {
  to:
    string | string[];

  subject:
    string;

  react:
    ReactElement;

  sender?:
    CaseBudgetEmailSender;

  replyTo?:
    string | string[];

  cc?:
    string | string[];

  bcc?:
    string | string[];

  tags?:
    {
      name:
        string;

      value:
        string;
    }[];
};

export type SendCaseBudgetEmailSuccess = {
  success:
    true;

  data: {
    id:
      string | null;
  };
};

export type SendCaseBudgetEmailFailure = {
  success:
    false;

  error: {
    code:
      string;

    message:
      string;

    statusCode:
      number | null;
  };
};

export type SendCaseBudgetEmailResult =
  | SendCaseBudgetEmailSuccess
  | SendCaseBudgetEmailFailure;

/**
 * Sends a CASE Budget transactional email through Resend.
 *
 * All callers should use this helper rather than calling the Resend SDK
 * directly. This keeps sender formatting, validation, logging, and error
 * handling consistent across authentication, billing, and notification
 * emails.
 */
export async function sendCaseBudgetEmail({
  to,
  subject,
  react,
  sender = "noreply",
  replyTo,
  cc,
  bcc,
  tags,
}: SendCaseBudgetEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedRecipients =
    normalizeEmailAddresses(
      to,
    );

  if (
    normalizedRecipients.length ===
    0
  ) {
    return failure({
      code:
        "recipient-required",

      message:
        "At least one valid email recipient is required.",

      statusCode:
        null,
    });
  }

  const normalizedSubject =
    subject.trim();

  if (
    !normalizedSubject
  ) {
    return failure({
      code:
        "subject-required",

      message:
        "An email subject is required.",

      statusCode:
        null,
    });
  }

  try {
    const resend =
      getCaseBudgetResendClient();

    const {
      data,
      error,
    } =
      await resend.emails.send({
        from:
          getCaseBudgetEmailSender(
            sender,
          ),

        to:
          normalizedRecipients,

        subject:
          normalizedSubject,

        react,

        ...(replyTo
          ? {
              replyTo:
                normalizeEmailAddresses(
                  replyTo,
                ),
            }
          : {}),

        ...(cc
          ? {
              cc:
                normalizeEmailAddresses(
                  cc,
                ),
            }
          : {}),

        ...(bcc
          ? {
              bcc:
                normalizeEmailAddresses(
                  bcc,
                ),
            }
          : {}),

        ...(tags &&
        tags.length >
          0
          ? {
              tags:
                normalizeTags(
                  tags,
                ),
            }
          : {}),
      });

    if (
      error
    ) {
      logEmailError(
        "Resend returned an email delivery error.",
        {
          error,
          subject:
            normalizedSubject,

          sender,

          recipientCount:
            normalizedRecipients.length,
        },
      );

      return failure({
        code:
          readErrorCode(
            error,
          ),

        message:
          readErrorMessage(
            error,
          ),

        statusCode:
          readStatusCode(
            error,
          ),
      });
    }

    return {
      success:
        true,

      data: {
        id:
          data?.id ??
          null,
      },
    };
  } catch (
    error
  ) {
    logEmailError(
      "CASE Budget could not send the email.",
      {
        error,
        subject:
          normalizedSubject,

        sender,

        recipientCount:
          normalizedRecipients.length,
      },
    );

    return failure({
      code:
        "email-send-failed",

      message:
        getUnknownErrorMessage(
          error,
        ),

      statusCode:
        null,
    });
  }
}

function normalizeEmailAddresses(
  value:
    string | string[],
) {
  const addresses =
    Array.isArray(
      value,
    )
      ? value
      : [
          value,
        ];

  return Array.from(
    new Set(
      addresses
        .map(
          (
            address,
          ) =>
            address.trim(),
        )
        .filter(
          (
            address,
          ) =>
            Boolean(
              address,
            ),
        ),
    ),
  );
}

function normalizeTags(
  tags:
    {
      name:
        string;

      value:
        string;
    }[],
) {
  return tags
    .map(
      (
        tag,
      ) => ({
        name:
          tag.name.trim(),

        value:
          tag.value.trim(),
      }),
    )
    .filter(
      (
        tag,
      ) =>
        Boolean(
          tag.name,
        ) &&
        Boolean(
          tag.value,
        ),
    );
}

function failure({
  code,
  message,
  statusCode,
}: {
  code:
    string;

  message:
    string;

  statusCode:
    number | null;
}): SendCaseBudgetEmailFailure {
  return {
    success:
      false,

    error: {
      code,
      message,
      statusCode,
    },
  };
}

function readErrorCode(
  error:
    unknown,
) {
  if (
    typeof error ===
      "object" &&
    error !==
      null &&
    "name" in
      error &&
    typeof (
      error as {
        name?: unknown;
      }
    ).name ===
      "string"
  ) {
    return (
      error as {
        name:
          string;
      }
    ).name;
  }

  return "resend-error";
}

function readErrorMessage(
  error:
    unknown,
) {
  if (
    typeof error ===
      "object" &&
    error !==
      null &&
    "message" in
      error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message ===
      "string"
  ) {
    return (
      error as {
        message:
          string;
      }
    ).message;
  }

  return "Resend could not send the email.";
}

function readStatusCode(
  error:
    unknown,
) {
  if (
    typeof error ===
      "object" &&
    error !==
      null &&
    "statusCode" in
      error &&
    typeof (
      error as {
        statusCode?: unknown;
      }
    ).statusCode ===
      "number"
  ) {
    return (
      error as {
        statusCode:
          number;
      }
    ).statusCode;
  }

  return null;
}

function getUnknownErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return "CASE Budget could not send the email.";
}

function logEmailError(
  message:
    string,
  context:
    Record<
      string,
      unknown
    >,
) {
  if (
    process.env.NODE_ENV ===
      "production"
  ) {
    console.error(
      `[CASE Budget Email] ${message}`,
    );

    return;
  }

  console.error(
    `[CASE Budget Email] ${message}`,
    context,
  );
}