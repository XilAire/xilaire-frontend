import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  RefreshCw,
  ReceiptText,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type RecentTransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "refund";

export type RecentTransactionStatus =
  | "cleared"
  | "pending"
  | "failed";

export type RecentTransactionItem = {
  id: string;
  merchant: string;
  amount: number;
  date: Date | string;
  type: RecentTransactionType;
  status?: RecentTransactionStatus;
  category?: string;
  accountName?: string;
  note?: string;
  icon?: ReactNode;
};

export type RecentTransactionsCardProps = {
  transactions: RecentTransactionItem[];
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxTransactions?: number;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(value: Date | string) {
  if (value instanceof Date) {
    return new Date(value);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeDate(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getDaysDifference(
  date: Date,
  currentDate: Date
) {
  const normalizedDate = normalizeDate(date);
  const normalizedCurrentDate =
    normalizeDate(currentDate);

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.round(
    (normalizedCurrentDate.getTime() -
      normalizedDate.getTime()) /
      millisecondsPerDay
  );
}

function formatTransactionDate(
  value: Date | string,
  locale: string,
  currentDate: Date
) {
  const date = parseDateValue(value);

  if (!date) {
    return "Date unavailable";
  }

  const daysDifference = getDaysDifference(
    date,
    currentDate
  );

  if (daysDifference === 0) {
    return "Today";
  }

  if (daysDifference === 1) {
    return "Yesterday";
  }

  if (
    daysDifference > 1 &&
    daysDifference < 7
  ) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

const transactionTypeConfig: Record<
  RecentTransactionType,
  {
    label: string;
    amountMultiplier: number;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    icon: ReactNode;
  }
> = {
  income: {
    label: "Income",
    amountMultiplier: 1,
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    icon: (
      <ArrowDownLeft
        size={17}
        aria-hidden="true"
      />
    ),
  },
  expense: {
    label: "Expense",
    amountMultiplier: -1,
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    icon: (
      <ArrowUpRight
        size={17}
        aria-hidden="true"
      />
    ),
  },
  transfer: {
    label: "Transfer",
    amountMultiplier: 1,
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    icon: (
      <RefreshCw
        size={17}
        aria-hidden="true"
      />
    ),
  },
  refund: {
    label: "Refund",
    amountMultiplier: 1,
    textClass: "text-violet-400",
    backgroundClass: "bg-violet-500/10",
    borderClass: "border-violet-500/20",
    icon: (
      <CircleDollarSign
        size={17}
        aria-hidden="true"
      />
    ),
  },
};

const transactionStatusConfig: Record<
  RecentTransactionStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
  }
> = {
  cleared: {
    label: "Cleared",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  pending: {
    label: "Pending",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
  failed: {
    label: "Failed",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
  },
};

export default function RecentTransactionsCard({
  transactions,
  currency = "USD",
  locale = "en-US",
  title = "Recent Transactions",
  description = "Your latest account activity",
  emptyTitle = "No recent transactions",
  emptyDescription =
    "New transactions will appear here when they are added.",
  maxTransactions = 6,
  icon,
  href,
  className,
}: RecentTransactionsCardProps) {
  const currentDate = new Date();

  const resolvedTransactions = transactions
    .map((transaction) => {
      const parsedDate = parseDateValue(
        transaction.date
      );

      const transactionType =
        transactionTypeConfig[transaction.type];

      const normalizedAmount = Math.abs(
        transaction.amount
      );

      const displayAmount =
        normalizedAmount *
        transactionType.amountMultiplier;

      return {
        ...transaction,
        parsedDate,
        normalizedAmount,
        displayAmount,
        status: transaction.status ?? "cleared",
      };
    })
    .sort((firstTransaction, secondTransaction) => {
      if (
        !firstTransaction.parsedDate &&
        !secondTransaction.parsedDate
      ) {
        return 0;
      }

      if (!firstTransaction.parsedDate) {
        return 1;
      }

      if (!secondTransaction.parsedDate) {
        return -1;
      }

      return (
        secondTransaction.parsedDate.getTime() -
        firstTransaction.parsedDate.getTime()
      );
    })
    .slice(0, Math.max(maxTransactions, 0));

  const totalIncome = resolvedTransactions
    .filter((transaction) => {
      return (
        transaction.type === "income" ||
        transaction.type === "refund"
      );
    })
    .reduce((total, transaction) => {
      return total + transaction.normalizedAmount;
    }, 0);

  const totalExpenses = resolvedTransactions
    .filter((transaction) => {
      return transaction.type === "expense";
    })
    .reduce((total, transaction) => {
      return total + transaction.normalizedAmount;
    }, 0);

  const pendingCount =
    resolvedTransactions.filter((transaction) => {
      return transaction.status === "pending";
    }).length;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sky-400">
            {icon ?? (
              <ReceiptText
                size={21}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-200">
              {title}
            </h3>

            {description ? (
              <p className="mt-1 truncate text-xs text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {pendingCount > 0 ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
            {pendingCount} pending
          </span>
        ) : null}
      </div>

      {resolvedTransactions.length > 0 ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <ArrowDownLeft
                  size={15}
                  aria-hidden="true"
                />

                <span className="text-xs font-medium">
                  Money in
                </span>
              </div>

              <MoneyDisplay
                amount={totalIncome}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-slate-200"
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center gap-2 text-rose-400">
                <ArrowUpRight
                  size={15}
                  aria-hidden="true"
                />

                <span className="text-xs font-medium">
                  Money out
                </span>
              </div>

              <MoneyDisplay
                amount={totalExpenses}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-slate-200"
              />
            </div>
          </div>

          <div className="mt-5 divide-y divide-white/10">
            {resolvedTransactions.map(
              (transaction) => {
                const typeConfig =
                  transactionTypeConfig[
                    transaction.type
                  ];

                const statusConfig =
                  transactionStatusConfig[
                    transaction.status
                  ];

                const dateLabel =
                  formatTransactionDate(
                    transaction.date,
                    locale,
                    currentDate
                  );

                return (
                  <div
                    key={transaction.id}
                    className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={joinClassNames(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                          typeConfig.textClass,
                          typeConfig.backgroundClass,
                          typeConfig.borderClass
                        )}
                      >
                        {transaction.icon ??
                          typeConfig.icon}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {transaction.merchant}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {[
                            transaction.category,
                            transaction.accountName,
                          ]
                            .filter(Boolean)
                            .join(" • ") ||
                            typeConfig.label}
                        </p>

                        {transaction.note ? (
                          <p className="mt-1 truncate text-xs text-slate-600">
                            {transaction.note}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <MoneyDisplay
                        amount={
                          transaction.displayAmount
                        }
                        currency={currency}
                        locale={locale}
                        showColor={false}
                        showSign
                        size="sm"
                        className={joinClassNames(
                          transaction.type ===
                            "expense"
                            ? "text-rose-400"
                            : transaction.type ===
                                "income" ||
                              transaction.type ===
                                "refund"
                              ? "text-emerald-400"
                              : "text-sky-400"
                        )}
                      />

                      <p className="mt-1 text-xs text-slate-500">
                        {dateLabel}
                      </p>

                      {transaction.status !==
                      "cleared" ? (
                        <span
                          className={joinClassNames(
                            "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            statusConfig.textClass,
                            statusConfig.backgroundClass,
                            statusConfig.borderClass
                          )}
                        >
                          {statusConfig.label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
            <CreditCard
              size={21}
              aria-hidden="true"
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-300">
            {emptyTitle}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {emptyDescription}
          </p>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          className
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <article
      className={joinClassNames(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}