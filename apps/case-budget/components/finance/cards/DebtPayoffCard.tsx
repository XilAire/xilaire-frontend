import type { ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Flame,
  Landmark,
  Target,
  TrendingDown,
  TriangleAlert,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type DebtPayoffStrategy =
  | "snowball"
  | "avalanche"
  | "custom";

export type DebtPayoffStatus =
  | "on-track"
  | "behind"
  | "completed"
  | "paused";

export type DebtPayoffAccount = {
  id: string;
  name: string;
  balance: number;
  originalBalance?: number;
  interestRate?: number;
  minimumPayment?: number;
  plannedPayment?: number;
  payoffDate?: Date | string;
  status?: DebtPayoffStatus;
  accountType?: string;
  lastFour?: string;
  icon?: ReactNode;
};

export type DebtPayoffCardProps = {
  debts: DebtPayoffAccount[];
  strategy?: DebtPayoffStrategy;
  monthlyPayment?: number;
  extraMonthlyPayment?: number;
  estimatedPayoffDate?: Date | string;
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxDebts?: number;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(value?: Date | string) {
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
  value: Date | string | undefined,
  locale: string
) {
  const date = parseDateValue(value);

  if (!date) {
    return "Not calculated";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getPayoffDateLabel(
  value: Date | string | undefined,
  locale: string,
  currentDate: Date
) {
  const payoffDate = parseDateValue(value);

  if (!payoffDate) {
    return "Payoff date not calculated";
  }

  const daysUntilPayoff = getDaysUntilDate(
    payoffDate,
    currentDate
  );

  if (daysUntilPayoff < 0) {
    return "Payoff date has passed";
  }

  if (daysUntilPayoff === 0) {
    return "Payoff expected today";
  }

  if (daysUntilPayoff <= 30) {
    return `${daysUntilPayoff} ${
      daysUntilPayoff === 1 ? "day" : "days"
    } remaining`;
  }

  return `Estimated payoff ${formatDate(
    payoffDate,
    locale
  )}`;
}

function calculateProgress(
  balance: number,
  originalBalance?: number
) {
  if (
    typeof originalBalance !== "number" ||
    originalBalance <= 0
  ) {
    return balance <= 0 ? 100 : 0;
  }

  const amountPaid = Math.max(
    originalBalance - balance,
    0
  );

  return (amountPaid / originalBalance) * 100;
}

function resolveDebtStatus(
  debt: DebtPayoffAccount,
  currentDate: Date
): DebtPayoffStatus {
  if (debt.status === "paused") {
    return "paused";
  }

  if (
    debt.status === "completed" ||
    debt.balance <= 0
  ) {
    return "completed";
  }

  if (
    debt.status === "on-track" ||
    debt.status === "behind"
  ) {
    return debt.status;
  }

  const payoffDate = parseDateValue(
    debt.payoffDate
  );

  if (
    payoffDate &&
    getDaysUntilDate(
      payoffDate,
      currentDate
    ) < 0
  ) {
    return "behind";
  }

  const plannedPayment =
    debt.plannedPayment ??
    debt.minimumPayment ??
    0;

  if (plannedPayment <= 0) {
    return "behind";
  }

  return "on-track";
}

function getStrategyLabel(
  strategy: DebtPayoffStrategy
) {
  if (strategy === "snowball") {
    return "Debt snowball";
  }

  if (strategy === "avalanche") {
    return "Debt avalanche";
  }

  return "Custom plan";
}

function getStrategyDescription(
  strategy: DebtPayoffStrategy
) {
  if (strategy === "snowball") {
    return "Smallest balance first";
  }

  if (strategy === "avalanche") {
    return "Highest interest first";
  }

  return "Your preferred payoff order";
}

function getDebtIcon(
  accountType?: string
) {
  const normalizedType =
    accountType?.toLowerCase() ?? "";

  if (
    normalizedType.includes("mortgage") ||
    normalizedType.includes("loan")
  ) {
    return (
      <Landmark
        size={18}
        aria-hidden="true"
      />
    );
  }

  return (
    <CreditCard
      size={18}
      aria-hidden="true"
    />
  );
}

const debtStatusConfig: Record<
  DebtPayoffStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  "on-track": {
    label: "On track",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    progressClass: "bg-emerald-500",
    icon: (
      <Target
        size={13}
        aria-hidden="true"
      />
    ),
  },
  behind: {
    label: "Behind",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    progressClass: "bg-amber-500",
    icon: (
      <TriangleAlert
        size={13}
        aria-hidden="true"
      />
    ),
  },
  completed: {
    label: "Paid off",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    progressClass: "bg-sky-500",
    icon: (
      <CheckCircle2
        size={13}
        aria-hidden="true"
      />
    ),
  },
  paused: {
    label: "Paused",
    textClass: "text-slate-400",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
    progressClass: "bg-slate-500",
    icon: (
      <CalendarClock
        size={13}
        aria-hidden="true"
      />
    ),
  },
};

export default function DebtPayoffCard({
  debts,
  strategy = "snowball",
  monthlyPayment,
  extraMonthlyPayment = 0,
  estimatedPayoffDate,
  currency = "USD",
  locale = "en-US",
  title = "Debt Payoff",
  description = "Track your path to becoming debt-free",
  emptyTitle = "No debts added",
  emptyDescription =
    "Add a debt account to build your payoff plan.",
  maxDebts = 5,
  icon,
  href,
  className,
}: DebtPayoffCardProps) {
  const currentDate = new Date();

  const resolvedDebts = debts
    .map((debt) => {
      const normalizedBalance = Math.max(
        debt.balance,
        0
      );

      const normalizedOriginalBalance =
        typeof debt.originalBalance ===
        "number"
          ? Math.max(
              debt.originalBalance,
              normalizedBalance
            )
          : undefined;

      const progress = calculateProgress(
        normalizedBalance,
        normalizedOriginalBalance
      );

      const normalizedProgress = Math.min(
        Math.max(progress, 0),
        100
      );

      const status = resolveDebtStatus(
        {
          ...debt,
          balance: normalizedBalance,
          originalBalance:
            normalizedOriginalBalance,
        },
        currentDate
      );

      return {
        ...debt,
        balance: normalizedBalance,
        originalBalance:
          normalizedOriginalBalance,
        interestRate:
          typeof debt.interestRate ===
          "number"
            ? Math.max(debt.interestRate, 0)
            : undefined,
        minimumPayment:
          typeof debt.minimumPayment ===
          "number"
            ? Math.max(
                debt.minimumPayment,
                0
              )
            : undefined,
        plannedPayment:
          typeof debt.plannedPayment ===
          "number"
            ? Math.max(
                debt.plannedPayment,
                0
              )
            : undefined,
        progress,
        normalizedProgress,
        status,
      };
    })
    .sort((firstDebt, secondDebt) => {
      if (
        firstDebt.status === "completed" &&
        secondDebt.status !== "completed"
      ) {
        return 1;
      }

      if (
        secondDebt.status === "completed" &&
        firstDebt.status !== "completed"
      ) {
        return -1;
      }

      if (strategy === "avalanche") {
        return (
          (secondDebt.interestRate ?? 0) -
          (firstDebt.interestRate ?? 0)
        );
      }

      if (strategy === "snowball") {
        return (
          firstDebt.balance -
          secondDebt.balance
        );
      }

      return (
        secondDebt.balance -
        firstDebt.balance
      );
    })
    .slice(0, Math.max(maxDebts, 0));

  const totalBalance = resolvedDebts.reduce(
    (total, debt) => {
      return total + debt.balance;
    },
    0
  );

  const totalOriginalBalance =
    resolvedDebts.reduce((total, debt) => {
      return (
        total +
        (debt.originalBalance ??
          debt.balance)
      );
    }, 0);

  const totalPaid = Math.max(
    totalOriginalBalance - totalBalance,
    0
  );

  const overallProgress =
    totalOriginalBalance > 0
      ? (totalPaid /
          totalOriginalBalance) *
        100
      : totalBalance <= 0 &&
          resolvedDebts.length > 0
        ? 100
        : 0;

  const normalizedOverallProgress =
    Math.min(
      Math.max(overallProgress, 0),
      100
    );

  const resolvedMonthlyPayment =
    typeof monthlyPayment === "number"
      ? Math.max(monthlyPayment, 0)
      : resolvedDebts.reduce(
          (total, debt) => {
            return (
              total +
              (debt.plannedPayment ??
                debt.minimumPayment ??
                0)
            );
          },
          0
        );

  const normalizedExtraMonthlyPayment =
    Math.max(extraMonthlyPayment, 0);

  const totalMonthlyPayment =
    resolvedMonthlyPayment +
    normalizedExtraMonthlyPayment;

  const completedCount =
    resolvedDebts.filter((debt) => {
      return debt.status === "completed";
    }).length;

  const behindCount =
    resolvedDebts.filter((debt) => {
      return debt.status === "behind";
    }).length;

  const activeDebts = resolvedDebts.filter(
    (debt) => {
      return debt.status !== "completed";
    }
  );

  const nextDebt = activeDebts[0];

  const overallPayoffDateLabel =
    getPayoffDateLabel(
      estimatedPayoffDate,
      locale,
      currentDate
    );

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-rose-400">
            {icon ?? (
              <TrendingDown
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

        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-slate-300">
            {getStrategyLabel(strategy)}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {getStrategyDescription(strategy)}
          </p>
        </div>
      </div>

      {resolvedDebts.length > 0 ? (
        <>
          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500">
              Remaining debt
            </p>

            <MoneyDisplay
              amount={totalBalance}
              currency={currency}
              locale={locale}
              showColor={false}
              size="xl"
              className="mt-1 text-white"
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">
                Overall payoff progress
              </span>

              <span className="text-xs font-semibold tabular-nums text-slate-300">
                {overallProgress.toFixed(0)}%
              </span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{
                  width: `${normalizedOverallProgress}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Paid{" "}
                <MoneyDisplay
                  amount={totalPaid}
                  currency={currency}
                  locale={locale}
                  showColor={false}
                  size="sm"
                  className="text-emerald-400"
                />
              </span>

              <span>
                Started at{" "}
                <MoneyDisplay
                  amount={totalOriginalBalance}
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
                Monthly payment
              </p>

              <MoneyDisplay
                amount={totalMonthlyPayment}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-slate-200"
              />

              {normalizedExtraMonthlyPayment >
              0 ? (
                <p className="mt-1 text-xs text-emerald-400">
                  Includes{" "}
                  <MoneyDisplay
                    amount={
                      normalizedExtraMonthlyPayment
                    }
                    currency={currency}
                    locale={locale}
                    showColor={false}
                    size="sm"
                    className="text-emerald-400"
                  />{" "}
                  extra
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <p className="text-xs font-medium text-slate-500">
                Debt-free estimate
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-200">
                {formatDate(
                  estimatedPayoffDate,
                  locale
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {overallPayoffDateLabel}
              </p>
            </div>
          </div>

          {completedCount > 0 ||
          behindCount > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {completedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400">
                  <CheckCircle2
                    size={13}
                    aria-hidden="true"
                  />

                  {completedCount} paid off
                </span>
              ) : null}

              {behindCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                  <TriangleAlert
                    size={13}
                    aria-hidden="true"
                  />

                  {behindCount} behind
                </span>
              ) : null}
            </div>
          ) : null}

          {nextDebt ? (
            <div className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400">
                  <Flame
                    size={17}
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-400">
                    Current focus
                  </p>

                  <p className="mt-1 truncate text-sm font-semibold text-slate-200">
                    {nextDebt.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Remaining{" "}
                    <MoneyDisplay
                      amount={nextDebt.balance}
                      currency={currency}
                      locale={locale}
                      showColor={false}
                      size="sm"
                      className="text-slate-300"
                    />

                    {typeof nextDebt.interestRate ===
                    "number"
                      ? ` at ${nextDebt.interestRate.toFixed(
                          2
                        )}% APR`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {resolvedDebts.map((debt) => {
              const statusConfig =
                debtStatusConfig[debt.status];

              const paymentAmount =
                debt.plannedPayment ??
                debt.minimumPayment;

              const payoffDateLabel =
                getPayoffDateLabel(
                  debt.payoffDate,
                  locale,
                  currentDate
                );

              return (
                <div
                  key={debt.id}
                  className={joinClassNames(
                    "rounded-xl border bg-white/[0.025] p-4",
                    debt.status === "behind"
                      ? "border-amber-500/20"
                      : debt.status ===
                          "completed"
                        ? "border-sky-500/20"
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
                        {debt.icon ??
                          getDebtIcon(
                            debt.accountType
                          )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {debt.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {[
                            debt.accountType,
                            debt.lastFour
                              ? `•••• ${debt.lastFour}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" • ") ||
                            "Debt account"}
                        </p>
                      </div>
                    </div>

                    <span
                      className={joinClassNames(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        statusConfig.textClass,
                        statusConfig.backgroundClass,
                        statusConfig.borderClass
                      )}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <MoneyDisplay
                        amount={debt.balance}
                        currency={currency}
                        locale={locale}
                        showColor={false}
                        size="sm"
                        className="text-slate-200"
                      />

                      <span className="text-xs font-semibold tabular-nums text-slate-400">
                        {debt.progress.toFixed(0)}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={joinClassNames(
                          "h-full rounded-full transition-[width] duration-300",
                          statusConfig.progressClass
                        )}
                        style={{
                          width: `${debt.normalizedProgress}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-600">
                          Payment
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-300">
                          {typeof paymentAmount ===
                          "number" ? (
                            <MoneyDisplay
                              amount={
                                paymentAmount
                              }
                              currency={currency}
                              locale={locale}
                              showColor={false}
                              size="sm"
                              className="text-slate-300"
                            />
                          ) : (
                            "Not set"
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-600">
                          Interest rate
                        </p>

                        <p className="mt-1 text-xs font-medium text-slate-300">
                          {typeof debt.interestRate ===
                          "number"
                            ? `${debt.interestRate.toFixed(
                                2
                              )}% APR`
                            : "Not set"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-slate-500">
                      <CalendarClock
                        size={13}
                        aria-hidden="true"
                      />

                      <span>
                        {payoffDateLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2
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
          behindCount > 0 &&
            "border-amber-500/20",
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
        behindCount > 0 &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}