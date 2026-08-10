import "server-only";

import {
  type ItemGetResponse,
  type LinkTokenCreateRequest,
  type LinkTokenCreateResponse,
  type Products,
} from "plaid";

import {
  getPlaidClient,
  getPlaidServerConfiguration,
} from "@/lib/integrations/plaid/client";

export type CreatePlaidLinkTokenInput = {
  userId: string;

  clientName?: string;

  products?: Products[];

  accountFilters?:
    LinkTokenCreateRequest["account_filters"];

  redirectUri?: string;
  webhookUrl?: string;

  accessToken?: string;

  updateReason?: string;
};

export type PlaidLinkTokenResult = {
  linkToken: string;
  expiration: string;
  requestId: string;
};

export type ExchangePlaidPublicTokenResult = {
  accessToken: string;
  itemId: string;
  requestId: string;
};

export type PlaidItemStatus = {
  itemId: string;

  institutionId?: string;

  webhookUrl?: string;

  availableProducts: Products[];
  billedProducts: Products[];
  consentedProducts: Products[];

  consentExpirationTime?: string;

  updateType?: string;

  error:
    | {
        errorType?: string;
        errorCode?: string;
        errorMessage?: string;
        displayMessage?: string;
        requestId?: string;
      }
    | null;

  requestId: string;
};

export type RemovePlaidItemResult = {
  removed: true;
  requestId: string;
};

export type PlaidServiceErrorCode =
  | "invalid-request"
  | "invalid-input"
  | "invalid-token"
  | "item-login-required"
  | "item-not-found"
  | "institution-unavailable"
  | "product-not-ready"
  | "rate-limited"
  | "provider-error"
  | "configuration-error"
  | "unknown";

export class PlaidServiceError extends Error {
  readonly code:
    PlaidServiceErrorCode;

  readonly plaidErrorType?:
    string;

  readonly plaidErrorCode?:
    string;

  readonly displayMessage?:
    string;

  readonly requestId?:
    string;

  readonly statusCode?:
    number;

  constructor({
    message,
    code,
    plaidErrorType,
    plaidErrorCode,
    displayMessage,
    requestId,
    statusCode,
    cause,
  }: {
    message:
      string;

    code:
      PlaidServiceErrorCode;

    plaidErrorType?:
      string;

    plaidErrorCode?:
      string;

    displayMessage?:
      string;

    requestId?:
      string;

    statusCode?:
      number;

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
      "PlaidServiceError";

    this.code =
      code;

    this.plaidErrorType =
      plaidErrorType;

    this.plaidErrorCode =
      plaidErrorCode;

    this.displayMessage =
      displayMessage;

    this.requestId =
      requestId;

    this.statusCode =
      statusCode;
  }
}

const DEFAULT_CLIENT_NAME =
  "CASE Budget";

const DEFAULT_UPDATE_REASON =
  "reauthentication";

/**
 * Creates a Link token for a new Plaid connection.
 *
 * The returned link token is safe to send to the authenticated browser session.
 * Plaid credentials and access tokens remain server-side.
 */
export async function createPlaidLinkToken(
  input:
    Omit<
      CreatePlaidLinkTokenInput,
      "accessToken"
    >,
): Promise<PlaidLinkTokenResult> {
  return createLinkToken({
    ...input,

    accessToken:
      undefined,
  });
}

/**
 * Creates a Link token in update mode for an existing Plaid Item.
 *
 * Use update mode when an Item requires reauthentication, account selection
 * changes, or consent renewal. Never send the access token to the browser.
 */
export async function createPlaidUpdateLinkToken(
  input:
    CreatePlaidLinkTokenInput & {
      accessToken: string;
    },
): Promise<PlaidLinkTokenResult> {
  const accessToken =
    requireNonEmptyValue(
      input.accessToken,
      "Plaid access token",
    );

  return createLinkToken({
    ...input,

    accessToken,

    updateReason:
      input.updateReason ??
      DEFAULT_UPDATE_REASON,
  });
}

/**
 * Exchanges the short-lived public token returned by Plaid Link for a
 * permanent Item access token.
 *
 * Store the returned access token only in encrypted server-side persistence.
 */
export async function exchangePlaidPublicToken(
  publicToken:
    string,
): Promise<ExchangePlaidPublicTokenResult> {
  const normalizedPublicToken =
    requireNonEmptyValue(
      publicToken,
      "Plaid public token",
    );

  try {
    const plaid =
      getPlaidClient();

    const response =
      await plaid.itemPublicTokenExchange({
        public_token:
          normalizedPublicToken,
      });

    return {
      accessToken:
        response.data.access_token,

      itemId:
        response.data.item_id,

      requestId:
        response.data.request_id,
    };
  } catch (
    error
  ) {
    throw normalizePlaidError(
      error,
      "Unable to exchange the Plaid public token.",
    );
  }
}

/**
 * Retrieves current Item metadata and error state for a connected institution.
 */
export async function getPlaidItemStatus(
  accessToken:
    string,
): Promise<PlaidItemStatus> {
  const normalizedAccessToken =
    requireNonEmptyValue(
      accessToken,
      "Plaid access token",
    );

  try {
    const plaid =
      getPlaidClient();

    const response =
      await plaid.itemGet({
        access_token:
          normalizedAccessToken,
      });

    return mapItemGetResponse(
      response.data,
    );
  } catch (
    error
  ) {
    throw normalizePlaidError(
      error,
      "Unable to retrieve the Plaid Item.",
    );
  }
}

/**
 * Removes a Plaid Item and invalidates its access token.
 *
 * Call this only after confirming the authenticated user owns the associated
 * CASE Budget financial connection.
 */
export async function removePlaidItem(
  accessToken:
    string,
): Promise<RemovePlaidItemResult> {
  const normalizedAccessToken =
    requireNonEmptyValue(
      accessToken,
      "Plaid access token",
    );

  try {
    const plaid =
      getPlaidClient();

    const response =
      await plaid.itemRemove({
        access_token:
          normalizedAccessToken,
      });

    return {
      removed:
        true,

      requestId:
        response.data.request_id,
    };
  } catch (
    error
  ) {
    throw normalizePlaidError(
      error,
      "Unable to disconnect the Plaid Item.",
    );
  }
}

async function createLinkToken(
  input:
    CreatePlaidLinkTokenInput,
): Promise<PlaidLinkTokenResult> {
  const configuration =
    getPlaidServerConfiguration();

  const userId =
    requireNonEmptyValue(
      input.userId,
      "Plaid client user ID",
    );

  const clientName =
    input.clientName?.trim() ||
    DEFAULT_CLIENT_NAME;

  const accessToken =
    normalizeOptionalValue(
      input.accessToken,
    );

  const redirectUri =
    normalizeOptionalUrl(
      input.redirectUri ??
      configuration.redirectUri,
      "Plaid redirect URI",
    );

  const webhookUrl =
    normalizeOptionalUrl(
      input.webhookUrl ??
      configuration.webhookUrl,
      "Plaid webhook URL",
    );

  const request:
    LinkTokenCreateRequest = {
      client_name:
        clientName,

      country_codes:
        configuration.countryCodes,

      language:
        configuration.language,

      user: {
        client_user_id:
          userId,
      },
  };

  if (
    accessToken
  ) {
    request.access_token =
      accessToken;

    request.update = {
      account_selection_enabled:
        true,
    };
  } else {
    request.products =
      input.products ??
      configuration.products;
  }

  if (
    input.accountFilters
  ) {
    request.account_filters =
      input.accountFilters;
  }

  if (
    redirectUri
  ) {
    request.redirect_uri =
      redirectUri;
  }

  if (
    webhookUrl
  ) {
    request.webhook =
      webhookUrl;
  }

  try {
    const plaid =
      getPlaidClient();

    const response =
      await plaid.linkTokenCreate(
        request,
      );

    return mapLinkTokenResponse(
      response.data,
    );
  } catch (
    error
  ) {
    throw normalizePlaidError(
      error,
      accessToken
        ? "Unable to create the Plaid update-mode Link token."
        : "Unable to create the Plaid Link token.",
    );
  }
}

function mapLinkTokenResponse(
  response:
    LinkTokenCreateResponse,
): PlaidLinkTokenResult {
  return {
    linkToken:
      response.link_token,

    expiration:
      response.expiration,

    requestId:
      response.request_id,
  };
}

function mapItemGetResponse(
  response:
    ItemGetResponse,
): PlaidItemStatus {
  const itemError =
    response.item.error;

  return {
    itemId:
      response.item.item_id,

    institutionId:
      response.item.institution_id ??
      undefined,

    webhookUrl:
      response.item.webhook ??
      undefined,

    availableProducts:
      response.item.available_products,

    billedProducts:
      response.item.billed_products,

    consentedProducts:
      response.item.consented_products ??
      [],

    consentExpirationTime:
      response.item.consent_expiration_time ??
      undefined,

    updateType:
      response.item.update_type ??
      undefined,

    error:
      itemError
        ? {
            errorType:
              itemError.error_type,

            errorCode:
              itemError.error_code,

            errorMessage:
              itemError.error_message,

            displayMessage:
              itemError.display_message ??
              undefined,

            requestId:
              itemError.request_id,
          }
        : null,

    requestId:
      response.request_id,
  };
}

function normalizePlaidError(
  error:
    unknown,
  fallbackMessage:
    string,
): PlaidServiceError {
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
      mapPlaidErrorCode(
        plaidErrorType,
        plaidErrorCode,
        statusCode,
      ),

    plaidErrorType,

    plaidErrorCode,

    displayMessage,

    requestId,

    statusCode,

    cause:
      error,
  });
}

function mapPlaidErrorCode(
  errorType:
    string | undefined,
  errorCode:
    string | undefined,
  statusCode:
    number | undefined,
): PlaidServiceErrorCode {
  const normalizedErrorType =
    errorType?.toUpperCase();

  const normalizedErrorCode =
    errorCode?.toUpperCase();

  if (
    normalizedErrorCode ===
      "ITEM_LOGIN_REQUIRED"
  ) {
    return "item-login-required";
  }

  if (
    normalizedErrorCode ===
      "INVALID_ACCESS_TOKEN" ||
    normalizedErrorCode ===
      "INVALID_PUBLIC_TOKEN" ||
    normalizedErrorCode ===
      "INVALID_LINK_TOKEN"
  ) {
    return "invalid-token";
  }

  if (
    normalizedErrorCode ===
      "ITEM_NOT_FOUND"
  ) {
    return "item-not-found";
  }

  if (
    normalizedErrorCode ===
      "INSTITUTION_DOWN" ||
    normalizedErrorCode ===
      "INSTITUTION_NOT_RESPONDING" ||
    normalizedErrorCode ===
      "INSTITUTION_NOT_AVAILABLE"
  ) {
    return "institution-unavailable";
  }

  if (
    normalizedErrorCode ===
      "PRODUCT_NOT_READY"
  ) {
    return "product-not-ready";
  }

  if (
    normalizedErrorType ===
      "RATE_LIMIT_EXCEEDED" ||
    statusCode ===
      429
  ) {
    return "rate-limited";
  }

  if (
    normalizedErrorType ===
      "INVALID_REQUEST"
  ) {
    return "invalid-request";
  }

  if (
    normalizedErrorType ===
      "INVALID_INPUT"
  ) {
    return "invalid-input";
  }

  if (
    normalizedErrorType ===
      "API_ERROR"
  ) {
    return "provider-error";
  }

  if (
    statusCode &&
    statusCode >=
      500
  ) {
    return "provider-error";
  }

  return "unknown";
}

function requireNonEmptyValue(
  value:
    string,
  label:
    string,
) {
  const normalizedValue =
    value.trim();

  if (
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new PlaidServiceError({
    message:
      `${label} is required.`,

    code:
      "invalid-input",
  });
}

function normalizeOptionalValue(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeOptionalUrl(
  value:
    string | undefined,
  label:
    string,
) {
  const normalizedValue =
    normalizeOptionalValue(
      value,
    );

  if (
    !normalizedValue
  ) {
    return undefined;
  }

  let parsedUrl:
    URL;

  try {
    parsedUrl =
      new URL(
        normalizedValue,
      );
  } catch {
    throw new PlaidServiceError({
      message:
        `${label} must be a valid absolute URL.`,

      code:
        "configuration-error",
    });
  }

  if (
    parsedUrl.protocol !==
      "https:" &&
    !isLocalDevelopmentUrl(
      parsedUrl,
    )
  ) {
    throw new PlaidServiceError({
      message:
        `${label} must use HTTPS outside local development.`,

      code:
        "configuration-error",
    });
  }

  return parsedUrl.toString();
}

function isLocalDevelopmentUrl(
  url:
    URL,
) {
  return (
    url.protocol ===
      "http:" &&
    (
      url.hostname ===
        "localhost" ||
      url.hostname ===
        "127.0.0.1" ||
      url.hostname ===
        "[::1]"
    )
  );
}

function toRecord(
  value:
    unknown,
):
  Record<
    string,
    unknown
  > | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
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
    "string"
    ? value
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