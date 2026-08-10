import {
  getPlaidAccounts,
  refreshPlaidAccountBalances,
} from "@/lib/integrations/plaid/accounts";

import {
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

import {
  getPlaidItemWithAccessTokenByConnectionId,
  PlaidItemRepositoryError,
} from "@/lib/repositories/plaid-items";

import type {
  FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

export type PlaidAccountSyncMode =
  | "standard"
  | "fresh-balances";

export type PlaidAccountSyncTrigger =
  | "initial"
  | "manual"
  | "scheduled"
  | "webhook";

export type PlaidAccountSyncStoreAccount = {
  id: string;

  providerAccountId:
    string;

  isActive?:
    boolean;
};

export type PlaidAccountSyncStoreUpsertInput = {
  workspaceId:
    string;

  userId:
    string;

  connectionId:
    string;

  provider:
    "plaid";

  providerAccountId:
    string;

  providerPersistentAccountId?:
    string;

  institutionId?:
    string;

  institutionName:
    string;

  name:
    string;

  officialName?:
    string;

  mask?:
    string;

  type:
    string;

  subtype?:
    string;

  classification:
    "asset" | "liability";

  balance:
    number;

  availableBalance?:
    number;

  creditLimit?:
    number;

  currency:
    string;

  isActive:
    boolean;

  lastSyncedAt:
    string;

  metadata:
    Record<
      string,
      unknown
    >;
};

export type PlaidAccountSyncStoreUpsertResult = {
  accountId:
    string;

  status:
    | "created"
    | "updated"
    | "unchanged";
};

export type PlaidAccountSyncStore = {
  listPlaidAccountsForConnection:
    (
      input: {
        connectionId:
          string;

        owner:
          FinancialConnectionOwner;
      },
    ) =>
      Promise<
        PlaidAccountSyncStoreAccount[]
      >;

  upsertPlaidAccount:
    (
      input:
        PlaidAccountSyncStoreUpsertInput,
    ) =>
      Promise<
        PlaidAccountSyncStoreUpsertResult
      >;

  deactivatePlaidAccounts:
    (
      input: {
        connectionId:
          string;

        owner:
          FinancialConnectionOwner;

        accountIds:
          string[];

        synchronizedAt:
          string;
      },
    ) =>
      Promise<void>;

  markPlaidConnectionSyncSuccess?:
    (
      input: {
        connectionId:
          string;

        owner:
          FinancialConnectionOwner;

        synchronizedAt:
          string;

        accountCount:
          number;
      },
    ) =>
      Promise<void>;

  markPlaidConnectionSyncFailure?:
    (
      input: {
        connectionId:
          string;

        owner:
          FinancialConnectionOwner;

        failedAt:
          string;

        message:
          string;
      },
    ) =>
      Promise<void>;
};

export type PlaidAccountSyncInput = {
  connectionId:
    string;

  owner:
    FinancialConnectionOwner;

  institutionName:
    string;

  trigger:
    PlaidAccountSyncTrigger;

  mode?:
    PlaidAccountSyncMode;

  accountIds?:
    string[];

  store:
    PlaidAccountSyncStore;
};

export type PlaidAccountSyncResult = {
  connectionId:
    string;

  institutionName:
    string;

  mode:
    PlaidAccountSyncMode;

  trigger:
    PlaidAccountSyncTrigger;

  startedAt:
    string;

  completedAt:
    string;

  receivedAccountCount:
    number;

  selectedAccountCount:
    number;

  createdCount:
    number;

  updatedCount:
    number;

  unchangedCount:
    number;

  deactivatedCount:
    number;

  skippedCount:
    number;

  createdAccountIds:
    string[];

  updatedAccountIds:
    string[];

  unchangedAccountIds:
    string[];

  deactivatedAccountIds:
    string[];

  skippedProviderAccountIds:
    string[];

  plaidItemId:
    string;

  institutionId?:
    string;

  requestId?:
    string;
};

export class PlaidAccountSyncError extends Error {
  readonly code:
    | "invalid-input"
    | "plaid-item-not-found"
    | "store-read-failed"
    | "store-write-failed"
    | "provider-error"
    | "unknown";

  readonly connectionId?:
    string;

  readonly providerRequestId?:
    string;

  readonly cause?:
    unknown;

  constructor({
    message,
    code,
    connectionId,
    providerRequestId,
    cause,
  }: {
    message:
      string;

    code:
      PlaidAccountSyncError["code"];

    connectionId?:
      string;

    providerRequestId?:
      string;

    cause?:
      unknown;
  }) {
    super(
      message,
    );

    this.name =
      "PlaidAccountSyncError";

    this.code =
      code;

    this.connectionId =
      connectionId;

    this.providerRequestId =
      providerRequestId;

    this.cause =
      cause;
  }
}

type NormalizedPlaidAccount = {
  providerAccountId:
    string;

  providerPersistentAccountId?:
    string;

  name:
    string;

  officialName?:
    string;

  mask?:
    string;

  type:
    string;

  subtype?:
    string;

  classification:
    "asset" | "liability";

  balance:
    number;

  availableBalance?:
    number;

  creditLimit?:
    number;

  currency:
    string;
};

type NormalizedPlaidAccountsResponse = {
  accounts:
    NormalizedPlaidAccount[];

  requestId?:
    string;
};

export async function syncPlaidAccounts(
  input:
    PlaidAccountSyncInput,
): Promise<PlaidAccountSyncResult> {
  const normalizedInput =
    normalizeSyncInput(
      input,
    );

  const startedAt =
    new Date().toISOString();

  try {
    const plaidItem =
      await getPlaidItemWithAccessTokenByConnectionId({
        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,
      });

    if (
      !plaidItem
    ) {
      throw new PlaidAccountSyncError({
        message:
          "The Plaid Item could not be found for this financial connection.",

        code:
          "plaid-item-not-found",

        connectionId:
          normalizedInput.connectionId,
      });
    }

    if (
      plaidItem.revokedAt
    ) {
      throw new PlaidAccountSyncError({
        message:
          "The Plaid Item has been revoked and must be reconnected before synchronization.",

        code:
          "provider-error",

        connectionId:
          normalizedInput.connectionId,
      });
    }

    const providerResponse =
      normalizedInput.mode ===
        "fresh-balances"
        ? await refreshPlaidAccountBalances({
            accessToken:
              plaidItem.accessToken,

            accountIds:
              normalizedInput.accountIds,
          })
        : await getPlaidAccounts({
            accessToken:
              plaidItem.accessToken,
          });

    const normalizedProviderResponse =
      normalizeProviderResponse(
        providerResponse,
      );

    const selectedAccountIds =
      resolveSelectedAccountIds(
        plaidItem.selectedAccounts,
      );

    const requestedAccountIds =
      new Set(
        normalizedInput.accountIds ??
        [],
      );

    const accountsToSynchronize =
      normalizedProviderResponse.accounts.filter(
        (
          account,
        ) => {
          if (
            requestedAccountIds.size >
              0 &&
            !requestedAccountIds.has(
              account.providerAccountId,
            )
          ) {
            return false;
          }

          if (
            selectedAccountIds.size >
              0 &&
            !selectedAccountIds.has(
              account.providerAccountId,
            )
          ) {
            return false;
          }

          return true;
        },
      );

    let existingAccounts:
      PlaidAccountSyncStoreAccount[];

    try {
      existingAccounts =
        await normalizedInput.store.listPlaidAccountsForConnection({
          connectionId:
            normalizedInput.connectionId,

          owner:
            normalizedInput.owner,
        });
    } catch (
      error
    ) {
      throw new PlaidAccountSyncError({
        message:
          "CASE Budget could not read the existing connected accounts.",

        code:
          "store-read-failed",

        connectionId:
          normalizedInput.connectionId,

        providerRequestId:
          normalizedProviderResponse.requestId,

        cause:
          error,
      });
    }

    const existingAccountByProviderId =
      new Map<
        string,
        PlaidAccountSyncStoreAccount
      >();

    for (
      const account
      of existingAccounts
    ) {
      const providerAccountId =
        normalizeOptionalText(
          account.providerAccountId,
        );

      if (
        providerAccountId
      ) {
        existingAccountByProviderId.set(
          providerAccountId,
          account,
        );
      }
    }

    const synchronizedProviderAccountIds =
      new Set<string>();

    const createdAccountIds:
      string[] = [];

    const updatedAccountIds:
      string[] = [];

    const unchangedAccountIds:
      string[] = [];

    const skippedProviderAccountIds:
      string[] = [];

    const synchronizedAt =
      new Date().toISOString();

    for (
      const account
      of accountsToSynchronize
    ) {
      synchronizedProviderAccountIds.add(
        account.providerAccountId,
      );

      try {
        const persisted =
          await normalizedInput.store.upsertPlaidAccount({
            workspaceId:
              normalizedInput.owner.workspaceId,

            userId:
              normalizedInput.owner.userId,

            connectionId:
              normalizedInput.connectionId,

            provider:
              "plaid",

            providerAccountId:
              account.providerAccountId,

            providerPersistentAccountId:
              account.providerPersistentAccountId,

            institutionId:
              normalizeOptionalText(
                plaidItem.institutionId,
              ),

            institutionName:
              normalizedInput.institutionName,

            name:
              account.name,

            officialName:
              account.officialName,

            mask:
              account.mask,

            type:
              mapPlaidAccountType({
                type:
                  account.type,

                subtype:
                  account.subtype,
              }),

            subtype:
              account.subtype,

            classification:
              account.classification,

            balance:
              account.balance,

            availableBalance:
              account.availableBalance,

            creditLimit:
              account.creditLimit,

            currency:
              account.currency,

            isActive:
              true,

            lastSyncedAt:
              synchronizedAt,

            metadata: {
              plaidType:
                account.type,

              plaidSubtype:
                account.subtype ??
                null,

              plaidItemId:
                plaidItem.plaidItemId,

              syncMode:
                normalizedInput.mode,

              syncTrigger:
                normalizedInput.trigger,
            },
          });

        switch (
          persisted.status
        ) {
          case "created":
            createdAccountIds.push(
              persisted.accountId,
            );
            break;

          case "updated":
            updatedAccountIds.push(
              persisted.accountId,
            );
            break;

          case "unchanged":
            unchangedAccountIds.push(
              persisted.accountId,
            );
            break;
        }
      } catch (
        error
      ) {
        skippedProviderAccountIds.push(
          account.providerAccountId,
        );

        console.error(
          "CASE Budget could not persist a Plaid account during synchronization.",
          {
            connectionId:
              normalizedInput.connectionId,

            providerAccountId:
              account.providerAccountId,

            error,
          },
        );
      }
    }

    const shouldDeactivateMissingAccounts =
      normalizedInput.mode ===
        "standard" &&
      requestedAccountIds.size ===
        0;

    const accountsToDeactivate =
      shouldDeactivateMissingAccounts
        ? existingAccounts.filter(
            (
              account,
            ) =>
              account.isActive !==
                false &&
              !synchronizedProviderAccountIds.has(
                account.providerAccountId,
              ),
          )
        : [];

    const deactivatedAccountIds =
      accountsToDeactivate.map(
        (
          account,
        ) =>
          account.id,
      );

    if (
      deactivatedAccountIds.length >
      0
    ) {
      try {
        await normalizedInput.store.deactivatePlaidAccounts({
          connectionId:
            normalizedInput.connectionId,

          owner:
            normalizedInput.owner,

          accountIds:
            deactivatedAccountIds,

          synchronizedAt,
        });
      } catch (
        error
      ) {
        throw new PlaidAccountSyncError({
          message:
            "CASE Budget could not deactivate accounts that are no longer available from Plaid.",

          code:
            "store-write-failed",

          connectionId:
            normalizedInput.connectionId,

          providerRequestId:
            normalizedProviderResponse.requestId,

          cause:
            error,
        });
      }
    }

    const successfulAccountCount =
      createdAccountIds.length +
      updatedAccountIds.length +
      unchangedAccountIds.length;

    if (
      normalizedInput.store
        .markPlaidConnectionSyncSuccess
    ) {
      try {
        await normalizedInput.store.markPlaidConnectionSyncSuccess({
          connectionId:
            normalizedInput.connectionId,

          owner:
            normalizedInput.owner,

          synchronizedAt,

          accountCount:
            successfulAccountCount,
        });
      } catch (
        error
      ) {
        console.error(
          "CASE Budget synchronized Plaid accounts but could not update connection health.",
          {
            connectionId:
              normalizedInput.connectionId,

            error,
          },
        );
      }
    }

    return {
      connectionId:
        normalizedInput.connectionId,

      institutionName:
        normalizedInput.institutionName,

      mode:
        normalizedInput.mode,

      trigger:
        normalizedInput.trigger,

      startedAt,

      completedAt:
        new Date().toISOString(),

      receivedAccountCount:
        normalizedProviderResponse
          .accounts.length,

      selectedAccountCount:
        accountsToSynchronize.length,

      createdCount:
        createdAccountIds.length,

      updatedCount:
        updatedAccountIds.length,

      unchangedCount:
        unchangedAccountIds.length,

      deactivatedCount:
        deactivatedAccountIds.length,

      skippedCount:
        skippedProviderAccountIds.length,

      createdAccountIds,

      updatedAccountIds,

      unchangedAccountIds,

      deactivatedAccountIds,

      skippedProviderAccountIds,

      plaidItemId:
        plaidItem.plaidItemId,

      institutionId:
        normalizeOptionalText(
          plaidItem.institutionId,
        ),

      requestId:
        normalizedProviderResponse.requestId,
    };
  } catch (
    error
  ) {
    const normalizedError =
      normalizePlaidAccountSyncError({
        error,

        connectionId:
          normalizedInput.connectionId,
      });

    if (
      normalizedInput.store
        .markPlaidConnectionSyncFailure
    ) {
      try {
        await normalizedInput.store.markPlaidConnectionSyncFailure({
          connectionId:
            normalizedInput.connectionId,

          owner:
            normalizedInput.owner,

          failedAt:
            new Date().toISOString(),

          message:
            normalizedError.message,
        });
      } catch (
        statusError
      ) {
        console.error(
          "CASE Budget could not persist the Plaid synchronization failure state.",
          {
            connectionId:
              normalizedInput.connectionId,

            error:
              statusError,
          },
        );
      }
    }

    throw normalizedError;
  }
}

function normalizeSyncInput(
  input:
    PlaidAccountSyncInput,
) {
  if (
    !input ||
    typeof input !==
      "object"
  ) {
    throw new PlaidAccountSyncError({
      message:
        "Plaid account synchronization requires a valid input object.",

      code:
        "invalid-input",
    });
  }

  const connectionId =
    requireNonEmptyText(
      input.connectionId,
      "connectionId",
    );

  const workspaceId =
    requireNonEmptyText(
      input.owner?.workspaceId,
      "owner.workspaceId",
    );

  const userId =
    requireNonEmptyText(
      input.owner?.userId,
      "owner.userId",
    );

  const institutionName =
    requireNonEmptyText(
      input.institutionName,
      "institutionName",
    );

  const trigger =
    normalizeTrigger(
      input.trigger,
    );

  const mode =
    normalizeMode(
      input.mode,
    );

  const accountIds =
    normalizeAccountIds(
      input.accountIds,
    );

  if (
    mode !==
      "fresh-balances" &&
    accountIds &&
    accountIds.length >
      0
  ) {
    throw new PlaidAccountSyncError({
      message:
        "accountIds may only be supplied for fresh-balances synchronization.",

      code:
        "invalid-input",

      connectionId,
    });
  }

  if (
    !input.store ||
    typeof input.store !==
      "object"
  ) {
    throw new PlaidAccountSyncError({
      message:
        "A Plaid account synchronization store is required.",

      code:
        "invalid-input",

      connectionId,
    });
  }

  return {
    connectionId,

    owner: {
      workspaceId,
      userId,
    },

    institutionName,

    trigger,

    mode,

    accountIds,

    store:
      input.store,
  };
}

function normalizeMode(
  value:
    PlaidAccountSyncMode | undefined,
): PlaidAccountSyncMode {
  if (
    value ===
      undefined
  ) {
    return "standard";
  }

  if (
    value ===
      "standard" ||
    value ===
      "fresh-balances"
  ) {
    return value;
  }

  throw new PlaidAccountSyncError({
    message:
      `Unsupported Plaid account synchronization mode "${String(
        value,
      )}".`,

    code:
      "invalid-input",
  });
}

function normalizeTrigger(
  value:
    PlaidAccountSyncTrigger,
): PlaidAccountSyncTrigger {
  if (
    value ===
      "initial" ||
    value ===
      "manual" ||
    value ===
      "scheduled" ||
    value ===
      "webhook"
  ) {
    return value;
  }

  throw new PlaidAccountSyncError({
    message:
      `Unsupported Plaid account synchronization trigger "${String(
        value,
      )}".`,

    code:
      "invalid-input",
  });
}

function normalizeAccountIds(
  values:
    string[] | undefined,
) {
  if (
    values ===
      undefined
  ) {
    return undefined;
  }

  const normalized =
    values.map(
      (
        value,
      ) =>
        requireNonEmptyText(
          value,
          "accountId",
        ),
    );

  return [
    ...new Set(
      normalized,
    ),
  ];
}

function resolveSelectedAccountIds(
  selectedAccounts:
    unknown,
) {
  const selectedAccountIds =
    new Set<string>();

  if (
    !Array.isArray(
      selectedAccounts,
    )
  ) {
    return selectedAccountIds;
  }

  for (
    const selectedAccount
    of selectedAccounts
  ) {
    if (
      !isPlainObject(
        selectedAccount,
      )
    ) {
      continue;
    }

    const isSelected =
      selectedAccount.isSelected ??
      selectedAccount.is_selected ??
      true;

    const isActive =
      selectedAccount.isActive ??
      selectedAccount.is_active ??
      true;

    if (
      isSelected ===
        false ||
      isActive ===
        false
    ) {
      continue;
    }

    const providerAccountId =
      normalizeOptionalText(
        readStringProperty(
          selectedAccount,
          [
            "providerAccountId",
            "provider_account_id",
            "accountId",
            "account_id",
          ],
        ),
      );

    if (
      providerAccountId
    ) {
      selectedAccountIds.add(
        providerAccountId,
      );
    }
  }

  return selectedAccountIds;
}

function normalizeProviderResponse(
  response:
    unknown,
): NormalizedPlaidAccountsResponse {
  const responseObject =
    isPlainObject(
      response,
    )
      ? response
      : {};

  const rawAccounts =
    Array.isArray(
      responseObject.accounts,
    )
      ? responseObject.accounts
      : Array.isArray(
          response,
        )
        ? response
        : [];

  const normalizedAccounts:
    NormalizedPlaidAccount[] =
      [];

  for (
    const rawAccount
    of rawAccounts
  ) {
    const normalized =
      normalizeProviderAccount(
        rawAccount,
      );

    if (
      normalized
    ) {
      normalizedAccounts.push(
        normalized,
      );
    }
  }

  return {
    accounts:
      normalizedAccounts,

    requestId:
      normalizeOptionalText(
        readStringProperty(
          responseObject,
          [
            "requestId",
            "request_id",
          ],
        ),
      ),
  };
}

function normalizeProviderAccount(
  value:
    unknown,
): NormalizedPlaidAccount | null {
  if (
    !isPlainObject(
      value,
    )
  ) {
    return null;
  }

  const providerAccountId =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "providerAccountId",
          "provider_account_id",
          "accountId",
          "account_id",
          "id",
        ],
      ),
    );

  if (
    !providerAccountId
  ) {
    return null;
  }

  const name =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "name",
          "accountName",
          "account_name",
        ],
      ),
    ) ??
    "Connected account";

  const officialName =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "officialName",
          "official_name",
        ],
      ),
    );

  const type =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "type",
          "accountType",
          "account_type",
        ],
      ),
    ) ??
    "other";

  const subtype =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "subtype",
          "accountSubtype",
          "account_subtype",
        ],
      ),
    );

  const balance =
    readFiniteNumberProperty(
      value,
      [
        "currentBalance",
        "current_balance",
        "balance",
      ],
    ) ??
    0;

  const availableBalance =
    readFiniteNumberProperty(
      value,
      [
        "availableBalance",
        "available_balance",
      ],
    );

  const creditLimit =
    readFiniteNumberProperty(
      value,
      [
        "creditLimit",
        "credit_limit",
        "limit",
      ],
    );

  const currency =
    (
      normalizeOptionalText(
        readStringProperty(
          value,
          [
            "currencyCode",
            "currency_code",
            "currency",
            "isoCurrencyCode",
            "iso_currency_code",
          ],
        ),
      ) ??
      "USD"
    ).toUpperCase();

  const providerPersistentAccountId =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "persistentAccountId",
          "persistent_account_id",
        ],
      ),
    );

  const mask =
    normalizeOptionalText(
      readStringProperty(
        value,
        [
          "mask",
        ],
      ),
    );

  return {
    providerAccountId,

    providerPersistentAccountId,

    name,

    officialName,

    mask,

    type:
      type.toLowerCase(),

    subtype:
      subtype?.toLowerCase(),

    classification:
      getAccountClassification({
        type,
        subtype,
      }),

    balance,

    availableBalance:
      availableBalance ??
      undefined,

    creditLimit:
      creditLimit ??
      undefined,

    currency,
  };
}

function getAccountClassification({
  type,
  subtype,
}: {
  type:
    string;

  subtype?:
    string;
}):
  "asset" | "liability" {
  const normalizedType =
    type
      .trim()
      .toLowerCase();

  const normalizedSubtype =
    subtype
      ?.trim()
      .toLowerCase();

  if (
    normalizedType ===
      "credit" ||
    normalizedType ===
      "loan"
  ) {
    return "liability";
  }

  if (
    normalizedSubtype?.includes(
      "credit",
    ) ||
    normalizedSubtype?.includes(
      "loan",
    ) ||
    normalizedSubtype?.includes(
      "mortgage",
    )
  ) {
    return "liability";
  }

  return "asset";
}

function mapPlaidAccountType({
  type,
  subtype,
}: {
  type:
    string;

  subtype?:
    string;
}) {
  const normalizedType =
    type
      .trim()
      .toLowerCase();

  const normalizedSubtype =
    subtype
      ?.trim()
      .toLowerCase();

  if (
    normalizedType ===
      "depository"
  ) {
    if (
      normalizedSubtype ===
        "savings" ||
      normalizedSubtype ===
        "money market" ||
      normalizedSubtype ===
        "money_market"
    ) {
      return "savings";
    }

    if (
      normalizedSubtype ===
        "cash management" ||
      normalizedSubtype ===
        "cash_management" ||
      normalizedSubtype ===
        "prepaid"
    ) {
      return "cash";
    }

    return "checking";
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
    return "loan";
  }

  if (
    normalizedType ===
      "investment" ||
    normalizedType ===
      "brokerage"
  ) {
    return "investment";
  }

  return "other";
}

function normalizePlaidAccountSyncError({
  error,
  connectionId,
}: {
  error:
    unknown;

  connectionId:
    string;
}) {
  if (
    error instanceof
    PlaidAccountSyncError
  ) {
    return error;
  }

  if (
    error instanceof
    PlaidServiceError
  ) {
    return new PlaidAccountSyncError({
      message:
        error.message,

      code:
        "provider-error",

      connectionId,

      providerRequestId:
        error.requestId,

      cause:
        error,
    });
  }

  if (
    error instanceof
    PlaidItemRepositoryError
  ) {
    return new PlaidAccountSyncError({
      message:
        error.message,

      code:
        error.code ===
        "not-found"
          ? "plaid-item-not-found"
          : "store-read-failed",

      connectionId,

      cause:
        error,
    });
  }

  if (
    error instanceof
    Error
  ) {
    return new PlaidAccountSyncError({
      message:
        "Unable to synchronize Plaid accounts.",

      code:
        "unknown",

      connectionId,

      cause:
        error,
    });
  }

  return new PlaidAccountSyncError({
    message:
      "Unable to synchronize Plaid accounts.",

    code:
      "unknown",

    connectionId,

    cause:
      error,
  });
}

function readStringProperty(
  value:
    Record<
      string,
      unknown
    >,
  propertyNames:
    string[],
) {
  for (
    const propertyName
    of propertyNames
  ) {
    const propertyValue =
      value[
        propertyName
      ];

    if (
      typeof propertyValue ===
        "string"
    ) {
      return propertyValue;
    }
  }

  return undefined;
}

function readFiniteNumberProperty(
  value:
    Record<
      string,
      unknown
    >,
  propertyNames:
    string[],
) {
  for (
    const propertyName
    of propertyNames
  ) {
    const propertyValue =
      value[
        propertyName
      ];

    if (
      typeof propertyValue ===
        "number" &&
      Number.isFinite(
        propertyValue,
      )
    ) {
      return propertyValue;
    }
  }

  return null;
}

function requireNonEmptyText(
  value:
    string | undefined,
  fieldName:
    string,
) {
  const normalizedValue =
    normalizeOptionalText(
      value,
    );

  if (
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new PlaidAccountSyncError({
    message:
      `${fieldName} is required for Plaid account synchronization.`,

    code:
      "invalid-input",
  });
}

function normalizeOptionalText(
  value:
    string | undefined,
) {
  if (
    typeof value !==
      "string"
  ) {
    return undefined;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function isPlainObject(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
}
