"use client";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";
import {
  useMemo,
} from "react";

import DashboardActivityFeed from "@/components/dashboard/DashboardActivityFeed";
import DashboardAlerts from "@/components/dashboard/DashboardAlerts";
import DashboardBudgetProgress from "@/components/dashboard/DashboardBudgetProgress";
import DashboardCashFlow from "@/components/dashboard/DashboardCashFlow";
import DashboardDebtProgress from "@/components/dashboard/DashboardDebtProgress";
import DashboardFinancialSnapshot from "@/components/dashboard/DashboardFinancialSnapshot";
import DashboardNetWorthSnapshot from "@/components/dashboard/DashboardNetWorthSnapshot";
import DashboardPaycheckPlanner from "@/components/dashboard/DashboardPaycheckPlanner";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import UpcomingBillsWidget from "@/components/dashboard/UpcomingBillsWidget";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useApp,
} from "@/components/providers/AppProvider";
import {
  useBills,
} from "@/components/providers/BillsProvider";
import {
  useBudget,
} from "@/components/providers/BudgetProvider";
import {
  useGoals,
} from "@/components/providers/GoalsProvider";
import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

import type {
  BillData,
} from "@/types/bill";

export type DashboardOverviewProps = {
  bills?: BillData[];
  userName?: string;
  workspaceName?: string;
};

type RecentTransaction = {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  type:
    | "income"
    | "expense";
};

type SavingsGoal = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetDate?: string;
};

export default function DashboardOverview({
  bills: billsOverride,
  userName = "Calix",
  workspaceName,
}: DashboardOverviewProps) {
  const router =
    useRouter();

  const {
    activeWorkspace,
  } = useApp();

  const {
    accounts,
    totalAssets,
    totalLiabilities,
    netWorth,
  } = useAccounts();

  const {
    bills: storedBills,
  } = useBills();

  const {
    selectedMonth,
    monthNavigation,
    totals,
  } = useBudget();

  const {
    transactions,
  } = useTransactions();

  const {
    activeGoals,
  } = useGoals();

  const bills =
    billsOverride ??
    storedBills;

  const resolvedWorkspaceName =
    workspaceName ??
    activeWorkspace?.name ??
    "Personal";

  const greeting =
    useMemo(
      () =>
        getTimeBasedGreeting(),
      [],
    );

  const currentMonthBills =
    useMemo(
      () =>
        bills.filter(
          (
            bill,
          ) =>
            isDateInMonth(
              bill.dueDate,
              selectedMonth,
            ),
        ),
      [
        bills,
        selectedMonth,
      ],
    );

  const upcomingBills =
    useMemo(
      () =>
        currentMonthBills.filter(
          (
            bill,
          ) =>
            bill.status !==
            "paid",
        ),
      [
        currentMonthBills,
      ],
    );

  const currentMonthTransactions =
    useMemo(
      () =>
        transactions.filter(
          (
            transaction,
          ) =>
            isDateInMonth(
              transaction.date,
              selectedMonth,
            ),
        ),
      [
        selectedMonth,
        transactions,
      ],
    );

  const currentMonthClearedTransactions =
    useMemo(
      () =>
        currentMonthTransactions.filter(
          (
            transaction,
          ) =>
            transaction.status ===
            "cleared",
        ),
      [
        currentMonthTransactions,
      ],
    );

  const liveMonthlyExpenses =
    useMemo(
      () =>
        currentMonthClearedTransactions
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
              transaction.amount,
            0,
          ),
      [
        currentMonthClearedTransactions,
      ],
    );

  const pendingExpenseAmount =
    useMemo(
      () =>
        currentMonthTransactions
          .filter(
            (
              transaction,
            ) =>
              transaction.type ===
                "expense" &&
              transaction.status ===
                "pending",
          )
          .reduce(
            (
              total,
              transaction,
            ) =>
              total +
              transaction.amount,
            0,
          ),
      [
        currentMonthTransactions,
      ],
    );

  const liveMonthlyTransfers =
    useMemo(
      () =>
        currentMonthClearedTransactions
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
              transaction.amount,
            0,
          ),
      [
        currentMonthClearedTransactions,
      ],
    );

  const recentTransactions =
    useMemo<RecentTransaction[]>(
      () =>
        transactions
          .filter(
            (
              transaction,
            ) =>
              transaction.type ===
                "income" ||
              transaction.type ===
                "expense",
          )
          .sort(
            (
              firstTransaction,
              secondTransaction,
            ) =>
              secondTransaction.date.localeCompare(
                firstTransaction.date,
              ),
          )
          .slice(
            0,
            5,
          )
          .map(
            (
              transaction,
            ) => ({
              id:
                transaction.id,
              merchant:
                transaction.merchant,
              category:
                transaction.category?.name ??
                "Uncategorized",
              date:
                transaction.date,
              amount:
                transaction.amount,
              type:
                transaction.type ===
                "income"
                  ? "income"
                  : "expense",
            }),
          ),
      [
        transactions,
      ],
    );

  const savingsGoals =
    useMemo<SavingsGoal[]>(
      () =>
        activeGoals
          .slice(
            0,
            3,
          )
          .map(
            (
              goal,
            ) => ({
              id:
                goal.id,
              name:
                goal.name,
              currentAmount:
                goal.currentAmount,
              targetAmount:
                goal.targetAmount,
              targetDate:
                goal.targetDate,
            }),
          ),
      [
        activeGoals,
      ],
    );

  const financialSnapshotData =
    useMemo(
      () => ({
        plannedIncome:
          totals.plannedIncome,
        receivedIncome:
          totals.receivedIncome,
        monthlyAssigned:
          totals.assignedAmount,
        monthlyExpenses:
          liveMonthlyExpenses,
        billsTotal:
          currentMonthBills.reduce(
            (
              total,
              bill,
            ) =>
              total +
              bill.amount,
            0,
          ),
        upcomingBillsTotal:
          upcomingBills.reduce(
            (
              total,
              bill,
            ) =>
              total +
              bill.amount,
            0,
          ),
        upcomingBillsCount:
          upcomingBills.length,
      }),
      [
        currentMonthBills,
        liveMonthlyExpenses,
        totals.assignedAmount,
        totals.plannedIncome,
        totals.receivedIncome,
        upcomingBills,
      ],
    );

  function handleViewBillDetails(
    bill: BillData,
  ) {
    router.push(
      `/dashboard/bills?billId=${encodeURIComponent(
        bill.id,
      )}`,
    );
  }

  function handleViewAllBills() {
    router.push(
      "/dashboard/bills",
    );
  }

  return (
    <div className="space-y-5 pb-8 sm:space-y-6">
      <DashboardWelcome
        greeting={greeting}
        userName={userName}
        workspaceName={
          resolvedWorkspaceName
        }
      />

      <DashboardFinancialSnapshot
        data={
          financialSnapshotData
        }
        monthLabel={
          monthNavigation.monthLabel
        }
      />

      <LiveFinancialPosition
        accountCount={
          accounts.length
        }
        totalAssets={
          totalAssets
        }
        totalLiabilities={
          totalLiabilities
        }
        netWorth={
          netWorth
        }
        pendingExpenseAmount={
          pendingExpenseAmount
        }
        monthlyTransferAmount={
          liveMonthlyTransfers
        }
      />

      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <DashboardAlerts
            maxVisible={4}
            showViewAll={false}
          />
        </div>

        <div className="min-w-0">
          <DashboardQuickActions
            maxVisible={6}
            compact
            showViewAll={false}
          />
        </div>
      </div>

      <UpcomingBillsWidget
        bills={bills}
        maxItems={5}
        onViewDetails={
          handleViewBillDetails
        }
        onViewAll={
          handleViewAllBills
        }
      />

      <DashboardBudgetProgress
        maxVisibleItems={8}
        showGroupSummary
      />

      <DashboardPaycheckPlanner />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <RecentTransactionsCard
          transactions={
            recentTransactions
          }
        />

        <SavingsGoalsCard
          goals={
            savingsGoals
          }
        />
      </div>

      <DashboardDebtProgress
        maxVisible={4}
      />

      <DashboardNetWorthSnapshot />

      <DashboardCashFlow
        showRecentActivity={false}
      />

      <DashboardActivityFeed
        maxVisible={6}
        showViewAll={false}
      />
    </div>
  );
}

type LiveFinancialPositionProps = {
  accountCount: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  pendingExpenseAmount: number;
  monthlyTransferAmount: number;
};

function LiveFinancialPosition({
  accountCount,
  totalAssets,
  totalLiabilities,
  netWorth,
  pendingExpenseAmount,
  monthlyTransferAmount,
}: LiveFinancialPositionProps) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <FinancialPositionMetric
        label="Net worth"
        value={
          formatCurrency(
            netWorth,
          )
        }
        detail={`${accountCount} ${
          accountCount === 1
            ? "account"
            : "accounts"
        }`}
        tone={
          netWorth >= 0
            ? "positive"
            : "negative"
        }
      />

      <FinancialPositionMetric
        label="Total assets"
        value={
          formatCurrency(
            totalAssets,
          )
        }
        detail="Included in net worth"
        tone="positive"
      />

      <FinancialPositionMetric
        label="Total liabilities"
        value={
          formatCurrency(
            totalLiabilities,
          )
        }
        detail="Included in net worth"
        tone={
          totalLiabilities > 0
            ? "warning"
            : "neutral"
        }
      />

      <FinancialPositionMetric
        label="Pending expenses"
        value={
          formatCurrency(
            pendingExpenseAmount,
          )
        }
        detail="Not yet cleared"
        tone={
          pendingExpenseAmount > 0
            ? "warning"
            : "neutral"
        }
      />

      <FinancialPositionMetric
        label="Monthly transfers"
        value={
          formatCurrency(
            monthlyTransferAmount,
          )
        }
        detail="Cleared account transfers"
        tone="neutral"
      />
    </section>
  );
}

type FinancialPositionMetricProps = {
  label: string;
  value: string;
  detail: string;
  tone:
    | "positive"
    | "warning"
    | "negative"
    | "neutral";
};

function FinancialPositionMetric({
  label,
  value,
  detail,
  tone,
}: FinancialPositionMetricProps) {
  const valueClassName =
    tone === "positive"
      ? "text-[var(--success)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "negative"
          ? "text-[var(--danger)]"
          : "text-[var(--text-primary)]";

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-bold tracking-tight",
          valueClassName,
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

type DashboardWelcomeProps = {
  greeting: string;
  userName: string;
  workspaceName: string;
};

function DashboardWelcome({
  greeting,
  userName,
  workspaceName,
}: DashboardWelcomeProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-5 shadow-sm sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--primary)]">
              {workspaceName}
            </p>

            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />

              Active workspace
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {greeting},{" "}
            {userName}
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            Your financial overview,
            priorities, and recent
            activity in one place.
          </p>
        </div>

        <div className="flex shrink-0">
          <Link
            href="/dashboard/transactions?action=add"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:border-[var(--primary)] hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:w-auto"
          >
            <TransactionIcon />

            Add Transaction
          </Link>
        </div>
      </div>
    </section>
  );
}

type RecentTransactionsCardProps = {
  transactions:
    RecentTransaction[];
};

function RecentTransactionsCard({
  transactions,
}: RecentTransactionsCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <DashboardCardHeader
        title="Recent Transactions"
        description="Your latest account activity."
        href="/dashboard/transactions"
        linkLabel="View all"
        icon={
          <TransactionIcon />
        }
      />

      {transactions.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {transactions.map(
            (
              transaction,
            ) => (
              <Link
                key={
                  transaction.id
                }
                href={`/dashboard/transactions?transactionId=${encodeURIComponent(
                  transaction.id,
                )}`}
                className="flex items-center gap-3 px-4 py-4 outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-5"
              >
                <div
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    transaction.type ===
                    "income"
                      ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {transaction.type ===
                  "income" ? (
                    <IncomeIcon />
                  ) : (
                    <ReceiptIcon />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {
                      transaction.merchant
                    }
                  </p>

                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                    {
                      transaction.category
                    }{" "}
                    ·{" "}
                    {formatDate(
                      transaction.date,
                    )}
                  </p>
                </div>

                <p
                  className={[
                    "shrink-0 text-sm font-bold sm:text-base",
                    transaction.type ===
                    "income"
                      ? "text-[var(--success)]"
                      : "text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {transaction.type ===
                  "income"
                    ? "+"
                    : "-"}
                  {formatCurrency(
                    transaction.amount,
                  )}
                </p>
              </Link>
            ),
          )}
        </div>
      ) : (
        <DashboardEmptyState
          title="No recent transactions"
          description="Your latest income and expense activity will appear here."
          href="/dashboard/transactions?action=add"
          actionLabel="Add transaction"
        />
      )}
    </section>
  );
}

type SavingsGoalsCardProps = {
  goals: SavingsGoal[];
};

function SavingsGoalsCard({
  goals,
}: SavingsGoalsCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <DashboardCardHeader
        title="Savings Goals"
        description="Progress toward your financial goals."
        href="/dashboard/goals"
        linkLabel="View goals"
        icon={
          <SavingsIcon />
        }
      />

      {goals.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {goals.map(
            (
              goal,
            ) => {
              const percentage =
                calculatePercentage(
                  goal.currentAmount,
                  goal.targetAmount,
                );

              return (
                <Link
                  key={
                    goal.id
                  }
                  href={`/dashboard/goals?goalId=${encodeURIComponent(
                    goal.id,
                  )}`}
                  className="block px-4 py-4 outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {goal.name}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {formatCurrency(
                          goal.currentAmount,
                        )}{" "}
                        saved
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {percentage.toFixed(
                          0,
                        )}
                        %
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Goal{" "}
                        {formatCurrency(
                          goal.targetAmount,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--success)] transition-[width] duration-500"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  {goal.targetDate ? (
                    <p className="mt-2 text-[10px] font-medium text-[var(--text-muted)]">
                      Target{" "}
                      {formatLongDate(
                        goal.targetDate,
                      )}
                    </p>
                  ) : null}
                </Link>
              );
            },
          )}
        </div>
      ) : (
        <DashboardEmptyState
          title="No savings goals yet"
          description="Create a goal to start tracking progress toward something important."
          href="/dashboard/goals?action=add"
          actionLabel="Create goal"
        />
      )}
    </section>
  );
}

type DashboardCardHeaderProps = {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  icon: React.ReactNode;
};

function DashboardCardHeader({
  title,
  description,
  href,
  linkLabel,
  icon,
}: DashboardCardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-[var(--text-primary)]">
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {linkLabel}

        <ChevronRightIcon />
      </Link>
    </header>
  );
}

type DashboardEmptyStateProps = {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

function DashboardEmptyState({
  title,
  description,
  href,
  actionLabel,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <PlusIcon />
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>

      <Link
        href={href}
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        {actionLabel}

        <ArrowRightIcon />
      </Link>
    </div>
  );
}

function isDateInMonth(
  value: string,
  month: Date,
) {
  const date =
    createLocalDate(
      value,
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

function getTimeBasedGreeting() {
  const hour =
    new Date().getHours();

  if (
    hour <
    12
  ) {
    return "Good morning";
  }

  if (
    hour <
    17
  ) {
    return "Good afternoon";
  }

  return "Good evening";
}

function calculatePercentage(
  value: number,
  total: number,
  clamp = true,
) {
  if (
    !Number.isFinite(
      value,
    ) ||
    !Number.isFinite(
      total,
    ) ||
    total <= 0
  ) {
    return 0;
  }

  const percentage =
    (value /
      total) *
    100;

  if (
    !clamp
  ) {
    return Math.max(
      0,
      percentage,
    );
  }

  return Math.min(
    100,
    Math.max(
      0,
      percentage,
    ),
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

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );
}

function formatLongDate(
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

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
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

function IncomeIcon() {
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
      <path d="M12 2v20" />
      <path d="m17 7-5-5-5 5" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ReceiptIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
    </svg>
  );
}

function TransactionIcon() {
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

function SavingsIcon() {
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
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
    </svg>
  );
}

function PlusIcon() {
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