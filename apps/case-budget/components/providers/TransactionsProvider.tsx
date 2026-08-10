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
  useAccounts,
  type AccountData,
} from "@/components/providers/AccountsProvider";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import {
  applyTransactionToAccounts,
  replaceTransactionInAccounts,
  reverseTransactionFromAccounts,
} from "@/lib/accounts/account-balance-utils";

import type {
  TransactionData,
} from "@/types/transaction";

type TransactionsContextValue = {
  transactions: TransactionData[];

  addTransaction: (
    transaction: TransactionData,
  ) => void;

  updateTransaction: (
    transaction: TransactionData,
  ) => void;

  deleteTransaction: (
    transactionId: string,
  ) => void;

  getTransactionById: (
    transactionId: string,
  ) => TransactionData | null;
};

export type TransactionsProviderProps = {
  children: ReactNode;
  initialTransactions?: TransactionData[];
};

type ManagedTransactionEffects = {
  budgetImpactIds: string[];
  accountImpactIds: string[];
};

const TRANSACTIONS_STORAGE_KEY =
  "case-budget:transactions:v2";

const TRANSACTION_EFFECTS_STORAGE_KEY =
  "case-budget:transaction-effects:v2";

const LEGACY_TRANSACTIONS_STORAGE_KEY =
  "case-budget:transactions:v1";

const LEGACY_TRANSACTION_EFFECTS_STORAGE_KEY =
  "case-budget:transaction-effects:v1";

const LEGACY_DEMO_TRANSACTION_IDS =
  new Set([
    "transaction-1",
    "transaction-2",
    "transaction-3",
    "transaction-4",
    "transaction-5",
  ]);

const defaultTransactions:
  TransactionData[] = [];

const TransactionsContext =
  createContext<
    TransactionsContextValue | undefined
  >(undefined);

function cloneTransaction(
  transaction: TransactionData,
): TransactionData {
  return {
    ...transaction,
    account: {
      ...transaction.account,
    },
    category:
      transaction.category
        ? {
            ...transaction.category,
          }
        : undefined,
    transferAccountId:
      transaction.transferAccountId,
  };
}

function cloneTransactions(
  transactions: TransactionData[],
) {
  return transactions.map(
    cloneTransaction,
  );
}

function isClearedExpense(
  transaction: TransactionData,
) {
  return (
    transaction.type ===
      "expense" &&
    transaction.status ===
      "cleared" &&
    Boolean(
      transaction.category?.id,
    ) &&
    Number.isFinite(
      transaction.amount,
    ) &&
    transaction.amount > 0
  );
}

function getTransactionBudgetItemId(
  transaction: TransactionData,
) {
  if (
    !isClearedExpense(
      transaction,
    )
  ) {
    return null;
  }

  return (
    transaction.category?.id ??
    null
  );
}

function getTransactionBudgetImpact(
  transaction: TransactionData,
) {
  if (
    !isClearedExpense(
      transaction,
    )
  ) {
    return 0;
  }

  return transaction.amount;
}

function shouldApplyAccountImpact(
  transaction: TransactionData,
) {
  return (
    transaction.status ===
      "cleared" &&
    Number.isFinite(
      transaction.amount,
    ) &&
    transaction.amount > 0 &&
    Boolean(
      transaction.account.id,
    ) &&
    (
      transaction.type !==
        "transfer" ||
      Boolean(
        transaction.transferAccountId,
      )
    )
  );
}

function loadStoredTransactions():
  | TransactionData[]
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const currentTransactions =
    readStoredTransactions(
      TRANSACTIONS_STORAGE_KEY,
    );

  if (
    currentTransactions
  ) {
    return currentTransactions;
  }

  const legacyTransactions =
    readStoredTransactions(
      LEGACY_TRANSACTIONS_STORAGE_KEY,
    );

  if (
    !legacyTransactions
  ) {
    return null;
  }

  const migratedTransactions =
    legacyTransactions.filter(
      (
        transaction,
      ) =>
        !isLegacyDemoTransaction(
          transaction,
        ),
    );

  try {
    window.localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(
        migratedTransactions,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_TRANSACTIONS_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return migratedTransactions;
}

function readStoredTransactions(
  storageKey: string,
):
  | TransactionData[]
  | null {
  try {
    const raw =
      window.localStorage.getItem(
        storageKey,
      );

    if (!raw) {
      return null;
    }

    const parsed:
      unknown =
      JSON.parse(
        raw,
      );

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    return parsed
      .filter(
        isTransactionData,
      )
      .map(
        cloneTransaction,
      );
  } catch {
    return null;
  }
}

function isTransactionData(
  value: unknown,
): value is TransactionData {
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
    value as Partial<TransactionData>;

  return (
    typeof candidate.id ===
      "string" &&
    typeof candidate.date ===
      "string" &&
    typeof candidate.merchant ===
      "string" &&
    typeof candidate.amount ===
      "number" &&
    Number.isFinite(
      candidate.amount,
    ) &&
    (
      candidate.type ===
        "expense" ||
      candidate.type ===
        "income" ||
      candidate.type ===
        "transfer"
    ) &&
    (
      candidate.status ===
        "pending" ||
      candidate.status ===
        "cleared"
    ) &&
    Boolean(
      candidate.account,
    ) &&
    typeof candidate.account ===
      "object" &&
    !Array.isArray(
      candidate.account,
    ) &&
    typeof candidate.account.id ===
      "string" &&
    typeof candidate.account.name ===
      "string" &&
    typeof candidate.account.type ===
      "string"
  );
}

function isLegacyDemoTransaction(
  transaction: TransactionData,
) {
  if (
    !LEGACY_DEMO_TRANSACTION_IDS.has(
      transaction.id,
    )
  ) {
    return false;
  }

  switch (
    transaction.id
  ) {
    case "transaction-1":
      return (
        transaction.merchant ===
          "Publix" &&
        transaction.date ===
          "2026-07-29" &&
        transaction.amount ===
          152.41 &&
        transaction.type ===
          "expense"
      );

    case "transaction-2":
      return (
        transaction.merchant ===
          "Payroll" &&
        transaction.date ===
          "2026-07-28" &&
        transaction.amount ===
          3200 &&
        transaction.type ===
          "income"
      );

    case "transaction-3":
      return (
        transaction.merchant ===
          "Amazon" &&
        transaction.date ===
          "2026-07-27" &&
        transaction.amount ===
          89.73 &&
        transaction.type ===
          "expense"
      );

    case "transaction-4":
      return (
        transaction.merchant ===
          "FPL" &&
        transaction.date ===
          "2026-07-26" &&
        transaction.amount ===
          184.62 &&
        transaction.type ===
          "expense"
      );

    case "transaction-5":
      return (
        transaction.merchant ===
          "Checking to Savings" &&
        transaction.date ===
          "2026-07-25" &&
        transaction.amount ===
          500 &&
        transaction.type ===
          "transfer"
      );

    default:
      return false;
  }
}

function loadManagedTransactionEffects():
  ManagedTransactionEffects {
  const currentEffects =
    readManagedTransactionEffects(
      TRANSACTION_EFFECTS_STORAGE_KEY,
    );

  if (
    currentEffects
  ) {
    return currentEffects;
  }

  const legacyEffects =
    readManagedTransactionEffects(
      LEGACY_TRANSACTION_EFFECTS_STORAGE_KEY,
    );

  if (
    !legacyEffects
  ) {
    return createEmptyManagedEffects();
  }

  const migratedEffects:
    ManagedTransactionEffects = {
      budgetImpactIds:
        legacyEffects.budgetImpactIds.filter(
          (
            transactionId,
          ) =>
            !LEGACY_DEMO_TRANSACTION_IDS.has(
              transactionId,
            ),
        ),

      accountImpactIds:
        legacyEffects.accountImpactIds.filter(
          (
            transactionId,
          ) =>
            !LEGACY_DEMO_TRANSACTION_IDS.has(
              transactionId,
            ),
        ),
  };

  try {
    window.localStorage.setItem(
      TRANSACTION_EFFECTS_STORAGE_KEY,
      JSON.stringify(
        migratedEffects,
      ),
    );

    window.localStorage.removeItem(
      LEGACY_TRANSACTION_EFFECTS_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable or full.
  }

  return migratedEffects;
}

function readManagedTransactionEffects(
  storageKey: string,
):
  | ManagedTransactionEffects
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        storageKey,
      );

    if (!raw) {
      return null;
    }

    const parsed:
      unknown =
      JSON.parse(
        raw,
      );

    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      Array.isArray(
        parsed,
      )
    ) {
      window.localStorage.removeItem(
        storageKey,
      );

      return null;
    }

    const candidate =
      parsed as Partial<ManagedTransactionEffects>;

    return {
      budgetImpactIds:
        Array.isArray(
          candidate.budgetImpactIds,
        )
          ? candidate.budgetImpactIds.filter(
              (
                value,
              ): value is string =>
                typeof value ===
                "string",
            )
          : [],

      accountImpactIds:
        Array.isArray(
          candidate.accountImpactIds,
        )
          ? candidate.accountImpactIds.filter(
              (
                value,
              ): value is string =>
                typeof value ===
                "string",
            )
          : [],
    };
  } catch {
    return null;
  }
}

function createEmptyManagedEffects():
  ManagedTransactionEffects {
  return {
    budgetImpactIds: [],
    accountImpactIds: [],
  };
}

function haveAccountBalancesChanged(
  previousAccount: AccountData,
  nextAccount: AccountData,
) {
  return (
    previousAccount.balance !==
      nextAccount.balance ||
    previousAccount.availableBalance !==
      nextAccount.availableBalance
  );
}

export default function TransactionsProvider({
  children,
  initialTransactions =
    defaultTransactions,
}: TransactionsProviderProps) {
  const {
    adjustBudgetItemSpentAmount,
  } = useBudget();

  const {
    accounts,
    updateAccountBalance,
  } = useAccounts();

  const initialTransactionState =
    useMemo(
      () =>
        cloneTransactions(
          initialTransactions,
        ),
      [
        initialTransactions,
      ],
    );

  const storedTransactionsRef =
    useRef<
      TransactionData[] | null
    >(null);

  if (
    storedTransactionsRef.current ===
      null
  ) {
    storedTransactionsRef.current =
      loadStoredTransactions();
  }

  const initialManagedEffectsRef =
    useRef<
      ManagedTransactionEffects | null
    >(null);

  if (
    initialManagedEffectsRef.current ===
      null
  ) {
    initialManagedEffectsRef.current =
      loadManagedTransactionEffects();
  }

  const [
    transactions,
    setTransactions,
  ] = useState<TransactionData[]>(
    () =>
      storedTransactionsRef.current ??
      initialTransactionState,
  );

  const transactionsRef =
    useRef<TransactionData[]>(
      storedTransactionsRef.current ??
        initialTransactionState,
    );

  const accountsRef =
    useRef<AccountData[]>(
      accounts,
    );

  const managedBudgetImpactIdsRef =
    useRef<Set<string>>(
      new Set(
        initialManagedEffectsRef.current
          ?.budgetImpactIds ??
          [],
      ),
    );

  const managedAccountImpactIdsRef =
    useRef<Set<string>>(
      new Set(
        initialManagedEffectsRef.current
          ?.accountImpactIds ??
          [],
      ),
    );

  useEffect(
    () => {
      accountsRef.current =
        accounts;
    },
    [
      accounts,
    ],
  );

  useEffect(
    () => {
      try {
        window.localStorage.setItem(
          TRANSACTIONS_STORAGE_KEY,
          JSON.stringify(
            transactions,
          ),
        );
      } catch {
        // Local storage may be unavailable or full.
      }
    },
    [
      transactions,
    ],
  );

  useEffect(
    () => {
      try {
        window.localStorage.removeItem(
          LEGACY_TRANSACTIONS_STORAGE_KEY,
        );

        window.localStorage.removeItem(
          LEGACY_TRANSACTION_EFFECTS_STORAGE_KEY,
        );
      } catch {
        // Local storage may be unavailable.
      }
    },
    [],
  );

  const persistManagedEffects =
    useCallback(
      () => {
        try {
          const effects:
            ManagedTransactionEffects = {
              budgetImpactIds:
                Array.from(
                  managedBudgetImpactIdsRef.current,
                ),
              accountImpactIds:
                Array.from(
                  managedAccountImpactIdsRef.current,
                ),
            };

          window.localStorage.setItem(
            TRANSACTION_EFFECTS_STORAGE_KEY,
            JSON.stringify(
              effects,
            ),
          );
        } catch {
          // Local storage may be unavailable or full.
        }
      },
      [],
    );

  const replaceTransactions =
    useCallback(
      (
        nextTransactions:
          TransactionData[],
      ) => {
        transactionsRef.current =
          nextTransactions;

        setTransactions(
          nextTransactions,
        );
      },
      [],
    );

  const applyBudgetImpact =
    useCallback(
      (
        transaction:
          TransactionData,
        multiplier: 1 | -1,
      ) => {
        const budgetItemId =
          getTransactionBudgetItemId(
            transaction,
          );

        const impact =
          getTransactionBudgetImpact(
            transaction,
          );

        if (
          !budgetItemId ||
          impact === 0
        ) {
          return false;
        }

        adjustBudgetItemSpentAmount(
          budgetItemId,
          impact * multiplier,
        );

        return true;
      },
      [
        adjustBudgetItemSpentAmount,
      ],
    );

  const commitAccountState =
    useCallback(
      (
        nextAccounts:
          AccountData[],
      ) => {
        const previousAccounts =
          accountsRef.current;

        nextAccounts.forEach(
          (
            nextAccount,
          ) => {
            const previousAccount =
              previousAccounts.find(
                (
                  account,
                ) =>
                  account.id ===
                  nextAccount.id,
              );

            if (
              !previousAccount ||
              !haveAccountBalancesChanged(
                previousAccount,
                nextAccount,
              )
            ) {
              return;
            }

            updateAccountBalance(
              nextAccount.id,
              nextAccount.balance,
              nextAccount.availableBalance,
            );
          },
        );

        accountsRef.current =
          nextAccounts;
      },
      [
        updateAccountBalance,
      ],
    );

  const applyAccountImpact =
    useCallback(
      (
        transaction:
          TransactionData,
      ) => {
        if (
          !shouldApplyAccountImpact(
            transaction,
          )
        ) {
          return false;
        }

        const result =
          applyTransactionToAccounts(
            accountsRef.current,
            transaction,
            {
              destinationAccountId:
                transaction.transferAccountId,
              updateAvailableBalance:
                true,
            },
          );

        if (
          result.impact.deltas.length ===
            0
        ) {
          return false;
        }

        commitAccountState(
          result.accounts,
        );

        return true;
      },
      [
        commitAccountState,
      ],
    );

  const reverseAccountImpact =
    useCallback(
      (
        transaction:
          TransactionData,
      ) => {
        if (
          !shouldApplyAccountImpact(
            transaction,
          )
        ) {
          return false;
        }

        const result =
          reverseTransactionFromAccounts(
            accountsRef.current,
            transaction,
            {
              destinationAccountId:
                transaction.transferAccountId,
              updateAvailableBalance:
                true,
            },
          );

        if (
          result.impact.deltas.length ===
            0
        ) {
          return false;
        }

        commitAccountState(
          result.accounts,
        );

        return true;
      },
      [
        commitAccountState,
      ],
    );

  const replaceAccountImpact =
    useCallback(
      (
        previousTransaction:
          TransactionData,
        nextTransaction:
          TransactionData,
      ) => {
        const previousShouldApply =
          shouldApplyAccountImpact(
            previousTransaction,
          );

        const nextShouldApply =
          shouldApplyAccountImpact(
            nextTransaction,
          );

        if (
          previousShouldApply &&
          nextShouldApply
        ) {
          const result =
            replaceTransactionInAccounts(
              accountsRef.current,
              previousTransaction,
              nextTransaction,
              {
                previousDestinationAccountId:
                  previousTransaction.transferAccountId,
                nextDestinationAccountId:
                  nextTransaction.transferAccountId,
                updateAvailableBalance:
                  true,
              },
            );

          if (
            result.impact.deltas.length ===
              0
          ) {
            return false;
          }

          commitAccountState(
            result.accounts,
          );

          return true;
        }

        if (
          previousShouldApply
        ) {
          reverseAccountImpact(
            previousTransaction,
          );
        }

        if (
          nextShouldApply
        ) {
          return applyAccountImpact(
            nextTransaction,
          );
        }

        return false;
      },
      [
        applyAccountImpact,
        commitAccountState,
        reverseAccountImpact,
      ],
    );

  const addTransaction =
    useCallback(
      (
        transaction:
          TransactionData,
      ) => {
        const transactionExists =
          transactionsRef.current.some(
            (
              currentTransaction,
            ) =>
              currentTransaction.id ===
              transaction.id,
          );

        if (
          transactionExists
        ) {
          return;
        }

        const storedTransaction =
          cloneTransaction(
            transaction,
          );

        replaceTransactions([
          storedTransaction,
          ...transactionsRef.current,
        ]);

        const budgetImpactApplied =
          applyBudgetImpact(
            storedTransaction,
            1,
          );

        if (
          budgetImpactApplied
        ) {
          managedBudgetImpactIdsRef.current.add(
            storedTransaction.id,
          );
        }

        const accountImpactApplied =
          applyAccountImpact(
            storedTransaction,
          );

        if (
          accountImpactApplied
        ) {
          managedAccountImpactIdsRef.current.add(
            storedTransaction.id,
          );
        }

        persistManagedEffects();
      },
      [
        applyAccountImpact,
        applyBudgetImpact,
        persistManagedEffects,
        replaceTransactions,
      ],
    );

  const updateTransaction =
    useCallback(
      (
        updatedTransaction:
          TransactionData,
      ) => {
        const previousTransaction =
          transactionsRef.current.find(
            (
              transaction,
            ) =>
              transaction.id ===
              updatedTransaction.id,
          );

        if (
          !previousTransaction
        ) {
          return;
        }

        const storedTransaction =
          cloneTransaction(
            updatedTransaction,
          );

        const nextTransactions =
          transactionsRef.current.map(
            (
              transaction,
            ) =>
              transaction.id ===
              storedTransaction.id
                ? storedTransaction
                : transaction,
          );

        replaceTransactions(
          nextTransactions,
        );

        const previousBudgetImpactWasManaged =
          managedBudgetImpactIdsRef.current.has(
            previousTransaction.id,
          );

        if (
          previousBudgetImpactWasManaged
        ) {
          applyBudgetImpact(
            previousTransaction,
            -1,
          );

          managedBudgetImpactIdsRef.current.delete(
            previousTransaction.id,
          );
        }

        const updatedBudgetImpactApplied =
          applyBudgetImpact(
            storedTransaction,
            1,
          );

        if (
          updatedBudgetImpactApplied
        ) {
          managedBudgetImpactIdsRef.current.add(
            storedTransaction.id,
          );
        }

        const previousAccountImpactWasManaged =
          managedAccountImpactIdsRef.current.has(
            previousTransaction.id,
          );

        if (
          previousAccountImpactWasManaged
        ) {
          const updatedAccountImpactApplied =
            replaceAccountImpact(
              previousTransaction,
              storedTransaction,
            );

          managedAccountImpactIdsRef.current.delete(
            previousTransaction.id,
          );

          if (
            updatedAccountImpactApplied
          ) {
            managedAccountImpactIdsRef.current.add(
              storedTransaction.id,
            );
          }
        } else {
          const updatedAccountImpactApplied =
            applyAccountImpact(
              storedTransaction,
            );

          if (
            updatedAccountImpactApplied
          ) {
            managedAccountImpactIdsRef.current.add(
              storedTransaction.id,
            );
          }
        }

        persistManagedEffects();
      },
      [
        applyAccountImpact,
        applyBudgetImpact,
        persistManagedEffects,
        replaceAccountImpact,
        replaceTransactions,
      ],
    );

  const deleteTransaction =
    useCallback(
      (
        transactionId:
          string,
      ) => {
        const deletedTransaction =
          transactionsRef.current.find(
            (
              transaction,
            ) =>
              transaction.id ===
              transactionId,
          );

        if (
          !deletedTransaction
        ) {
          return;
        }

        const nextTransactions =
          transactionsRef.current.filter(
            (
              transaction,
            ) =>
              transaction.id !==
              transactionId,
          );

        replaceTransactions(
          nextTransactions,
        );

        const deletedBudgetImpactWasManaged =
          managedBudgetImpactIdsRef.current.has(
            transactionId,
          );

        if (
          deletedBudgetImpactWasManaged
        ) {
          applyBudgetImpact(
            deletedTransaction,
            -1,
          );

          managedBudgetImpactIdsRef.current.delete(
            transactionId,
          );
        }

        const deletedAccountImpactWasManaged =
          managedAccountImpactIdsRef.current.has(
            transactionId,
          );

        if (
          deletedAccountImpactWasManaged
        ) {
          reverseAccountImpact(
            deletedTransaction,
          );

          managedAccountImpactIdsRef.current.delete(
            transactionId,
          );
        }

        persistManagedEffects();
      },
      [
        applyBudgetImpact,
        persistManagedEffects,
        replaceTransactions,
        reverseAccountImpact,
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

  const value =
    useMemo<
      TransactionsContextValue
    >(
      () => ({
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionById,
      }),
      [
        addTransaction,
        deleteTransaction,
        getTransactionById,
        transactions,
        updateTransaction,
      ],
    );

  return (
    <TransactionsContext.Provider
      value={value}
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

  if (!context) {
    throw new Error(
      "useTransactions must be used within a TransactionsProvider.",
    );
  }

  return context;
}