import "server-only";

import {
  getPlaidClient,
} from "@/lib/integrations/plaid/client";

import {
  PlaidServiceError,
  type PlaidServiceErrorCode,
} from "@/lib/integrations/plaid/link";

export type UpdatePlaidItemWebhookInput = {
  accessToken:
    string;

  webhookUrl:
    string;
};

export type UpdatePlaidItemWebhookResult = {
  updated:
    true;

  webhookUrl:
    string;

  requestId:
    string;
};

/**
 * Updates the webhook URL for an existing Plaid Item.
 *
 * This is the correct Plaid API for changing the webhook on an Item that
 * already exists. Creating an update-mode Link token does not retroactively
 * change the Item webhook.
 *
 * The access token must remain server-side at all times.
 */
export async function updatePlaidItemWebhook({
  accessToken,
  webhookUrl,
}: UpdatePlaidItemWebhookInput): Promise<
  UpdatePlaidItemWebhookResult
> {
  const normalizedAccessToken =
    requireNonEmptyValue(
      accessToken,
      "Plaid access token",
    );

  const normalizedWebhookUrl =
    normalizeWebhookUrl(
      webhookUrl,
    );

  try {
    const plaid =
      getPlaidClient();

    const response =
      await plaid.itemWebhookUpdate({
        access_token:
          normalizedAccessToken,

        webhook:
          normalizedWebhookUrl,
      });

    return {
      updated:
        true,

      webhookUrl:
        normalizedWebhookUrl,

      requestId:
        response.data.request_id,
    };
  } catch (
    error
  ) {
    throw normalizePlaidItemError(
      error,
      "Unable to update the Plaid Item webhook.",
    );
  }
}

function normalizeWebhookUrl(
  value:
    unknown,
) {
  const normalized =
    requireNonEmptyValue(
      value,
      "Plaid webhook URL",
    );

  let parsed:
    URL;

  try {
    parsed =
      new URL(
        normalized,
      );
  } catch {
    throw new PlaidServiceError({
      message:
        "Plaid webhook URL must be a valid absolute URL.",

      code:
        "invalid-input",
    });
  }

  if (
    parsed.protocol !==
    "https:"
  ) {
    throw new PlaidServiceError({
      message:
        "Plaid webhook URL must use HTTPS.",

      code:
        "invalid-input",
    });
  }

  return parsed.toString();
}

function requireNonEmptyValue(
  value:
    unknown,
  label:
    string,
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new PlaidServiceError({
      message:
        `${label} is required.`,

      code:
        "invalid-input",
    });
  }

  const normalized =
    value.trim();

  if (
    !normalized
  ) {
    throw new PlaidServiceError({
      message:
        `${label} is required.`,

      code:
        "invalid-input",
    });
  }

  return normalized;
}

/**
 * Maps Plaid/Axios provider failures into the same safe PlaidServiceError
 * contract used by the rest of CASE Budget's Plaid integration.
 *
 * Never serialize or log the raw provider error object because it may contain
 * request headers or other sensitive server-only metadata.
 */
function normalizePlaidItemError(
  error:
    unknown,
  fallbackMessage:
    string,
) {
  if (
    error instanceof
    PlaidServiceError
  ) {
    return error;
  }

  const errorRecord =
    toRecord(
      error,
    );

  const responseRecord =
    toRecord(
      errorRecord?.response,
    );

  const responseData =
    toRecord(
      responseRecord?.data,
    );

  const plaidErrorType =
    getOptionalString(
      responseData?.error_type,
    );

  const plaidErrorCode =
    getOptionalString(
      responseData?.error_code,
    );

  const plaidMessage =
    getOptionalString(
      responseData?.error_message,
    );

  const displayMessage =
    getOptionalString(
      responseData?.display_message,
    );

  const requestId =
    getOptionalString(
      responseData?.request_id,
    );

  const statusCode =
    getOptionalNumber(
      responseRecord?.status,
    );

  return new PlaidServiceError({
    message:
      plaidMessage ??
      fallbackMessage,

    code:
      mapPlaidItemErrorCode({
        plaidErrorType,
        plaidErrorCode,
        statusCode,
      }),

    plaidErrorType,

    plaidErrorCode,

    displayMessage,

    requestId,

    statusCode,

    cause:
      error,
  });
}

function mapPlaidItemErrorCode({
  plaidErrorType,
  plaidErrorCode,
  statusCode,
}: {
  plaidErrorType:
    string | undefined;

  plaidErrorCode:
    string | undefined;

  statusCode:
    number | undefined;
}): PlaidServiceErrorCode {
  const normalizedType =
    plaidErrorType
      ?.trim()
      .toUpperCase();

  const normalizedCode =
    plaidErrorCode
      ?.trim()
      .toUpperCase();

  if (
    normalizedCode ===
    "ITEM_LOGIN_REQUIRED"
  ) {
    return "item-login-required";
  }

  if (
    normalizedCode ===
    "ITEM_NOT_FOUND"
  ) {
    return "item-not-found";
  }

  if (
    normalizedCode ===
      "INVALID_ACCESS_TOKEN" ||
    normalizedCode ===
      "INVALID_API_KEYS"
  ) {
    return "invalid-token";
  }

  if (
    normalizedCode ===
      "INSTITUTION_DOWN" ||
    normalizedCode ===
      "INSTITUTION_NOT_RESPONDING"
  ) {
    return "institution-unavailable";
  }

  if (
    normalizedCode ===
      "RATE_LIMIT_EXCEEDED" ||
    normalizedType ===
      "RATE_LIMIT_EXCEEDED" ||
    statusCode ===
      429
  ) {
    return "rate-limited";
  }

  if (
    normalizedType ===
      "INVALID_REQUEST" ||
    normalizedType ===
      "INVALID_INPUT"
  ) {
    return "invalid-request";
  }

  if (
    statusCode &&
    statusCode >=
      500
  ) {
    return "provider-error";
  }

  return "provider-error";
}

function toRecord(
  value:
    unknown,
): Record<
  string,
  unknown
> | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null
  ) {
    return null;
  }

  return value as Record<
    string,
    unknown
  >;
}

function getOptionalString(
  value:
    unknown,
) {
  return typeof value ===
      "string" &&
    value.trim()
    ? value.trim()
    : undefined;
}

function getOptionalNumber(
  value:
    unknown,
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : undefined;
}
