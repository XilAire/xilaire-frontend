/**
 * CASE Budget
 * Plaid account synchronization orchestration.
 *
 * This module intentionally owns the synchronization rules and leaves provider
 * access / persistence behind small adapters. That keeps the sync behavior
 * reusable from:
 *
 * - the first Plaid connection import,
 * - manual "Sync now" requests,
 * - scheduled/background synchronization,
 * - webhook-triggered synchronization.
 *
 * Important security rule:
 * Plaid access tokens must only be resolved server-side and must never be
 * returned from this module.
 */

export type PlaidAccountSyncMode =
  | "initial"
  | "manual"
  | "scheduled"
  | "webhook";

export type PlaidAccountSyncStatus =
  | "created"
  | "updated"
  | "unchanged"
  | "skipped";

export type PlaidAccountKind =
  | "checking"
  | "savings"
  | "credit-card"
  | "cash"
  | "loan"
  | "investment"
  | "other";

export type PlaidAccountNature =
  | "asset"
  | "liability";

export type PlaidAccountSyncOwner = {
  workspaceId: string;
  userId: string;
};

export type PlaidProviderAccount = {
  providerAccountId: string;
  name: string;
  officialName?: string;
  mask?: string;

  type?: string;
  subtype?: string;

  currentBalance: number;
  availableBalance?: number;
  creditLimit?: number;

  currencyCode: string;

  persistentAccountId?: string;

  verificationStatus?: string;

  raw?: Record<
    string,
    unknown
  >;
};

export type PlaidSelectedAccount = {
  providerAccountId: string;

  name?: string;
  mask?: string;
  type?: string;
  subtype?: string;

  isSelected: boolean;
  isActive: boolean;
};

export type PlaidSyncConnection = {
  id: string;

  workspaceId: string;
  userId: string;

  provider: "plaid";

  providerConnectionId?: string;

  providerInstitutionId?: string;

  institutionName: string;

  status?: string;

  metadata?: Record<
    string,
    unknown
  >;
};

export type PlaidSyncItem = {
  connectionId: string;

  plaidItemId: string;

  institutionId?: string;

  selectedAccounts:
    PlaidSelectedAccount[];

  consentExpirationTime?: string;
  updateType?: string;

  revokedAt?: string;
};

export type ExistingCaseBudgetAccount = {
  id: string;

  workspaceId: string;
  userId: string;

  connectionId?: string;

  provider?: string;

  providerAccountId?: string;

  providerPersistentAccountId?: string;

  institutionId?: string;
  institutionName?: string;

  name: string;

  accountKind:
    PlaidAccountKind;

  accountNature:
    PlaidAccountNature;

  mask?: string;

  currentBalance: number;
  availableBalance?: number;
  creditLimit?: number;

  currencyCode: string;

  isActive: boolean;

  lastSyncedAt?: string;
};

export type PersistCaseBudgetAccountInput = {
  workspaceId: string;
  userId: string;

  connectionId: string;

  provider: "plaid";

  providerAccountId: string;

  providerPersistentAccountId?: string;

  institutionId?: string;
  institutionName: string;

  name: string;

  accountKind:
    PlaidAccountKind;

  accountNature:
    PlaidAccountNature;

  mask?: string;

  currentBalance: number;
  availableBalance?: number;
  creditLimit?: number;

  currencyCode: string;

  isActive: boolean;

  lastSyncedAt: string;

  metadata: Record<
    string,
    unknown
  >;
};

export type PersistCaseBudgetAccountResult = {
  accountId: string;

  status:
    | "created"
    | "updated"
    | "unchanged";
};

export type PlaidAccountSyncAccountResult = {
  providerAccountId: string;

  accountId?: string;

  name: string;

  accountKind:
    PlaidAccountKind;

  accountNature:
    PlaidAccountNature;

  currentBalance: number;

  currencyCode: string;

  status:
    PlaidAccountSyncStatus;

  reason?: string;
};

export type PlaidAccountSyncResult = {
  connectionId: string;

  plaidItemId: string;

  institutionName: string;

  mode:
    PlaidAccountSyncMode;

  startedAt: string;
  completedAt: string;

  providerAccountCount: number;
  selectedAccountCount: number;
  synchronizedAccountCount: number;

  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  skippedCount: number;

  deactivatedAccountCount: number;

  accounts:
    PlaidAccountSyncAccountResult[];
};

export type PlaidAccountSyncInput = {
  connectionId: string;

  owner:
    PlaidAccountSyncOwner;

  mode?:
    PlaidAccountSyncMode;

  /**
   * Defaults to true.
   *
   * When true, CASE Budget accounts previously imported from this connection
   * that are no longer selected/returned are deactivated instead of deleted.
   */
  deactivateMissingAccounts?:
    boolean;
};

export type PlaidAccountSyncDependencies = {
  getConnection: (
    input: {
      connectionId: string;
      owner:
        PlaidAccountSyncOwner;
    },
  ) =>
    Promise<
      PlaidSyncConnection | null
    >;

  getPlaidItem: (
    input: {
      connectionId: string;
      owner:
        PlaidAccountSyncOwner;
    },
  ) =>
    Promise<
      PlaidSyncItem | null
    >;

  /**
   * Must resolve and decrypt the Plaid access token server-side.
   *
   * The returned token is used only inside this synchronization call and is
   * never included in any result.
   */
  getPlaidAccessToken: (
    input: {
      connectionId: string;
      owner:
        PlaidAccountSyncOwner;
    },
  ) =>
    Promise<string>;

  /**
   * Retrieves the provider's current account metadata/balances.
   *
   * The first implementation should use the existing Plaid accounts helper.
   */
  getProviderAccounts: (
    input: {
      accessToken: string;
    },
  ) =>
    Promise<
      PlaidProviderAccount[]
    >;

  listCaseBudgetAccounts: (
    input: {
      connectionId: string;
      owner:
        PlaidAccountSyncOwner;
    },
  ) =>
    Promise<
      ExistingCaseBudgetAccount[]
    >;

  upsertCaseBudgetAccount: (
    input:
      PersistCaseBudgetAccountInput,
    existingAccount:
      ExistingCaseBudgetAccount | null,
  ) =>
    Promise<
      PersistCaseBudgetAccountResult
    >;

  deactivateCaseBudgetAccounts?: (
    input: {
      accountIds: string[];

      connectionId: string;

      owner:
        PlaidAccountSyncOwner;

      synchronizedAt: string;
    },
  ) =>
    Promise<void>;

  markConnectionHealthy?: (
    input: {
      connectionId: string;

      owner:
        PlaidAccountSyncOwner;

      synchronizedAt: string;

      accountCount: number;
    },
  ) =>
    Promise<void>;

  markConnectionSyncError?: (
    input: {
      connectionId: string;

      owner:
        PlaidAccountSyncOwner;

      failedAt: string;

      error:
        unknown;
    },
  ) =>
    Promise<void>;
};

export class PlaidAccountSyncError extends Error {
  readonly code:
    | "invalid-input"
    | "connection-not-found"
    | "ownership-mismatch"
    | "plaid-item-not-found"
    | "connection-inactive"
    | "provider-error"
    | "persistence-error"
    | "unknown";

  readonly connectionId?: string;

  readonly cause?: unknown;

  constructor({
    message,
    code,
    connectionId,
    cause,
  }: {
    message: string;

    code:
      PlaidAccountSyncError["code"];

    connectionId?:
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

    this.cause =
      cause;
  }
}

/**
 * Synchronizes the selected Plaid accounts for one CASE Budget financial
 * connection into the CASE Budget accounts repository.
 *
 * This function is deliberately server-side orchestration only:
 *
 * 1. Validate the owner/connection.
 * 2. Load the encrypted Plaid Item metadata.
 * 3. Resolve the Plaid access token.
 * 4. Fetch current Plaid account metadata and balances.
 * 5. Restrict the import to selected accounts.
 * 6. Normalize each Plaid account into CASE Budget account semantics.
 * 7. Upsert accounts idempotently by provider account identity.
 * 8. Optionally deactivate accounts that disappeared or were deselected.
 * 9. Mark the connection healthy after a successful sync.
 */
export async function syncPlaidAccounts(
  input:
    PlaidAccountSyncInput,
  dependencies:
    PlaidAccountSyncDependencies,
): Promise<PlaidAccountSyncResult> {
  const normalizedInput =
    normalizeSyncInput(
      input,
    );

  const startedAt =
    new Date().toISOString();

  try {
    const connection =
      await dependencies.getConnection({
        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,
      });

    if (
      !connection
    ) {
      throw new PlaidAccountSyncError({
        message:
          "The Plaid financial connection could not be found.",

        code:
          "connection-not-found",

        connectionId:
          normalizedInput.connectionId,
      });
    }

    assertConnectionOwnership({
      connection,
      owner:
        normalizedInput.owner,
    });

    assertPlaidConnection(
      connection,
    );

    const item =
      await dependencies.getPlaidItem({
        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,
      });

    if (
      !item
    ) {
      throw new PlaidAccountSyncError({
        message:
          "The Plaid Item for this financial connection could not be found.",

        code:
          "plaid-item-not-found",

        connectionId:
          normalizedInput.connectionId,
      });
    }

    if (
      item.revokedAt
    ) {
      throw new PlaidAccountSyncError({
        message:
          "The Plaid Item has been revoked and must be reconnected before accounts can sync.",

        code:
          "connection-inactive",

        connectionId:
          normalizedInput.connectionId,
      });
    }

    const accessToken =
      await dependencies.getPlaidAccessToken({
        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,
      });

    const providerAccounts =
      await dependencies.getProviderAccounts({
        accessToken:
          requireNonEmptyString(
            accessToken,
            "Plaid access token",
          ),
      });

    const selectedAccountIds =
      resolveSelectedAccountIds(
        item.selectedAccounts,
      );

    const accountsToSync =
      selectAccountsForSync({
        providerAccounts,
        selectedAccountIds,
      });

    const existingAccounts =
      await dependencies.listCaseBudgetAccounts({
        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,
      });

    const existingByProviderAccountId =
      indexExistingAccounts(
        existingAccounts,
      );

    const synchronizedProviderAccountIds =
      new Set<string>();

    const accountResults:
      PlaidAccountSyncAccountResult[] =
        [];

    let createdCount =
      0;

    let updatedCount =
      0;

    let unchangedCount =
      0;

    let skippedCount =
      0;

    const synchronizedAt =
      new Date().toISOString();

    for (
      const providerAccount
      of accountsToSync
    ) {
      const normalizedProviderAccount =
        normalizeProviderAccount(
          providerAccount,
        );

      if (
        !normalizedProviderAccount
      ) {
        skippedCount +=
          1;

        accountResults.push({
          providerAccountId:
            providerAccount.providerAccountId,

          name:
            providerAccount.name ||
            "Unnamed account",

          accountKind:
            "other",

          accountNature:
            "asset",

          currentBalance:
            normalizeNumber(
              providerAccount.currentBalance,
            ) ??
            0,

          currencyCode:
            normalizeCurrencyCode(
              providerAccount.currencyCode,
            ),

          status:
            "skipped",

          reason:
            "The provider account was missing required identity or balance information.",
        });

        continue;
      }

      synchronizedProviderAccountIds.add(
        normalizedProviderAccount.providerAccountId,
      );

      const existingAccount =
        existingByProviderAccountId.get(
          normalizedProviderAccount.providerAccountId,
        ) ??
        null;

      const accountKind =
        mapPlaidAccountKind({
          type:
            normalizedProviderAccount.type,

          subtype:
            normalizedProviderAccount.subtype,
        });

      const accountNature =
        mapAccountNature({
          accountKind,

          type:
            normalizedProviderAccount.type,

          subtype:
            normalizedProviderAccount.subtype,
        });

      const persisted =
        await dependencies.upsertCaseBudgetAccount(
          {
            workspaceId:
              normalizedInput.owner.workspaceId,

            userId:
              normalizedInput.owner.userId,

            connectionId:
              normalizedInput.connectionId,

            provider:
              "plaid",

            providerAccountId:
              normalizedProviderAccount.providerAccountId,

            providerPersistentAccountId:
              normalizedProviderAccount.persistentAccountId,

            institutionId:
              connection.providerInstitutionId ??
              item.institutionId,

            institutionName:
              connection.institutionName,

            name:
              resolveAccountName(
                normalizedProviderAccount,
              ),

            accountKind,

            accountNature,

            mask:
              normalizedProviderAccount.mask,

            currentBalance:
              normalizedProviderAccount.currentBalance,

            availableBalance:
              normalizedProviderAccount.availableBalance,

            creditLimit:
              normalizedProviderAccount.creditLimit,

            currencyCode:
              normalizedProviderAccount.currencyCode,

            isActive:
              true,

            lastSyncedAt:
              synchronizedAt,

            metadata: {
              plaidType:
                normalizedProviderAccount.type ??
                null,

              plaidSubtype:
                normalizedProviderAccount.subtype ??
                null,

              officialName:
                normalizedProviderAccount.officialName ??
                null,

              verificationStatus:
                normalizedProviderAccount.verificationStatus ??
                null,

              syncMode:
                normalizedInput.mode,

              plaidItemId:
                item.plaidItemId,
            },
          },
          existingAccount,
        );

      switch (
        persisted.status
      ) {
        case "created":
          createdCount +=
            1;
          break;

        case "updated":
          updatedCount +=
            1;
          break;

        case "unchanged":
          unchangedCount +=
            1;
          break;
      }

      accountResults.push({
        providerAccountId:
          normalizedProviderAccount.providerAccountId,

        accountId:
          persisted.accountId,

        name:
          resolveAccountName(
            normalizedProviderAccount,
          ),

        accountKind,

        accountNature,

        currentBalance:
          normalizedProviderAccount.currentBalance,

        currencyCode:
          normalizedProviderAccount.currencyCode,

        status:
          persisted.status,
      });
    }

    const accountsToDeactivate =
      normalizedInput.deactivateMissingAccounts
        ? existingAccounts.filter(
            (
              account,
            ) =>
              account.isActive &&
              Boolean(
                account.providerAccountId,
              ) &&
              !synchronizedProviderAccountIds.has(
                account.providerAccountId!,
              ),
          )
        : [];

    if (
      accountsToDeactivate.length >
        0 &&
      dependencies.deactivateCaseBudgetAccounts
    ) {
      await dependencies.deactivateCaseBudgetAccounts({
        accountIds:
          accountsToDeactivate.map(
            (
              account,
            ) =>
              account.id,
          ),

        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,

        synchronizedAt,
      });
    }

    if (
      dependencies.markConnectionHealthy
    ) {
      await dependencies.markConnectionHealthy({
        connectionId:
          normalizedInput.connectionId,

        owner:
          normalizedInput.owner,

        synchronizedAt,

        accountCount:
          accountResults.length -
          skippedCount,
      });
    }

    return {
      connectionId:
        normalizedInput.connectionId,

      plaidItemId:
        item.plaidItemId,

      institutionName:
        connection.institutionName,

      mode:
        normalizedInput.mode,

      startedAt,

      completedAt:
        new Date().toISOString(),

      providerAccountCount:
        providerAccounts.length,

      selectedAccountCount:
        selectedAccountIds.size >
        0
          ? selectedAccountIds.size
          : providerAccounts.length,

      synchronizedAccountCount:
        accountResults.length -
        skippedCount,

      createdCount,

      updatedCount,

      unchangedCount,

      skippedCount,

      deactivatedAccountCount:
        accountsToDeactivate.length,

      accounts:
        accountResults,
    };
  } catch (
    error
  ) {
    const failedAt =
      new Date().toISOString();

    if (
      dependencies.markConnectionSyncError
    ) {
      try {
        await dependencies.markConnectionSyncError({
          connectionId:
            normalizedInput.connectionId,

          owner:
            normalizedInput.owner,

          failedAt,

          error,
        });
      } catch (
        connectionStatusError
      ) {
        console.error(
          "CASE Budget could not persist the Plaid account sync error state.",
          connectionStatusError,
        );
      }
    }

    throw normalizePlaidAccountSyncError({
      error,
      connectionId:
        normalizedInput.connectionId,
    });
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
    requireNonEmptyString(
      input.connectionId,
      "connectionId",
    );

  const workspaceId =
    requireNonEmptyString(
      input.owner?.workspaceId,
      "owner.workspaceId",
    );

  const userId =
    requireNonEmptyString(
      input.owner?.userId,
      "owner.userId",
    );

  const mode =
    input.mode ??
    "manual";

  if (
    mode !==
      "initial" &&
    mode !==
      "manual" &&
    mode !==
      "scheduled" &&
    mode !==
      "webhook"
  ) {
    throw new PlaidAccountSyncError({
      message:
        `Unsupported Plaid account sync mode "${String(
          mode,
        )}".`,

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

    mode,

    deactivateMissingAccounts:
      input.deactivateMissingAccounts ??
      true,
  };
}

function assertConnectionOwnership({
  connection,
  owner,
}: {
  connection:
    PlaidSyncConnection;

  owner:
    PlaidAccountSyncOwner;
}) {
  if (
    connection.workspaceId !==
      owner.workspaceId ||
    connection.userId !==
      owner.userId
  ) {
    throw new PlaidAccountSyncError({
      message:
        "The financial connection does not belong to this CASE Budget user and workspace.",

      code:
        "ownership-mismatch",

      connectionId:
        connection.id,
    });
  }
}

function assertPlaidConnection(
  connection:
    PlaidSyncConnection,
) {
  if (
    connection.provider !==
    "plaid"
  ) {
    throw new PlaidAccountSyncError({
      message:
        "The selected financial connection is not a Plaid connection.",

      code:
        "invalid-input",

      connectionId:
        connection.id,
    });
  }

  const normalizedStatus =
    connection.status
      ?.trim()
      .toLowerCase();

  if (
    normalizedStatus ===
      "disconnected" ||
    normalizedStatus ===
      "revoked"
  ) {
    throw new PlaidAccountSyncError({
      message:
        "The Plaid financial connection is inactive and must be reconnected before syncing.",

      code:
        "connection-inactive",

      connectionId:
        connection.id,
    });
  }
}

function resolveSelectedAccountIds(
  selectedAccounts:
    PlaidSelectedAccount[],
) {
  const ids =
    new Set<string>();

  for (
    const selectedAccount
    of selectedAccounts
  ) {
    if (
      !selectedAccount.isSelected ||
      !selectedAccount.isActive
    ) {
      continue;
    }

    const providerAccountId =
      normalizeOptionalString(
        selectedAccount.providerAccountId,
      );

    if (
      providerAccountId
    ) {
      ids.add(
        providerAccountId,
      );
    }
  }

  return ids;
}

function selectAccountsForSync({
  providerAccounts,
  selectedAccountIds,
}: {
  providerAccounts:
    PlaidProviderAccount[];

  selectedAccountIds:
    Set<string>;
}) {
  if (
    selectedAccountIds.size ===
    0
  ) {
    return providerAccounts;
  }

  return providerAccounts.filter(
    (
      account,
    ) =>
      selectedAccountIds.has(
        account.providerAccountId,
      ),
  );
}

function indexExistingAccounts(
  accounts:
    ExistingCaseBudgetAccount[],
) {
  const indexed =
    new Map<
      string,
      ExistingCaseBudgetAccount
    >();

  for (
    const account
    of accounts
  ) {
    const providerAccountId =
      normalizeOptionalString(
        account.providerAccountId,
      );

    if (
      !providerAccountId
    ) {
      continue;
    }

    indexed.set(
      providerAccountId,
      account,
    );
  }

  return indexed;
}

function normalizeProviderAccount(
  account:
    PlaidProviderAccount,
): PlaidProviderAccount | null {
  const providerAccountId =
    normalizeOptionalString(
      account.providerAccountId,
    );

  const name =
    normalizeOptionalString(
      account.name,
    );

  const currentBalance =
    normalizeNumber(
      account.currentBalance,
    );

  if (
    !providerAccountId ||
    !name ||
    currentBalance ===
      null
  ) {
    return null;
  }

  return {
    providerAccountId,

    name,

    officialName:
      normalizeOptionalString(
        account.officialName,
      ),

    mask:
      normalizeOptionalString(
        account.mask,
      ),

    type:
      normalizeOptionalString(
        account.type,
      )?.toLowerCase(),

    subtype:
      normalizeOptionalString(
        account.subtype,
      )?.toLowerCase(),

    currentBalance,

    availableBalance:
      normalizeNumber(
        account.availableBalance,
      ) ??
      undefined,

    creditLimit:
      normalizeNumber(
        account.creditLimit,
      ) ??
      undefined,

    currencyCode:
      normalizeCurrencyCode(
        account.currencyCode,
      ),

    persistentAccountId:
      normalizeOptionalString(
        account.persistentAccountId,
      ),

    verificationStatus:
      normalizeOptionalString(
        account.verificationStatus,
      ),

    raw:
      account.raw,
  };
}

function resolveAccountName(
  account:
    PlaidProviderAccount,
) {
  return (
    normalizeOptionalString(
      account.officialName,
    ) ??
    normalizeOptionalString(
      account.name,
    ) ??
    "Connected account"
  );
}

/**
 * Maps Plaid account type/subtype values into CASE Budget's account taxonomy.
 *
 * The mapping is deliberately conservative. Unknown values remain "other"
 * rather than being forced into an incorrect financial bucket.
 */
export function mapPlaidAccountKind({
  type,
  subtype,
}: {
  type?: string;
  subtype?: string;
}): PlaidAccountKind {
  const normalizedType =
    normalizeOptionalString(
      type,
    )?.toLowerCase();

  const normalizedSubtype =
    normalizeOptionalString(
      subtype,
    )?.toLowerCase();

  if (
    normalizedType ===
      "depository"
  ) {
    switch (
      normalizedSubtype
    ) {
      case "checking":
        return "checking";

      case "savings":
      case "money market":
      case "money_market":
        return "savings";

      case "cash management":
      case "cash_management":
      case "paypal":
      case "prepaid":
        return "cash";

      default:
        return "checking";
    }
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

  if (
    normalizedSubtype ===
      "checking"
  ) {
    return "checking";
  }

  if (
    normalizedSubtype ===
      "savings"
  ) {
    return "savings";
  }

  if (
    normalizedSubtype ===
      "credit card" ||
    normalizedSubtype ===
      "credit_card"
  ) {
    return "credit-card";
  }

  if (
    normalizedSubtype?.includes(
      "loan",
    ) ||
    normalizedSubtype?.includes(
      "mortgage",
    )
  ) {
    return "loan";
  }

  if (
    normalizedSubtype?.includes(
      "investment",
    ) ||
    normalizedSubtype?.includes(
      "brokerage",
    ) ||
    normalizedSubtype?.includes(
      "401k",
    ) ||
    normalizedSubtype?.includes(
      "ira",
    )
  ) {
    return "investment";
  }

  return "other";
}

export function mapAccountNature({
  accountKind,
  type,
  subtype,
}: {
  accountKind:
    PlaidAccountKind;

  type?: string;
  subtype?: string;
}): PlaidAccountNature {
  if (
    accountKind ===
      "credit-card" ||
    accountKind ===
      "loan"
  ) {
    return "liability";
  }

  const normalizedType =
    normalizeOptionalString(
      type,
    )?.toLowerCase();

  const normalizedSubtype =
    normalizeOptionalString(
      subtype,
    )?.toLowerCase();

  if (
    normalizedType ===
      "credit" ||
    normalizedType ===
      "loan" ||
    normalizedSubtype?.includes(
      "mortgage",
    ) ||
    normalizedSubtype?.includes(
      "loan",
    )
  ) {
    return "liability";
  }

  return "asset";
}

function normalizeCurrencyCode(
  value:
    string | undefined,
) {
  const normalizedValue =
    normalizeOptionalString(
      value,
    )?.toUpperCase();

  return normalizedValue ??
    "USD";
}

function normalizeNumber(
  value:
    number | undefined,
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value,
    )
  ) {
    return null;
  }

  return value;
}

function normalizeOptionalString(
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

function requireNonEmptyString(
  value:
    string | undefined,
  fieldName:
    string,
) {
  const normalizedValue =
    normalizeOptionalString(
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
    Error
  ) {
    return new PlaidAccountSyncError({
      message:
        "Unable to synchronize Plaid accounts.",

      code:
        inferPlaidAccountSyncErrorCode(
          error,
        ),

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

function inferPlaidAccountSyncErrorCode(
  error:
    Error,
): PlaidAccountSyncError["code"] {
  const message =
    error.message
      .toLowerCase();

  if (
    message.includes(
      "plaid",
    ) ||
    message.includes(
      "institution",
    ) ||
    message.includes(
      "provider",
    )
  ) {
    return "provider-error";
  }

  if (
    message.includes(
      "database",
    ) ||
    message.includes(
      "persist",
    ) ||
    message.includes(
      "repository",
    ) ||
    message.includes(
      "supabase",
    )
  ) {
    return "persistence-error";
  }

  return "unknown";
}
