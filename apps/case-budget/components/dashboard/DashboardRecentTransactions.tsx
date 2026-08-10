"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

export type DashboardTransactionType =
  | "income"
  | "expense"
  | "transfer";

export type DashboardTransactionStatus =
  | "cleared"
  | "pending"
  | "uncategorized";

export type DashboardTransactionAccount = {
  id: string;
  name: string;
};

export type DashboardRecentTransaction = {
  id: string;
  merchant: string;
  description?: string;
  category?: string;
  categoryId?: string;
  date: string;
  amount: number;
  type: DashboardTransactionType;
  status?: DashboardTransactionStatus;
  account?: DashboardTransactionAccount;
  note?: string;
};

export type DashboardRecentTransactionsProps = {
  transactions?: DashboardRecentTransaction[];
  title?: string;
  description?: string;
  maxVisible?: number;
  showHeader?: boolean;
  showFilters?: boolean;
  showSummary?: boolean;
  showViewAll?: boolean;
  transactionsHref?: string;
  addTransactionHref?: string;
};

type TransactionFilter =
  | "all"
  | DashboardTransactionType
  | "uncategorized";

type TransactionSummary = {
  income: number;
  expenses: number;
  transfers: number;
  netAmount: number;
  uncategorizedCount: number;
};

const defaultTransactions:
  DashboardRecentTransaction[] = [
    {
      id: "publix-aug-02",
      merchant: "Publix",
      description:
        "Weekly household groceries",
      category: "Groceries",
      categoryId: "groceries",
      date: "2026-08-02",
      amount: 142.36,
      type: "expense",
      status: "cleared",
      account: {
        id: "primary-checking",
        name: "Primary Checking",
      },
    },
    {
      id: "county-payroll-aug-01",
      merchant:
        "Palm Beach County Payroll",
      description:
        "Primary employment income",
      category: "Paychecks",
      categoryId: "paychecks",
      date: "2026-08-01",
      amount: 3284.16,
      type: "income",
      status: "cleared",
      account: {
        id: "primary-checking",
        name: "Primary Checking",
      },
    },
    {
      id: "fpl-aug-01",
      merchant:
        "Florida Power & Light",
      description:
        "Monthly electricity bill",
      category: "Electricity",
      categoryId: "electricity",
      date: "2026-08-01",
      amount: 182.55,
      type: "expense",
      status: "cleared",
      account: {
        id: "primary-checking",
        name: "Primary Checking",
      },
    },
    {
      id: "savings-transfer-aug-01",
      merchant:
        "Emergency Savings Transfer",
      description:
        "Monthly emergency-fund contribution",
      category: "Emergency Fund",
      categoryId: "emergency-fund",
      date: "2026-08-01",
      amount: 500,
      type: "transfer",
      status: "cleared",
      account: {
        id: "emergency-savings",
        name: "Emergency Savings",
      },
    },
    {
      id: "costco-jul-31",
      merchant: "Costco",
      description:
        "Household supplies",
      category: "Household",
      categoryId: "household",
      date: "2026-07-31",
      amount: 218.34,
      type: "expense",
      status: "cleared",
      account: {
        id: "primary-checking",
        name: "Primary Checking",
      },
    },
    {
      id: "shell-jul-30",
      merchant: "Shell",
      description:
        "Fuel purchase",
      category: "Gas",
      categoryId: "gas",
      date: "2026-07-30",
      amount: 54.19,
      type: "expense",
      status: "pending",
      account: {
        id: "primary-checking",
        name: "Primary Checking",
      },
    },
    {
      id: "amazon-jul-30",
      merchant: "Amazon",
      description:
        "Online purchase",
      date: "2026-07-30",
      amount: 76.48,
      type: "expense",
      status: "uncategorized",
      account: {
        id: "primary-checking",
        name: "Primary Checking",
      },
    },
  ];

const transactionFilters: {
  value: TransactionFilter;
  label: string;
}[] = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "income",
    label: "Income",
  },
  {
    value: "expense",
    label: "Expenses",
  },
  {
    value: "transfer",
    label: "Transfers",
  },
  {
    value: "uncategorized",
    label: "Needs review",
  },
];

export default function DashboardRecentTransactions({
  transactions = defaultTransactions,
  title = "Recent Transactions",
  description =
    "Your latest income, spending, and transfer activity.",
  maxVisible = 6,
  showHeader = true,
  showFilters = true,
  showSummary = true,
  showViewAll = true,
  transactionsHref =
    "/dashboard/transactions",
  addTransactionHref =
    "/dashboard/transactions?action=add",
}: DashboardRecentTransactionsProps) {
  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<TransactionFilter>(
      "all",
    );

  const sortedTransactions =
    useMemo(
      () =>
        [...transactions].sort(
          (
            firstTransaction,
            secondTransaction,
          ) =>
            createDateValue(
              secondTransaction.date,
            ) -
            createDateValue(
              firstTransaction.date,
            ),
        ),
      [
        transactions,
      ],
    );

  const filteredTransactions =
    useMemo(
      () =>
        filterTransactions(
          sortedTransactions,
          selectedFilter,
        ),
      [
        selectedFilter,
        sortedTransactions,
      ],
    );

  const visibleTransactions =
    filteredTransactions.slice(
      0,
      Math.max(
        0,
        maxVisible,
      ),
    );

  const hiddenTransactionCount =
    Math.max(
      0,
      filteredTransactions.length -
        visibleTransactions.length,
    );

  const summary =
    useMemo(
      () =>
        calculateTransactionSummary(
          transactions,
        ),
      [
        transactions,
      ],
    );

  return (
    <section
      aria-labelledby="dashboard-recent-transactions-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <TransactionsHeader
          title={
            title
          }
          description={
            description
          }
          transactionCount={
            transactions.length
          }
          showViewAll={
            showViewAll
          }
          transactionsHref={
            transactionsHref
          }
        />
      ) : null}

      {showSummary &&
      transactions.length >
        0 ? (
        <TransactionSummarySection
          summary={
            summary
          }
        />
      ) : null}

      {showFilters &&
      transactions.length >
        0 ? (
        <TransactionFilters
          transactions={
            transactions
          }
          selectedFilter={
            selectedFilter
          }
          onFilterChange={
            setSelectedFilter
          }
        />
      ) : null}

      {visibleTransactions.length >
      0 ? (
        <>
          <div className="divide-y divide-[var(--border-subtle)]">
            {visibleTransactions.map(
              (
                transaction,
              ) => (
                <TransactionRow
                  key={
                    transaction.id
                  }
                  transaction={
                    transaction
                  }
                  transactionsHref={
                    transactionsHref
                  }
                />
              ),
            )}
          </div>

          {hiddenTransactionCount >
          0 ? (
            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {
                  hiddenTransactionCount
                }{" "}
                additional{" "}
                {hiddenTransactionCount ===
                1
                  ? "transaction"
                  : "transactions"}{" "}
                not shown
              </p>

              <Link
                href={createTransactionsHref(
                  transactionsHref,
                  selectedFilter,
                )}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                View transactions

                <ArrowRightIcon />
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <TransactionsEmptyState
          hasTransactions={
            transactions.length >
            0
          }
          selectedFilter={
            selectedFilter
          }
          addTransactionHref={
            addTransactionHref
          }
          onShowAll={() =>
            setSelectedFilter(
              "all",
            )
          }
        />
      )}
    </section>
  );
}

type TransactionsHeaderProps = {
  title: string;
  description: string;
  transactionCount: number;
  showViewAll: boolean;
  transactionsHref: string;
};

function TransactionsHeader({
  title,
  description,
  transactionCount,
  showViewAll,
  transactionsHref,
}: TransactionsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <TransactionsIcon />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dashboard-recent-transactions-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              {title}
            </h2>

            {transactionCount >
            0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
                {transactionCount}
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      {showViewAll ? (
        <Link
          href={
            transactionsHref
          }
          className="inline-flex min-h-9 items-center gap-1 self-start text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-auto"
        >
          View all

          <ChevronRightIcon />
        </Link>
      ) : null}
    </header>
  );
}

type TransactionSummarySectionProps = {
  summary: TransactionSummary;
};

function TransactionSummarySection({
  summary,
}: TransactionSummarySectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5 lg:grid-cols-4">
      <TransactionSummaryMetric
        label="Income"
        value={formatCurrency(
          summary.income,
        )}
        tone="success"
        icon={
          <IncomeIcon />
        }
      />

      <TransactionSummaryMetric
        label="Expenses"
        value={formatCurrency(
          summary.expenses,
        )}
        tone="danger"
        icon={
          <ExpenseIcon />
        }
      />

      <TransactionSummaryMetric
        label="Net Activity"
        value={formatSignedCurrency(
          summary.netAmount,
        )}
        tone={
          summary.netAmount >=
          0
            ? "success"
            : "danger"
        }
        icon={
          <NetActivityIcon />
        }
      />

      <TransactionSummaryMetric
        label="Needs Review"
        value={String(
          summary.uncategorizedCount,
        )}
        supportingText={
          summary.uncategorizedCount ===
          1
            ? "transaction"
            : "transactions"
        }
        tone={
          summary.uncategorizedCount >
          0
            ? "warning"
            : "neutral"
        }
        icon={
          <ReviewIcon />
        }
      />
    </div>
  );
}

type TransactionSummaryMetricProps = {
  label: string;
  value: string;
  supportingText?: string;
  tone:
    | "success"
    | "warning"
    | "danger"
    | "neutral";
  icon: React.ReactNode;
};

function TransactionSummaryMetric({
  label,
  value,
  supportingText,
  tone,
  icon,
}: TransactionSummaryMetricProps) {
  const toneClasses =
    getSummaryToneClasses(
      tone,
    );

  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          toneClasses.iconBackground,
          toneClasses.iconText,
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </p>

      <div className="mt-1 flex flex-wrap items-baseline gap-1">
        <p className="truncate text-lg font-bold tracking-tight text-[var(--text-primary)]">
          {value}
        </p>

        {supportingText ? (
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {supportingText}
          </span>
        ) : null}
      </div>
    </article>
  );
}

type TransactionFiltersProps = {
  transactions: DashboardRecentTransaction[];
  selectedFilter: TransactionFilter;
  onFilterChange: (
    filter: TransactionFilter,
  ) => void;
};

function TransactionFilters({
  transactions,
  selectedFilter,
  onFilterChange,
}: TransactionFiltersProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
      <div
        role="tablist"
        aria-label="Filter recent transactions"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {transactionFilters.map(
          (
            filter,
          ) => {
            const isSelected =
              filter.value ===
              selectedFilter;

            const count =
              getFilterCount(
                transactions,
                filter.value,
              );

            return (
              <button
                key={
                  filter.value
                }
                type="button"
                role="tab"
                aria-selected={
                  isSelected
                }
                onClick={() =>
                  onFilterChange(
                    filter.value,
                  )
                }
                className={[
                  "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isSelected
                    ? "border-[color-mix(in_srgb,var(--primary)_28%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))] text-[var(--primary)]"
                    : "border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {filter.label}

                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                    isSelected
                      ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]"
                      : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

type TransactionRowProps = {
  transaction: DashboardRecentTransaction;
  transactionsHref: string;
};

function TransactionRow({
  transaction,
  transactionsHref,
}: TransactionRowProps) {
  const transactionHref =
    `${transactionsHref}?transactionId=${encodeURIComponent(
      transaction.id,
    )}`;

  const status =
    transaction.status ??
    "cleared";

  return (
    <Link
      href={
        transactionHref
      }
      className="group flex items-center gap-3 px-4 py-4 outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-5"
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          getTransactionIconClasses(
            transaction.type,
          ),
        ].join(" ")}
      >
        <TransactionTypeIcon
          type={
            transaction.type
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
            {transaction.merchant}
          </p>

          <TransactionStatusBadge
            status={
              status
            }
          />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>
            {transaction.category ??
              "Uncategorized"}
          </span>

          <span
            aria-hidden="true"
          >
            ·
          </span>

          <span>
            {formatDate(
              transaction.date,
            )}
          </span>

          {transaction.account ? (
            <>
              <span
                aria-hidden="true"
              >
                ·
              </span>

              <span className="truncate">
                {
                  transaction
                    .account.name
                }
              </span>
            </>
          ) : null}
        </div>

        {transaction.description ? (
          <p className="mt-1 hidden truncate text-xs text-[var(--text-muted)] sm:block">
            {
              transaction.description
            }
          </p>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={[
            "text-sm font-bold sm:text-base",
            getTransactionAmountClass(
              transaction.type,
            ),
          ].join(" ")}
        >
          {formatTransactionAmount(
            transaction,
          )}
        </p>

        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] opacity-0 transition group-hover:opacity-100">
          View

          <ChevronRightIcon />
        </span>
      </div>
    </Link>
  );
}

type TransactionStatusBadgeProps = {
  status: DashboardTransactionStatus;
};

function TransactionStatusBadge({
  status,
}: TransactionStatusBadgeProps) {
  const config =
    getTransactionStatusConfig(
      status,
    );

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
        config.classes,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

type TransactionsEmptyStateProps = {
  hasTransactions: boolean;
  selectedFilter: TransactionFilter;
  addTransactionHref: string;
  onShowAll: () => void;
};

function TransactionsEmptyState({
  hasTransactions,
  selectedFilter,
  addTransactionHref,
  onShowAll,
}: TransactionsEmptyStateProps) {
  if (
    hasTransactions &&
    selectedFilter !==
      "all"
  ) {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <FilterIcon />
        </div>

        <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
          No matching transactions
        </h3>

        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
          There are no recent
          transactions in the selected
          filter.
        </p>

        <button
          type="button"
          onClick={
            onShowAll
          }
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Show all transactions
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <TransactionsIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        No transactions yet
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Record income, expenses, and
        transfers to begin tracking your
        financial activity.
      </p>

      <Link
        href={
          addTransactionHref
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        Add transaction

        <PlusIcon />
      </Link>
    </div>
  );
}

function filterTransactions(
  transactions: DashboardRecentTransaction[],
  filter: TransactionFilter,
) {
  if (
    filter ===
    "all"
  ) {
    return transactions;
  }

  if (
    filter ===
    "uncategorized"
  ) {
    return transactions.filter(
      (
        transaction,
      ) =>
        transaction.status ===
          "uncategorized" ||
        !transaction.category,
    );
  }

  return transactions.filter(
    (
      transaction,
    ) =>
      transaction.type ===
      filter,
  );
}

function calculateTransactionSummary(
  transactions: DashboardRecentTransaction[],
): TransactionSummary {
  const income =
    transactions
      .filter(
        (
          transaction,
        ) =>
          transaction.type ===
          "income",
      )
      .reduce(
        (
          total,
          transaction,
        ) =>
          total +
          Math.abs(
            transaction.amount,
          ),
        0,
      );

  const expenses =
    transactions
      .filter(
        (
          transaction,
        ) =>
          transaction.type ===
          "expense",
      )
      .reduce(
        (
          total,
          transaction,
        ) =>
          total +
          Math.abs(
            transaction.amount,
          ),
        0,
      );

  const transfers =
    transactions
      .filter(
        (
          transaction,
        ) =>
          transaction.type ===
          "transfer",
      )
      .reduce(
        (
          total,
          transaction,
        ) =>
          total +
          Math.abs(
            transaction.amount,
          ),
        0,
      );

  const uncategorizedCount =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.status ===
          "uncategorized" ||
        !transaction.category,
    ).length;

  return {
    income:
      normalizeCurrency(
        income,
      ),
    expenses:
      normalizeCurrency(
        expenses,
      ),
    transfers:
      normalizeCurrency(
        transfers,
      ),
    netAmount:
      normalizeCurrency(
        income -
          expenses,
      ),
    uncategorizedCount,
  };
}

function getFilterCount(
  transactions: DashboardRecentTransaction[],
  filter: TransactionFilter,
) {
  return filterTransactions(
    transactions,
    filter,
  ).length;
}

function createTransactionsHref(
  baseHref: string,
  filter: TransactionFilter,
) {
  if (
    filter ===
    "all"
  ) {
    return baseHref;
  }

  const separator =
    baseHref.includes(
      "?",
    )
      ? "&"
      : "?";

  return `${baseHref}${separator}filter=${encodeURIComponent(
    filter,
  )}`;
}

function formatTransactionAmount(
  transaction: DashboardRecentTransaction,
) {
  const formattedAmount =
    formatCurrency(
      Math.abs(
        transaction.amount,
      ),
    );

  switch (
    transaction.type
  ) {
    case "income":
      return `+${formattedAmount}`;

    case "expense":
      return `-${formattedAmount}`;

    case "transfer":
    default:
      return formattedAmount;
  }
}

function getTransactionAmountClass(
  type: DashboardTransactionType,
) {
  switch (type) {
    case "income":
      return "text-[var(--success)]";

    case "expense":
      return "text-[var(--text-primary)]";

    case "transfer":
    default:
      return "text-[var(--primary)]";
  }
}

function getTransactionIconClasses(
  type: DashboardTransactionType,
) {
  switch (type) {
    case "income":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "expense":
      return "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]";

    case "transfer":
    default:
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";
  }
}

function getTransactionStatusConfig(
  status: DashboardTransactionStatus,
) {
  switch (status) {
    case "pending":
      return {
        label:
          "Pending",
        classes:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
      };

    case "uncategorized":
      return {
        label:
          "Review",
        classes:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
      };

    case "cleared":
    default:
      return {
        label:
          "Cleared",
        classes:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
      };
  }
}

function getSummaryToneClasses(
  tone: TransactionSummaryMetricProps["tone"],
) {
  switch (tone) {
    case "success":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        iconText:
          "text-[var(--success)]",
      };

    case "warning":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        iconText:
          "text-[var(--warning)]",
      };

    case "danger":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        iconText:
          "text-[var(--danger)]",
      };

    case "neutral":
    default:
      return {
        iconBackground:
          "bg-[var(--surface-muted)]",
        iconText:
          "text-[var(--text-muted)]",
      };
  }
}

function createDateValue(
  value: string,
) {
  const date =
    createLocalDate(
      value,
    );

  return date?.getTime() ??
    0;
}

function createLocalDate(
  value: string,
) {
  const normalizedValue =
    value.slice(
      0,
      10,
    );

  const date =
    new Date(
      `${normalizedValue}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatDate(
  value: string,
) {
  const date =
    createLocalDate(
      value,
    );

  if (
    !date
  ) {
    return value;
  }

  const today =
    new Date();

  const todayStart =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

  const transactionStart =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

  const differenceInDays =
    Math.round(
      (todayStart.getTime() -
        transactionStart.getTime()) /
        86400000,
    );

  if (
    differenceInDays ===
    0
  ) {
    return "Today";
  }

  if (
    differenceInDays ===
    1
  ) {
    return "Yesterday";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !==
        today.getFullYear()
          ? "numeric"
          : undefined,
    },
  );
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatSignedCurrency(
  value: number,
) {
  const formattedValue =
    formatCurrency(
      Math.abs(
        value,
      ),
    );

  if (
    value >
    0.005
  ) {
    return `+${formattedValue}`;
  }

  if (
    value <
    -0.005
  ) {
    return `-${formattedValue}`;
  }

  return formattedValue;
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
      value * 100,
    ) / 100
  );
}

function TransactionTypeIcon({
  type,
}: {
  type: DashboardTransactionType;
}) {
  switch (type) {
    case "income":
      return (
        <IncomeIcon />
      );

    case "expense":
      return (
        <ExpenseIcon />
      );

    case "transfer":
    default:
      return (
        <TransferIcon />
      );
  }
}

function TransactionsIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function IncomeIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13h14" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v18" />
      <path d="m7 16 5 5 5-5" />
      <path d="M5 11h14" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function NetActivityIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-4-4" />
      <path d="M11 8v4" />
      <path d="M11 15h.01" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}