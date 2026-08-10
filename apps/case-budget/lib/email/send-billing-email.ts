import "server-only";

import {
  createElement,
} from "react";

import PaymentFailed from "@/emails/billing/PaymentFailed";
import Receipt from "@/emails/billing/Receipt";
import TrialEnding from "@/emails/billing/TrialEnding";

import {
  sendCaseBudgetEmail,
  type SendCaseBudgetEmailResult,
} from "./send-email";

import {
  CASE_BUDGET_EMAIL_ADDRESSES,
} from "./resend";

export type SendTrialEndingEmailInput = {
  to:
    string;

  firstName?:
    string;

  planName?:
    string;

  trialEndsOn?:
    string;

  daysRemaining?:
    number;

  billingUrl?:
    string;

  monthlyPrice?:
    string;

  annualPrice?:
    string;
};

export type SendPaymentFailedEmailInput = {
  to:
    string;

  firstName?:
    string;

  planName?:
    string;

  amountDue?:
    string;

  retryDate?:
    string;

  billingUrl?:
    string;
};

export type SendReceiptEmailInput = {
  to:
    string;

  firstName?:
    string;

  receiptNumber?:
    string;

  billingDate?:
    string;

  planName?:
    string;

  paymentMethodLabel?:
    string;

  subtotal?:
    string;

  tax?:
    string;

  total:
    string;

  lineItems?: {
    label:
      string;

    amount:
      string;
  }[];

  billingUrl?:
    string;

  receiptUrl?:
    string;
};

/**
 * Sends a CASE Budget trial-ending notification.
 */
export async function sendTrialEndingEmail({
  to,
  firstName,
  planName,
  trialEndsOn,
  daysRemaining = 3,
  billingUrl,
  monthlyPrice,
  annualPrice,
}: SendTrialEndingEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  const normalizedPlanName =
    normalizeOptionalText(
      planName,
    );

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      normalizedPlanName
        ? `${normalizedPlanName} trial ending soon`
        : "Your CASE Budget trial is ending soon",

    sender:
      "billing",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        TrialEnding,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          planName:
            normalizedPlanName,

          trialEndsOn:
            normalizeOptionalText(
              trialEndsOn,
            ),

          daysRemaining:
            normalizePositiveInteger(
              daysRemaining,
              3,
            ),

          billingUrl:
            normalizeOptionalText(
              billingUrl,
            ),

          monthlyPrice:
            normalizeOptionalText(
              monthlyPrice,
            ),

          annualPrice:
            normalizeOptionalText(
              annualPrice,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "billing",
      },

      {
        name:
          "template",

        value:
          "trial-ending",
      },
    ],
  });
}

/**
 * Sends a failed-payment notification for a CASE Budget subscription.
 */
export async function sendPaymentFailedEmail({
  to,
  firstName,
  planName,
  amountDue,
  retryDate,
  billingUrl,
}: SendPaymentFailedEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  if (
    !normalizedEmail
  ) {
    return createInputFailure(
      "recipient-required",
      "A recipient email address is required.",
    );
  }

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      "Action needed: CASE Budget payment failed",

    sender:
      "billing",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        PaymentFailed,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          planName:
            normalizeOptionalText(
              planName,
            ),

          amountDue:
            normalizeOptionalText(
              amountDue,
            ),

          retryDate:
            normalizeOptionalText(
              retryDate,
            ),

          billingUrl:
            normalizeOptionalText(
              billingUrl,
            ),

          supportEmail:
            CASE_BUDGET_EMAIL_ADDRESSES.support,
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "billing",
      },

      {
        name:
          "template",

        value:
          "payment-failed",
      },
    ],
  });
}

/**
 * Sends a receipt after a successful CASE Budget subscription payment.
 */
export async function sendReceiptEmail({
  to,
  firstName,
  receiptNumber,
  billingDate,
  planName,
  paymentMethodLabel,
  subtotal,
  tax,
  total,
  lineItems = [],
  billingUrl,
  receiptUrl,
}: SendReceiptEmailInput):
  Promise<SendCaseBudgetEmailResult> {
  const normalizedEmail =
    normalizeRequiredText(
      to,
    );

  const normalizedTotal =
    normalizeRequiredText(
      total,
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
    !normalizedTotal
  ) {
    return createInputFailure(
      "total-required",
      "A receipt total is required.",
    );
  }

  const normalizedLineItems =
    normalizeLineItems(
      lineItems,
    );

  return sendCaseBudgetEmail({
    to:
      normalizedEmail,

    subject:
      receiptNumber?.trim()
        ? `CASE Budget receipt ${receiptNumber.trim()}`
        : "Your CASE Budget receipt",

    sender:
      "billing",

    replyTo:
      CASE_BUDGET_EMAIL_ADDRESSES.support,

    react:
      createElement(
        Receipt,
        {
          firstName:
            normalizeOptionalText(
              firstName,
            ),

          receiptNumber:
            normalizeOptionalText(
              receiptNumber,
            ),

          billingDate:
            normalizeOptionalText(
              billingDate,
            ),

          planName:
            normalizeOptionalText(
              planName,
            ),

          paymentMethodLabel:
            normalizeOptionalText(
              paymentMethodLabel,
            ),

          subtotal:
            normalizeOptionalText(
              subtotal,
            ),

          tax:
            normalizeOptionalText(
              tax,
            ),

          total:
            normalizedTotal,

          lineItems:
            normalizedLineItems,

          billingUrl:
            normalizeOptionalText(
              billingUrl,
            ),

          receiptUrl:
            normalizeOptionalText(
              receiptUrl,
            ),
        },
      ),

    tags: [
      {
        name:
          "category",

        value:
          "billing",
      },

      {
        name:
          "template",

        value:
          "receipt",
      },
    ],
  });
}

function normalizeLineItems(
  lineItems:
    {
      label:
        string;

      amount:
        string;
    }[],
) {
  return lineItems
    .map(
      (
        item,
      ) => ({
        label:
          item.label.trim(),

        amount:
          item.amount.trim(),
      }),
    )
    .filter(
      (
        item,
      ) =>
        Boolean(
          item.label,
        ) &&
        Boolean(
          item.amount,
        ),
    );
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