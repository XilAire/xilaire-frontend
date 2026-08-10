import "server-only";

import {
  getPlaidAccounts,
  refreshPlaidAccountBalances,
  type PlaidNormalizedAccount,
} from "@/lib/integrations/plaid/accounts";

import {
  PlaidServiceError,
} from "@/lib/integrations/plaid/link";

import {
  getPlaidItemWithAccessTokenByConnectionId,
  type PlaidItemWithAccessToken,
} from "@/lib/repositories/plaid-items";

import {
  markFinancialConnectionReauthenticationRequired,
  markFinancialConnectionSyncCompleted,
  markFinancialConnectionSyncFailed,
  markFinancialConnectionSyncStarted,
  type FinancialConnectionOwner,
} from "@/lib/repositories/financial-connections";

import type {
  FinancialConnectionErrorCode,
  FinancialSyncTrigger,
} from "@/types/financial-connection";

export type PlaidAccountSyncMode =
  | "standard"
  | "fresh-balances";

export type PlaidAccountSyncInput = {
  connectionId: string;

  owner:
    FinancialConnectionOwner;

  institutionName?: string;

  trigger?:
    FinancialSyncTrigger;

  mode?:
    PlaidAccountSyncMode;

  /**
   * Optional subset of provider account IDs for a fresh-balance request.
   *
   * This only affects `mode: "fresh-balances"`.
   */
  accountIds?:
    string[];

  store:
    PlaidAccountSyncStore;
};

export type PlaidAccountSyncStore = {
  /**
   * Returns existing CASE Budget account records for one financial connection.
   *
   * The adapter must enforce workspace and user ownership.
   */
  listByConnection(
    input:
      PlaidAccountStoreScope,
  ): Promise<
    PlaidStoredAccount[]
  >;

  /**
   * Creates a new provider-backed CASE Budget account.
   */
  create(
    input:
      PlaidCreateAccountInput,
  ): Promise<
    PlaidStoredAccount
  >;

  /**
   * Updates a provider-backed CASE Budget account.
   */
  update(
    input:
      PlaidUpdateAccountInput,
  ): Promise<
    PlaidStoredAccount
  >;

  /**
   * Marks an account inactive when the provider no longer returns it.
   *
   * Historical transactions and balances should remain intact.
   */
  deactivate(
    input:
      PlaidDeactivateAccountInput,
  ): Promise<
    PlaidStoredAccount
  >;
};

export type PlaidAccountStoreScope = {
  connectionId: string;

  workspaceId: string;
  userId: string;
};

export type PlaidStoredAccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit-card"
  | "loan"
  | "mortgage"
  | "investment"
  | "retirement"
  | "other";

export type PlaidStoredAccount = {
  id: string;

  workspaceId: string;
  userId: string;

  connectionId: string;

  provider: "plaid";
  providerAccountId: string;

  providerInstitutionId?: string;
  institutionName?: string;

  name: string;
  officialName?: string;

  mask?: string;

  type:
    PlaidStoredAccountType;

  providerType: string;
  providerSubtype?: string;

  balance: number;
  availableBalance?: number;
  limit?: number;

  currency: string;

  isDebt: boolean;
  isActive: boolean;

  lastSyncedAt: string;

  createdAt: string;
  updatedAt: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type PlaidCreateAccountInput = {
  workspaceId: string;
  userId: string;

  connectionId: string;

  provider: "plaid";
  providerAccountId: string;

  providerInstitutionId?: string;
  institutionName?: string;

  name: string;
  officialName?: string;

  mask?: string;

  type:
    PlaidStoredAccountType;

  providerType: string;
  providerSubtype?: string;

  balance: number;
  availableBalance?: number;
  limit?: number;

  currency: string;

  isDebt: boolean;
  isActive: true;

  lastSyncedAt: string;

  metadata:
    Record<
      string,
      string | number | boolean | null
    >;
};

export type PlaidUpdateAccountInput = {
  accountId: string;

  workspaceId: string;
  userId: string;

  connectionId: string;

  providerInstitutionId?: string;
  institutionName?: string;

  name: string;
  officialName?: string;

  mask?: string;

  type:
    PlaidStoredAccountType;

  providerType: string;
  providerSubtype?: string;

  balance: number;
  availableBalance?: number;
  limit?: number;

  currency: string;

  isDebt: boolean;
  isActive: true;

  lastSyncedAt: string;

  metadata:
    Record<
      string,
      string | number | boolean | null
    >;
};

export type PlaidDeactivateAccountInput = {
  accountId: string;

  workspaceId: string;
  userId: string;

  connectionId: string;

  deactivatedAt: string;

  reason:
    "missing-from-provider";
};

export type PlaidAccountSyncResult = {
  connectionId: string;

  plaidItemId: string;

  institutionId?: string;

  mode:
    PlaidAccountSyncMode;

  trigger:
    FinancialSyncTrigger;

  startedAt: string;
  completedAt: string;

  receivedAccountCount: number;
  selectedAccountCount: number;

  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  deactivatedCount: number;
  skippedCount: number;

  createdAccountIds: string[];
  updatedAccountIds: string[];
  unchangedAccountIds: string[];
  deactivatedAccountIds: string[];
  skippedProviderAccountIds: string[];

  requestId: string;
};

export type PlaidAccountSyncErrorCode =
  | "invalid-input"
  | "plaid-item-not-found"
  | "store-read-failed"
  | "store-write-failed"
  | "provider-error"
  | "unknown";

export class PlaidAccountSyncError extends Error {
  readonly code:
    PlaidAccountSyncErrorCode;

  readonly connectionId?:
    string;

  readonly providerRequestId?:
    string;

  constructor({
    message,
    code,
    connectionId,
    providerRequestId,
    cause,
  }: {
    message: string;

    code:
      PlaidAccountSyncErrorCode;

    connectionId?: string;

    providerRequestId?: string;

    cause?: unknown;
  }) {
    super(
      message,
      {
        cause,
      },
    );

    this.name =
      "PlaidAccountSyncError";

    this.code =
      code;

    this.connectionId =
      connectionId;

    this.providerRequestId =
      providerRequestId;
  }
}

type PlaidAccountSyncPlan = {
  creates:
    PlaidNormalizedAccount[];

  updates:
    {
      existing:
        PlaidStoredAccount;

      incoming:
        PlaidNormalizedAccount;
    }[];

  unchanged:
    PlaidStoredAccount[];

  deactivations:
    PlaidStoredAccount[];

  skippedProviderAccountIds:
    string[];
};

const DEFAULT_SYNC_TRIGGER:
  FinancialSyncTrigger =
    "manual";

const DEFAULT_SYNC_MODE:
  PlaidAccountSyncMode =
    "standard";

/**
 * Synchronizes selected Plaid accounts into CASE Budget.
 *
 * This service is storage-agnostic. The caller supplies a server-only account
 * store adapter so the synchronization logic does not depend on a guessed
 * database schema.
 */
export async function syncPlaidAccounts(
  input:
    PlaidAccountSyncInput,
): Promise<PlaidAccountSyncResult> {
  const connectionId =
    requireNonEmptyString(
      input.connectionId,
      "connectionId",
    );

  const owner =
    normalizeOwner(
      input.owner,
    );

  const trigger =
    input.trigger ??
    DEFAULT_SYNC_TRIGGER;

  const mode =
    input.mode ??
    DEFAULT_SYNC_MODE;

  const startedAt =
    new Date().toISOString();

  await markFinancialConnectionSyncStarted({
    connectionId,
    owner,
    trigger,
  });

  try {
    const plaidItem =
      await loadPlaidItem({
        connectionId,
        owner,
      });

    const selectedAccountIds =
      getSelectedProviderAccountIds(
        plaidItem,
      );

    const plaidResult =
      mode ===
      "fresh-balances"
        ? await refreshPlaidAccountBalances({
            accessToken:
              plaidItem.accessToken,

            institutionName:
              input.institutionName,

            providerConnectionId:
              connectionId,

            selectedAccountIds,

            includeUnselectedAccounts:
              false,

            accountIds:
              normalizeAccountIds(
                input.accountIds,
              ),
          })
        : await getPlaidAccounts({
            accessToken:
              plaidItem.accessToken,

            institutionName:
              input.institutionName,

            providerConnectionId:
              connectionId,

            selectedAccountIds,

            includeUnselectedAccounts:
              false,
          });

    const existingAccounts =
      await loadExistingAccounts({
        store:
          input.store,

        scope: {
          connectionId,

          workspaceId:
            owner.workspaceId,

          userId:
            owner.userId,
        },
      });

    const syncPlan =
      createPlaidAccountSyncPlan({
        incomingAccounts:
          plaidResult.accounts,

        existingAccounts,

        selectedAccountIds,
      });

    const executionResult =
      await executePlaidAccountSyncPlan({
        plan:
          syncPlan,

        store:
          input.store,

        scope: {
          connectionId,

          workspaceId:
            owner.workspaceId,

          userId:
            owner.userId,
        },

        syncedAt:
          new Date().toISOString(),
      });

    const completedAt =
      new Date().toISOString();

    await markFinancialConnectionSyncCompleted({
      connectionId,
      owner,

      status:
        executionResult.skippedCount >
        0
          ? "completed-with-warnings"
          : "completed",

      completedAt,
    });

    return {
      connectionId,

      plaidItemId:
        plaidItem.plaidItemId,

      institutionId:
        plaidResult.institutionId,

      mode,

      trigger,

      startedAt,
      completedAt,

      receivedAccountCount:
        plaidResult.accounts.length,

      selectedAccountCount:
        selectedAccountIds.length,

      createdCount:
        executionResult.createdAccountIds.length,

      updatedCount:
        executionResult.updatedAccountIds.length,

      unchangedCount:
        executionResult.unchangedAccountIds.length,

      deactivatedCount:
        executionResult.deactivatedAccountIds.length,

      skippedCount:
        executionResult.skippedProviderAccountIds.length,

      createdAccountIds:
        executionResult.createdAccountIds,

      updatedAccountIds:
        executionResult.updatedAccountIds,

      unchangedAccountIds:
        executionResult.unchangedAccountIds,

      deactivatedAccountIds:
        executionResult.deactivatedAccountIds,

      skippedProviderAccountIds:
        executionResult.skippedProviderAccountIds,

      requestId:
        plaidResult.requestId,
    };
  } catch (
    error
  ) {
    await handlePlaidAccountSyncFailure({
      connectionId,
      owner,
      error,
    });

    throw normalizePlaidAccountSyncError({
      error,
      connectionId,
    });
  }
}

/**
 * Creates a deterministic synchronization plan without writing data.
 *
 * This is useful for tests and dry-run diagnostics.
 */
export function createPlaidAccountSyncPlan({
  incomingAccounts,
  existingAccounts,
  selectedAccountIds,
}: {
  incomingAccounts:
    PlaidNormalizedAccount[];

  existingAccounts:
    PlaidStoredAccount[];

  selectedAccountIds?:
    string[];
}): PlaidAccountSyncPlan {
  const selectedIds =
    new Set(
      normalizeAccountIds(
        selectedAccountIds,
      ),
    );

  const existingByProviderAccountId =
    new Map(
      existingAccounts.map(
        (
          account,
        ) => [
          account.providerAccountId,
          account,
        ],
      ),
    );

  const incomingProviderAccountIds =
    new Set<string>();

  const creates:
    PlaidAccountSyncPlan["creates"] =
    [];

  const updates:
    PlaidAccountSyncPlan["updates"] =
    [];

  const unchanged:
    PlaidAccountSyncPlan["unchanged"] =
    [];

  const skippedProviderAccountIds:
    string[] = [];

  for (
    const incomingAccount of incomingAccounts
  ) {
    if (
      selectedIds.size >
        0 &&
      !selectedIds.has(
        incomingAccount.providerAccountId,
      )
    ) {
      skippedProviderAccountIds.push(
        incomingAccount.providerAccountId,
      );

      continue;
    }

    incomingProviderAccountIds.add(
      incomingAccount.providerAccountId,
    );

    const existingAccount =
      existingByProviderAccountId.get(
        incomingAccount.providerAccountId,
      );

    if (
      !existingAccount
    ) {
      creates.push(
        incomingAccount,
      );

      continue;
    }

    if (
      accountRequiresUpdate({
        existing:
          existingAccount,

        incoming:
          incomingAccount,
      })
    ) {
      updates.push({
        existing:
          existingAccount,

        incoming:
          incomingAccount,
      });

      continue;
    }

    unchanged.push(
      existingAccount,
    );
  }

  const deactivations =
    existingAccounts.filter(
      (
        existingAccount,
      ) =>
        existingAccount.isActive &&
        (
          selectedIds.size ===
            0 ||
          selectedIds.has(
            existingAccount.providerAccountId,
          )
        ) &&
        !incomingProviderAccountIds.has(
          existingAccount.providerAccountId,
        ),
    );

  return {
    creates,
    updates,
    unchanged,
    deactivations,
    skippedProviderAccountIds:
      deduplicateStrings(
        skippedProviderAccountIds,
      ),
  };
}

async function executePlaidAccountSyncPlan({
  plan,
  store,
  scope,
  syncedAt,
}: {
  plan:
    PlaidAccountSyncPlan;

  store:
    PlaidAccountSyncStore;

  scope:
    PlaidAccountStoreScope;

  syncedAt:
    string;
}) {
  const createdAccountIds:
    string[] = [];

  const updatedAccountIds:
    string[] = [];

  const unchangedAccountIds =
    plan.unchanged.map(
      (
        account,
      ) =>
        account.id,
    );

  const deactivatedAccountIds:
    string[] = [];

  const skippedProviderAccountIds = [
    ...plan.skippedProviderAccountIds,
  ];

  for (
    const incomingAccount of plan.creates
  ) {
    try {
      const createdAccount =
        await store.create(
          mapPlaidAccountToCreateInput({
            account:
              incomingAccount,

            scope,

            syncedAt,
          }),
        );

      createdAccountIds.push(
        createdAccount.id,
      );
    } catch (
      error
    ) {
      skippedProviderAccountIds.push(
        incomingAccount.providerAccountId,
      );

      console.error(
        "Unable to create a Plaid-backed CASE Budget account.",
        {
          connectionId:
            scope.connectionId,

          providerAccountId:
            incomingAccount.providerAccountId,

          error,
        },
      );
    }
  }

  for (
    const update of plan.updates
  ) {
    try {
      const updatedAccount =
        await store.update(
          mapPlaidAccountToUpdateInput({
            existing:
              update.existing,

            incoming:
              update.incoming,

            scope,

            syncedAt,
          }),
        );

      updatedAccountIds.push(
        updatedAccount.id,
      );
    } catch (
      error
    ) {
      skippedProviderAccountIds.push(
        update.incoming.providerAccountId,
      );

      console.error(
        "Unable to update a Plaid-backed CASE Budget account.",
        {
          connectionId:
            scope.connectionId,

          providerAccountId:
            update.incoming.providerAccountId,

          error,
        },
      );
    }
  }

  for (
    const existingAccount of plan.deactivations
  ) {
    try {
      const deactivatedAccount =
        await store.deactivate({
          accountId:
            existingAccount.id,

          workspaceId:
            scope.workspaceId,

          userId:
            scope.userId,

          connectionId:
            scope.connectionId,

          deactivatedAt:
            syncedAt,

          reason:
            "missing-from-provider",
        });

      deactivatedAccountIds.push(
        deactivatedAccount.id,
      );
    } catch (
      error
    ) {
      skippedProviderAccountIds.push(
        existingAccount.providerAccountId,
      );

      console.error(
        "Unable to deactivate a missing Plaid-backed CASE Budget account.",
        {
          connectionId:
            scope.connectionId,

          providerAccountId:
            existingAccount.providerAccountId,

          error,
        },
      );
    }
  }

  return {
    createdAccountIds:
      deduplicateStrings(
        createdAccountIds,
      ),

    updatedAccountIds:
      deduplicateStrings(
        updatedAccountIds,
      ),

    unchangedAccountIds:
      deduplicateStrings(
        unchangedAccountIds,
      ),

    deactivatedAccountIds:
      deduplicateStrings(
        deactivatedAccountIds,
      ),

    skippedProviderAccountIds:
      deduplicateStrings(
        skippedProviderAccountIds,
      ),

    skippedCount:
      deduplicateStrings(
        skippedProviderAccountIds,
      ).length,
  };
}

async function loadPlaidItem({
  connectionId,
  owner,
}: {
  connectionId:
    string;

  owner:
    FinancialConnectionOwner;
}) {
  const plaidItem =
    await getPlaidItemWithAccessTokenByConnectionId({
      connectionId,
      owner,
    });

  if (
    plaidItem
  ) {
    return plaidItem;
  }

  throw new PlaidAccountSyncError({
    message:
      "The encrypted Plaid Item could not be found for this connection.",

    code:
      "plaid-item-not-found",

    connectionId,
  });
}

async function loadExistingAccounts({
  store,
  scope,
}: {
  store:
    PlaidAccountSyncStore;

  scope:
    PlaidAccountStoreScope;
}) {
  try {
    return await store.listByConnection(
      scope,
    );
  } catch (
    error
  ) {
    throw new PlaidAccountSyncError({
      message:
        "CASE Budget could not load the existing accounts for this connection.",

      code:
        "store-read-failed",

      connectionId:
        scope.connectionId,

      cause:
        error,
    });
  }
}

function getSelectedProviderAccountIds(
  plaidItem:
    PlaidItemWithAccessToken,
) {
  return deduplicateStrings(
    plaidItem.selectedAccounts
      .filter(
        (
          account,
        ) =>
          account.isSelected &&
          account.isActive,
      )
      .map(
        (
          account,
        ) =>
          account.providerAccountId,
      ),
  );
}

function mapPlaidAccountToCreateInput({
  account,
  scope,
  syncedAt,
}: {
  account:
    PlaidNormalizedAccount;

  scope:
    PlaidAccountStoreScope;

  syncedAt:
    string;
}): PlaidCreateAccountInput {
  return {
    workspaceId:
      scope.workspaceId,

    userId:
      scope.userId,

    connectionId:
      scope.connectionId,

    provider:
      "plaid",

    providerAccountId:
      account.providerAccountId,

    providerInstitutionId:
      account.providerInstitutionId,

    institutionName:
      account.institutionName,

    name:
      account.name,

    officialName:
      account.officialName,

    mask:
      account.mask,

    type:
      account.type,

    providerType:
      account.providerType,

    providerSubtype:
      account.providerSubtype,

    balance:
      account.currentBalance,

    availableBalance:
      account.availableBalance,

    limit:
      account.limit,

    currency:
      account.currency,

    isDebt:
      account.isDebt,

    isActive:
      true,

    lastSyncedAt:
      syncedAt,

    metadata: {
      ...account.metadata,

      provider:
        "plaid",

      providerAccountId:
        account.providerAccountId,

      syncedAt,
    },
  };
}

function mapPlaidAccountToUpdateInput({
  existing,
  incoming,
  scope,
  syncedAt,
}: {
  existing:
    PlaidStoredAccount;

  incoming:
    PlaidNormalizedAccount;

  scope:
    PlaidAccountStoreScope;

  syncedAt:
    string;
}): PlaidUpdateAccountInput {
  return {
    accountId:
      existing.id,

    workspaceId:
      scope.workspaceId,

    userId:
      scope.userId,

    connectionId:
      scope.connectionId,

    providerInstitutionId:
      incoming.providerInstitutionId,

    institutionName:
      incoming.institutionName,

    name:
      incoming.name,

    officialName:
      incoming.officialName,

    mask:
      incoming.mask,

    type:
      incoming.type,

    providerType:
      incoming.providerType,

    providerSubtype:
      incoming.providerSubtype,

    balance:
      incoming.currentBalance,

    availableBalance:
      incoming.availableBalance,

    limit:
      incoming.limit,

    currency:
      incoming.currency,

    isDebt:
      incoming.isDebt,

    isActive:
      true,

    lastSyncedAt:
      syncedAt,

    metadata: {
      ...incoming.metadata,

      provider:
        "plaid",

      providerAccountId:
        incoming.providerAccountId,

      syncedAt,
    },
  };
}

function accountRequiresUpdate({
  existing,
  incoming,
}: {
  existing:
    PlaidStoredAccount;

  incoming:
    PlaidNormalizedAccount;
}) {
  return (
    existing.name !==
      incoming.name ||
    normalizeNullableText(
      existing.officialName,
    ) !==
      normalizeNullableText(
        incoming.officialName,
      ) ||
    normalizeNullableText(
      existing.mask,
    ) !==
      normalizeNullableText(
        incoming.mask,
      ) ||
    existing.type !==
      incoming.type ||
    existing.providerType !==
      incoming.providerType ||
    normalizeNullableText(
      existing.providerSubtype,
    ) !==
      normalizeNullableText(
        incoming.providerSubtype,
      ) ||
    !numbersEqual(
      existing.balance,
      incoming.currentBalance,
    ) ||
    !optionalNumbersEqual(
      existing.availableBalance,
      incoming.availableBalance,
    ) ||
    !optionalNumbersEqual(
      existing.limit,
      incoming.limit,
    ) ||
    existing.currency !==
      incoming.currency ||
    existing.isDebt !==
      incoming.isDebt ||
    existing.isActive !==
      true ||
    normalizeNullableText(
      existing.providerInstitutionId,
    ) !==
      normalizeNullableText(
        incoming.providerInstitutionId,
      ) ||
    normalizeNullableText(
      existing.institutionName,
    ) !==
      normalizeNullableText(
        incoming.institutionName,
      )
  );
}

async function handlePlaidAccountSyncFailure({
  connectionId,
  owner,
  error,
}: {
  connectionId:
    string;

  owner:
    FinancialConnectionOwner;

  error:
    unknown;
}) {
  if (
    error instanceof
      PlaidServiceError &&
    error.code ===
      "item-login-required"
  ) {
    try {
      await markFinancialConnectionReauthenticationRequired({
        connectionId,
        owner,

        errorCode:
          "reauthentication-required",

        errorMessage:
          error.displayMessage ??
          "The financial institution requires the user to reconnect.",
      });
    } catch (
      statusError
    ) {
      console.error(
        "Unable to mark the Plaid connection as requiring reauthentication.",
        {
          connectionId,
          statusError,
        },
      );
    }

    return;
  }

  const mappedErrorCode =
    mapSyncFailureToConnectionErrorCode(
      error,
    );

  const errorMessage =
    getSafeSyncFailureMessage(
      error,
    );

  try {
    await markFinancialConnectionSyncFailed({
      connectionId,
      owner,

      errorCode:
        mappedErrorCode,

      errorMessage,

      requiresReauthentication:
        false,
    });
  } catch (
    statusError
  ) {
    console.error(
      "Unable to mark the Plaid account synchronization as failed.",
      {
        connectionId,
        statusError,
      },
    );
  }
}

function mapSyncFailureToConnectionErrorCode(
  error:
    unknown,
): FinancialConnectionErrorCode {
  if (
    !(error instanceof
      PlaidServiceError)
  ) {
    return "sync-failed";
  }

  switch (
    error.code
  ) {
    case "invalid-token":
      return "authentication-failed";

    case "item-login-required":
      return "reauthentication-required";

    case "item-not-found":
      return "resource-not-found";

    case "institution-unavailable":
      return "institution-unavailable";

    case "rate-limited":
      return "rate-limited";

    case "configuration-error":
      return "invalid-configuration";

    case "provider-error":
      return "provider-unavailable";

    case "product-not-ready":
    case "invalid-request":
    case "invalid-input":
    case "unknown":
    default:
      return "sync-failed";
  }
}

function getSafeSyncFailureMessage(
  error:
    unknown,
) {
  if (
    error instanceof
    PlaidServiceError
  ) {
    switch (
      error.code
    ) {
      case "invalid-token":
        return "The Plaid access token is no longer valid.";

      case "item-login-required":
        return "The financial institution requires reauthentication.";

      case "item-not-found":
        return "The Plaid Item could not be found.";

      case "institution-unavailable":
        return "The financial institution is temporarily unavailable.";

      case "product-not-ready":
        return "Plaid account data is not ready yet.";

      case "rate-limited":
        return "Plaid is temporarily limiting account requests.";

      case "configuration-error":
        return "Plaid account synchronization is not configured correctly.";

      case "provider-error":
        return "Plaid is temporarily unavailable.";

      case "invalid-request":
      case "invalid-input":
        return "The Plaid account synchronization request was invalid.";

      case "unknown":
      default:
        return "Plaid account synchronization failed.";
    }
  }

  if (
    error instanceof
    PlaidAccountSyncError
  ) {
    return error.message;
  }

  return "Plaid account synchronization failed.";
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
        getSafeSyncFailureMessage(
          error,
        ),

      code:
        "provider-error",

      connectionId,

      providerRequestId:
        error.requestId,

      cause:
        error,
    });
  }

  return new PlaidAccountSyncError({
    message:
      "Plaid account synchronization failed.",

    code:
      "unknown",

    connectionId,

    cause:
      error,
  });
}

function normalizeOwner(
  owner:
    FinancialConnectionOwner,
): FinancialConnectionOwner {
  return {
    workspaceId:
      requireNonEmptyString(
        owner.workspaceId,
        "workspaceId",
      ),

    userId:
      requireNonEmptyString(
        owner.userId,
        "userId",
      ),
  };
}

function normalizeAccountIds(
  values:
    string[] | undefined,
) {
  return deduplicateStrings(
    values ??
    [],
  );
}

function deduplicateStrings(
  values:
    string[],
) {
  return [
    ...new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  ];
}

function requireNonEmptyString(
  value:
    string,
  fieldName:
    string,
) {
  const normalizedValue =
    value?.trim();

  if (
    normalizedValue
  ) {
    return normalizedValue;
  }

  throw new PlaidAccountSyncError({
    message:
      `${fieldName} is required.`,

    code:
      "invalid-input",
  });
}

function normalizeNullableText(
  value:
    string | undefined,
) {
  return value?.trim() ??
    "";
}

function numbersEqual(
  firstValue:
    number,
  secondValue:
    number,
) {
  return Math.abs(
    firstValue -
      secondValue,
  ) <
    0.000001;
}

function optionalNumbersEqual(
  firstValue:
    number | undefined,
  secondValue:
    number | undefined,
) {
  if (
    firstValue ===
      undefined &&
    secondValue ===
      undefined
  ) {
    return true;
  }

  if (
    firstValue ===
      undefined ||
    secondValue ===
      undefined
  ) {
    return false;
  }

  return numbersEqual(
    firstValue,
    secondValue,
  );
}
