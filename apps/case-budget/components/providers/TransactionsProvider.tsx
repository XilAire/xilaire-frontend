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
  createTransaction as createTransactionAction,
  type CreateCaseBudgetTransactionResult,
} from "@/actions/transactions/create-transaction";

import {
  deleteTransaction as deleteTransactionAction,
  type DeleteCaseBudgetTransactionResult,
} from "@/actions/transactions/delete-transaction";

import {
  getTransactions,
  type CaseBudgetTransactionRecord,
} from "@/actions/transactions/get-transactions";

import {
  updateTransaction as updateTransactionAction,
  type UpdateCaseBudgetTransactionResult,
} from "@/actions/transactions/update-transaction";

import {
  useApp,
} from "@/components/providers/AppProvider";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import type {
  CreateTransactionData,
  TransactionData,
  TransactionSummary,
  UpdateTransactionData,
} from "@/types/transaction";

export type TransactionMutationResult =
  | {
      success:
        true;

      status:
        "created" |
        "updated" |
        "deleted";

      approvalRequired:
        false;

      approvalId:
        null;

      message:
        string;
    }
  | {
      success:
        true;

      status:
        "approval-required";

      approvalRequired:
        true;

      approvalId:
        string;

      message:
        string;
    }
  | {
      success:
        false;

      status:
        "error";

      approvalRequired:
        false;

      approvalId:
        null;

      message:
        string;
    };

type TransactionServerMutationResult =
  | CreateCaseBudgetTransactionResult
  | UpdateCaseBudgetTransactionResult
  | DeleteCaseBudgetTransactionResult;

type TransactionsContextValue = {
  transactions:
    TransactionData[];

  summary:
    TransactionSummary;

  isLoading:
    boolean;

  isRefreshing:
    boolean;

  isMutating:
    boolean;

  error:
    string | null;

  lastMutation:
    TransactionMutationResult | null;

  refreshTransactions:
    () => Promise<void>;

  addTransaction:
    (
      transaction:
        TransactionData,
    ) => Promise<TransactionMutationResult>;

  createTransaction:
    (
      input:
        CreateTransactionData,
    ) => Promise<TransactionMutationResult>;

  updateTransaction:
    (
      transaction:
        TransactionData,
    ) => Promise<TransactionMutationResult>;

  updateTransactionData:
    (
      input:
        UpdateTransactionData,
    ) => Promise<TransactionMutationResult>;

  deleteTransaction:
    (
      transactionId:
        string,
    ) => Promise<TransactionMutationResult>;

  getTransactionById:
    (
      transactionId:
        string,
    ) => TransactionData | null;

  clearTransactionError:
    () => void;

  clearLastMutation:
    () => void;
};

export type TransactionsProviderProps = {
  children:
    ReactNode;

  /**
   * Optional server-provided transaction data.
   *
   * This is treated only as initial render state. Supabase remains the
   * canonical source of truth and the provider refreshes from the server
   * whenever the active workspace changes.
   */
  initialTransactions?:
    TransactionData[];
};

const EMPTY_SUMMARY:
  TransactionSummary = {
    totalIncome:
      0,

    totalExpenses:
      0,

    netAmount:
      0,

    clearedIncome:
      0,

    clearedExpenses:
      0,

    netClearedAmount:
      0,

    pendingExpenseAmount:
      0,

    totalTransferAmount:
      0,

    pendingCount:
      0,

    clearedCount:
      0,

    transferCount:
      0,

    uncategorizedCount:
      0,

    totalCount:
      0,
  };

const TransactionsContext =
  createContext<
    TransactionsContextValue | undefined
  >(
    undefined,
  );

export default function TransactionsProvider({
  children,
  initialTransactions = [],
}: TransactionsProviderProps) {
  const {
    activeWorkspace,
  } =
    useApp();

  const {
    refreshBudget,
  } =
    useBudget();

  const activeWorkspaceId =
    activeWorkspace?.id ??
    null;

  const initialState =
    useMemo(
      () =>
        cloneTransactions(
          initialTransactions,
        ),
      [
        initialTransactions,
      ],
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      TransactionData[]
    >(
      initialState,
    );

  const [
    summary,
    setSummary,
  ] =
    useState<
      TransactionSummary
    >(
      () =>
        buildTransactionSummary(
          initialState,
        ),
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false,
    );

  const [
    isMutating,
    setIsMutating,
  ] =
    useState(
      false,
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

  const [
    lastMutation,
    setLastMutation,
  ] =
    useState<
      TransactionMutationResult | null
    >(
      null,
    );

  const transactionsRef =
    useRef<
      TransactionData[]
    >(
      initialState,
    );

  const activeWorkspaceIdRef =
    useRef<
      string | null
    >(
      activeWorkspaceId,
    );

  const loadSequenceRef =
    useRef(
      0,
    );

  const mutationInFlightRef =
    useRef(
      false,
    );

  useEffect(
    () => {
      activeWorkspaceIdRef.current =
        activeWorkspaceId;
    },
    [
      activeWorkspaceId,
    ],
  );

  const replaceTransactions =
    useCallback(
      ({
        nextTransactions,
        nextSummary,
      }: {
        nextTransactions:
          TransactionData[];

        nextSummary:
          TransactionSummary;
      }) => {
        const cloned =
          cloneTransactions(
            nextTransactions,
          );

        transactionsRef.current =
          cloned;

        setTransactions(
          cloned,
        );

        setSummary({
          ...nextSummary,
        });
      },
      [],
    );

  const clearTransactions =
    useCallback(
      () => {
        transactionsRef.current =
          [];

        setTransactions(
          [],
        );

        setSummary({
          ...EMPTY_SUMMARY,
        });
      },
      [],
    );

  const loadTransactions =
    useCallback(
      async ({
        initialLoad,
      }: {
        initialLoad:
          boolean;
      }) => {
        const requestedWorkspaceId =
          activeWorkspaceIdRef.current;

        const sequence =
          ++loadSequenceRef.current;

        if (
          !requestedWorkspaceId
        ) {
          clearTransactions();

          setError(
            null,
          );

          setIsLoading(
            false,
          );

          setIsRefreshing(
            false,
          );

          return;
        }

        if (
          initialLoad
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

        try {
          const result =
            await getTransactions();

          if (
            sequence !==
            loadSequenceRef.current
          ) {
            return;
          }

          if (
            activeWorkspaceIdRef.current !==
            requestedWorkspaceId
          ) {
            return;
          }

          if (
            !result.success
          ) {
            clearTransactions();

            setError(
              result.error.message,
            );

            return;
          }

          const mappedTransactions =
            result.transactions
              .map(
                mapServerTransaction,
              )
              .filter(
                (
                  transaction,
                ): transaction is TransactionData =>
                  transaction !==
                  null,
              );

          replaceTransactions({
            nextTransactions:
              mappedTransactions,

            nextSummary:
              result.summary,
          });
        } catch (
          loadError
        ) {
          console.error(
            "[CASE Budget TransactionsProvider] Failed to load transactions.",
            loadError,
          );

          if (
            sequence ===
              loadSequenceRef.current &&
            activeWorkspaceIdRef.current ===
              requestedWorkspaceId
          ) {
            clearTransactions();

            setError(
              "CASE Budget could not load transactions. Please try again.",
            );
          }
        } finally {
          if (
            sequence ===
            loadSequenceRef.current
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
      [
        clearTransactions,
        replaceTransactions,
      ],
    );

  const refreshTransactions =
    useCallback(
      async () => {
        await loadTransactions({
          initialLoad:
            false,
        });
      },
      [
        loadTransactions,
      ],
    );

  useEffect(
    () => {
      /*
       * Invalidate any outstanding request immediately when the workspace
       * changes so data from the previous workspace can never be committed
       * into the new workspace's client state.
       */
      ++loadSequenceRef.current;

      clearTransactions();

      setError(
        null,
      );

      setLastMutation(
        null,
      );

      if (
        !activeWorkspaceId
      ) {
        setIsLoading(
          false,
        );

        setIsRefreshing(
          false,
        );

        return;
      }

      activeWorkspaceIdRef.current =
        activeWorkspaceId;

      void loadTransactions({
        initialLoad:
          true,
      });
    },
    [
      activeWorkspaceId,
      clearTransactions,
      loadTransactions,
    ],
  );

  const runMutation =
    useCallback(
      async ({
        execute,
        mapResult,
      }: {
        execute:
          () => Promise<
            TransactionServerMutationResult
          >;

        mapResult:
          (
            result:
              TransactionServerMutationResult,
          ) => TransactionMutationResult;
      }): Promise<TransactionMutationResult> => {
        if (
          mutationInFlightRef.current
        ) {
          const busyResult:
            TransactionMutationResult = {
              success:
                false,

              status:
                "error",

              approvalRequired:
                false,

              approvalId:
                null,

              message:
                "Another transaction change is already being processed.",
            };

          setLastMutation(
            busyResult,
          );

          return busyResult;
        }

        mutationInFlightRef.current =
          true;

        setIsMutating(
          true,
        );

        setError(
          null,
        );

        try {
          const actionResult =
            await execute();

          const mutationResult =
            mapResult(
              actionResult,
            );

          setLastMutation(
            mutationResult,
          );

          /*
           * Always reload canonical transaction AND budget state after the
           * server action returns, including failure responses.
           *
           * Transaction actions now recalculate budget activity server-side.
           * The provider must therefore never apply a browser-side spending
           * delta. It simply reloads both canonical projections from Supabase.
           *
           * This also matters for recovery paths: a transaction action may
           * roll back a create/update/delete after a budget-sync failure.
           * Reloading both providers prevents either client snapshot from
           * assuming its pre-mutation state is still authoritative.
           *
           * Approval-required responses are safe here as well. The
           * transaction and budget rows are normally unchanged, while the
           * household approval state may have changed server-side.
           */
          await Promise.all([
            loadTransactions({
              initialLoad:
                false,
            }),

            refreshBudget(),
          ]);

          if (
            !mutationResult.success
          ) {
            setError(
              mutationResult.message,
            );
          }

          return mutationResult;
        } catch (
          mutationError
        ) {
          console.error(
            "[CASE Budget TransactionsProvider] Transaction mutation failed.",
            mutationError,
          );

          const failure:
            TransactionMutationResult = {
              success:
                false,

              status:
                "error",

              approvalRequired:
                false,

              approvalId:
                null,

              message:
                "CASE Budget could not complete the transaction change. Please try again.",
            };

          setError(
            failure.message,
          );

          setLastMutation(
            failure,
          );

          return failure;
        } finally {
          mutationInFlightRef.current =
            false;

          setIsMutating(
            false,
          );
        }
      },
      [
        loadTransactions,
        refreshBudget,
      ],
    );

  const createTransaction =
    useCallback(
      async (
        input:
          CreateTransactionData,
      ) => {
        return runMutation({
          execute:
            () =>
              createTransactionAction(
                input,
              ),

          mapResult:
            mapCreateResult,
        });
      },
      [
        runMutation,
      ],
    );

  const addTransaction =
    useCallback(
      async (
        transaction:
          TransactionData,
      ) => {
        return createTransaction(
          transactionDataToCreateInput(
            transaction,
          ),
        );
      },
      [
        createTransaction,
      ],
    );

  const updateTransactionData =
    useCallback(
      async (
        input:
          UpdateTransactionData,
      ) => {
        return runMutation({
          execute:
            () =>
              updateTransactionAction(
                input,
              ),

          mapResult:
            mapUpdateResult,
        });
      },
      [
        runMutation,
      ],
    );

  const updateTransaction =
    useCallback(
      async (
        transaction:
          TransactionData,
      ) => {
        return updateTransactionData(
          transactionDataToUpdateInput(
            transaction,
          ),
        );
      },
      [
        updateTransactionData,
      ],
    );

  const deleteTransaction =
    useCallback(
      async (
        transactionId:
          string,
      ) => {
        return runMutation({
          execute:
            () =>
              deleteTransactionAction({
                transactionId,
              }),

          mapResult:
            mapDeleteResult,
        });
      },
      [
        runMutation,
      ],
    );

  const getTransactionById =
    useCallback(
      (
        transactionId:
          string,
      ) => {
        return (
          transactionsRef.current.find(
            (
              transaction,
            ) =>
              transaction.id ===
              transactionId,
          ) ??
          null
        );
      },
      [],
    );

  const clearTransactionError =
    useCallback(
      () => {
        setError(
          null,
        );
      },
      [],
    );

  const clearLastMutation =
    useCallback(
      () => {
        setLastMutation(
          null,
        );
      },
      [],
    );

  const value =
    useMemo<
      TransactionsContextValue
    >(
      () => ({
        transactions,

        summary,

        isLoading,

        isRefreshing,

        isMutating,

        error,

        lastMutation,

        refreshTransactions,

        addTransaction,

        createTransaction,

        updateTransaction,

        updateTransactionData,

        deleteTransaction,

        getTransactionById,

        clearTransactionError,

        clearLastMutation,
      }),
      [
        addTransaction,
        clearLastMutation,
        clearTransactionError,
        createTransaction,
        deleteTransaction,
        error,
        getTransactionById,
        isLoading,
        isMutating,
        isRefreshing,
        lastMutation,
        refreshTransactions,
        summary,
        transactions,
        updateTransaction,
        updateTransactionData,
      ],
    );

  return (
    <TransactionsContext.Provider
      value={
        value
      }
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context =
    useContext(
      TransactionsContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useTransactions must be used within a TransactionsProvider.",
    );
  }

  return context;
}

function mapServerTransaction(
  transaction:
    CaseBudgetTransactionRecord,
): TransactionData | null {
  const accountId =
    normalizeOptionalText(
      transaction.account?.id,
    );

  const accountName =
    normalizeOptionalText(
      transaction.account?.name,
    );

  if (
    !accountId ||
    !accountName
  ) {
    console.error(
      "[CASE Budget TransactionsProvider] Transaction is missing its canonical account reference.",
      {
        transactionId:
          transaction.id,
      },
    );

    return null;
  }

  const merchant =
    normalizeOptionalText(
      transaction.merchant,
    ) ??
    getFallbackMerchant(
      transaction.type,
    );

  const note =
    normalizeOptionalText(
      transaction.note,
    );

  const category =
    transaction.category
      ? {
          id:
            transaction.category.id,

          name:
            transaction.category.name,

          groupName:
            transaction.category.groupName,
        }
      : undefined;

  const transferAccountId =
    normalizeOptionalText(
      transaction.transferAccountId,
    );

  return {
    id:
      transaction.id,

    date:
      transaction.date,

    merchant,

    ...(note
      ? {
          note,
        }
      : {}),

    amount:
      transaction.amount,

    type:
      transaction.type,

    status:
      transaction.status,

    account: {
      id:
        accountId,

      name:
        accountName,

      type:
        transaction.account.type,
    },

    ...(category
      ? {
          category,
        }
      : {}),

    ...(transferAccountId
      ? {
          transferAccountId,
        }
      : {}),
  };
}

function transactionDataToCreateInput(
  transaction:
    TransactionData,
): CreateTransactionData {
  return {
    date:
      transaction.date,

    merchant:
      transaction.merchant,

    ...(normalizeOptionalText(
      transaction.note,
    )
      ? {
          note:
            transaction.note,
        }
      : {}),

    amount:
      transaction.amount,

    type:
      transaction.type,

    status:
      transaction.status,

    accountId:
      transaction.account.id,

    ...(transaction.category?.id
      ? {
          categoryId:
            transaction.category.id,
        }
      : {}),

    ...(transaction.transferAccountId
      ? {
          transferAccountId:
            transaction.transferAccountId,
        }
      : {}),
  };
}

function transactionDataToUpdateInput(
  transaction:
    TransactionData,
): UpdateTransactionData {
  return {
    id:
      transaction.id,

    date:
      transaction.date,

    merchant:
      transaction.merchant,

    ...(normalizeOptionalText(
      transaction.note,
    )
      ? {
          note:
            transaction.note,
        }
      : {}),

    amount:
      transaction.amount,

    type:
      transaction.type,

    status:
      transaction.status,

    accountId:
      transaction.account.id,

    ...(transaction.category?.id
      ? {
          categoryId:
            transaction.category.id,
        }
      : {}),

    ...(transaction.transferAccountId
      ? {
          transferAccountId:
            transaction.transferAccountId,
        }
      : {}),
  };
}

function mapCreateResult(
  result:
    TransactionServerMutationResult,
): TransactionMutationResult {
  if (
    !result.success
  ) {
    return {
      success:
        false,

      status:
        "error",

      approvalRequired:
        false,

      approvalId:
        null,

      message:
        result.error.message,
    };
  }

  if (
    result.approvalRequired
  ) {
    return {
      success:
        true,

      status:
        "approval-required",

      approvalRequired:
        true,

      approvalId:
        result.approval.id,

      message:
        "This transaction requires household approval before it can be created.",
    };
  }

  if (
    result.status !==
    "created"
  ) {
    return {
      success:
        false,

      status:
        "error",

      approvalRequired:
        false,

      approvalId:
        null,

      message:
        "CASE Budget received an unexpected transaction-create response.",
    };
  }

  return {
    success:
      true,

    status:
      "created",

    approvalRequired:
      false,

    approvalId:
      null,

    message:
      "Transaction created successfully.",
  };
}

function mapUpdateResult(
  result:
    TransactionServerMutationResult,
): TransactionMutationResult {
  if (
    !result.success
  ) {
    return {
      success:
        false,

      status:
        "error",

      approvalRequired:
        false,

      approvalId:
        null,

      message:
        result.error.message,
    };
  }

  if (
    result.approvalRequired
  ) {
    return {
      success:
        true,

      status:
        "approval-required",

      approvalRequired:
        true,

      approvalId:
        result.approval.id,

      message:
        "This transaction change requires household approval before it can be applied.",
    };
  }

  if (
    result.status !==
    "updated"
  ) {
    return {
      success:
        false,

      status:
        "error",

      approvalRequired:
        false,

      approvalId:
        null,

      message:
        "CASE Budget received an unexpected transaction-update response.",
    };
  }

  return {
    success:
      true,

    status:
      "updated",

    approvalRequired:
      false,

    approvalId:
      null,

    message:
      "Transaction updated successfully.",
  };
}

function mapDeleteResult(
  result:
    TransactionServerMutationResult,
): TransactionMutationResult {
  if (
    !result.success
  ) {
    return {
      success:
        false,

      status:
        "error",

      approvalRequired:
        false,

      approvalId:
        null,

      message:
        result.error.message,
    };
  }

  if (
    result.approvalRequired
  ) {
    return {
      success:
        true,

      status:
        "approval-required",

      approvalRequired:
        true,

      approvalId:
        result.approval.id,

      message:
        "Deleting this transaction requires household approval before it can be applied.",
    };
  }

  if (
    result.status !==
    "deleted"
  ) {
    return {
      success:
        false,

      status:
        "error",

      approvalRequired:
        false,

      approvalId:
        null,

      message:
        "CASE Budget received an unexpected transaction-delete response.",
    };
  }

  return {
    success:
      true,

    status:
      "deleted",

    approvalRequired:
      false,

    approvalId:
      null,

    message:
      "Transaction deleted successfully.",
  };
}

function cloneTransaction(
  transaction:
    TransactionData,
): TransactionData {
  return {
    ...transaction,

    account: {
      ...transaction.account,
    },

    ...(transaction.category
      ? {
          category: {
            ...transaction.category,
          },
        }
      : {
          category:
            undefined,
        }),

    ...(transaction.transferAccountId
      ? {
          transferAccountId:
            transaction.transferAccountId,
        }
      : {
          transferAccountId:
            undefined,
        }),
  };
}

function cloneTransactions(
  transactions:
    TransactionData[],
) {
  return transactions.map(
    cloneTransaction,
  );
}

function buildTransactionSummary(
  transactions:
    TransactionData[],
): TransactionSummary {
  let totalIncome =
    0;

  let totalExpenses =
    0;

  let clearedIncome =
    0;

  let clearedExpenses =
    0;

  let pendingExpenseAmount =
    0;

  let totalTransferAmount =
    0;

  let pendingCount =
    0;

  let clearedCount =
    0;

  let transferCount =
    0;

  let uncategorizedCount =
    0;

  for (
    const transaction of
      transactions
  ) {
    const amount =
      normalizeAmount(
        transaction.amount,
      );

    if (
      transaction.status ===
      "pending"
    ) {
      pendingCount +=
        1;
    }

    if (
      transaction.status ===
      "cleared"
    ) {
      clearedCount +=
        1;
    }

    switch (
      transaction.type
    ) {
      case "income": {
        totalIncome +=
          amount;

        if (
          transaction.status ===
          "cleared"
        ) {
          clearedIncome +=
            amount;
        }

        break;
      }

      case "expense": {
        totalExpenses +=
          amount;

        if (
          transaction.status ===
          "cleared"
        ) {
          clearedExpenses +=
            amount;
        }

        if (
          transaction.status ===
          "pending"
        ) {
          pendingExpenseAmount +=
            amount;
        }

        if (
          !transaction.category?.id
        ) {
          uncategorizedCount +=
            1;
        }

        break;
      }

      case "transfer": {
        totalTransferAmount +=
          amount;

        transferCount +=
          1;

        break;
      }
    }
  }

  return {
    totalIncome:
      roundCurrency(
        totalIncome,
      ),

    totalExpenses:
      roundCurrency(
        totalExpenses,
      ),

    netAmount:
      roundCurrency(
        totalIncome -
        totalExpenses,
      ),

    clearedIncome:
      roundCurrency(
        clearedIncome,
      ),

    clearedExpenses:
      roundCurrency(
        clearedExpenses,
      ),

    netClearedAmount:
      roundCurrency(
        clearedIncome -
        clearedExpenses,
      ),

    pendingExpenseAmount:
      roundCurrency(
        pendingExpenseAmount,
      ),

    totalTransferAmount:
      roundCurrency(
        totalTransferAmount,
      ),

    pendingCount,

    clearedCount,

    transferCount,

    uncategorizedCount,

    totalCount:
      transactions.length,
  };
}

function normalizeAmount(
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

  return Math.abs(
    value,
  );
}

function roundCurrency(
  value:
    number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function normalizeOptionalText(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}

function getFallbackMerchant(
  type:
    TransactionData["type"],
) {
  switch (
    type
  ) {
    case "income":
      return "Income";

    case "transfer":
      return "Transfer";

    case "expense":
    default:
      return "Transaction";
  }
}
