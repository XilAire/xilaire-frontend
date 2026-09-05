import "server-only";

import {
  Resend,
} from "resend";

const RESEND_API_KEY_ENV_NAME =
  "RESEND_API_KEY_CASE_UNIVERSITY";

const UNIVERSITY_EMAIL_DOMAIN =
  "university.casetrades.com";

const SUPPORT_INBOX_EMAIL =
  process.env
    .SUPPORT_INBOX_EMAIL
    ?.trim() ||
  "support@xilairetechnologies.com";

export const CASE_UNIVERSITY_EMAIL_ADDRESSES = {
  noreply:
    `noreply@${UNIVERSITY_EMAIL_DOMAIN}`,

  support:
    `support@${UNIVERSITY_EMAIL_DOMAIN}`,

  billing:
    `billing@${UNIVERSITY_EMAIL_DOMAIN}`,

  security:
    `security@${UNIVERSITY_EMAIL_DOMAIN}`,

  hello:
    `hello@${UNIVERSITY_EMAIL_DOMAIN}`,
} as const;

export const CASE_UNIVERSITY_EMAIL_SENDERS = {
  noreply:
    `CASE University <${CASE_UNIVERSITY_EMAIL_ADDRESSES.noreply}>`,

  support:
    `CASE University Support <${CASE_UNIVERSITY_EMAIL_ADDRESSES.support}>`,

  billing:
    `CASE University Billing <${CASE_UNIVERSITY_EMAIL_ADDRESSES.billing}>`,

  security:
    `CASE University Security <${CASE_UNIVERSITY_EMAIL_ADDRESSES.security}>`,

  hello:
    `CASE University <${CASE_UNIVERSITY_EMAIL_ADDRESSES.hello}>`,
} as const;

export const CASE_UNIVERSITY_EMAIL_REPLY_TO = {
  support:
    SUPPORT_INBOX_EMAIL,

  security:
    SUPPORT_INBOX_EMAIL,

  billing:
    SUPPORT_INBOX_EMAIL,

  hello:
    SUPPORT_INBOX_EMAIL,

  noreply:
    SUPPORT_INBOX_EMAIL,
} as const;

export type CaseUniversityEmailSender =
  keyof typeof CASE_UNIVERSITY_EMAIL_SENDERS;

let resendClient:
  Resend | null =
    null;

/**
 * Returns the shared server-side Resend client for CASE University.
 *
 * The Resend API key must remain server-only and must never use
 * a NEXT_PUBLIC_* environment variable.
 */
export function getCaseUniversityResendClient() {
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
 * Resolves a named CASE University sender into the formatted
 * "Display Name <email@domain>" representation expected by Resend.
 */
export function getCaseUniversityEmailSender(
  sender:
    CaseUniversityEmailSender =
      "noreply",
) {
  return CASE_UNIVERSITY_EMAIL_SENDERS[
    sender
  ];
}

/**
 * Resolves the raw mailbox address for a named CASE University sender.
 */
export function getCaseUniversityEmailAddress(
  sender:
    CaseUniversityEmailSender =
      "noreply",
) {
  return CASE_UNIVERSITY_EMAIL_ADDRESSES[
    sender
  ];
}

/**
 * Resolves the real monitored Reply-To mailbox.
 *
 * University sender addresses are transactional sender identities.
 * Replies are routed to the existing monitored XilAire support mailbox.
 */
export function getCaseUniversityReplyTo(
  sender:
    CaseUniversityEmailSender =
      "noreply",
) {
  return CASE_UNIVERSITY_EMAIL_REPLY_TO[
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