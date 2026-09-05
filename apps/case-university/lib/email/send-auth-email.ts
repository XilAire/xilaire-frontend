import React from "react";
import { Resend } from "resend";

import ResetPasswordEmail from "@/emails/auth/ResetPasswordEmail";

type SendResetPasswordEmailInput = {
  to: string;
  resetUrl: string;
  firstName?: string;
  expiresInMinutes?: number;
};

type SendAuthEmailSuccess = {
  success: true;
  id: string;
};

type SendAuthEmailFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number | null;
  };
};

export type SendAuthEmailResult =
  | SendAuthEmailSuccess
  | SendAuthEmailFailure;

const CASE_UNIVERSITY_FROM_EMAIL =
  "CASE University <noreply@university.casetrades.com>";

export async function sendResetPasswordEmail({
  to,
  resetUrl,
  firstName,
  expiresInMinutes = 60,
}: SendResetPasswordEmailInput): Promise<SendAuthEmailResult> {
  const resend = createResendClient();

  const replyTo =
    process.env.SUPPORT_INBOX_EMAIL?.trim();

  try {
    const { data, error } =
      await resend.emails.send({
        from: CASE_UNIVERSITY_FROM_EMAIL,
        to: [to],
        subject: "Reset your CASE University password",
        replyTo: replyTo || undefined,
        react: React.createElement(
          ResetPasswordEmail,
          {
            firstName,
            resetUrl,
            expiresInMinutes,
          },
        ),
        text: buildResetPasswordText({
          firstName,
          resetUrl,
          expiresInMinutes,
        }),
      });

    if (error) {
      return {
        success: false,
        error: {
          code: readErrorCode(error),
          message:
            error.message ||
            "Resend rejected the CASE University password reset email.",
          statusCode: readStatusCode(error),
        },
      };
    }

    if (!data?.id) {
      return {
        success: false,
        error: {
          code: "missing_email_id",
          message:
            "Resend did not return an email delivery ID.",
          statusCode: null,
        },
      };
    }

    return {
      success: true,
      id: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: "unexpected_email_error",
        message:
          error instanceof Error
            ? error.message
            : "Unexpected CASE University email delivery failure.",
        statusCode: null,
      },
    };
  }
}

function createResendClient() {
  const apiKey =
    process.env.RESEND_API_KEY_CASE_UNIVERSITY?.trim();

  if (!apiKey) {
    throw new Error(
      "Missing RESEND_API_KEY_CASE_UNIVERSITY.",
    );
  }

  return new Resend(apiKey);
}

function buildResetPasswordText({
  firstName,
  resetUrl,
  expiresInMinutes,
}: {
  firstName?: string;
  resetUrl: string;
  expiresInMinutes: number;
}) {
  const greeting =
    firstName
      ? `Hi ${firstName},`
      : "Hello,";

  return [
    greeting,
    "",
    "We received a request to reset the password for your CASE University account.",
    "",
    `Reset your password: ${resetUrl}`,
    "",
    `For your security, this password reset link expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
    "",
    "CASE University",
  ].join("\n");
}

function readErrorCode(
  error: unknown,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof (
      error as {
        name?: unknown;
      }
    ).name === "string"
  ) {
    return (
      error as {
        name: string;
      }
    ).name;
  }

  return "resend_error";
}

function readStatusCode(
  error: unknown,
) {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (
      error as {
        statusCode?: unknown;
      }
    ).statusCode === "number"
  ) {
    return (
      error as {
        statusCode: number;
      }
    ).statusCode;
  }

  return null;
}
