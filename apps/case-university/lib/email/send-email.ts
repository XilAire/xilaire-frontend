import "server-only";

import type {
  ReactElement,
} from "react";

import {
  getCaseUniversityEmailSender,
  getCaseUniversityReplyTo,
  getCaseUniversityResendClient,
  type CaseUniversityEmailSender,
} from "./resend";

export type SendCaseUniversityEmailInput = {
  to:
    string | string[];

  subject:
    string;

  react:
    ReactElement;

  sender?:
    CaseUniversityEmailSender;

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

export type SendCaseUniversityEmailSuccess = {
  success:
    true;

  data: {
    id:
      string | null;
  };
};

export type SendCaseUniversityEmailFailure = {
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

export type SendCaseUniversityEmailResult =
  | SendCaseUniversityEmailSuccess
  | SendCaseUniversityEmailFailure;

/**
 * Sends a CASE University transactional email through Resend.
 *
 * Application services should use this helper instead of calling
 * the Resend SDK directly.
 *
 * This keeps:
 *
 * - sender identities
 * - Reply-To behavior
 * - recipient normalization
 * - tags
 * - logging
 * - error handling
 *
 * consistent across authentication, billing, learning,
 * notification, certificate, and marketing emails.
 */
export async function sendCaseUniversityEmail({
  to,
  subject,
  react,
  sender = "noreply",
  replyTo,
  cc,
  bcc,
  tags,
}: SendCaseUniversityEmailInput):
  Promise<SendCaseUniversityEmailResult> {
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

  const normalizedReplyTo =
    replyTo
      ? normalizeEmailAddresses(
          replyTo,
        )
      : normalizeEmailAddresses(
          getCaseUniversityReplyTo(
            sender,
          ),
        );

  const normalizedCc =
    cc
      ? normalizeEmailAddresses(
          cc,
        )
      : [];

  const normalizedBcc =
    bcc
      ? normalizeEmailAddresses(
          bcc,
        )
      : [];

  const normalizedTags =
    tags
      ? normalizeTags(
          tags,
        )
      : [];

  try {
    const resend =
      getCaseUniversityResendClient();

    const {
      data,
      error,
    } =
      await resend.emails.send({
        from:
          getCaseUniversityEmailSender(
            sender,
          ),

        to:
          normalizedRecipients,

        subject:
          normalizedSubject,

        react,

        ...(normalizedReplyTo.length >
        0
          ? {
              replyTo:
                normalizedReplyTo,
            }
          : {}),

        ...(normalizedCc.length >
        0
          ? {
              cc:
                normalizedCc,
            }
          : {}),

        ...(normalizedBcc.length >
        0
          ? {
              bcc:
                normalizedBcc,
            }
          : {}),

        ...(normalizedTags.length >
        0
          ? {
              tags:
                normalizedTags,
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
      "CASE University could not send the email.",
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
            address
              .trim()
              .toLowerCase(),
        )
        .filter(
          (
            address,
          ) =>
            isValidEmailAddress(
              address,
            ),
        ),
    ),
  );
}

function isValidEmailAddress(
  value:
    string,
) {
  if (
    !value
  ) {
    return false;
  }

  const atIndex =
    value.indexOf(
      "@",
    );

  if (
    atIndex <=
      0 ||
    atIndex ===
      value.length -
        1
  ) {
    return false;
  }

  const domain =
    value.slice(
      atIndex +
        1,
    );

  return domain.includes(
    ".",
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
  const seen =
    new Set<string>();

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
      ) => {
        if (
          !tag.name ||
          !tag.value
        ) {
          return false;
        }

        const key =
          `${tag.name}:${tag.value}`;

        if (
          seen.has(
            key,
          )
        ) {
          return false;
        }

        seen.add(
          key,
        );

        return true;
      },
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
}): SendCaseUniversityEmailFailure {
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

  return "CASE University could not send the email.";
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
      `[CASE University Email] ${message}`,
    );

    return;
  }

  console.error(
    `[CASE University Email] ${message}`,
    context,
  );
}