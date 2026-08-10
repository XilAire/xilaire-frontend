"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";
import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

import type {
  TransactionData,
} from "@/types/transaction";

export type DashboardCashFlowPeriod =
  | "month"
  | "quarter"
  | "year";

export type DashboardCashFlowCategory =
  | "income"
  | "housing"
  | "transportation"
  | "food"
  | "utilities"
  | "insurance"
  | "debt"
  | "savings"
  | "personal"
  | "entertainment"
  | "other";

export type DashboardCashFlowEntry = {
  id: string;
  label: string;
  date: string;
  amount: number;
  type:
    | "income"
    | "expense";
  category: DashboardCashFlowCategory;
};

export type DashboardCashFlowHistoryPoint = {
  id: string;
  label: string;
  income: number;
  expenses: number;
};

export type DashboardCashFlowProps = {
  entries?: DashboardCashFlowEntry[];
  history?: DashboardCashFlowHistoryPoint[];
  title?: string;
  description?: string;
  initialPeriod?: DashboardCashFlowPeriod;
  showHeader?: boolean;
  showRecentActivity?: boolean;
  maxRecentEntries?: number;
  transactionsHref?: string;
  reportsHref?: string;
};

type CashFlowSummary = {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  expenseRate: number;
  incomeEntryCount: number;
  expenseEntryCount: number;
  pendingExpenseAmount: number;
  pendingExpenseCount: number;
  transferAmount: number;
  transferCount: number;
  largestExpense: DashboardCashFlowEntry | null;
};

type CashFlowCategorySummary = {
  category: DashboardCashFlowCategory;
  label: string;
  amount: number;
  percentage: number;
};

const defaultEntries:
  DashboardCashFlowEntry[] = [
    {
      id: "paycheck-primary",
      label: "Primary Paycheck",
      date: "2026-08-01",
      amount: 4225,
      type: "income",
      category: "income",
    },
    {
      id: "paycheck-secondary",
      label: "Secondary Paycheck",
      date: "2026-08-01",
      amount: 2850,
      type: "income",
      category: "income",
    },
    {
      id: "other-income",
      label: "Other Income",
      date: "2026-08-02",
      amount: 1375,
      type: "income",
      category: "income",
    },
    {
      id: "mortgage",
      label: "Mortgage",
      date: "2026-08-01",
      amount: 2250,
      type: "expense",
      category: "housing",
    },
    {
      id: "groceries",
      label: "Groceries",
      date: "2026-08-02",
      amount: 742.18,
      type: "expense",
      category: "food",
    },
    {
      id: "vehicle-payment",
      label: "Vehicle Payment",
      date: "2026-08-02",
      amount: 684.12,
      type: "expense",
      category: "transportation",
    },
    {
      id: "utilities",
      label: "Utilities",
      date: "2026-08-03",
      amount: 438.26,
      type: "expense",
      category: "utilities",
    },
    {
      id: "insurance",
      label: "Insurance",
      date: "2026-08-03",
      amount: 375.42,
      type: "expense",
      category: "insurance",
    },
    {
      id: "debt-payments",
      label: "Debt Payments",
      date: "2026-08-04",
      amount: 534.35,
      type: "expense",
      category: "debt",
    },
    {
      id: "savings-transfer",
      label: "Savings Transfer",
      date: "2026-08-04",
      amount: 1275,
      type: "expense",
      category: "savings",
    },
    {
      id: "personal-spending",
      label: "Personal Spending",
      date: "2026-08-05",
      amount: 318.09,
      type: "expense",
      category: "personal",
    },
    {
      id: "entertainment",
      label: "Entertainment",
      date: "2026-08-05",
      amount: 245,
      type: "expense",
      category: "entertainment",
    },
  ];

const defaultHistory:
  DashboardCashFlowHistoryPoint[] = [
    {
      id: "march-2026",
      label: "Mar",
      income: 8120,
      expenses: 6240,
    },
    {
      id: "april-2026",
      label: "Apr",
      income: 8450,
      expenses: 6585,
    },
    {
      id: "may-2026",
      label: "May",
      income: 8450,
      expenses: 6910,
    },
    {
      id: "june-2026",
      label: "Jun",
      income: 8725,
      expenses: 6420,
    },
    {
      id: "july-2026",
      label: "Jul",
      income: 8450,
      expenses: 6215,
    },
    {
      id: "august-2026",
      label: "Aug",
      income: 8450,
      expenses: 6862.42,
    },
  ];

export default function DashboardCashFlow({
  entries: entriesOverride,
  history: historyOverride,
  title = "Cash Flow",
  description =
    "Understand how money moves in and out of your household.",
  initialPeriod = "month",
  showHeader = true,
  showRecentActivity = true,
  maxRecentEntries = 5,
  transactionsHref =
    "/dashboard/transactions",
  reportsHref =
    "/dashboard/reports?report=cash-flow",
}: DashboardCashFlowProps) {
  const {
    selectedMonth,
  } = useBudget();

  const {
    transactions,
  } = useTransactions();

  const entries =
    useMemo<
      DashboardCashFlowEntry[]
    >(
      () =>
        entriesOverride ??
        transactions
          .filter(
            (
              transaction,
            ) =>
              transaction.status ===
                "cleared" &&
              transaction.type !==
                "transfer" &&
              isTransactionInMonth(
                transaction,
                selectedMonth,
              ),
          )
          .map(
            mapTransactionToCashFlowEntry,
          ),
      [
        entriesOverride,
        selectedMonth,
        transactions,
      ],
    );

  const pendingTransactions =
    useMemo(
      () =>
        transactions.filter(
          (
            transaction,
          ) =>
            transaction.type ===
              "expense" &&
            transaction.status ===
              "pending" &&
            isTransactionInMonth(
              transaction,
              selectedMonth,
            ),
        ),
      [
        selectedMonth,
        transactions,
      ],
    );

  const transferTransactions =
    useMemo(
      () =>
        transactions.filter(
          (
            transaction,
          ) =>
            transaction.type ===
              "transfer" &&
            transaction.status ===
              "cleared" &&
            isTransactionInMonth(
              transaction,
              selectedMonth,
            ),
        ),
      [
        selectedMonth,
        transactions,
      ],
    );

  const history =
    useMemo<
      DashboardCashFlowHistoryPoint[]
    >(
      () =>
        historyOverride ??
        buildCashFlowHistory(
          transactions,
          selectedMonth,
          12,
        ),
      [
        historyOverride,
        selectedMonth,
        transactions,
      ],
    );

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] =
    useState<DashboardCashFlowPeriod>(
      initialPeriod,
    );

  const summary =
    useMemo(
      () =>
        calculateCashFlowSummary(
          entries,
          pendingTransactions,
          transferTransactions,
        ),
      [
        entries,
        pendingTransactions,
        transferTransactions,
      ],
    );

  const expenseCategories =
    useMemo(
      () =>
        calculateExpenseCategories(
          entries,
          summary.totalExpenses,
        ),
      [
        entries,
        summary.totalExpenses,
      ],
    );

  const recentEntries =
    useMemo(
      () =>
        [...entries]
          .sort(
            (
              firstEntry,
              secondEntry,
            ) =>
              new Date(
                secondEntry.date,
              ).getTime() -
              new Date(
                firstEntry.date,
              ).getTime(),
          )
          .slice(
            0,
            Math.max(
              0,
              maxRecentEntries,
            ),
          ),
      [
        entries,
        maxRecentEntries,
      ],
    );

  return (
    <section
      aria-labelledby="dashboard-cash-flow-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <CashFlowHeader
          title={
            title
          }
          description={
            description
          }
          selectedPeriod={
            selectedPeriod
          }
          onPeriodChange={
            setSelectedPeriod
          }
          reportsHref={
            reportsHref
          }
        />
      ) : null}

      {entries.length >
      0 ? (
        <>
          <CashFlowSummarySection
            summary={
              summary
            }
          />

          <div className="grid gap-5 border-t border-[var(--border-subtle)] p-4 sm:p-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
            <CashFlowHistoryChart
              history={
                history
              }
              selectedPeriod={
                selectedPeriod
              }
            />

            <ExpenseBreakdown
              categories={
                expenseCategories
              }
              totalExpenses={
                summary.totalExpenses
              }
            />
          </div>

          {showRecentActivity ? (
            <RecentCashFlowActivity
              entries={
                recentEntries
              }
              transactionsHref={
                transactionsHref
              }
            />
          ) : null}
        </>
      ) : (
        <CashFlowEmptyState
          transactionsHref={
            transactionsHref
          }
        />
      )}
    </section>
  );
}

type CashFlowHeaderProps = {
  title: string;
  description: string;
  selectedPeriod: DashboardCashFlowPeriod;
  onPeriodChange: (
    period: DashboardCashFlowPeriod,
  ) => void;
  reportsHref: string;
};

function CashFlowHeader({
  title,
  description,
  selectedPeriod,
  onPeriodChange,
  reportsHref,
}: CashFlowHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <CashFlowIcon />
        </div>

        <div className="min-w-0">
          <h2
            id="dashboard-cash-flow-title"
            className="text-base font-bold text-[var(--text-primary)]"
          >
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CashFlowPeriodSelector
          selectedPeriod={
            selectedPeriod
          }
          onPeriodChange={
            onPeriodChange
          }
        />

        <Link
          href={
            reportsHref
          }
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold text-[var(--primary)] outline-none transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Full report

          <ArrowRightIcon />
        </Link>
      </div>
    </header>
  );
}

type CashFlowPeriodSelectorProps = {
  selectedPeriod: DashboardCashFlowPeriod;
  onPeriodChange: (
    period: DashboardCashFlowPeriod,
  ) => void;
};

function CashFlowPeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: CashFlowPeriodSelectorProps) {
  const periods: {
    value: DashboardCashFlowPeriod;
    label: string;
  }[] = [
    {
      value: "month",
      label: "Month",
    },
    {
      value: "quarter",
      label: "Quarter",
    },
    {
      value: "year",
      label: "Year",
    },
  ];

  return (
    <div
      role="group"
      aria-label="Cash flow period"
      className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1"
    >
      {periods.map(
        (
          period,
        ) => {
          const isSelected =
            selectedPeriod ===
            period.value;

          return (
            <button
              key={
                period.value
              }
              type="button"
              aria-pressed={
                isSelected
              }
              onClick={() =>
                onPeriodChange(
                  period.value,
                )
              }
              className={[
                "inline-flex min-h-8 items-center justify-center rounded-lg px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                isSelected
                  ? "bg-[var(--surface-default)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {period.label}
            </button>
          );
        },
      )}
    </div>
  );
}

type CashFlowSummarySectionProps = {
  summary: CashFlowSummary;
};

function CashFlowSummarySection({
  summary,
}: CashFlowSummarySectionProps) {
  return (
    <div className="bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <CashFlowMetric
          label="Total Income"
          value={formatCurrency(
            summary.totalIncome,
          )}
          supportingText={`${summary.incomeEntryCount} ${
            summary.incomeEntryCount ===
            1
              ? "income source"
              : "income entries"
          }`}
          tone="success"
          icon={
            <IncomeIcon />
          }
        />

        <CashFlowMetric
          label="Total Outflow"
          value={formatCurrency(
            summary.totalExpenses,
          )}
          supportingText={`${summary.expenseEntryCount} ${
            summary.expenseEntryCount ===
            1
              ? "expense"
              : "expenses"
          }`}
          tone="danger"
          icon={
            <ExpenseIcon />
          }
        />

        <CashFlowMetric
          label="Net Cash Flow"
          value={formatCurrency(
            summary.netCashFlow,
          )}
          supportingText={
            summary.netCashFlow >=
            0
              ? "Positive cash flow"
              : "Negative cash flow"
          }
          tone={
            summary.netCashFlow >=
            0
              ? "success"
              : "danger"
          }
          icon={
            <BalanceIcon />
          }
        />

        <CashFlowMetric
          label="Savings Rate"
          value={formatPercentage(
            summary.savingsRate,
          )}
          supportingText={`${formatPercentage(
            summary.expenseRate,
          )} spent`}
          tone={
            summary.savingsRate >=
            20
              ? "success"
              : summary.savingsRate >=
                  10
                ? "primary"
                : "warning"
          }
          icon={
            <SavingsIcon />
          }
        />

        <CashFlowMetric
          label="Pending Expenses"
          value={formatCurrency(
            summary.pendingExpenseAmount,
          )}
          supportingText={`${summary.pendingExpenseCount} ${
            summary.pendingExpenseCount ===
            1
              ? "pending expense"
              : "pending expenses"
          }`}
          tone={
            summary.pendingExpenseAmount >
            0
              ? "warning"
              : "primary"
          }
          icon={
            <PendingIcon />
          }
        />

        <CashFlowMetric
          label="Transfers"
          value={formatCurrency(
            summary.transferAmount,
          )}
          supportingText={`${summary.transferCount} ${
            summary.transferCount ===
            1
              ? "cleared transfer"
              : "cleared transfers"
          }`}
          tone="primary"
          icon={
            <TransferIcon />
          }
        />
      </div>

      <CashFlowHealthBanner
        summary={
          summary
        }
      />
    </div>
  );
}

type CashFlowMetricProps = {
  label: string;
  value: string;
  supportingText: string;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger";
  icon: React.ReactNode;
};

function CashFlowMetric({
  label,
  value,
  supportingText,
  tone,
  icon,
}: CashFlowMetricProps) {
  const toneClasses =
    getToneClasses(
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

      <p className="mt-1 truncate text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
        {value}
      </p>

      <p
        className={[
          "mt-1 truncate text-xs font-semibold",
          toneClasses.supportingText,
        ].join(" ")}
      >
        {supportingText}
      </p>
    </article>
  );
}

function CashFlowHealthBanner({
  summary,
}: {
  summary: CashFlowSummary;
}) {
  if (
    summary.totalIncome <=
    0
  ) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-default))] p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
          <WarningIcon />
        </div>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Income information is
            missing
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Add income transactions to
            calculate your monthly cash
            flow and savings rate.
          </p>
        </div>
      </div>
    );
  }

  if (
    summary.netCashFlow <
    0
  ) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-default))] p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <TrendDownIcon />
        </div>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Expenses are exceeding
            income
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Your current outflow is{" "}
            {formatCurrency(
              Math.abs(
                summary.netCashFlow,
              ),
            )}{" "}
            higher than your income.
            Review spending and planned
            expenses.
          </p>
        </div>
      </div>
    );
  }

  if (
    summary.savingsRate >=
    20
  ) {
    return (
      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--success)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface-default))] p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
          <TrendUpIcon />
        </div>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            Your cash flow is healthy
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            You are keeping{" "}
            {formatPercentage(
              summary.savingsRate,
            )}{" "}
            of your income after
            expenses this period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-default))] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <InformationIcon />
      </div>

      <div>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          Your cash flow is positive
        </p>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          You have{" "}
          {formatCurrency(
            summary.netCashFlow,
          )}{" "}
          remaining after recorded
          expenses. Increasing savings
          could strengthen your monthly
          plan.
        </p>
      </div>
    </div>
  );
}

type CashFlowHistoryChartProps = {
  history: DashboardCashFlowHistoryPoint[];
  selectedPeriod: DashboardCashFlowPeriod;
};

function CashFlowHistoryChart({
  history,
  selectedPeriod,
}: CashFlowHistoryChartProps) {
  const filteredHistory =
    useMemo(
      () =>
        filterHistoryForPeriod(
          history,
          selectedPeriod,
        ),
      [
        history,
        selectedPeriod,
      ],
    );

  const maximumValue =
    useMemo(
      () =>
        Math.max(
          1,
          ...filteredHistory.flatMap(
            (
              point,
            ) => [
              point.income,
              point.expenses,
            ],
          ),
        ),
      [
        filteredHistory,
      ],
    );

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Income vs. Expenses
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Compare inflow and outflow
            across recent periods.
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <ChartIcon />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <ChartLegend
          label="Income"
          tone="success"
        />

        <ChartLegend
          label="Expenses"
          tone="danger"
        />
      </div>

      {filteredHistory.length >
      0 ? (
        <div className="mt-6 flex h-56 items-end gap-3 overflow-x-auto pb-1">
          {filteredHistory.map(
            (
              point,
            ) => (
              <CashFlowChartColumn
                key={
                  point.id
                }
                point={
                  point
                }
                maximumValue={
                  maximumValue
                }
              />
            ),
          )}
        </div>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center text-center">
          <ChartIcon />

          <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
            No cash-flow history
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Historical income and
            expense data will appear
            here.
          </p>
        </div>
      )}
    </section>
  );
}

type CashFlowChartColumnProps = {
  point: DashboardCashFlowHistoryPoint;
  maximumValue: number;
};

function CashFlowChartColumn({
  point,
  maximumValue,
}: CashFlowChartColumnProps) {
  const incomeHeight =
    Math.max(
      4,
      Math.min(
        100,
        (point.income /
          maximumValue) *
          100,
      ),
    );

  const expenseHeight =
    Math.max(
      4,
      Math.min(
        100,
        (point.expenses /
          maximumValue) *
          100,
      ),
    );

  return (
    <div className="flex min-w-[58px] flex-1 flex-col items-center justify-end">
      <div className="flex h-44 w-full items-end justify-center gap-1.5">
        <div className="flex h-full w-full items-end rounded-t-md bg-[color-mix(in_srgb,var(--success)_8%,transparent)]">
          <div
            className="w-full rounded-t-md bg-[var(--success)] transition-[height] duration-500"
            style={{
              height: `${incomeHeight}%`,
            }}
            title={`${point.label} income: ${formatCurrency(
              point.income,
            )}`}
          />
        </div>

        <div className="flex h-full w-full items-end rounded-t-md bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]">
          <div
            className="w-full rounded-t-md bg-[var(--danger)] transition-[height] duration-500"
            style={{
              height: `${expenseHeight}%`,
            }}
            title={`${point.label} expenses: ${formatCurrency(
              point.expenses,
            )}`}
          />
        </div>
      </div>

      <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">
        {point.label}
      </p>
    </div>
  );
}

type ChartLegendProps = {
  label: string;
  tone:
    | "success"
    | "danger";
};

function ChartLegend({
  label,
  tone,
}: ChartLegendProps) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
      <span
        className={[
          "h-2.5 w-2.5 rounded-full",
          tone ===
          "success"
            ? "bg-[var(--success)]"
            : "bg-[var(--danger)]",
        ].join(" ")}
      />

      {label}
    </span>
  );
}

type ExpenseBreakdownProps = {
  categories: CashFlowCategorySummary[];
  totalExpenses: number;
};

function ExpenseBreakdown({
  categories,
  totalExpenses,
}: ExpenseBreakdownProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Expense Breakdown
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Where your money went this
            period.
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
          <BreakdownIcon />
        </div>
      </div>

      <p className="mt-5 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
        {formatCurrency(
          totalExpenses,
        )}
      </p>

      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Total recorded outflow
      </p>

      <div className="mt-5 space-y-4">
        {categories
          .slice(
            0,
            6,
          )
          .map(
            (
              category,
            ) => (
              <ExpenseCategoryRow
                key={
                  category.category
                }
                category={
                  category
                }
              />
            ),
          )}
      </div>
    </section>
  );
}

function ExpenseCategoryRow({
  category,
}: {
  category: CashFlowCategorySummary;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-default)] text-[var(--text-muted)]">
            <CashFlowCategoryIcon
              category={
                category.category
              }
            />
          </div>

          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {category.label}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatCurrency(
              category.amount,
            )}
          </p>

          <p className="text-[10px] text-[var(--text-muted)]">
            {formatPercentage(
              category.percentage,
            )}
          </p>
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-default)]">
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-500"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                category.percentage,
              ),
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

type RecentCashFlowActivityProps = {
  entries: DashboardCashFlowEntry[];
  transactionsHref: string;
};

function RecentCashFlowActivity({
  entries,
  transactionsHref,
}: RecentCashFlowActivityProps) {
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Recent Cash-Flow Activity
          </h3>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Latest recorded income and
            expenses.
          </p>
        </div>

        <Link
          href={
            transactionsHref
          }
          className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          View transactions

          <ChevronRightIcon />
        </Link>
      </header>

      <div className="divide-y divide-[var(--border-subtle)]">
        {entries.map(
          (
            entry,
          ) => (
            <RecentCashFlowRow
              key={
                entry.id
              }
              entry={
                entry
              }
              transactionsHref={
                transactionsHref
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

type RecentCashFlowRowProps = {
  entry: DashboardCashFlowEntry;
  transactionsHref: string;
};

function RecentCashFlowRow({
  entry,
  transactionsHref,
}: RecentCashFlowRowProps) {
  const detailHref =
    `${transactionsHref}?transactionId=${encodeURIComponent(
      entry.id,
    )}`;

  return (
    <Link
      href={
        detailHref
      }
      className="flex items-center gap-3 px-4 py-4 outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-5"
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          entry.type ===
          "income"
            ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
            : "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]",
        ].join(" ")}
      >
        {entry.type ===
        "income" ? (
          <IncomeIcon />
        ) : (
          <ExpenseIcon />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--text-primary)]">
          {entry.label}
        </p>

        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {getCategoryLabel(
            entry.category,
          )}{" "}
          ·{" "}
          {formatDate(
            entry.date,
          )}
        </p>
      </div>

      <p
        className={[
          "shrink-0 text-sm font-bold",
          entry.type ===
          "income"
            ? "text-[var(--success)]"
            : "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {entry.type ===
        "income"
          ? "+"
          : "-"}
        {formatCurrency(
          Math.abs(
            entry.amount,
          ),
        )}
      </p>
    </Link>
  );
}

function CashFlowEmptyState({
  transactionsHref,
}: {
  transactionsHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <CashFlowIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        No cash-flow activity yet
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Add income and expense
        transactions to understand how
        money moves through your
        household.
      </p>

      <Link
        href={`${transactionsHref}?action=add`}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        Add transaction

        <PlusIcon />
      </Link>
    </div>
  );
}

function mapTransactionToCashFlowEntry(
  transaction: TransactionData,
): DashboardCashFlowEntry {
  return {
    id:
      transaction.id,
    label:
      transaction.merchant,
    date:
      transaction.date,
    amount:
      Math.abs(
        transaction.amount,
      ),
    type:
      transaction.type ===
      "income"
        ? "income"
        : "expense",
    category:
      mapTransactionCategory(
        transaction,
      ),
  };
}

function mapTransactionCategory(
  transaction: TransactionData,
): DashboardCashFlowCategory {
  if (
    transaction.type ===
    "income"
  ) {
    return "income";
  }

  const categoryText = [
    transaction.category?.id,
    transaction.category?.name,
    transaction.category?.groupName,
  ]
    .filter(
      Boolean,
    )
    .join(
      " ",
    )
    .toLowerCase();

  if (
    categoryText.includes(
      "housing",
    ) ||
    categoryText.includes(
      "mortgage",
    ) ||
    categoryText.includes(
      "rent",
    )
  ) {
    return "housing";
  }

  if (
    categoryText.includes(
      "transport",
    ) ||
    categoryText.includes(
      "vehicle",
    ) ||
    categoryText.includes(
      "auto",
    ) ||
    categoryText.includes(
      "gas",
    )
  ) {
    return "transportation";
  }

  if (
    categoryText.includes(
      "food",
    ) ||
    categoryText.includes(
      "grocery",
    ) ||
    categoryText.includes(
      "restaurant",
    )
  ) {
    return "food";
  }

  if (
    categoryText.includes(
      "utilit",
    ) ||
    categoryText.includes(
      "electric",
    ) ||
    categoryText.includes(
      "water",
    ) ||
    categoryText.includes(
      "internet",
    ) ||
    categoryText.includes(
      "phone",
    )
  ) {
    return "utilities";
  }

  if (
    categoryText.includes(
      "insurance",
    )
  ) {
    return "insurance";
  }

  if (
    categoryText.includes(
      "debt",
    ) ||
    categoryText.includes(
      "loan",
    ) ||
    categoryText.includes(
      "credit card",
    )
  ) {
    return "debt";
  }

  if (
    categoryText.includes(
      "saving",
    ) ||
    categoryText.includes(
      "invest",
    )
  ) {
    return "savings";
  }

  if (
    categoryText.includes(
      "entertain",
    ) ||
    categoryText.includes(
      "stream",
    )
  ) {
    return "entertainment";
  }

  if (
    categoryText.includes(
      "personal",
    ) ||
    categoryText.includes(
      "lifestyle",
    ) ||
    categoryText.includes(
      "shopping",
    )
  ) {
    return "personal";
  }

  return "other";
}

function isTransactionInMonth(
  transaction: TransactionData,
  month: Date,
) {
  const date =
    createLocalDate(
      transaction.date,
    );

  if (!date) {
    return false;
  }

  return (
    date.getFullYear() ===
      month.getFullYear() &&
    date.getMonth() ===
      month.getMonth()
  );
}

function buildCashFlowHistory(
  transactions: TransactionData[],
  selectedMonth: Date,
  monthCount: number,
): DashboardCashFlowHistoryPoint[] {
  const safeMonthCount =
    Math.max(
      1,
      Math.floor(
        monthCount,
      ),
    );

  return Array.from(
    {
      length:
        safeMonthCount,
    },
    (
      _,
      index,
    ) => {
      const month =
        new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth() -
            (
              safeMonthCount -
              1 -
              index
            ),
          1,
        );

      const monthTransactions =
        transactions.filter(
          (
            transaction,
          ) =>
            transaction.status ===
              "cleared" &&
            transaction.type !==
              "transfer" &&
            isTransactionInMonth(
              transaction,
              month,
            ),
        );

      const income =
        monthTransactions
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
        monthTransactions
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

      return {
        id:
          `${month.getFullYear()}-${String(
            month.getMonth() +
              1,
          ).padStart(
            2,
            "0",
          )}`,
        label:
          month.toLocaleDateString(
            "en-US",
            {
              month: "short",
            },
          ),
        income:
          normalizeCurrency(
            income,
          ),
        expenses:
          normalizeCurrency(
            expenses,
          ),
      };
    },
  );
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

function calculateCashFlowSummary(
  entries: DashboardCashFlowEntry[],
  pendingTransactions: TransactionData[],
  transferTransactions: TransactionData[],
): CashFlowSummary {
  const incomeEntries =
    entries.filter(
      (
        entry,
      ) =>
        entry.type ===
        "income",
    );

  const expenseEntries =
    entries.filter(
      (
        entry,
      ) =>
        entry.type ===
        "expense",
    );

  const totalIncome =
    incomeEntries.reduce(
      (
        total,
        entry,
      ) =>
        total +
        Math.abs(
          entry.amount,
        ),
      0,
    );

  const totalExpenses =
    expenseEntries.reduce(
      (
        total,
        entry,
      ) =>
        total +
        Math.abs(
          entry.amount,
        ),
      0,
    );

  const netCashFlow =
    totalIncome -
    totalExpenses;

  const savingsRate =
    totalIncome > 0
      ? (netCashFlow /
          totalIncome) *
        100
      : 0;

  const expenseRate =
    totalIncome > 0
      ? (totalExpenses /
          totalIncome) *
        100
      : 0;

  const largestExpense =
    expenseEntries.reduce<DashboardCashFlowEntry | null>(
      (
        currentLargest,
        entry,
      ) => {
        if (
          !currentLargest ||
          Math.abs(
            entry.amount,
          ) >
            Math.abs(
              currentLargest.amount,
            )
        ) {
          return entry;
        }

        return currentLargest;
      },
      null,
    );

  const pendingExpenseAmount =
    pendingTransactions.reduce(
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

  const transferAmount =
    transferTransactions.reduce(
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

  return {
    totalIncome:
      normalizeCurrency(
        totalIncome,
      ),
    totalExpenses:
      normalizeCurrency(
        totalExpenses,
      ),
    netCashFlow:
      normalizeCurrency(
        netCashFlow,
      ),
    savingsRate:
      normalizePercentage(
        savingsRate,
      ),
    expenseRate:
      normalizePercentage(
        expenseRate,
      ),
    incomeEntryCount:
      incomeEntries.length,
    expenseEntryCount:
      expenseEntries.length,
    pendingExpenseAmount:
      normalizeCurrency(
        pendingExpenseAmount,
      ),
    pendingExpenseCount:
      pendingTransactions.length,
    transferAmount:
      normalizeCurrency(
        transferAmount,
      ),
    transferCount:
      transferTransactions.length,
    largestExpense,
  };
}

function calculateExpenseCategories(
  entries: DashboardCashFlowEntry[],
  totalExpenses: number,
): CashFlowCategorySummary[] {
  const categoryTotals =
    new Map<
      DashboardCashFlowCategory,
      number
    >();

  entries
    .filter(
      (
        entry,
      ) =>
        entry.type ===
        "expense",
    )
    .forEach(
      (
        entry,
      ) => {
        const currentAmount =
          categoryTotals.get(
            entry.category,
          ) ?? 0;

        categoryTotals.set(
          entry.category,
          currentAmount +
            Math.abs(
              entry.amount,
            ),
        );
      },
    );

  return Array.from(
    categoryTotals.entries(),
  )
    .map(
      ([
        category,
        amount,
      ]) => ({
        category,
        label:
          getCategoryLabel(
            category,
          ),
        amount:
          normalizeCurrency(
            amount,
          ),
        percentage:
          totalExpenses > 0
            ? normalizePercentage(
                (amount /
                  totalExpenses) *
                  100,
              )
            : 0,
      }),
    )
    .sort(
      (
        firstCategory,
        secondCategory,
      ) =>
        secondCategory.amount -
        firstCategory.amount,
    );
}

function filterHistoryForPeriod(
  history: DashboardCashFlowHistoryPoint[],
  period: DashboardCashFlowPeriod,
) {
  switch (period) {
    case "month":
      return history.slice(
        -6,
      );

    case "quarter":
      return history.slice(
        -4,
      );

    case "year":
      return history.slice(
        -12,
      );

    default:
      return history;
  }
}

function getCategoryLabel(
  category: DashboardCashFlowCategory,
) {
  switch (category) {
    case "income":
      return "Income";

    case "housing":
      return "Housing";

    case "transportation":
      return "Transportation";

    case "food":
      return "Food";

    case "utilities":
      return "Utilities";

    case "insurance":
      return "Insurance";

    case "debt":
      return "Debt Payments";

    case "savings":
      return "Savings";

    case "personal":
      return "Personal";

    case "entertainment":
      return "Entertainment";

    case "other":
    default:
      return "Other";
  }
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

function formatPercentage(
  value: number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  return `${normalizedValue.toFixed(
    1,
  )}%`;
}

function formatDate(
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
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
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
      value * 100,
    ) / 100
  );
}

function normalizePercentage(
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
      value * 10,
    ) / 10
  );
}

function getToneClasses(
  tone:
    CashFlowMetricProps["tone"],
) {
  switch (tone) {
    case "success":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        iconText:
          "text-[var(--success)]",
        supportingText:
          "text-[var(--success)]",
      };

    case "warning":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        iconText:
          "text-[var(--warning)]",
        supportingText:
          "text-[var(--warning)]",
      };

    case "danger":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        iconText:
          "text-[var(--danger)]",
        supportingText:
          "text-[var(--danger)]",
      };

    case "primary":
    default:
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        iconText:
          "text-[var(--primary)]",
        supportingText:
          "text-[var(--primary)]",
      };
  }
}

function CashFlowCategoryIcon({
  category,
}: {
  category:
    DashboardCashFlowCategory;
}) {
  switch (category) {
    case "housing":
      return (
        <HousingIcon />
      );

    case "transportation":
      return (
        <TransportationIcon />
      );

    case "food":
      return (
        <FoodIcon />
      );

    case "utilities":
      return (
        <UtilitiesIcon />
      );

    case "insurance":
      return (
        <InsuranceIcon />
      );

    case "debt":
      return (
        <DebtIcon />
      );

    case "savings":
      return (
        <SavingsIcon />
      );

    case "personal":
      return (
        <PersonalIcon />
      );

    case "entertainment":
      return (
        <EntertainmentIcon />
      );

    case "income":
      return (
        <IncomeIcon />
      );

    case "other":
    default:
      return (
        <OtherIcon />
      );
  }
}

function CashFlowIcon() {
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
      width="18"
      height="18"
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
      width="18"
      height="18"
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

function BalanceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function SavingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function BreakdownIcon() {
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
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 3v9h9" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </svg>
  );
}

function InformationIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function HousingIcon() {
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
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function TransportationIcon() {
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
      <path d="m5 11 2-5h10l2 5" />
      <rect
        x="3"
        y="11"
        width="18"
        height="7"
        rx="2"
      />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
    </svg>
  );
}

function FoodIcon() {
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
      <path d="M6 3v8" />
      <path d="M9 3v8" />
      <path d="M6 7h3" />
      <path d="M7.5 11v10" />
      <path d="M15 3v18" />
      <path d="M15 3c3 2 3 7 0 9" />
    </svg>
  );
}

function UtilitiesIcon() {
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
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c1 .7 1.5 1.5 1.7 2.3h4.6c.2-.8.7-1.6 1.7-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function InsuranceIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function DebtIcon() {
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
      <path d="M6 3h12v18H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h4" />
      <path d="M9 16h6" />
    </svg>
  );
}

function PersonalIcon() {
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
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function EntertainmentIcon() {
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
      <path d="M8 8h8" />
      <path d="M12 4v4" />
      <rect
        x="3"
        y="8"
        width="18"
        height="12"
        rx="3"
      />
      <path d="M8 12v4" />
      <path d="M6 14h4" />
      <path d="M16 13h.01" />
      <path d="M18 16h.01" />
    </svg>
  );
}

function OtherIcon() {
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
      <circle
        cx="5"
        cy="12"
        r="1"
      />
      <circle
        cx="12"
        cy="12"
        r="1"
      />
      <circle
        cx="19"
        cy="12"
        r="1"
      />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function TransferIcon() {
  return (
    <svg
      width="18"
      height="18"
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