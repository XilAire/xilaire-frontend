import "server-only";

import {
  Resend,
} from "resend";

const RESEND_API_KEY_ENV_NAME =
  "RESEND_API_KEY_CASE_BUDGET";

export const CASE_BUDGET_EMAIL_ADDRESSES = {
  noreply:
    "noreply@casebudgets.com",

  support:
    "support@casebudgets.com",

  billing:
    "billing@casebudgets.com",

  security:
    "security@casebudgets.com",

  hello:
    "hello@casebudgets.com",
} as const;

export const CASE_BUDGET_EMAIL_SENDERS = {
  noreply:
    `CASE Budget <${CASE_BUDGET_EMAIL_ADDRESSES.noreply}>`,

  support:
    `CASE Budget Support <${CASE_BUDGET_EMAIL_ADDRESSES.support}>`,

  billing:
    `CASE Budget Billing <${CASE_BUDGET_EMAIL_ADDRESSES.billing}>`,

  security:
    `CASE Budget Security <${CASE_BUDGET_EMAIL_ADDRESSES.security}>`,

  hello:
    `CASE Budget <${CASE_BUDGET_EMAIL_ADDRESSES.hello}>`,
} as const;

export type CaseBudgetEmailSender =
  keyof typeof CASE_BUDGET_EMAIL_SENDERS;

let resendClient:
  Resend | null =
    null;

/**
 * Returns the shared server-side Resend client for CASE Budget.
 *
 * The API key must never be exposed through a NEXT_PUBLIC_* environment
 * variable. All Resend delivery must occur from trusted server-side code.
 */
export function getCaseBudgetResendClient() {
  if (
    resendClient
  ) {
    return resendClient;
  }

  const apiKey =
    requireEnvironmentVariable(
      RESEND_API_KEY_ENV_NAME,
    );

  resendClient =
    new Resend(
      apiKey,
    );

  return resendClient;
}

/**
 * Resolves a named CASE Budget sender into the fully formatted
 * "Display Name <email@domain>" representation expected by Resend.
 */
export function getCaseBudgetEmailSender(
  sender:
    CaseBudgetEmailSender =
      "noreply",
) {
  return CASE_BUDGET_EMAIL_SENDERS[
    sender
  ];
}

/**
 * Resolves the raw mailbox address for a named CASE Budget sender.
 */
export function getCaseBudgetEmailAddress(
  sender:
    CaseBudgetEmailSender =
      "noreply",
) {
  return CASE_BUDGET_EMAIL_ADDRESSES[
    sender
  ];
}

function requireEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    value
  ) {
    return value;
  }

  throw new Error(
    `Missing required environment variable ${variableName}.`,
  );
}