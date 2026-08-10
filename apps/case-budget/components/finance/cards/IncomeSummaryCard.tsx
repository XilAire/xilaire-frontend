import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type IncomeSourceType =
  | "salary"
  | "business"
  | "investment"
  | "benefit"
  | "rental"
  | "other";

export type IncomeSourceStatus =
  | "received"
  | "expected"
  | "late"
  | "paused";

export type IncomeSourceItem = {
  id: string;
  name: string;
  amount: number;
  type?: IncomeSourceType;
  status?: IncomeSourceStatus;
  expectedDate?: Date | string;
  receivedDate?: Date | string;
  accountName?: string;
  isRecurring?: boolean;
  icon?: ReactNode;
};

export type IncomeSummaryCardProps = {
  incomeSources: IncomeSourceItem[];
  expectedIncome?: number;
  previousPeriodIncome?: number;
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxSources?: number;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

type ResolvedIncomeSource = Omit<
  IncomeSourceItem,
  "amount" | "type" | "status" | "expectedDate"
> & {
  amount: number;
  type: IncomeSourceType;
  status: IncomeSourceStatus;
  expectedDate: Date | null;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(
  value?: Date | string | null
) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function normalizeDate(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getDaysUntilDate(
  targetDate: Date,
  currentDate: Date
) {
  const normalizedTargetDate =
    normalizeDate(targetDate);

  const normalizedCurrentDate =
    normalizeDate(currentDate);

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.round(
    (normalizedTargetDate.getTime() -
      normalizedCurrentDate.getTime()) /
      millisecondsPerDay
  );
}

function formatDate(
  value: Date | string | null | undefined,
  locale: string
) {
  const date = parseDateValue(value);

  if (!date) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getIncomeDateLabel(
  incomeSource: {
    status: IncomeSourceStatus;
    expectedDate?: Date | string | null;
    receivedDate?: Date | string | null;
  },
  locale: string,
  currentDate: Date
) {
  if (
    incomeSource.status === "received" &&
    incomeSource.receivedDate
  ) {
    return `Received ${formatDate(
      incomeSource.receivedDate,
      locale
    )}`;
  }

  const expectedDate = parseDateValue(
    incomeSource.expectedDate
  );

  if (!expectedDate) {
    return incomeSource.status === "received"
      ? "Received"
      : "Expected date not set";
  }

  const daysUntilExpected =
    getDaysUntilDate(
      expectedDate,
      currentDate
    );

  if (daysUntilExpected < 0) {
    const overdueDays = Math.abs(
      daysUntilExpected
    );

    return overdueDays === 1
      ? "Expected 1 day ago"
      : `Expected ${overdueDays} days ago`;
  }

  if (daysUntilExpected === 0) {
    return "Expected today";
  }

  if (daysUntilExpected === 1) {
    return "Expected tomorrow";
  }

  if (daysUntilExpected <= 7) {
    return `Expected in ${daysUntilExpected} days`;
  }

  return `Expected ${formatDate(
    expectedDate,
    locale
  )}`;
}

function calculatePercentageChange(
  currentValue: number,
  previousValue?: number
) {
  if (
    typeof previousValue !== "number" ||
    previousValue === 0
  ) {
    return null;
  }

  return (
    ((currentValue - previousValue) /
      Math.abs(previousValue)) *
    100
  );
}

function getIncomeSourceIcon(
  type: IncomeSourceType
) {
  if (type === "salary") {
    return (
      <BriefcaseBusiness
        size={18}
        aria-hidden="true"
      />
    );
  }

  if (type === "business") {
    return (
      <Landmark
        size={18}
        aria-hidden="true"
      />
    );
  }

  if (type === "investment") {
    return (
      <TrendingUp
        size={18}
        aria-hidden="true"
      />
    );
  }

  if (type === "benefit") {
    return (
      <Wallet
        size={18}
        aria-hidden="true"
      />
    );
  }

  if (type === "rental") {
    return (
      <Landmark
        size={18}
        aria-hidden="true"
      />
    );
  }

  return (
    <CircleDollarSign
      size={18}
      aria-hidden="true"
    />
  );
}

function getIncomeSourceTypeLabel(
  type: IncomeSourceType
) {
  if (type === "salary") {
    return "Salary";
  }

  if (type === "business") {
    return "Business";
  }

  if (type === "investment") {
    return "Investment";
  }

  if (type === "benefit") {
    return "Benefit";
  }

  if (type === "rental") {
    return "Rental";
  }

  return "Other";
}

const incomeStatusConfig: Record<
  IncomeSourceStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
  }
> = {
  received: {
    label: "Received",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
  },
  expected: {
    label: "Expected",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
  },
  late: {
    label: "Late",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
  },
  paused: {
    label: "Paused",
    textClass: "text-slate-400",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
  },
};

export default function IncomeSummaryCard({
  incomeSources,
  expectedIncome,
  previousPeriodIncome,
  currency = "USD",
  locale = "en-US",
  title = "Income Summary",
  description =
    "Track received and expected income",
  emptyTitle = "No income added",
  emptyDescription =
    "Add an income source to begin tracking money coming in.",
  maxSources = 6,
  icon,
  href,
  className,
}: IncomeSummaryCardProps) {
  const currentDate = new Date();

  const resolvedIncomeSources: ResolvedIncomeSource[] =
    incomeSources
      .map((incomeSource) => {
        const normalizedAmount = Math.max(
          incomeSource.amount,
          0
        );

        const expectedDate = parseDateValue(
          incomeSource.expectedDate
        );

        let resolvedStatus: IncomeSourceStatus =
          incomeSource.status ?? "expected";

        if (
          resolvedStatus === "expected" &&
          expectedDate &&
          getDaysUntilDate(
            expectedDate,
            currentDate
          ) < 0
        ) {
          resolvedStatus = "late";
        }

        return {
          ...incomeSource,
          amount: normalizedAmount,
          type: incomeSource.type ?? "other",
          status: resolvedStatus,
          expectedDate,
        };
      })
      .sort(
        (
          firstIncomeSource,
          secondIncomeSource
        ) => {
          const statusPriority: Record<
            IncomeSourceStatus,
            number
          > = {
            late: 4,
            expected: 3,
            received: 2,
            paused: 1,
          };

          const firstPriority =
            statusPriority[
              firstIncomeSource.status
            ];

          const secondPriority =
            statusPriority[
              secondIncomeSource.status
            ];

          if (
            firstPriority !== secondPriority
          ) {
            return (
              secondPriority - firstPriority
            );
          }

          if (
            !firstIncomeSource.expectedDate &&
            !secondIncomeSource.expectedDate
          ) {
            return (
              secondIncomeSource.amount -
              firstIncomeSource.amount
            );
          }

          if (
            !firstIncomeSource.expectedDate
          ) {
            return 1;
          }

          if (
            !secondIncomeSource.expectedDate
          ) {
            return -1;
          }

          return (
            firstIncomeSource.expectedDate.getTime() -
            secondIncomeSource.expectedDate.getTime()
          );
        }
      )
      .slice(0, Math.max(maxSources, 0));

  const receivedIncome =
    resolvedIncomeSources
      .filter((incomeSource) => {
        return (
          incomeSource.status === "received"
        );
      })
      .reduce((total, incomeSource) => {
        return total + incomeSource.amount;
      }, 0);

  const pendingIncome =
    resolvedIncomeSources
      .filter((incomeSource) => {
        return (
          incomeSource.status === "expected" ||
          incomeSource.status === "late"
        );
      })
      .reduce((total, incomeSource) => {
        return total + incomeSource.amount;
      }, 0);

  const calculatedExpectedIncome =
    typeof expectedIncome === "number"
      ? Math.max(expectedIncome, 0)
      : receivedIncome + pendingIncome;

  const remainingIncome = Math.max(
    calculatedExpectedIncome -
      receivedIncome,
    0
  );

  const receivedProgress =
    calculatedExpectedIncome > 0
      ? (receivedIncome /
          calculatedExpectedIncome) *
        100
      : receivedIncome > 0
        ? 100
        : 0;

  const normalizedReceivedProgress =
    Math.min(
      Math.max(receivedProgress, 0),
      100
    );

  const percentageChange =
    calculatePercentageChange(
      receivedIncome,
      previousPeriodIncome
    );

  const lateCount =
    resolvedIncomeSources.filter(
      (incomeSource) => {
        return incomeSource.status === "late";
      }
    ).length;

  const expectedCount =
    resolvedIncomeSources.filter(
      (incomeSource) => {
        return (
          incomeSource.status === "expected"
        );
      }
    ).length;

  const recurringCount =
    resolvedIncomeSources.filter(
      (incomeSource) => {
        return incomeSource.isRecurring;
      }
    ).length;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-400">
            {icon ?? (
              <ArrowDownLeft
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

        {percentageChange !== null ? (
          <span
            className={joinClassNames(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
              percentageChange > 0
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : percentageChange < 0
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                  : "border-white/10 bg-white/[0.04] text-slate-400"
            )}
          >
            {percentageChange > 0 ? (
              <TrendingUp
                size={13}
                aria-hidden="true"
              />
            ) : percentageChange < 0 ? (
              <TrendingDown
                size={13}
                aria-hidden="true"
              />
            ) : null}

            {percentageChange > 0 ? "+" : ""}
            {percentageChange.toFixed(1)}%
          </span>
        ) : null}
      </div>

      {resolvedIncomeSources.length > 0 ? (
        <>
          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500">
              Income received
            </p>

            <MoneyDisplay
              amount={receivedIncome}
              currency={currency}
              locale={locale}
              showColor={false}
              size="xl"
              className="mt-1 text-emerald-400"
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">
                Monthly income progress
              </span>

              <span className="text-xs font-semibold tabular-nums text-slate-300">
                {receivedProgress.toFixed(0)}%
              </span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{
                  width: `${normalizedReceivedProgress}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Received{" "}
                <MoneyDisplay
                  amount={receivedIncome}
                  currency={currency}
                  locale={locale}
                  showColor={false}
                  size="sm"
                  className="text-slate-300"
                />
              </span>

              <span>
                Expected{" "}
                <MoneyDisplay
                  amount={
                    calculatedExpectedIncome
                  }
                  currency={currency}
                  locale={locale}
                  showColor={false}
                  size="sm"
                  className="text-slate-300"
                />
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium text-slate-500">
                Still expected
              </p>

              <MoneyDisplay
                amount={remainingIncome}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-sky-400"
              />

              <p className="mt-1 text-xs text-slate-500">
                {expectedCount} upcoming
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium text-slate-500">
                Recurring sources
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-200">
                {recurringCount}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Active income streams
              </p>
            </div>
          </div>

          {lateCount > 0 ? (
            <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
              <p className="text-sm font-semibold text-rose-400">
                {lateCount}{" "}
                {lateCount === 1
                  ? "income payment is late"
                  : "income payments are late"}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Review the expected dates and
                confirm whether these payments
                were received.
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {resolvedIncomeSources.map(
              (incomeSource) => {
                const statusConfig =
                  incomeStatusConfig[
                    incomeSource.status
                  ];

                const dateLabel =
                  getIncomeDateLabel(
                    incomeSource,
                    locale,
                    currentDate
                  );

                const typeLabel =
                  getIncomeSourceTypeLabel(
                    incomeSource.type
                  );

                return (
                  <div
                    key={incomeSource.id}
                    className={joinClassNames(
                      "rounded-xl border bg-white/[0.025] p-4",
                      incomeSource.status ===
                        "late"
                        ? "border-rose-500/20"
                        : "border-white/10"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={joinClassNames(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            statusConfig.textClass,
                            statusConfig.backgroundClass,
                            statusConfig.borderClass
                          )}
                        >
                          {incomeSource.icon ??
                            getIncomeSourceIcon(
                              incomeSource.type
                            )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-200">
                            {incomeSource.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {[
                              typeLabel,
                              incomeSource.accountName,
                              incomeSource.isRecurring
                                ? "Recurring"
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                      </div>

                      <MoneyDisplay
                        amount={incomeSource.amount}
                        currency={currency}
                        locale={locale}
                        showColor={false}
                        size="sm"
                        className="shrink-0 text-emerald-400"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays
                          size={13}
                          aria-hidden="true"
                        />

                        <span>{dateLabel}</span>
                      </div>

                      <span
                        className={joinClassNames(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          statusConfig.textClass,
                          statusConfig.backgroundClass,
                          statusConfig.borderClass
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CircleDollarSign
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
          lateCount > 0 &&
            "border-rose-500/20",
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
        lateCount > 0 &&
          "border-rose-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}