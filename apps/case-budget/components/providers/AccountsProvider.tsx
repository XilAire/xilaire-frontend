"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  archiveAccount as archiveAccountAction,
  type ArchiveCaseBudgetAccountResult,
} from "@/actions/accounts/archive-account";

import {
  createAccount as createAccountAction,
  type CreateCaseBudgetAccountResult,
} from "@/actions/accounts/create-account";

import {
  getAccounts as getAccountsAction,
  type GetCaseBudgetAccountsResult,
} from "@/actions/accounts/get-accounts";

import {
  updateAccount as updateAccountAction,
  type UpdateCaseBudgetAccountResult,
} from "@/actions/accounts/update-account";

import type {
  AccountData,
  AccountSummary,
  AccountType,
  AccountClassification,
  AccountConnectionStatus,
  CreateAccountData,
  UpdateAccountData,
} from "@/types/account";

export type {
  AccountData,
  AccountType,
  AccountClassification,
  AccountConnectionStatus,
  CreateAccountData,
  UpdateAccountData,
} from "@/types/account";

export type AccountMutationResult =
  | CreateCaseBudgetAccountResult
  | UpdateCaseBudgetAccountResult
  | ArchiveCaseBudgetAccountResult;

type AccountsContextValue = {
  accounts:
    AccountData[];

  allAccounts:
    AccountData[];

  archivedAccounts:
    AccountData[];

  assetAccounts:
    AccountData[];

  liabilityAccounts:
    AccountData[];

  includedNetWorthAccounts:
    AccountData[];

  totalAssets:
    number;

  totalLiabilities:
    number;

  netWorth:
    number;

  summary:
    AccountSummary;

  isLoading:
    boolean;

  isRefreshing:
    boolean;

  isMutating:
    boolean;

  error:
    string | null;

  refreshAccounts:
    () => Promise<GetCaseBudgetAccountsResult>;

  addAccount:
    (
      account:
        CreateAccountData,
    ) => Promise<CreateCaseBudgetAccountResult>;

  updateAccount:
    (
      accountId:
        string,
      updates:
        UpdateAccountData,
    ) => Promise<UpdateCaseBudgetAccountResult>;

  deleteAccount:
    (
      accountId:
        string,
    ) => Promise<ArchiveCaseBudgetAccountResult>;

  archiveAccount:
    (
      accountId:
        string,
    ) => Promise<ArchiveCaseBudgetAccountResult>;

  restoreAccount:
    (
      accountId:
        string,
    ) => Promise<ArchiveCaseBudgetAccountResult>;

  getAccountById:
    (
      accountId:
        string,
    ) => AccountData | null;

  updateAccountBalance:
    (
      accountId:
        string,
      balance:
        number,
      availableBalance?:
        number,
    ) => Promise<UpdateCaseBudgetAccountResult>;

  setAccountNetWorthInclusion:
    (
      accountId:
        string,
      included:
        boolean,
    ) => Promise<UpdateCaseBudgetAccountResult>;

  clearError:
    () => void;
};

export type AccountsProviderProps = {
  children:
    ReactNode;

  /**
   * Optional server-provided seed.
   *
   * This is not persisted client-side. Supabase remains the source of truth,
   * and the provider refreshes from the production account read action after
   * mounting.
   */
  initialAccounts?:
    AccountData[];
};

const EMPTY_SUMMARY:
  AccountSummary = {
    totalAssets:
      0,

    totalLiabilities:
      0,

    netWorth:
      0,

    activeAccountCount:
      0,

    archivedAccountCount:
      0,

    connectedAccountCount:
      0,

    manualAccountCount:
      0,

    includedInNetWorthCount:
      0,

    totalCount:
      0,
  };

const AccountsContext =
  createContext<
    AccountsContextValue | undefined
  >(
    undefined,
  );

/**
 * Production CASE Budget Accounts provider.
 *
 * Supabase is the only persistence layer.
 *
 * There is intentionally:
 *
 * - no localStorage hydration;
 * - no localStorage persistence;
 * - no browser-generated account ID;
 * - no client-only create/update/delete source of truth.
 *
 * React state is only an in-memory representation of canonical server data.
 */
export default function AccountsProvider({
  children,
  initialAccounts = [],
}: AccountsProviderProps) {
  const [
    allAccounts,
    setAllAccounts,
  ] =
    useState<
      AccountData[]
    >(
      () =>
        cloneAccounts(
          initialAccounts,
        ),
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      initialAccounts.length ===
        0,
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false,
    );

  const [
    mutationCount,
    setMutationCount,
  ] =
    useState(
      0,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const mountedRef =
    useRef(
      true,
    );

  const requestIdRef =
    useRef(
      0,
    );

  useEffect(
    () => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;
      };
    },
    [],
  );

  const loadAccounts =
    useCallback(
      async ({
        showInitialLoading,
      }: {
        showInitialLoading:
          boolean;
      }): Promise<GetCaseBudgetAccountsResult> => {
        const requestId =
          requestIdRef.current +
          1;

        requestIdRef.current =
          requestId;

        if (
          mountedRef.current
        ) {
          if (
            showInitialLoading
          ) {
            setIsLoading(
              true,
            );
          } else {
            setIsRefreshing(
              true,
            );
          }

          setError(
            null,
          );
        }

        try {
          const result =
            await getAccountsAction();

          if (
            !mountedRef.current ||
            requestId !==
              requestIdRef.current
          ) {
            return result;
          }

          if (
            result.success
          ) {
            setAllAccounts(
              cloneAccounts(
                result.accounts,
              ),
            );
          } else {
            setError(
              result.error.message,
            );
          }

          return result;
        } catch (
          loadError
        ) {
          const message =
            getUnexpectedErrorMessage(
              loadError,
              "CASE Budget could not load accounts. Please try again.",
            );

          if (
            mountedRef.current &&
            requestId ===
              requestIdRef.current
          ) {
            setError(
              message,
            );
          }

          return {
            success:
              false,

            accounts:
              [],

            summary: {
              ...EMPTY_SUMMARY,
            },

            error: {
              code:
                "unexpected-error",

              message,
            },
          };
        } finally {
          if (
            mountedRef.current &&
            requestId ===
              requestIdRef.current
          ) {
            setIsLoading(
              false,
            );

            setIsRefreshing(
              false,
            );
          }
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadAccounts({
        showInitialLoading:
          initialAccounts.length ===
          0,
      });
    },
    [
      initialAccounts.length,
      loadAccounts,
    ],
  );

  const refreshAccounts =
    useCallback(
      async () => {
        return loadAccounts({
          showInitialLoading:
            false,
        });
      },
      [
        loadAccounts,
      ],
    );

  const beginMutation =
    useCallback(
      () => {
        if (
          mountedRef.current
        ) {
          setMutationCount(
            (
              current,
            ) =>
              current +
              1,
          );

          setError(
            null,
          );
        }
      },
      [],
    );

  const endMutation =
    useCallback(
      () => {
        if (
          mountedRef.current
        ) {
          setMutationCount(
            (
              current,
            ) =>
              Math.max(
                0,
                current -
                  1,
              ),
          );
        }
      },
      [],
    );

  const addAccount =
    useCallback(
      async (
        account:
          CreateAccountData,
      ): Promise<CreateCaseBudgetAccountResult> => {
        beginMutation();

        try {
          const result =
            await createAccountAction(
              account,
            );

          if (
            !mountedRef.current
          ) {
            return result;
          }

          if (
            result.success &&
            result.status ===
              "created"
          ) {
            setAllAccounts(
              (
                current,
              ) =>
                upsertAccount(
                  current,
                  result.account,
                ),
            );
          } else if (
            !result.success
          ) {
            setError(
              result.error.message,
            );
          }

          return result;
        } catch (
          mutationError
        ) {
          const message =
            getUnexpectedErrorMessage(
              mutationError,
              "CASE Budget could not create the account. Please try again.",
            );

          if (
            mountedRef.current
          ) {
            setError(
              message,
            );
          }

          return {
            success:
              false,

            status:
              "error",

            account:
              null,

            approvalRequired:
              false,

            approval:
              null,

            error: {
              code:
                "unexpected-error",

              message,
            },
          };
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  const updateAccount =
    useCallback(
      async (
        accountId:
          string,
        updates:
          UpdateAccountData,
      ): Promise<UpdateCaseBudgetAccountResult> => {
        beginMutation();

        try {
          const result =
            await updateAccountAction({
              accountId,
              updates,
            });

          if (
            !mountedRef.current
          ) {
            return result;
          }

          if (
            result.success &&
            result.status ===
              "updated"
          ) {
            setAllAccounts(
              (
                current,
              ) =>
                upsertAccount(
                  current,
                  result.account,
                ),
            );
          } else if (
            !result.success
          ) {
            setError(
              result.error.message,
            );
          }

          return result;
        } catch (
          mutationError
        ) {
          const message =
            getUnexpectedErrorMessage(
              mutationError,
              "CASE Budget could not update the account. Please try again.",
            );

          if (
            mountedRef.current
          ) {
            setError(
              message,
            );
          }

          return {
            success:
              false,

            status:
              "error",

            account:
              null,

            approvalRequired:
              false,

            approval:
              null,

            error: {
              code:
                "unexpected-error",

              message,
            },
          };
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  const changeArchiveState =
    useCallback(
      async ({
        accountId,
        archived,
      }: {
        accountId:
          string;

        archived:
          boolean;
      }): Promise<ArchiveCaseBudgetAccountResult> => {
        beginMutation();

        try {
          const result =
            await archiveAccountAction({
              accountId,
              archived,
            });

          if (
            !mountedRef.current
          ) {
            return result;
          }

          if (
            result.success &&
            (
              result.status ===
                "archived" ||
              result.status ===
                "restored"
            )
          ) {
            setAllAccounts(
              (
                current,
              ) =>
                upsertAccount(
                  current,
                  result.account,
                ),
            );
          } else if (
            !result.success
          ) {
            setError(
              result.error.message,
            );
          }

          return result;
        } catch (
          mutationError
        ) {
          const message =
            getUnexpectedErrorMessage(
              mutationError,
              archived
                ? "CASE Budget could not archive the account. Please try again."
                : "CASE Budget could not restore the account. Please try again.",
            );

          if (
            mountedRef.current
          ) {
            setError(
              message,
            );
          }

          return {
            success:
              false,

            status:
              "error",

            account:
              null,

            approvalRequired:
              false,

            approval:
              null,

            error: {
              code:
                "unexpected-error",

              message,
            },
          };
        } finally {
          endMutation();
        }
      },
      [
        beginMutation,
        endMutation,
      ],
    );

  /**
   * Compatibility name retained for existing UI callers.
   *
   * "delete" now means archive. The database row is never destructively
   * deleted, preserving transaction and reporting history.
   */
  const deleteAccount =
    useCallback(
      async (
        accountId:
          string,
      ) => {
        return changeArchiveState({
          accountId,
          archived:
            true,
        });
      },
      [
        changeArchiveState,
      ],
    );

  const archiveAccount =
    deleteAccount;

  const restoreAccount =
    useCallback(
      async (
        accountId:
          string,
      ) => {
        return changeArchiveState({
          accountId,
          archived:
            false,
        });
      },
      [
        changeArchiveState,
      ],
    );

  const getAccountById =
    useCallback(
      (
        accountId:
          string,
      ) => {
        return (
          allAccounts.find(
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
        allAccounts,
      ],
    );

  const updateAccountBalance =
    useCallback(
      async (
        accountId:
          string,
        balance:
          number,
        availableBalance?:
          number,
      ) => {
        const updates:
          UpdateAccountData = {
            balance,
          };

        if (
          availableBalance !==
          undefined
        ) {
          updates.availableBalance =
            availableBalance;
        }

        return updateAccount(
          accountId,
          updates,
        );
      },
      [
        updateAccount,
      ],
    );

  const setAccountNetWorthInclusion =
    useCallback(
      async (
        accountId:
          string,
        included:
          boolean,
      ) => {
        return updateAccount(
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

  const clearError =
    useCallback(
      () => {
        setError(
          null,
        );
      },
      [],
    );

  /**
   * The public active account collection intentionally excludes archived and
   * inactive records so existing account selectors and account screens do not
   * suddenly expose historical rows.
   *
   * allAccounts/getAccountById retain historical records for transaction and
   * reporting lookups.
   */
  const accounts =
    useMemo(
      () =>
        allAccounts.filter(
          (
            account,
          ) =>
            account.isActive &&
            !account.isArchived,
        ),
      [
        allAccounts,
      ],
    );

  const archivedAccounts =
    useMemo(
      () =>
        allAccounts.filter(
          (
            account,
          ) =>
            account.isArchived,
        ),
      [
        allAccounts,
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
        normalizeBalance(
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
        ),
      [
        includedNetWorthAccounts,
      ],
    );

  const totalLiabilities =
    useMemo(
      () =>
        normalizeBalance(
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

  const summary =
    useMemo<AccountSummary>(
      () => {
        let connectedAccountCount =
          0;

        let manualAccountCount =
          0;

        for (
          const account of
            allAccounts
        ) {
          if (
            account.connectionStatus ===
            "connected"
          ) {
            connectedAccountCount +=
              1;
          }

          if (
            account.source ===
            "manual"
          ) {
            manualAccountCount +=
              1;
          }
        }

        return {
          totalAssets,
          totalLiabilities,
          netWorth,

          activeAccountCount:
            accounts.length,

          archivedAccountCount:
            archivedAccounts.length,

          connectedAccountCount,

          manualAccountCount,

          includedInNetWorthCount:
            includedNetWorthAccounts.length,

          totalCount:
            allAccounts.length,
        };
      },
      [
        accounts.length,
        allAccounts,
        archivedAccounts.length,
        includedNetWorthAccounts.length,
        netWorth,
        totalAssets,
        totalLiabilities,
      ],
    );

  const isMutating =
    mutationCount >
    0;

  const value =
    useMemo<AccountsContextValue>(
      () => ({
        accounts,
        allAccounts,
        archivedAccounts,
        assetAccounts,
        liabilityAccounts,
        includedNetWorthAccounts,
        totalAssets,
        totalLiabilities,
        netWorth,
        summary,
        isLoading,
        isRefreshing,
        isMutating,
        error,
        refreshAccounts,
        addAccount,
        updateAccount,
        deleteAccount,
        archiveAccount,
        restoreAccount,
        getAccountById,
        updateAccountBalance,
        setAccountNetWorthInclusion,
        clearError,
      }),
      [
        accounts,
        addAccount,
        allAccounts,
        archiveAccount,
        archivedAccounts,
        assetAccounts,
        clearError,
        deleteAccount,
        error,
        getAccountById,
        includedNetWorthAccounts,
        isLoading,
        isMutating,
        isRefreshing,
        liabilityAccounts,
        netWorth,
        refreshAccounts,
        restoreAccount,
        setAccountNetWorthInclusion,
        summary,
        totalAssets,
        totalLiabilities,
        updateAccount,
        updateAccountBalance,
      ],
    );

  return (
    <AccountsContext.Provider
      value={
        value
      }
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

  if (
    !context
  ) {
    throw new Error(
      "useAccounts must be used within an AccountsProvider.",
    );
  }

  return context;
}

function upsertAccount(
  accounts:
    AccountData[],
  account:
    AccountData,
) {
  const existingIndex =
    accounts.findIndex(
      (
        current,
      ) =>
        current.id ===
        account.id,
    );

  if (
    existingIndex ===
    -1
  ) {
    return sortAccounts([
      cloneAccount(
        account,
      ),
      ...accounts,
    ]);
  }

  const nextAccounts =
    accounts.map(
      (
        current,
        index,
      ) =>
        index ===
        existingIndex
          ? cloneAccount(
              account,
            )
          : current,
    );

  return sortAccounts(
    nextAccounts,
  );
}

function sortAccounts(
  accounts:
    AccountData[],
) {
  return [
    ...accounts,
  ].sort(
    (
      left,
      right,
    ) => {
      if (
        left.isArchived !==
        right.isArchived
      ) {
        return left.isArchived
          ? 1
          : -1;
      }

      if (
        left.sortOrder !==
        right.sortOrder
      ) {
        return (
          left.sortOrder -
          right.sortOrder
        );
      }

      return left.name.localeCompare(
        right.name,
        undefined,
        {
          sensitivity:
            "base",
        },
      );
    },
  );
}

function cloneAccount(
  account:
    AccountData,
): AccountData {
  return {
    ...account,
  };
}

function cloneAccounts(
  accounts:
    AccountData[],
) {
  return sortAccounts(
    accounts.map(
      cloneAccount,
    ),
  );
}

function normalizeBalance(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function getUnexpectedErrorMessage(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    error instanceof
      Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}
