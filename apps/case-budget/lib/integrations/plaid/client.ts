import "server-only";

import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";

export type PlaidEnvironment =
  | "sandbox"
  | "development"
  | "production";

export type PlaidServerConfiguration = {
  clientId: string;
  secret: string;

  environment: PlaidEnvironment;
  basePath: string;

  products: Products[];
  countryCodes: CountryCode[];
  language: string;

  webhookUrl?: string;
  redirectUri?: string;
};

const DEFAULT_PLAID_ENVIRONMENT:
  PlaidEnvironment = "sandbox";

const DEFAULT_PLAID_PRODUCTS: Products[] = [
  Products.Transactions,
];

const DEFAULT_PLAID_COUNTRY_CODES:
  CountryCode[] = [
    CountryCode.Us,
  ];

const DEFAULT_PLAID_LANGUAGE =
  "en";

const PLAID_REQUEST_TIMEOUT_MS =
  30_000;

let cachedPlaidClient:
  PlaidApi | null = null;

let cachedPlaidConfiguration:
  PlaidServerConfiguration | null = null;

/**
 * Returns the shared server-side Plaid API client.
 *
 * The client is initialized lazily so Next.js can import this module during
 * builds without immediately requiring Plaid credentials.
 */
export function getPlaidClient() {
  if (
    cachedPlaidClient
  ) {
    return cachedPlaidClient;
  }

  const configuration =
    getPlaidServerConfiguration();

  const plaidConfiguration =
    new Configuration({
      basePath:
        configuration.basePath,

      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID":
            configuration.clientId,

          "PLAID-SECRET":
            configuration.secret,
        },

        timeout:
          PLAID_REQUEST_TIMEOUT_MS,
      },
    });

  cachedPlaidClient =
    new PlaidApi(
      plaidConfiguration,
    );

  return cachedPlaidClient;
}

/**
 * Returns validated Plaid environment configuration.
 *
 * Secrets are intentionally returned only from this server-only module.
 * Never serialize this object into a Client Component or API response.
 */
export function getPlaidServerConfiguration():
  PlaidServerConfiguration {
  if (
    cachedPlaidConfiguration
  ) {
    return cachedPlaidConfiguration;
  }

  const clientId =
    requireEnvironmentVariable(
      "PLAID_CLIENT_ID",
    );

  const secret =
    requireEnvironmentVariable(
      "PLAID_SECRET",
    );

  const environment =
    parsePlaidEnvironment(
      process.env.PLAID_ENV,
    );

  const basePath =
    getPlaidBasePath(
      environment,
    );

  const products =
    parsePlaidProducts(
      process.env.PLAID_PRODUCTS,
    );

  const countryCodes =
    parsePlaidCountryCodes(
      process.env.PLAID_COUNTRY_CODES,
    );

  const language =
    normalizeOptionalEnvironmentVariable(
      process.env.PLAID_LANGUAGE,
    ) ??
    DEFAULT_PLAID_LANGUAGE;

  const webhookUrl =
    normalizeOptionalUrlEnvironmentVariable(
      "PLAID_WEBHOOK_URL",
      process.env.PLAID_WEBHOOK_URL,
    );

  const redirectUri =
    normalizeOptionalUrlEnvironmentVariable(
      "PLAID_REDIRECT_URI",
      process.env.PLAID_REDIRECT_URI,
    );

  cachedPlaidConfiguration = {
    clientId,
    secret,
    environment,
    basePath,
    products,
    countryCodes,
    language,
    webhookUrl,
    redirectUri,
  };

  return cachedPlaidConfiguration;
}

/**
 * Returns true when the minimum credentials required to initialize Plaid exist.
 *
 * This performs a lightweight presence check and does not make a Plaid API
 * request or validate whether the credentials are accepted by Plaid.
 */
export function isPlaidConfigured() {
  return Boolean(
    normalizeOptionalEnvironmentVariable(
      process.env.PLAID_CLIENT_ID,
    ) &&
      normalizeOptionalEnvironmentVariable(
        process.env.PLAID_SECRET,
      ),
  );
}

/**
 * Returns a non-sensitive summary suitable for logs and diagnostics.
 *
 * The Plaid Client ID and secret are never included.
 */
export function getPlaidConfigurationSummary() {
  const configuration =
    getPlaidServerConfiguration();

  return {
    environment:
      configuration.environment,

    products:
      configuration.products,

    countryCodes:
      configuration.countryCodes,

    language:
      configuration.language,

    hasWebhookUrl:
      Boolean(
        configuration.webhookUrl,
      ),

    hasRedirectUri:
      Boolean(
        configuration.redirectUri,
      ),
  };
}

/**
 * Clears cached configuration and client instances.
 *
 * This is primarily useful for automated tests that change process.env.
 */
export function resetPlaidClientForTesting() {
  if (
    process.env.NODE_ENV !==
    "test"
  ) {
    throw new Error(
      "resetPlaidClientForTesting can only be used when NODE_ENV is test.",
    );
  }

  cachedPlaidClient =
    null;

  cachedPlaidConfiguration =
    null;
}

function parsePlaidEnvironment(
  value:
    string | undefined,
): PlaidEnvironment {
  const normalizedValue =
    normalizeOptionalEnvironmentVariable(
      value,
    )?.toLowerCase();

  if (
    !normalizedValue
  ) {
    return DEFAULT_PLAID_ENVIRONMENT;
  }

  if (
    normalizedValue ===
      "sandbox" ||
    normalizedValue ===
      "development" ||
    normalizedValue ===
      "production"
  ) {
    return normalizedValue;
  }

  throw new Error(
    [
      `Invalid PLAID_ENV value "${normalizedValue}".`,
      "Expected sandbox, development, or production.",
    ].join(
      " ",
    ),
  );
}

function getPlaidBasePath(
  environment:
    PlaidEnvironment,
) {
  const basePath =
    PlaidEnvironments[
      environment
    ];

  if (
    !basePath
  ) {
    throw new Error(
      `Plaid does not define an API base path for environment "${environment}".`,
    );
  }

  return basePath;
}

function parsePlaidProducts(
  value:
    string | undefined,
) {
  const productValues =
    parseCommaSeparatedValues(
      value,
    );

  if (
    productValues.length ===
    0
  ) {
    return [
      ...DEFAULT_PLAID_PRODUCTS,
    ];
  }

  return deduplicateValues(
    productValues.map(
      (
        product,
      ) =>
        parsePlaidProduct(
          product,
        ),
    ),
  );
}

function parsePlaidProduct(
  value:
    string,
): Products {
  const normalizedValue =
    value
      .trim()
      .toLowerCase()
      .replace(
        /_/g,
        "-",
      );

  switch (
    normalizedValue
  ) {
    case "assets":
      return Products.Assets;

    case "auth":
      return Products.Auth;

    case "balance":
      return Products.Balance;

    case "employment":
      return Products.Employment;

    case "identity":
      return Products.Identity;

    case "identity-match":
      return Products.IdentityMatch;

    case "identity-verification":
      return Products.IdentityVerification;

    case "income":
      return Products.Income;

    case "income-verification":
      return Products.IncomeVerification;

    case "investments":
      return Products.Investments;

    case "liabilities":
      return Products.Liabilities;

    case "payment-initiation":
      return Products.PaymentInitiation;

    case "transactions":
      return Products.Transactions;

    case "transfer":
      return Products.Transfer;

    default:
      throw new Error(
        [
          `Unsupported Plaid product "${value}" in PLAID_PRODUCTS.`,
          "Review the installed plaid package Products enum and your enabled Plaid products.",
        ].join(
          " ",
        ),
      );
  }
}

function parsePlaidCountryCodes(
  value:
    string | undefined,
) {
  const countryValues =
    parseCommaSeparatedValues(
      value,
    );

  if (
    countryValues.length ===
    0
  ) {
    return [
      ...DEFAULT_PLAID_COUNTRY_CODES,
    ];
  }

  return deduplicateValues(
    countryValues.map(
      (
        countryCode,
      ) =>
        parsePlaidCountryCode(
          countryCode,
        ),
    ),
  );
}

function parsePlaidCountryCode(
  value:
    string,
): CountryCode {
  switch (
    value
      .trim()
      .toUpperCase()
  ) {
    case "US":
      return CountryCode.Us;

    case "CA":
      return CountryCode.Ca;

    case "GB":
      return CountryCode.Gb;

    case "ES":
      return CountryCode.Es;

    case "FR":
      return CountryCode.Fr;

    case "IE":
      return CountryCode.Ie;

    case "NL":
      return CountryCode.Nl;

    case "DE":
      return CountryCode.De;

    case "IT":
      return CountryCode.It;

    case "PL":
      return CountryCode.Pl;

    case "DK":
      return CountryCode.Dk;

    case "NO":
      return CountryCode.No;

    case "SE":
      return CountryCode.Se;

    case "EE":
      return CountryCode.Ee;

    case "LT":
      return CountryCode.Lt;

    case "LV":
      return CountryCode.Lv;

    case "PT":
      return CountryCode.Pt;

    case "BE":
      return CountryCode.Be;

    default:
      throw new Error(
        `Unsupported country code "${value}" in PLAID_COUNTRY_CODES.`,
      );
  }
}

function requireEnvironmentVariable(
  variableName:
    string,
) {
  const value =
    normalizeOptionalEnvironmentVariable(
      process.env[
        variableName
      ],
    );

  if (
    value
  ) {
    return value;
  }

  throw new Error(
    [
      `Missing required environment variable ${variableName}.`,
      "Add it to apps/case-budget/.env.local and restart the development server.",
    ].join(
      " ",
    ),
  );
}

function normalizeOptionalEnvironmentVariable(
  value:
    string | undefined,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeOptionalUrlEnvironmentVariable(
  variableName:
    string,
  value:
    string | undefined,
) {
  const normalizedValue =
    normalizeOptionalEnvironmentVariable(
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
    throw new Error(
      `${variableName} must be a valid absolute URL.`,
    );
  }

  if (
    parsedUrl.protocol !==
      "https:" &&
    !isAllowedLocalHttpUrl(
      parsedUrl,
    )
  ) {
    throw new Error(
      [
        `${variableName} must use HTTPS.`,
        "HTTP is allowed only for localhost development URLs.",
      ].join(
        " ",
      ),
    );
  }

  return parsedUrl.toString();
}

function isAllowedLocalHttpUrl(
  url:
    URL,
) {
  if (
    url.protocol !==
    "http:"
  ) {
    return false;
  }

  return (
    url.hostname ===
      "localhost" ||
    url.hostname ===
      "127.0.0.1" ||
    url.hostname ===
      "[::1]"
  );
}

function parseCommaSeparatedValues(
  value:
    string | undefined,
) {
  return (
    value
      ?.split(
        ",",
      )
      .map(
        (
          item,
        ) =>
          item.trim(),
      )
      .filter(
        Boolean,
      ) ??
    []
  );
}

function deduplicateValues<
  Value extends string,
>(
  values:
    Value[],
) {
  return [
    ...new Set(
      values,
    ),
  ];
}
