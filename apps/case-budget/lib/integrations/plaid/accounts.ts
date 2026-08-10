import "server-only";

import {
  type AccountBase,
  type AccountsBalanceGetRequest,
  type AccountsGetRequest,
  type ItemGetResponse,
} from "plaid";

import {
  getPlaidClient,
} from "@/lib/integrations/plaid/client";

import {
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

export type PlaidNormalizedAccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit-card"
  | "loan"
  | "investment"
  | "retirement"
  | "mortgage"
  | "other";

export type PlaidNormalizedAccountProvider =
  "plaid";

export type PlaidNormalizedAccount = {
  provider:
    PlaidNormalizedAccountProvider;

  providerAccountId:
    string;

  providerConnectionId?:
    string;

  providerInstitutionId?:
    string;

  institutionName?:
    string;

  name:
    string;

  officialName?:
    string;

  mask?:
    string;

  type:
    PlaidNormalizedAccountType;

  providerType:
    string;

  providerSubtype?:
    string;

  currentBalance:
    number;

  availableBalance?:
    number;

  limit?:
    number;

  currency:
    string;

  isDebt:
    boolean;

  isSelected:
    boolean;

  isActive:
    boolean;

  metadata:
    Record<
      string,
      string | number | boolean | null
    >;
};

export type PlaidAccountsResult = {
  itemId:
    string;

  institutionId?:
    string;

  accounts:
    PlaidNormalizedAccount[];

  requestId:
    string;
};

export type PlaidAccountsFetchInput = {
  accessToken:
    string;

  institutionName?:
    string;

  providerConnectionId?:
    string;

  selectedAccountIds?:
    string[];

  includeUnselectedAccounts?:
    boolean;
};

export type PlaidBalanceRefreshInput = {
  accessToken:
    string;

  institutionName?:
    string;

  providerConnectionId?:
    string;

  selectedAccountIds?:
    string[];

  includeUnselectedAccounts?:
    boolean;

  accountIds?:
    string[];
};

export type PlaidAccountFilterInput = {
  accounts:
    PlaidNormalizedAccount[];

  selectedAccountIds?:
    string[];

  includeUnselectedAccounts?:
    boolean;
};

const DEFAULT_CURRENCY =
  "USD";

/**
 * Retrieves Plaid account metadata and cached balances.
 *
 * Use this for normal synchronization and initial account import.
 */
export async function getPlaidAccounts(
  input:
    PlaidAccountsFetchInput,
): Promise<PlaidAccountsResult> {
  const accessToken =
    requireNonEmptyString(
      input.accessToken,
      "Plaid access token",
    );

  const selectedAccountIds =
    normalizeAccountIds(
      input.selectedAccountIds,
    );

  const request:
    AccountsGetRequest = {
      access_token:
        accessToken,
  };

  try {
    const plaid =
      getPlaidClient();

    const [
      accountsResponse,
      itemResponse,
    ] =
      await Promise.all([
        plaid.accountsGet(
          request,
        ),

        plaid.itemGet({
          access_token:
            accessToken,
        }),
      ]);

    const normalizedAccounts =
      accountsResponse.data.accounts.map(
        (
          account,
        ) =>
          normalizePlaidAccount({
            account,

            item:
              itemResponse.data,

            institutionName:
              input.institutionName,

            providerConnectionId:
              input.providerConnectionId,

            selectedAccountIds,
          }),
      );

    return {
      itemId:
        itemResponse.data.item.item_id,

      institutionId:
        itemResponse.data.item.institution_id ??
        undefined,

      accounts:
        filterPlaidAccounts({
          accounts:
            normalizedAccounts,

          selectedAccountIds,

          includeUnselectedAccounts:
            input.includeUnselectedAccounts,
        }),

      requestId:
        accountsResponse.data.request_id,
    };
  } catch (
    error
  ) {
    throw normalizePlaidAccountsError(
      error,
      "Unable to retrieve Plaid accounts.",
    );
  }
}

/**
 * Requests current balances from Plaid.
 *
 * Balance requests may be slower and may cause the institution to be queried
 * directly. Prefer getPlaidAccounts for scheduled syncs unless fresh balances
 * are specifically required.
 */
export async function refreshPlaidAccountBalances(
  input:
    PlaidBalanceRefreshInput,
): Promise<PlaidAccountsResult> {
  const accessToken =
    requireNonEmptyString(
      input.accessToken,
      "Plaid access token",
    );

  const selectedAccountIds =
    normalizeAccountIds(
      input.selectedAccountIds,
    );

  const requestedAccountIds =
    normalizeAccountIds(
      input.accountIds,
    );

  const request:
    AccountsBalanceGetRequest = {
      access_token:
        accessToken,
  };

  if (
    requestedAccountIds.length >
    0
  ) {
    request.options = {
      account_ids:
        requestedAccountIds,
    };
  }

  try {
    const plaid =
      getPlaidClient();

    const [
      balancesResponse,
      itemResponse,
    ] =
      await Promise.all([
        plaid.accountsBalanceGet(
          request,
        ),

        plaid.itemGet({
          access_token:
            accessToken,
        }),
      ]);

    const normalizedAccounts =
      balancesResponse.data.accounts.map(
        (
          account,
        ) =>
          normalizePlaidAccount({
            account,

            item:
              itemResponse.data,

            institutionName:
              input.institutionName,

            providerConnectionId:
              input.providerConnectionId,

            selectedAccountIds,
          }),
      );

    return {
      itemId:
        itemResponse.data.item.item_id,

      institutionId:
        itemResponse.data.item.institution_id ??
        undefined,

      accounts:
        filterPlaidAccounts({
          accounts:
            normalizedAccounts,

          selectedAccountIds,

          includeUnselectedAccounts:
            input.includeUnselectedAccounts,
        }),

      requestId:
        balancesResponse.data.request_id,
    };
  } catch (
    error
  ) {
    throw normalizePlaidAccountsError(
      error,
      "Unable to refresh Plaid account balances.",
    );
  }
}

/**
 * Filters normalized accounts by the selected Plaid account IDs.
 */
export function filterPlaidAccounts({
  accounts,
  selectedAccountIds,
  includeUnselectedAccounts =
    false,
}: PlaidAccountFilterInput) {
  const selectedIds =
    new Set(
      normalizeAccountIds(
        selectedAccountIds,
      ),
    );

  if (
    includeUnselectedAccounts ||
    selectedIds.size ===
    0
  ) {
    return accounts;
  }

  return accounts.filter(
    (
      account,
    ) =>
      selectedIds.has(
        account.providerAccountId,
      ),
  );
}

/**
 * Normalizes one Plaid account into a provider-neutral CASE Budget record.
 */
export function normalizePlaidAccount({
  account,
  item,
  institutionName,
  providerConnectionId,
  selectedAccountIds,
}: {
  account:
    AccountBase;

  item:
    ItemGetResponse;

  institutionName?:
    string;

  providerConnectionId?:
    string;

  selectedAccountIds:
    string[];
}): PlaidNormalizedAccount {
  const normalizedType =
    mapPlaidAccountType(
      account.type,
      account.subtype,
    );

  const isDebt =
    isDebtAccountType(
      normalizedType,
    );

  const currentBalance =
    normalizeBalance({
      value:
        account.balances.current,

      isDebt,
    });

  const availableBalance =
    normalizeOptionalBalance({
      value:
        account.balances.available,

      isDebt,
    });

  const limit =
    normalizeOptionalNumber(
      account.balances.limit,
    );

  const currency =
    normalizeCurrency(
      account.balances.iso_currency_code,
      account.balances.unofficial_currency_code,
    );

  const selectedIds =
    new Set(
      selectedAccountIds,
    );

  const isSelected =
    selectedIds.size ===
      0 ||
    selectedIds.has(
      account.account_id,
    );

  return {
    provider:
      "plaid",

    providerAccountId:
      account.account_id,

    providerConnectionId,

    providerInstitutionId:
      item.item.institution_id ??
      undefined,

    institutionName:
      normalizeOptionalText(
        institutionName,
      ),

    name:
      normalizeRequiredText(
        account.name,
        "Plaid account name",
      ),

    officialName:
      normalizeOptionalText(
        account.official_name ??
        undefined,
      ),

    mask:
      normalizeOptionalText(
        account.mask ??
        undefined,
      ),

    type:
      normalizedType,

    providerType:
      String(
        account.type,
      ),

    providerSubtype:
      account.subtype
        ? String(
            account.subtype,
          )
        : undefined,

    currentBalance,

    availableBalance,

    limit,

    currency,

    isDebt,

    isSelected,

    isActive:
      true,

    metadata: {
      persistentAccountId:
        normalizeOptionalText(
          account.persistent_account_id ??
          undefined,
        ) ??
        null,

      verificationStatus:
        normalizeOptionalText(
          account.verification_status ??
          undefined,
        ) ??
        null,

      providerType:
        String(
          account.type,
        ),

      providerSubtype:
        account.subtype
          ? String(
              account.subtype,
            )
          : null,

      isDebt,

      selected:
        isSelected,
    },
  };
}

/**
 * Maps Plaid account type and subtype values into CASE Budget account types.
 */
export function mapPlaidAccountType(
  type:
    AccountBase["type"],
  subtype:
    AccountBase["subtype"],
): PlaidNormalizedAccountType {
  const normalizedType =
    String(
      type,
    ).toLowerCase();

  const normalizedSubtype =
    subtype
      ? String(
          subtype,
        ).toLowerCase()
      : "";

  if (
    normalizedType ===
    "depository"
  ) {
    if (
      normalizedSubtype ===
      "checking"
    ) {
      return "checking";
    }

    if (
      normalizedSubtype ===
        "savings" ||
      normalizedSubtype ===
        "money market"
    ) {
      return "savings";
    }

    return "cash";
  }

  if (
    normalizedType ===
    "credit"
  ) {
    return "credit-card";
  }

  if (
    normalizedType ===
    "loan"
  ) {
    if (
      normalizedSubtype ===
        "mortgage" ||
      normalizedSubtype ===
        "home equity" ||
      normalizedSubtype ===
        "home equity line of credit"
    ) {
      return "mortgage";
    }

    return "loan";
  }

  if (
    normalizedType ===
    "investment"
  ) {
    if (
      isRetirementSubtype(
        normalizedSubtype,
      )
    ) {
      return "retirement";
    }

    return "investment";
  }

  return "other";
}

/**
 * Returns true when a normalized account should be treated as a liability.
 */
export function isDebtAccountType(
  type:
    PlaidNormalizedAccountType,
) {
  return (
    type ===
      "credit-card" ||
    type ===
      "loan" ||
    type ===
      "mortgage"
  );
}

/**
 * Converts a normalized Plaid account into the shape expected by the existing
 * AccountsProvider.
 */
export function mapPlaidAccountToCaseBudgetAccount({
  account,
  connectionId,
  now =
    new Date().toISOString(),
}: {
  account:
    PlaidNormalizedAccount;

  connectionId:
    string;

  now?:
    string;
}) {
  return {
    id:
      createStablePlaidAccountId(
        account.providerAccountId,
      ),

    name:
      account.name,

    institution:
      account.institutionName,

    type:
      mapNormalizedTypeToProviderType(
        account.type,
      ),

    balance:
      account.currentBalance,

    availableBalance:
      account.availableBalance,

    currency:
      account.currency,

    connectionStatus:
      "connected" as const,

    connectionId,

    providerAccountId:
      account.providerAccountId,

    accountMask:
      account.mask,

    provider:
      "plaid" as const,

    lastSyncedAt:
      now,

    createdAt:
      now,

    updatedAt:
      now,
  };
}

function mapNormalizedTypeToProviderType(
  type:
    PlaidNormalizedAccountType,
) {
  switch (
    type
  ) {
    case "checking":
      return "checking" as const;

    case "savings":
      return "savings" as const;

    case "cash":
      return "cash" as const;

    case "credit-card":
      return "credit-card" as const;

    case "mortgage":
      return "mortgage" as const;

    case "loan":
      return "loan" as const;

    case "investment":
      return "investment" as const;

    case "retirement":
      return "retirement" as const;

    case "other":
    default:
      return "other" as const;
  }
}

function normalizeBalance({
  value,
  isDebt,
}: {
  value:
    number | null;

  isDebt:
    boolean;
}) {
  const normalizedValue =
    normalizeOptionalNumber(
      value,
    ) ??
    0;

  return isDebt
    ? Math.abs(
        normalizedValue,
      )
    : normalizedValue;
}

function normalizeOptionalBalance({
  value,
  isDebt,
}: {
  value:
    number | null;

  isDebt:
    boolean;
}) {
  const normalizedValue =
    normalizeOptionalNumber(
      value,
    );

  if (
    normalizedValue ===
    undefined
  ) {
    return undefined;
  }

  return isDebt
    ? Math.abs(
        normalizedValue,
      )
    : normalizedValue;
}

function normalizeOptionalNumber(
  value:
    number | null | undefined,
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return undefined;
  }

  return value;
}

function normalizeCurrency(
  isoCurrencyCode:
    string | null,
  unofficialCurrencyCode:
    string | null,
) {
  const isoCurrency =
    normalizeOptionalText(
      isoCurrencyCode ??
      undefined,
    );

  if (
    isoCurrency
  ) {
    return isoCurrency.toUpperCase();
  }

  const unofficialCurrency =
    normalizeOptionalText(
      unofficialCurrencyCode ??
      undefined,
    );

  return unofficialCurrency ??
    DEFAULT_CURRENCY;
}

function normalizeAccountIds(
  accountIds:
    string[] | undefined,
) {
  return [
    ...new Set(
      (
        accountIds ??
        []
      )
        .map(
          (
            accountId,
          ) =>
            accountId.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];
}

function isRetirementSubtype(
  subtype:
    string,
) {
  return [
    "401a",
    "401k",
    "403b",
    "457b",
    "ira",
    "keogh",
    "pension",
    "roth",
    "roth 401k",
    "sep ira",
    "simple ira",
    "thrift savings plan",
  ].includes(
    subtype,
  );
}

function createStablePlaidAccountId(
  providerAccountId:
    string,
) {
  return `plaid:${providerAccountId}`;
}

function requireNonEmptyString(
  value:
    string,
  label:
    string,
) {
  const normalizedValue =
    value?.trim();

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

function normalizeRequiredText(
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

function normalizePlaidAccountsError(
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
      mapPlaidAccountsErrorCode({
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

function mapPlaidAccountsErrorCode({
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
}) {
  const normalizedErrorType =
    plaidErrorType?.toUpperCase();

  const normalizedErrorCode =
    plaidErrorCode?.toUpperCase();

  if (
    normalizedErrorCode ===
    "ITEM_LOGIN_REQUIRED"
  ) {
    return "item-login-required" as const;
  }

  if (
    normalizedErrorCode ===
      "INVALID_ACCESS_TOKEN" ||
    normalizedErrorCode ===
      "INVALID_TOKEN"
  ) {
    return "invalid-token" as const;
  }

  if (
    normalizedErrorCode ===
    "ITEM_NOT_FOUND"
  ) {
    return "item-not-found" as const;
  }

  if (
    normalizedErrorCode ===
      "INSTITUTION_DOWN" ||
    normalizedErrorCode ===
      "INSTITUTION_NOT_RESPONDING" ||
    normalizedErrorCode ===
      "INSTITUTION_NOT_AVAILABLE"
  ) {
    return "institution-unavailable" as const;
  }

  if (
    normalizedErrorCode ===
    "PRODUCT_NOT_READY"
  ) {
    return "product-not-ready" as const;
  }

  if (
    normalizedErrorType ===
      "RATE_LIMIT_EXCEEDED" ||
    statusCode ===
      429
  ) {
    return "rate-limited" as const;
  }

  if (
    normalizedErrorType ===
    "INVALID_REQUEST"
  ) {
    return "invalid-request" as const;
  }

  if (
    normalizedErrorType ===
    "INVALID_INPUT"
  ) {
    return "invalid-input" as const;
  }

  if (
    normalizedErrorType ===
      "API_ERROR" ||
    (
      statusCode !==
        undefined &&
      statusCode >=
        500
    )
  ) {
    return "provider-error" as const;
  }

  return "unknown" as const;
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
