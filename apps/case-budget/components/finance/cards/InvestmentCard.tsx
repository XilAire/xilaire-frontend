import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Landmark,
  Minus,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";
import PercentageBadge from "../display/PercentageBadge";

export type InvestmentCardPerformance =
  | "gain"
  | "loss"
  | "flat";

export type InvestmentCardProps = {
  title: string;
  currentValue: number;
  totalContributions?: number;
  totalReturn?: number;
  returnPercentage?: number;
  dayChange?: number;
  dayChangePercentage?: number;
  accountType?: string;
  institutionName?: string;
  currency?: string;
  locale?: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function calculateReturnPercentage(
  totalReturn: number,
  totalContributions: number
) {
  if (totalContributions === 0) {
    return totalReturn === 0 ? 0 : 100;
  }

  return (
    (totalReturn / Math.abs(totalContributions)) *
    100
  );
}

function getPerformance(
  value: number
): InvestmentCardPerformance {
  if (value > 0) {
    return "gain";
  }

  if (value < 0) {
    return "loss";
  }

  return "flat";
}

export default function InvestmentCard({
  title,
  currentValue,
  totalContributions,
  totalReturn,
  returnPercentage,
  dayChange,
  dayChangePercentage,
  accountType,
  institutionName,
  currency = "USD",
  locale = "en-US",
  description,
  icon,
  href,
  className,
}: InvestmentCardProps) {
  const resolvedTotalReturn =
    typeof totalReturn === "number"
      ? totalReturn
      : typeof totalContributions === "number"
        ? currentValue - totalContributions
        : null;

  const resolvedReturnPercentage =
    typeof returnPercentage === "number"
      ? returnPercentage
      : resolvedTotalReturn !== null &&
          typeof totalContributions === "number"
        ? calculateReturnPercentage(
            resolvedTotalReturn,
            totalContributions
          )
        : null;

  const performance = getPerformance(
    resolvedTotalReturn ?? 0
  );

  const PerformanceIcon =
    performance === "gain"
      ? ArrowUpRight
      : performance === "loss"
        ? ArrowDownRight
        : Minus;

  const DayChangeIcon =
    typeof dayChange === "number" &&
    dayChange > 0
      ? ArrowUpRight
      : typeof dayChange === "number" &&
          dayChange < 0
        ? ArrowDownRight
        : Minus;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-indigo-400">
            {icon ?? (
              <ChartNoAxesCombined
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

        {resolvedReturnPercentage !== null ? (
          <PercentageBadge
            value={resolvedReturnPercentage}
            positiveIsGood
            size="sm"
          />
        ) : null}
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-500">
          Current value
        </p>

        <MoneyDisplay
          amount={currentValue}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className="mt-1 text-white"
        />
      </div>

      {resolvedTotalReturn !== null ? (
        <div
          className={joinClassNames(
            "mt-3 inline-flex items-center gap-1.5 text-xs font-semibold",
            performance === "gain"
              ? "text-emerald-400"
              : performance === "loss"
                ? "text-rose-400"
                : "text-slate-400"
          )}
        >
          <PerformanceIcon
            size={14}
            aria-hidden="true"
          />

          <MoneyDisplay
            amount={resolvedTotalReturn}
            currency={currency}
            locale={locale}
            showSign
            showColor={false}
            size="sm"
          />

          <span className="font-normal text-slate-500">
            total return
          </span>
        </div>
      ) : null}

      {typeof dayChange === "number" ||
      typeof dayChangePercentage === "number" ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Today&apos;s change
              </p>

              {typeof dayChange === "number" ? (
                <div
                  className={joinClassNames(
                    "mt-2 inline-flex items-center gap-1.5",
                    dayChange > 0
                      ? "text-emerald-400"
                      : dayChange < 0
                        ? "text-rose-400"
                        : "text-slate-400"
                  )}
                >
                  <DayChangeIcon
                    size={16}
                    aria-hidden="true"
                  />

                  <MoneyDisplay
                    amount={dayChange}
                    currency={currency}
                    locale={locale}
                    showSign
                    showColor={false}
                    size="md"
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-slate-400">
                  Amount unavailable
                </p>
              )}
            </div>

            {typeof dayChangePercentage ===
            "number" ? (
              <PercentageBadge
                value={dayChangePercentage}
                positiveIsGood
                size="sm"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {typeof totalContributions === "number" ||
      accountType ||
      institutionName ? (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <BriefcaseBusiness
                size={16}
                aria-hidden="true"
              />

              <span className="text-xs font-medium">
                Contributions
              </span>
            </div>

            {typeof totalContributions ===
            "number" ? (
              <MoneyDisplay
                amount={totalContributions}
                currency={currency}
                locale={locale}
                showColor={false}
                size="md"
                className="mt-2 text-slate-200"
              />
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-400">
                Not available
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Landmark
                size={16}
                aria-hidden="true"
              />

              <span className="text-xs font-medium">
                Account
              </span>
            </div>

            <p className="mt-2 truncate text-sm font-semibold text-slate-200">
              {accountType ?? "Investment account"}
            </p>

            {institutionName ? (
              <p className="mt-1 truncate text-xs text-slate-500">
                {institutionName}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View investment account: ${title}`}
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