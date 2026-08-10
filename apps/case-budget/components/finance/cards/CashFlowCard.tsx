import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";
import PercentageBadge from "../display/PercentageBadge";

export type CashFlowStatus =
  | "positive"
  | "negative"
  | "balanced";

export type CashFlowCardProps = {
  income: number;
  expenses: number;
  previousNetCashFlow?: number;
  percentageChange?: number;
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  incomeLabel?: string;
  expensesLabel?: string;
  netCashFlowLabel?: string;
  comparisonLabel?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function calculatePercentageChange(
  currentValue: number,
  previousValue: number
) {
  if (previousValue === 0) {
    return currentValue === 0 ? 0 : 100;
  }

  return (
    ((currentValue - previousValue) /
      Math.abs(previousValue)) *
    100
  );
}

function getCashFlowStatus(
  netCashFlow: number
): CashFlowStatus {
  if (netCashFlow > 0) {
    return "positive";
  }

  if (netCashFlow < 0) {
    return "negative";
  }

  return "balanced";
}

const statusConfig: Record<
  CashFlowStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    icon: ReactNode;
  }
> = {
  positive: {
    label: "Positive cash flow",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    icon: (
      <TrendingUp
        size={14}
        aria-hidden="true"
      />
    ),
  },
  negative: {
    label: "Negative cash flow",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    icon: (
      <TrendingDown
        size={14}
        aria-hidden="true"
      />
    ),
  },
  balanced: {
    label: "Balanced",
    textClass: "text-slate-300",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
    icon: (
      <Minus
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function CashFlowCard({
  income,
  expenses,
  previousNetCashFlow,
  percentageChange,
  currency = "USD",
  locale = "en-US",
  title = "Monthly Cash Flow",
  description = "Income compared with expenses",
  incomeLabel = "Income",
  expensesLabel = "Expenses",
  netCashFlowLabel = "Net cash flow",
  comparisonLabel = "from previous period",
  icon,
  href,
  className,
}: CashFlowCardProps) {
  const normalizedIncome = Math.max(income, 0);
  const normalizedExpenses = Math.max(expenses, 0);

  const netCashFlow =
    normalizedIncome - normalizedExpenses;

  const status = getCashFlowStatus(netCashFlow);
  const currentStatus = statusConfig[status];

  const netCashFlowDifference =
    typeof previousNetCashFlow === "number"
      ? netCashFlow - previousNetCashFlow
      : null;

  const resolvedPercentageChange =
    typeof percentageChange === "number"
      ? percentageChange
      : typeof previousNetCashFlow === "number"
        ? calculatePercentageChange(
            netCashFlow,
            previousNetCashFlow
          )
        : null;

  const incomePercentage =
    normalizedIncome > 0
      ? 100
      : 0;

  const expensePercentage =
    normalizedIncome > 0
      ? Math.min(
          (normalizedExpenses / normalizedIncome) *
            100,
          100
        )
      : normalizedExpenses > 0
        ? 100
        : 0;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-400">
            {icon ?? (
              <CircleDollarSign
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

        <span
          className={joinClassNames(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            currentStatus.textClass,
            currentStatus.backgroundClass,
            currentStatus.borderClass
          )}
        >
          {currentStatus.icon}

          {currentStatus.label}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-500">
          {netCashFlowLabel}
        </p>

        <MoneyDisplay
          amount={netCashFlow}
          currency={currency}
          locale={locale}
          showColor={false}
          showSign
          size="xl"
          className={joinClassNames(
            "mt-1",
            status === "positive"
              ? "text-emerald-400"
              : status === "negative"
                ? "text-rose-400"
                : "text-white"
          )}
        />

        {resolvedPercentageChange !== null ||
        netCashFlowDifference !== null ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {resolvedPercentageChange !== null ? (
              <PercentageBadge
                value={resolvedPercentageChange}
                positiveIsGood
                size="sm"
              />
            ) : null}

            {netCashFlowDifference !== null ? (
              <div
                className={joinClassNames(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  netCashFlowDifference > 0
                    ? "text-emerald-400"
                    : netCashFlowDifference < 0
                      ? "text-rose-400"
                      : "text-slate-400"
                )}
              >
                {netCashFlowDifference > 0 ? (
                  <TrendingUp
                    size={14}
                    aria-hidden="true"
                  />
                ) : netCashFlowDifference < 0 ? (
                  <TrendingDown
                    size={14}
                    aria-hidden="true"
                  />
                ) : (
                  <Minus
                    size={14}
                    aria-hidden="true"
                  />
                )}

                <MoneyDisplay
                  amount={netCashFlowDifference}
                  currency={currency}
                  locale={locale}
                  showSign
                  showColor={false}
                  size="sm"
                />

                <span className="font-normal text-slate-500">
                  {comparisonLabel}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <ArrowDownLeft
                size={16}
                aria-hidden="true"
              />

              <span className="text-xs font-semibold">
                {incomeLabel}
              </span>
            </div>

            <MoneyDisplay
              amount={normalizedIncome}
              currency={currency}
              locale={locale}
              showColor={false}
              size="sm"
              className="text-slate-200"
            />
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
              style={{
                width: `${incomePercentage}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-rose-400">
              <ArrowUpRight
                size={16}
                aria-hidden="true"
              />

              <span className="text-xs font-semibold">
                {expensesLabel}
              </span>
            </div>

            <MoneyDisplay
              amount={normalizedExpenses}
              currency={currency}
              locale={locale}
              showColor={false}
              size="sm"
              className="text-slate-200"
            />
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-rose-500 transition-[width] duration-300"
              style={{
                width: `${expensePercentage}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <ArrowDownLeft
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              Total income
            </span>
          </div>

          <MoneyDisplay
            amount={normalizedIncome}
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
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              Total expenses
            </span>
          </div>

          <MoneyDisplay
            amount={normalizedExpenses}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-slate-200"
          />
        </div>
      </div>
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
        status === "negative" &&
          "border-rose-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}