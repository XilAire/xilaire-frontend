import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Minus,
  WalletCards,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";
import PercentageBadge from "../display/PercentageBadge";

export type NetWorthCardProps = {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  previousNetWorth?: number;
  percentageChange?: number;
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  assetsLabel?: string;
  liabilitiesLabel?: string;
  changeLabel?: string;
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
  previousValue: number,
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

export default function NetWorthCard({
  netWorth,
  totalAssets,
  totalLiabilities,
  previousNetWorth,
  percentageChange,
  currency = "USD",
  locale = "en-US",
  title = "Net Worth",
  description = "Assets minus liabilities",
  assetsLabel = "Total assets",
  liabilitiesLabel = "Total liabilities",
  changeLabel = "from previous period",
  icon,
  href,
  className,
}: NetWorthCardProps) {
  const netWorthDifference =
    typeof previousNetWorth === "number"
      ? netWorth - previousNetWorth
      : null;

  const resolvedPercentageChange =
    typeof percentageChange === "number"
      ? percentageChange
      : typeof previousNetWorth === "number"
        ? calculatePercentageChange(
            netWorth,
            previousNetWorth,
          )
        : null;

  const isPositive = netWorthDifference
    ? netWorthDifference > 0
    : false;

  const isNegative = netWorthDifference
    ? netWorthDifference < 0
    : false;

  const TrendIcon = isPositive
    ? ArrowUpRight
    : isNegative
      ? ArrowDownRight
      : Minus;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-400">
            {icon ?? (
              <WalletCards
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

        {resolvedPercentageChange !== null ? (
          <PercentageBadge
            value={resolvedPercentageChange}
            positiveIsGood
            size="sm"
          />
        ) : null}
      </div>

      <div className="mt-6">
        <MoneyDisplay
          amount={netWorth}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className="text-white"
        />

        {netWorthDifference !== null ? (
          <div
            className={joinClassNames(
              "mt-2 inline-flex items-center gap-1.5 text-xs font-medium",
              isPositive
                ? "text-emerald-400"
                : isNegative
                  ? "text-rose-400"
                  : "text-slate-500",
            )}
          >
            <TrendIcon
              size={14}
              aria-hidden="true"
            />

            <MoneyDisplay
              amount={netWorthDifference}
              currency={currency}
              locale={locale}
              showSign
              showColor={false}
              size="sm"
            />

            <span className="font-normal text-slate-500">
              {changeLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Landmark
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              {assetsLabel}
            </span>
          </div>

          <MoneyDisplay
            amount={totalAssets}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-emerald-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <WalletCards
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              {liabilitiesLabel}
            </span>
          </div>

          <MoneyDisplay
            amount={Math.abs(totalLiabilities)}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-rose-400"
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