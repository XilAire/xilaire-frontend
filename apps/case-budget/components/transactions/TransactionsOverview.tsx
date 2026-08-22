"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import PageContainer from "@/components/layout/PageContainer";
import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";
import AddTransactionModal from "@/components/transactions/AddTransactionModal";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";
import EmptyTransactionsState from "@/components/transactions/EmptyTransactionsState";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionList from "@/components/transactions/TransactionList";
import TransactionSummaryCards from "@/components/transactions/TransactionSummaryCards";
import TransactionsHeader from "@/components/transactions/TransactionsHeader";
import Pagination from "@/components/ui/Pagination";

import usePagination from "@/hooks/usePagination";

import type {
  TransactionData,
  TransactionFilters as TransactionFilterValues,
} from "@/types/transaction";

const defaultFilters: TransactionFilterValues = {
  search: "",
  type: "all",
  status: "all",
  accountId: "all",
  categoryId: "all",
  dateFrom: undefined,
  dateTo: undefined,
};

const DEFAULT_TRANSACTION_PAGE_SIZE =
  10;

const TRANSACTION_PAGE_SIZE_OPTIONS = [
  10,
  25,
  50,
  100,
];

export default function TransactionsOverview() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const initialPage =
    parsePositiveInteger(
      searchParams.get(
        "page",
      ),
      1,
    );

  const initialPageSize =
    normalizeTransactionPageSize(
      parsePositiveInteger(
        searchParams.get(
          "pageSize",
        ),
        DEFAULT_TRANSACTION_PAGE_SIZE,
      ),
    );

  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [
    filters,
    setFilters,
  ] =
    useState<TransactionFilterValues>(
      () => ({
        ...defaultFilters,

        categoryId:
          normalizeSearchParamFilter(
            searchParams.get(
              "categoryId",
            ),
          ),
      }),
    );

  const [
    selectedTransaction,
    setSelectedTransaction,
  ] =
    useState<TransactionData | null>(
      null,
    );

  const [
    isAddTransactionModalOpen,
    setIsAddTransactionModalOpen,
  ] = useState(false);

  const [
    isEditTransactionModalOpen,
    setIsEditTransactionModalOpen,
  ] = useState(false);

  useEffect(() => {
    const categoryId =
      normalizeSearchParamFilter(
        searchParams.get(
          "categoryId",
        ),
      );

    setFilters(
      (
        current,
      ) => {
        if (
          current.categoryId ===
          categoryId
        ) {
          return current;
        }

        return {
          ...current,
          categoryId,
        };
      },
    );
  }, [
    searchParams,
  ]);

  const hasActiveFilters =
    useMemo(
      () =>
        filters.search.trim() !==
          "" ||
        filters.type !==
          "all" ||
        filters.status !==
          "all" ||
        filters.accountId !==
          "all" ||
        filters.categoryId !==
          "all" ||
        Boolean(
          filters.dateFrom,
        ) ||
        Boolean(
          filters.dateTo,
        ),
      [
        filters,
      ],
    );

  const filteredTransactions =
    useMemo(
      () => {
        const normalizedSearch =
          filters.search
            .trim()
            .toLowerCase();

        return transactions.filter(
          (
            transaction,
          ) => {
            if (
              normalizedSearch
            ) {
              const searchableValues =
                [
                  transaction.merchant,
                  transaction.note ??
                    "",
                  transaction.account
                    .name,
                  transaction.account
                    .type,
                  transaction.category
                    ?.name ??
                    "",
                  transaction.category
                    ?.groupName ??
                    "",
                  transaction.amount.toString(),
                  transaction.type,
                  transaction.status,
                ]
                  .join(
                    " ",
                  )
                  .toLowerCase();

              if (
                !searchableValues.includes(
                  normalizedSearch,
                )
              ) {
                return false;
              }
            }

            if (
              filters.type !==
                "all" &&
              transaction.type !==
                filters.type
            ) {
              return false;
            }

            if (
              filters.status !==
                "all" &&
              transaction.status !==
                filters.status
            ) {
              return false;
            }

            if (
              filters.accountId !==
                "all" &&
              transaction.account.id !==
                filters.accountId
            ) {
              return false;
            }

            if (
              filters.categoryId !==
                "all" &&
              transaction.category
                ?.id !==
                filters.categoryId
            ) {
              return false;
            }

            if (
              filters.dateFrom &&
              transaction.date <
                filters.dateFrom
            ) {
              return false;
            }

            if (
              filters.dateTo &&
              transaction.date >
                filters.dateTo
            ) {
              return false;
            }

            return true;
          },
        );
      },
      [
        filters,
        transactions,
      ],
    );

  const {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems:
      paginatedTransactions,
    setCurrentPage,
    setPageSize,
  } = usePagination({
    items:
      filteredTransactions,
    initialPage,
    initialPageSize,
    resetDependencies: [
      filters.search,
      filters.type,
      filters.status,
      filters.accountId,
      filters.categoryId,
      filters.dateFrom,
      filters.dateTo,
    ],
    onPageChange: (
      page,
    ) => {
      updateTransactionPaginationSearchParams({
        router,
        searchParams,
        page,
      });
    },
    onPageSizeChange: (
      nextPageSize,
    ) => {
      updateTransactionPaginationSearchParams({
        router,
        searchParams,
        page:
          1,
        pageSize:
          nextPageSize,
      });
    },
  });

  const summary =
    useMemo(
      () => {
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalTransferAmount =
          0;

        let clearedIncome = 0;
        let clearedExpenses = 0;

        let pendingExpenseAmount =
          0;

        let pendingCount = 0;
        let clearedCount = 0;
        let transferCount = 0;
        let uncategorizedCount =
          0;

        for (
          const transaction of filteredTransactions
        ) {
          const amount =
            normalizeAmount(
              transaction.amount,
            );

          if (
            transaction.type ===
            "income"
          ) {
            totalIncome +=
              amount;

            if (
              transaction.status ===
              "cleared"
            ) {
              clearedIncome +=
                amount;
            }
          }

          if (
            transaction.type ===
            "expense"
          ) {
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
              !transaction.category
            ) {
              uncategorizedCount +=
                1;
            }
          }

          if (
            transaction.type ===
            "transfer"
          ) {
            totalTransferAmount +=
              amount;

            transferCount +=
              1;
          }

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
        }

        return {
          totalIncome:
            normalizeCurrency(
              totalIncome,
            ),

          totalExpenses:
            normalizeCurrency(
              totalExpenses,
            ),

          netAmount:
            normalizeCurrency(
              totalIncome -
                totalExpenses,
            ),

          clearedIncome:
            normalizeCurrency(
              clearedIncome,
            ),

          clearedExpenses:
            normalizeCurrency(
              clearedExpenses,
            ),

          netClearedAmount:
            normalizeCurrency(
              clearedIncome -
                clearedExpenses,
            ),

          pendingExpenseAmount:
            normalizeCurrency(
              pendingExpenseAmount,
            ),

          totalTransferAmount:
            normalizeCurrency(
              totalTransferAmount,
            ),

          pendingCount,
          clearedCount,
          transferCount,
          uncategorizedCount,

          totalCount:
            filteredTransactions.length,
        };
      },
      [
        filteredTransactions,
      ],
    );

  function handleOpenAddTransaction() {
    setSelectedTransaction(
      null,
    );

    setIsEditTransactionModalOpen(
      false,
    );

    setIsAddTransactionModalOpen(
      true,
    );
  }

  function handleCloseAddTransaction() {
    setIsAddTransactionModalOpen(
      false,
    );
  }

  function handleOpenEditTransaction(
    transaction: TransactionData,
  ) {
    setIsAddTransactionModalOpen(
      false,
    );

    setSelectedTransaction(
      transaction,
    );

    setIsEditTransactionModalOpen(
      true,
    );
  }

  function handleCloseEditTransaction() {
    setIsEditTransactionModalOpen(
      false,
    );

    setSelectedTransaction(
      null,
    );
  }

  function handleAddTransaction(
    transaction: TransactionData,
  ) {
    addTransaction(
      transaction,
    );

    handleCloseAddTransaction();
  }

  function handleUpdateTransaction(
    updatedTransaction: TransactionData,
  ) {
    updateTransaction(
      updatedTransaction,
    );

    handleCloseEditTransaction();
  }

  function handleDeleteTransaction(
    transactionId: string,
  ) {
    deleteTransaction(
      transactionId,
    );

    handleCloseEditTransaction();
  }

  return (
    <>
      <PageContainer>
        <div className="space-y-5 py-4 sm:space-y-6 sm:py-5 lg:py-6">
          <TransactionsHeader
            onAddTransaction={
              handleOpenAddTransaction
            }
          />

          <TransactionSummaryCards
            summary={
              summary
            }
          />

          <TransactionFilters
            filters={
              filters
            }
            onChange={
              setFilters
            }
          />

          {filteredTransactions.length >
          0 ? (
            <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
              <TransactionList
                transactions={
                  paginatedTransactions
                }
                onEdit={
                  handleOpenEditTransaction
                }
              />

              <Pagination
                currentPage={
                  currentPage
                }
                totalItems={
                  totalItems
                }
                pageSize={
                  pageSize
                }
                itemLabel="transactions"
                showFirstLast
                showPageSizeSelector
                pageSizeOptions={
                  TRANSACTION_PAGE_SIZE_OPTIONS
                }
                onPageChange={
                  setCurrentPage
                }
                onPageSizeChange={
                  setPageSize
                }
              />
            </section>
          ) : (
            <EmptyTransactionsState
              onAddTransaction={
                handleOpenAddTransaction
              }
            />
          )}

          {hasActiveFilters &&
          transactions.length >
            0 &&
          filteredTransactions.length ===
            0 ? (
            <button
              type="button"
              onClick={() => {
                setFilters(
                  defaultFilters,
                );

                const params =
                  new URLSearchParams(
                    searchParams.toString(),
                  );

                params.delete(
                  "categoryId",
                );

                const queryString =
                  params.toString();

                router.replace(
                  queryString
                    ? `/dashboard/transactions?${queryString}`
                    : "/dashboard/transactions",
                  {
                    scroll:
                      false,
                  },
                );
              }}
              className="mx-auto flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Clear transaction
              filters
            </button>
          ) : null}
        </div>
      </PageContainer>

      <AddTransactionModal
        isOpen={
          isAddTransactionModalOpen
        }
        onClose={
          handleCloseAddTransaction
        }
        onAddTransaction={
          handleAddTransaction
        }
      />

      <EditTransactionModal
        isOpen={
          isEditTransactionModalOpen
        }
        transaction={
          selectedTransaction
        }
        onClose={
          handleCloseEditTransaction
        }
        onUpdateTransaction={
          handleUpdateTransaction
        }
        onDeleteTransaction={
          handleDeleteTransaction
        }
      />
    </>
  );
}

function normalizeSearchParamFilter(
  value:
    string | null,
) {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : "all";
}

function normalizeAmount(
  value: number,
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

function normalizeCurrency(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value *
        100,
    ) /
    100
  );
}

function parsePositiveInteger(
  value:
    string | null,
  fallback:
    number,
) {
  if (
    !value
  ) {
    return fallback;
  }

  const parsedValue =
    Number(
      value,
    );

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue <
      1
  ) {
    return fallback;
  }

  return parsedValue;
}

function normalizeTransactionPageSize(
  value:
    number,
) {
  return TRANSACTION_PAGE_SIZE_OPTIONS.includes(
    value,
  )
    ? value
    : DEFAULT_TRANSACTION_PAGE_SIZE;
}

function updateTransactionPaginationSearchParams({
  router,
  searchParams,
  page,
  pageSize,
}: {
  router:
    ReturnType<
      typeof useRouter
    >;

  searchParams:
    ReturnType<
      typeof useSearchParams
    >;

  page:
    number;

  pageSize?:
    number;
}) {
  const params =
    new URLSearchParams(
      searchParams.toString(),
    );

  if (
    page <=
    1
  ) {
    params.delete(
      "page",
    );
  } else {
    params.set(
      "page",
      String(
        page,
      ),
    );
  }

  if (
    pageSize !==
    undefined
  ) {
    if (
      pageSize ===
      DEFAULT_TRANSACTION_PAGE_SIZE
    ) {
      params.delete(
        "pageSize",
      );
    } else {
      params.set(
        "pageSize",
        String(
          pageSize,
        ),
      );
    }
  }

  const queryString =
    params.toString();

  router.replace(
    queryString
      ? `/dashboard/transactions?${queryString}`
      : "/dashboard/transactions",
    {
      scroll:
        false,
    },
  );
}

