import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";
import PercentageBadge from "../display/PercentageBadge";

export type BalanceCardTrend = {
  percentage: number;
  label?: string;
  positiveIsGood?: boolean;
};

export type BalanceCardProps = {
  title: string;
  balance: number;
  currency?: string;
  locale?: string;
  description?: string;
  icon?: ReactNode;
  trend?: BalanceCardTrend;
  previousBalance?: number;
  showPreviousBalance?: boolean;
  href?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(
  amount: number,
  locale: string,
  currency: string,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BalanceCard({
  title,
  balance,
  currency = "USD",
  locale = "en-US",
  description,
  icon,
  trend,
  previousBalance,
  showPreviousBalance = false,
  href,
  actionLabel = "View details",
  onAction,
  className,
}: BalanceCardProps) {
  const balanceDifference =
    typeof previousBalance === "number"
      ? balance - previousBalance
      : null;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300">
              {icon}
            </div>
          ) : null}

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

        {onAction ? (
          <button
            type="button"
            aria-label={`${actionLabel} for ${title}`}
            onClick={onAction}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            <MoreHorizontal
              size={18}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>

      <div className="mt-6">
        <MoneyDisplay
          amount={balance}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className="text-white"
        />
      </div>

      {trend || (showPreviousBalance && balanceDifference !== null) ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {trend ? (
            <PercentageBadge
              value={trend.percentage}
              positiveIsGood={trend.positiveIsGood ?? true}
              size="sm"
            />
          ) : null}

          {trend?.label ? (
            <span className="text-xs text-slate-500">
              {trend.label}
            </span>
          ) : null}

          {showPreviousBalance && balanceDifference !== null ? (
            <div
              className={joinClassNames(
                "inline-flex items-center gap-1 text-xs font-medium",
                balanceDifference > 0
                  ? "text-emerald-400"
                  : balanceDifference < 0
                    ? "text-rose-400"
                    : "text-slate-500",
              )}
            >
              {balanceDifference > 0 ? (
                <ArrowUpRight
                  size={14}
                  aria-hidden="true"
                />
              ) : balanceDifference < 0 ? (
                <ArrowDownRight
                  size={14}
                  aria-hidden="true"
                />
              ) : null}

              <span className="tabular-nums">
                {balanceDifference > 0 ? "+" : ""}
                {formatMoney(
                  balanceDifference,
                  locale,
                  currency,
                )}
              </span>

              <span className="font-normal text-slate-500">
                from previous balance
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (href && !onAction) {
    return (
      <a
        href={href}
        aria-label={`${actionLabel}: ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          className,
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
        className,
      )}
    >
      {content}
    </article>
  );
}