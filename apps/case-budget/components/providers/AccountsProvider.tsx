"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AccountType =
  | "checking"
  | "savings"
  | "cash"
  | "credit-card"
  | "investment"
  | "retirement"
  | "mortgage"
  | "loan"
  | "real-estate"
  | "vehicle"
  | "other";

export type AccountClassification =
  | "asset"
  | "liability";

export type AccountConnectionStatus =
  | "manual"
  | "connected"
  | "disconnected"
  | "error"
  | "pending";

export type AccountData = {
  id: string;
  name: string;
  institution?: string;
  type: AccountType;
  classification: AccountClassification;
  balance: number;
  availableBalance?: number;
  currency: string;
  isIncludedInNetWorth: boolean;
  connectionStatus: AccountConnectionStatus;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountData = {
  name: string;
  institution?: string;
  type: AccountType;
  classification: AccountClassification;
  balance: number;
  availableBalance?: number;
  currency?: string;
  isIncludedInNetWorth?: boolean;
  connectionStatus?: AccountConnectionStatus;
};

export type UpdateAccountData = Partial<
  Omit<
    AccountData,
    "id" | "createdAt"
  >
>;

type AccountsContextValue = {
  accounts: AccountData[];
  assetAccounts: AccountData[];
  liabilityAccounts: AccountData[];
  includedNetWorthAccounts: AccountData[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;

  addAccount: (
    account: CreateAccountData,
  ) => AccountData;

  updateAccount: (
    accountId: string,
    updates: UpdateAccountData,
  ) => void;

  deleteAccount: (
    accountId: string,
  ) => void;

  getAccountById: (
    accountId: string,
  ) => AccountData | null;

  updateAccountBalance: (
    accountId: string,
    balance: number,
    availableBalance?: number,
  ) => void;

  setAccountNetWorthInclusion: (
    accountId: string,
    included: boolean,
  ) => void;
};

export type AccountsProviderProps = {
  children: ReactNode;
  initialAccounts?: AccountData[];
};

const ACCOUNTS_STORAGE_KEY =
  "case-budget:accounts:v2";

const LEGACY_ACCOUNTS_STORAGE_KEY =
  "case-budget:accounts:v1";

const LEGACY_DEMO_ACCOUNT_IDS =
  new Set([
    "checking",
    "savings",
    "visa",
  ]);

const defaultAccounts:
  AccountData[] = [];

const AccountsContext =
  createContext<
    AccountsContextValue | undefined
  >(undefined);

function createAccountId() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `account-${crypto.randomUUID()}`;
  }

  return `account-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createUniqueAccountId(
  accounts: AccountData[],
) {
  const existingIds =
    new Set(
      accounts.map(
        (
          account,
        ) =>
          account.id,
      ),
    );

  let candidateId =
    createAccountId();

  while (
    existingIds.has(
      candidateId,
    )
  ) {
    candidateId =
      createAccountId();
  }

  return candidateId;
}

function cloneAccount(
  account: AccountData,
): AccountData {
  return {
    ...account,
  };
}

function cloneAccounts(
  accounts: AccountData[],
) {
  return accounts.map(
    cloneAccount,
  );
}

function isAccountType(
  value: unknown,
): value is AccountType {
  return (
    value === "checking" ||
    value === "savings" ||
    value === "cash" ||
    value === "credit-card" ||
    value === "investment" ||
    value === "retirement" ||
    value === "mortgage" ||
    value === "loan" ||
    value === "real-estate" ||
    value === "vehicle" ||
    value === "other"
  );
}

function isAccountClassification(
  value: unknown,
): value is AccountClassification {
  return (
    value === "asset" ||
    value === "liability"
  );
}

function isAccountConnectionStatus(
  value: unknown,
): value is AccountConnectionStatus {
  return (
    value === "manual" ||
    value === "connected" ||
    value === "disconnected" ||
    value === "error" ||
    value === "pending"
  );
}

function isAccountData(
  value: unknown,
): value is AccountData {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const candidate =
    value as Partial<AccountData>;

  return (
    typeof candidate.id ===
      "string" &&
    candidate.id.trim() !==
      "" &&
    typeof candidate.name ===
      "string" &&
    candidate.name.trim() !==
      "" &&
    isAccountType(
      candidate.type,
    ) &&
    isAccountClassification(
      candidate.classification,
    ) &&
    typeof candidate.balance ===
      "number" &&
    Number.isFinite(
      candidate.balance,
    ) &&
    typeof candidate.currency ===
      "string" &&
    candidate.currency.trim() !==
      "" &&
    typeof candidate.isIncludedInNetWorth ===
      "boolean" &&
    isAccountConnectionStatus(
      candidate.connectionStatus,
    ) &&
    typeof candidate.createdAt ===
      "string" &&
    typeof candidate.updatedAt ===
      "string"
  );
}

function loadStoredAccounts() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentAccounts =
    readStoredAccounts(
      ACCOUNTS_STORAGE_KEY,
    );

  if (
    currentAccounts
  ) {
    return currentAccounts;
  }

  const legacyAccounts =
    readStoredAccounts(
      LEGACY_ACCOUNTS_STORAGE_KEY,
    );

  if (
    !legacyAccounts
  ) {
    return null;
  }

  const migratedAccounts =
    legacyAccounts.filter(
      (
        account,
      ) =>
        !isUntouchedLegacyDemoAccount(
          account,
        ),
    );

  try {
    window.localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify(
        migratedAccounts,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_ACCOUNTS_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return migratedAccounts;
}

function readStoredAccounts(
  storageKey: string,
) {
  try {
    const storedValue =
      window.localStorage.getItem(
        storageKey,
      );

    if (
      !storedValue
    ) {
      return null;
    }

    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !Array.isArray(
        parsedValue,
      ) ||
      !parsedValue.every(
        isAccountData,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    return cloneAccounts(
      parsedValue,
    );
  } catch {
    return null;
  }
}

function isUntouchedLegacyDemoAccount(
  account: AccountData,
) {
  if (
    !LEGACY_DEMO_ACCOUNT_IDS.has(
      account.id,
    )
  ) {
    return false;
  }

  switch (
    account.id
  ) {
    case "checking":
      return (
        account.name ===
          "Checking" &&
        account.institution ===
          "Navy Federal Credit Union" &&
        account.type ===
          "checking" &&
        account.classification ===
          "asset" &&
        account.balance ===
          8240.55 &&
        account.availableBalance ===
          8240.55 &&
        account.currency ===
          "USD" &&
        account.isIncludedInNetWorth ===
          true &&
        account.connectionStatus ===
          "manual" &&
        account.createdAt ===
          "2026-07-01T12:00:00.000Z" &&
        account.updatedAt ===
          "2026-07-29T12:00:00.000Z"
      );

    case "savings":
      return (
        account.name ===
          "Emergency Savings" &&
        account.institution ===
          "Navy Federal Credit Union" &&
        account.type ===
          "savings" &&
        account.classification ===
          "asset" &&
        account.balance ===
          12500 &&
        account.availableBalance ===
          12500 &&
        account.currency ===
          "USD" &&
        account.isIncludedInNetWorth ===
          true &&
        account.connectionStatus ===
          "manual" &&
        account.createdAt ===
          "2026-07-01T12:00:00.000Z" &&
        account.updatedAt ===
          "2026-07-29T12:00:00.000Z"
      );

    case "visa":
      return (
        account.name ===
          "Visa" &&
        account.institution ===
          "Capital One" &&
        account.type ===
          "credit-card" &&
        account.classification ===
          "liability" &&
        account.balance ===
          6240.18 &&
        account.availableBalance ===
          undefined &&
        account.currency ===
          "USD" &&
        account.isIncludedInNetWorth ===
          true &&
        account.connectionStatus ===
          "manual" &&
        account.createdAt ===
          "2026-07-01T12:00:00.000Z" &&
        account.updatedAt ===
          "2026-07-29T12:00:00.000Z"
      );

    default:
      return false;
  }
}

function normalizeBalance(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    value * 100,
  ) / 100;
}

export default function AccountsProvider({
  children,
  initialAccounts = defaultAccounts,
}: AccountsProviderProps) {
  const [
    accounts,
    setAccounts,
  ] = useState<AccountData[]>(
    () =>
      cloneAccounts(
        initialAccounts,
      ),
  );

  const [
    hasHydratedStorage,
    setHasHydratedStorage,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      const storedAccounts =
        loadStoredAccounts();

      if (
        storedAccounts
      ) {
        setAccounts(
          storedAccounts,
        );
      }

      setHasHydratedStorage(
        true,
      );
    },
    [],
  );

  useEffect(
    () => {
      try {
        window.localStorage.removeItem(
          LEGACY_ACCOUNTS_STORAGE_KEY,
        );
      } catch {
        // Local storage may be unavailable.
      }
    },
    [],
  );

  useEffect(
    () => {
      if (
        !hasHydratedStorage
      ) {
        return;
      }

      try {
        window.localStorage.setItem(
          ACCOUNTS_STORAGE_KEY,
          JSON.stringify(
            accounts,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [
      accounts,
      hasHydratedStorage,
    ],
  );

  const assetAccounts =
    useMemo(
      () =>
        accounts.filter(
          (
            account,
          ) =>
            account.classification ===
            "asset",
        ),
      [
        accounts,
      ],
    );

  const liabilityAccounts =
    useMemo(
      () =>
        accounts.filter(
          (
            account,
          ) =>
            account.classification ===
            "liability",
        ),
      [
        accounts,
      ],
    );

  const includedNetWorthAccounts =
    useMemo(
      () =>
        accounts.filter(
          (
            account,
          ) =>
            account.isIncludedInNetWorth,
        ),
      [
        accounts,
      ],
    );

  const totalAssets =
    useMemo(
      () =>
        includedNetWorthAccounts
          .filter(
            (
              account,
            ) =>
              account.classification ===
              "asset",
          )
          .reduce(
            (
              total,
              account,
            ) =>
              total +
              Math.abs(
                account.balance,
              ),
            0,
          ),
      [
        includedNetWorthAccounts,
      ],
    );

  const totalLiabilities =
    useMemo(
      () =>
        includedNetWorthAccounts
          .filter(
            (
              account,
            ) =>
              account.classification ===
              "liability",
          )
          .reduce(
            (
              total,
              account,
            ) =>
              total +
              Math.abs(
                account.balance,
              ),
            0,
          ),
      [
        includedNetWorthAccounts,
      ],
    );

  const netWorth =
    useMemo(
      () =>
        normalizeBalance(
          totalAssets -
          totalLiabilities,
        ),
      [
        totalAssets,
        totalLiabilities,
      ],
    );

  const addAccount =
    useCallback(
      (
        account:
          CreateAccountData,
      ) => {
        const timestamp =
          new Date().toISOString();

        const baseAccount:
          Omit<
            AccountData,
            "id"
          > = {
            name:
              account.name.trim(),
            institution:
              account.institution?.trim() ||
              undefined,
            type:
              account.type,
            classification:
              account.classification,
            balance:
              normalizeBalance(
                account.balance,
              ),
            availableBalance:
              account.availableBalance ===
              undefined
                ? undefined
                : normalizeBalance(
                    account.availableBalance,
                  ),
            currency:
              account.currency?.trim()
                .toUpperCase() ||
              "USD",
            isIncludedInNetWorth:
              account.isIncludedInNetWorth ??
              true,
            connectionStatus:
              account.connectionStatus ??
              "manual",
            createdAt:
              timestamp,
            updatedAt:
              timestamp,
          };

        const preferredId =
          createAccountId();

        const newAccount:
          AccountData = {
            id:
              preferredId,
            ...baseAccount,
          };

        setAccounts(
          (
            currentAccounts,
          ) => {
            const uniqueAccount: AccountData = {
              ...newAccount,
              id:
                currentAccounts.some(
                  (
                    currentAccount,
                  ) =>
                    currentAccount.id ===
                    preferredId,
                )
                  ? createUniqueAccountId(
                      currentAccounts,
                    )
                  : preferredId,
            };

            return [
              uniqueAccount,
              ...currentAccounts,
            ];
          },
        );

        return newAccount;
      },
      [],
    );

  const updateAccount =
    useCallback(
      (
        accountId: string,
        updates:
          UpdateAccountData,
      ) => {
        setAccounts(
          (
            currentAccounts,
          ) =>
            currentAccounts.map(
              (
                account,
              ) => {
                if (
                  account.id !==
                  accountId
                ) {
                  return account;
                }

                return {
                  ...account,
                  ...updates,
                  id:
                    account.id,
                  name:
                    updates.name?.trim() ||
                    account.name,
                  institution:
                    updates.institution ===
                    undefined
                      ? account.institution
                      : updates.institution.trim() ||
                        undefined,
                  balance:
                    updates.balance ===
                    undefined
                      ? account.balance
                      : normalizeBalance(
                          updates.balance,
                        ),
                  availableBalance:
                    updates.availableBalance ===
                    undefined
                      ? account.availableBalance
                      : normalizeBalance(
                          updates.availableBalance,
                        ),
                  currency:
                    updates.currency?.trim()
                      .toUpperCase() ||
                    account.currency,
                  createdAt:
                    account.createdAt,
                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const deleteAccount =
    useCallback(
      (
        accountId: string,
      ) => {
        setAccounts(
          (
            currentAccounts,
          ) =>
            currentAccounts.filter(
              (
                account,
              ) =>
                account.id !==
                accountId,
            ),
        );
      },
      [],
    );

  const getAccountById =
    useCallback(
      (
        accountId: string,
      ) => {
        return (
          accounts.find(
            (
              account,
            ) =>
              account.id ===
              accountId,
          ) ??
          null
        );
      },
      [
        accounts,
      ],
    );

  const updateAccountBalance =
    useCallback(
      (
        accountId: string,
        balance: number,
        availableBalance?: number,
      ) => {
        updateAccount(
          accountId,
          {
            balance,
            availableBalance,
            lastSyncedAt:
              new Date().toISOString(),
          },
        );
      },
      [
        updateAccount,
      ],
    );

  const setAccountNetWorthInclusion =
    useCallback(
      (
        accountId: string,
        included: boolean,
      ) => {
        updateAccount(
          accountId,
          {
            isIncludedInNetWorth:
              included,
          },
        );
      },
      [
        updateAccount,
      ],
    );

  const value =
    useMemo<AccountsContextValue>(
      () => ({
        accounts,
        assetAccounts,
        liabilityAccounts,
        includedNetWorthAccounts,
        totalAssets:
          normalizeBalance(
            totalAssets,
          ),
        totalLiabilities:
          normalizeBalance(
            totalLiabilities,
          ),
        netWorth,
        addAccount,
        updateAccount,
        deleteAccount,
        getAccountById,
        updateAccountBalance,
        setAccountNetWorthInclusion,
      }),
      [
        accounts,
        addAccount,
        assetAccounts,
        deleteAccount,
        getAccountById,
        includedNetWorthAccounts,
        liabilityAccounts,
        netWorth,
        setAccountNetWorthInclusion,
        totalAssets,
        totalLiabilities,
        updateAccount,
        updateAccountBalance,
      ],
    );

  return (
    <AccountsContext.Provider
      value={value}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context =
    useContext(
      AccountsContext,
    );

  if (!context) {
    throw new Error(
      "useAccounts must be used within an AccountsProvider.",
    );
  }

  return context;
}