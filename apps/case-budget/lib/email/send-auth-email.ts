import "server-only";

import {
  createElement,
} from "react";

import ChangeEmailEmail from "@/emails/auth/ChangeEmailEmail";
import ConfirmEmail from "@/emails/auth/ConfirmEmail";
import InviteUserEmail from "@/emails/auth/InviteUserEmail";
import MagicLinkEmail from "@/emails/auth/MagicLinkEmail";
import ResetPasswordEmail from "@/emails/auth/ResetPasswordEmail";

import {
  sendCaseBudgetEmail,
  type SendCaseBudgetEmailResult,
} from "./send-email";

import {
  CASE_BUDGET_EMAIL_ADDRESSES,
} from "./resend";

export type SendConfirmEmailInput = {
  to:
    string;

  confirmationUrl:
    string;

  firstName?:
    string;

  expiresInMinutes?:
    number;
};

export type SendResetPasswordEmailInput = {
  to:
    string;

  resetUrl:
    string;

  firstName?:
    string;

  expiresInMinutes?:
    number;
};

export type SendMagicLinkEmailInput = {
  to:
    string;

  magicLinkUrl:
    string;

  firstName?:
    string;

  expiresInMinutes?:
    number;
};

export type SendInviteUserEmailInput = {
  to:
    string;

  inviteUrl:
    string;

  recipientName?:
    string;

  inviterName?:
    string;

  workspaceName?:
    string;

  expiresInHours?:
    number;
};

export type SendChangeEmailEmailInput = {
  to:
    string;

  confirmationUrl:
    string;

  firstName?:
    string;

  currentEmail?:
    string;

  newEmail?:
    string;

  expiresInMinutes?:
    number;
};

/**
 * Sends the CASE Budget account confirmation email.
 *
 * This email is intended for user-registration flows where the user must
 * verify ownership of their email address before completing authentication.
 */
export async function sendConfirmEmail({
  to,
  confirmationUrl,
  firstName,
  expiresInMinutes = 60,
}: SendConfirmEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedConfirmationUrl =
    normalizeRequiredText(
      confirmationUrl,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedConfirmationUrl
  ) {
    return createInputFailure(
      "confirmation-url-required",
      "A confirmation URL is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      "Confirm your CASE Budget email",

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        ConfirmEmail,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          confirmationUrl:
            normalizedConfirmationUrl,

          expiresInMinutes:
            normalizePositiveInteger(
              expiresInMinutes,
              60,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "authentication",
      },

      {
        name:
          "template",

        value:
          "confirm-email",
      },
    ],
  });
}

/**
 * Sends the CASE Budget password-reset email.
 */
export async function sendResetPasswordEmail({
  to,
  resetUrl,
  firstName,
  expiresInMinutes = 60,
}: SendResetPasswordEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedResetUrl =
    normalizeRequiredText(
      resetUrl,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedResetUrl
  ) {
    return createInputFailure(
      "reset-url-required",
      "A password reset URL is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      "Reset your CASE Budget password",

    sender:
      "security",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        ResetPasswordEmail,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          resetUrl:
            normalizedResetUrl,

          expiresInMinutes:
            normalizePositiveInteger(
              expiresInMinutes,
              60,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "authentication",
      },

      {
        name:
          "template",

        value:
          "reset-password",
      },
    ],
  });
}

/**
 * Sends a passwordless CASE Budget magic-link email.
 */
export async function sendMagicLinkEmail({
  to,
  magicLinkUrl,
  firstName,
  expiresInMinutes = 60,
}: SendMagicLinkEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedMagicLinkUrl =
    normalizeRequiredText(
      magicLinkUrl,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedMagicLinkUrl
  ) {
    return createInputFailure(
      "magic-link-url-required",
      "A magic-link URL is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      "Your secure CASE Budget sign-in link",

    sender:
      "security",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        MagicLinkEmail,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          magicLinkUrl:
            normalizedMagicLinkUrl,

          expiresInMinutes:
            normalizePositiveInteger(
              expiresInMinutes,
              60,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "authentication",
      },

      {
        name:
          "template",

        value:
          "magic-link",
      },
    ],
  });
}

/**
 * Sends a CASE Budget workspace invitation email.
 */
export async function sendInviteUserEmail({
  to,
  inviteUrl,
  recipientName,
  inviterName,
  workspaceName,
  expiresInHours = 72,
}: SendInviteUserEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedInviteUrl =
    normalizeRequiredText(
      inviteUrl,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedInviteUrl
  ) {
    return createInputFailure(
      "invite-url-required",
      "A workspace invitation URL is required.",
    );
  }

  const normalizedWorkspaceName =
    normalizeOptionalText(
      workspaceName,
    );

  const subject =
    normalizedWorkspaceName
      ? `You're invited to ${normalizedWorkspaceName} in CASE Budget`
      : "You're invited to a CASE Budget workspace";

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject,

    sender:
      "noreply",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        InviteUserEmail,
        {
          recipientName:
            normalizeOptionalText(
              recipientName,
            ),

          inviterName:
            normalizeOptionalText(
              inviterName,
            ),

          workspaceName:
            normalizedWorkspaceName,

          inviteUrl:
            normalizedInviteUrl,

          expiresInHours:
            normalizePositiveInteger(
              expiresInHours,
              72,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "authentication",
      },

      {
        name:
          "template",

        value:
          "invite-user",
      },
    ],
  });
}

/**
 * Sends the confirmation message used when a CASE Budget user changes the
 * email address associated with their account.
 */
export async function sendChangeEmailEmail({
  to,
  confirmationUrl,
  firstName,
  currentEmail,
  newEmail,
  expiresInMinutes = 60,
}: SendChangeEmailEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedConfirmationUrl =
    normalizeRequiredText(
      confirmationUrl,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  if (
    !normalizedConfirmationUrl
  ) {
    return createInputFailure(
      "confirmation-url-required",
      "An email-change confirmation URL is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      "Confirm your CASE Budget email change",

    sender:
      "security",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        ChangeEmailEmail,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          currentEmail:
            normalizeOptionalText(
              currentEmail,
            ),

          newEmail:
            normalizeOptionalText(
              newEmail,
            ),

          confirmationUrl:
            normalizedConfirmationUrl,

          expiresInMinutes:
            normalizePositiveInteger(
              expiresInMinutes,
              60,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "authentication",
      },

      {
        name:
          "template",

        value:
          "change-email",
      },
    ],
  });
}

function createInputFailure(
  code:
    string,
  message:
    string,
): SendCaseBudgetEmailResult {
  return {
    success:
      false,

    error: {
      code,
      message,

      statusCode:
        null,
    },
  };
}

function normalizeRequiredText(
  value:
    string,
) {
  return value.trim();
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizePositiveInteger(
  value:
    number | undefined,
  fallback:
    number,
) {
  if (
    value ===
      undefined ||
    !Number.isFinite(
      value,
    ) ||
    value <=
      0
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(
      value,
    ),
  );
}