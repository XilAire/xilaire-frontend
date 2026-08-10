import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";
import PercentageBadge from "../display/PercentageBadge";

export type SpendingSummaryCategory = {
  id: string;
  name: string;
  amount: number;
  percentage?: number;
  icon?: ReactNode;
};

export type SpendingSummaryStatus =
  | "under-budget"
  | "near-budget"
  | "over-budget";

export type SpendingSummaryCardProps = {
  totalSpent: number;
  budgetedAmount?: number;
  previousPeriodSpent?: number;
  percentageChange?: number;
  categories?: SpendingSummaryCategory[];
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  comparisonLabel?: string;
  emptyCategoriesLabel?: string;
  maxCategories?: number;
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

function getSpendingStatus(
  totalSpent: number,
  budgetedAmount?: number
): SpendingSummaryStatus {
  if (
    typeof budgetedAmount !== "number" ||
    budgetedAmount <= 0
  ) {
    return "under-budget";
  }

  const percentageUsed =
    (totalSpent / budgetedAmount) * 100;

  if (percentageUsed > 100) {
    return "over-budget";
  }

  if (percentageUsed >= 80) {
    return "near-budget";
  }

  return "under-budget";
}

const statusConfig: Record<
  SpendingSummaryStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
  }
> = {
  "under-budget": {
    label: "Under budget",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    progressClass: "bg-emerald-500",
  },
  "near-budget": {
    label: "Near budget",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    progressClass: "bg-amber-500",
  },
  "over-budget": {
    label: "Over budget",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    progressClass: "bg-rose-500",
  },
};

export default function SpendingSummaryCard({
  totalSpent,
  budgetedAmount,
  previousPeriodSpent,
  percentageChange,
  categories = [],
  currency = "USD",
  locale = "en-US",
  title = "Spending Summary",
  description = "Track where your money is going",
  comparisonLabel = "from previous period",
  emptyCategoriesLabel = "No spending categories available",
  maxCategories = 5,
  icon,
  href,
  className,
}: SpendingSummaryCardProps) {
  const normalizedTotalSpent = Math.max(
    totalSpent,
    0
  );

  const normalizedBudgetedAmount =
    typeof budgetedAmount === "number"
      ? Math.max(budgetedAmount, 0)
      : null;

  const status = getSpendingStatus(
    normalizedTotalSpent,
    normalizedBudgetedAmount ?? undefined
  );

  const currentStatus = statusConfig[status];

  const spendingDifference =
    typeof previousPeriodSpent === "number"
      ? normalizedTotalSpent -
        Math.max(previousPeriodSpent, 0)
      : null;

  const resolvedPercentageChange =
    typeof percentageChange === "number"
      ? percentageChange
      : typeof previousPeriodSpent === "number"
        ? calculatePercentageChange(
            normalizedTotalSpent,
            Math.max(previousPeriodSpent, 0)
          )
        : null;

  const budgetRemaining =
    normalizedBudgetedAmount !== null
      ? normalizedBudgetedAmount -
        normalizedTotalSpent
      : null;

  const budgetPercentageUsed =
    normalizedBudgetedAmount !== null &&
    normalizedBudgetedAmount > 0
      ? (normalizedTotalSpent /
          normalizedBudgetedAmount) *
        100
      : normalizedTotalSpent > 0 &&
          normalizedBudgetedAmount === 0
        ? 100
        : 0;

  const progressPercentage = Math.min(
    Math.max(budgetPercentageUsed, 0),
    100
  );

  const sortedCategories = [...categories]
    .map((category) => ({
      ...category,
      amount: Math.max(category.amount, 0),
    }))
    .sort((firstCategory, secondCategory) => {
      return (
        secondCategory.amount -
        firstCategory.amount
      );
    })
    .slice(0, Math.max(maxCategories, 0));

  const resolvedCategories =
    sortedCategories.map((category) => {
      const resolvedPercentage =
        typeof category.percentage === "number"
          ? category.percentage
          : normalizedTotalSpent > 0
            ? (category.amount /
                normalizedTotalSpent) *
              100
            : 0;

      return {
        ...category,
        resolvedPercentage: Math.min(
          Math.max(resolvedPercentage, 0),
          100
        ),
      };
    });

  const DifferenceIcon =
    spendingDifference === null ||
    spendingDifference === 0
      ? Minus
      : spendingDifference > 0
        ? ArrowUpRight
        : ArrowDownRight;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-violet-400">
            {icon ?? (
              <ShoppingCart
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

        {normalizedBudgetedAmount !== null ? (
          <span
            className={joinClassNames(
              "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              currentStatus.textClass,
              currentStatus.backgroundClass,
              currentStatus.borderClass
            )}
          >
            {currentStatus.label}
          </span>
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-500">
          Total spent
        </p>

        <MoneyDisplay
          amount={normalizedTotalSpent}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className="mt-1 text-white"
        />

        {resolvedPercentageChange !== null ||
        spendingDifference !== null ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {resolvedPercentageChange !== null ? (
              <PercentageBadge
                value={resolvedPercentageChange}
                positiveIsGood={false}
                size="sm"
              />
            ) : null}

            {spendingDifference !== null ? (
              <div
                className={joinClassNames(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  spendingDifference < 0
                    ? "text-emerald-400"
                    : spendingDifference > 0
                      ? "text-rose-400"
                      : "text-slate-400"
                )}
              >
                <DifferenceIcon
                  size={14}
                  aria-hidden="true"
                />

                <MoneyDisplay
                  amount={spendingDifference}
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

      {normalizedBudgetedAmount !== null ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">
              Monthly spending budget
            </span>

            <span className="text-xs font-semibold tabular-nums text-slate-300">
              {budgetPercentageUsed.toFixed(0)}%
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={joinClassNames(
                "h-full rounded-full transition-[width] duration-300",
                currentStatus.progressClass
              )}
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Budgeted{" "}
              <MoneyDisplay
                amount={normalizedBudgetedAmount}
                currency={currency}
                locale={locale}
                showColor={false}
                size="sm"
                className="text-slate-300"
              />
            </span>

            <span
              className={joinClassNames(
                budgetRemaining !== null &&
                  budgetRemaining < 0
                  ? "text-rose-400"
                  : "text-slate-500"
              )}
            >
              {budgetRemaining !== null &&
              budgetRemaining < 0
                ? "Over by "
                : "Remaining "}

              <MoneyDisplay
                amount={Math.abs(
                  budgetRemaining ?? 0
                )}
                currency={currency}
                locale={locale}
                showColor={false}
                size="sm"
                className={
                  budgetRemaining !== null &&
                  budgetRemaining < 0
                    ? "text-rose-400"
                    : "text-slate-300"
                }
              />
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex items-center gap-2">
          <ReceiptText
            size={16}
            className="text-slate-500"
            aria-hidden="true"
          />

          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top categories
          </h4>
        </div>

        {resolvedCategories.length > 0 ? (
          <div className="mt-4 space-y-4">
            {resolvedCategories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {category.icon ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-slate-400">
                        {category.icon}
                      </span>
                    ) : null}

                    <span className="truncate text-sm font-medium text-slate-300">
                      {category.name}
                    </span>
                  </div>

                  <div className="shrink-0 text-right">
                    <MoneyDisplay
                      amount={category.amount}
                      currency={currency}
                      locale={locale}
                      showColor={false}
                      size="sm"
                      className="text-slate-200"
                    />

                    <p className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                      {category.resolvedPercentage.toFixed(
                        0
                      )}
                      %
                    </p>
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-[width] duration-300"
                    style={{
                      width: `${category.resolvedPercentage}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
            <p className="text-sm text-slate-500">
              {emptyCategoriesLabel}
            </p>
          </div>
        )}
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
        status === "over-budget" &&
          "border-rose-500/20",
        status === "near-budget" &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}