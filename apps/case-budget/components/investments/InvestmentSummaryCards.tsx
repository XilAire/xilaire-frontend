"use client";

import {
  type ReactNode,
  useMemo,
} from "react";

import {
  useInvestments,
  type InvestmentHoldingData,
} from "@/components/providers/InvestmentsProvider";

export type InvestmentSummaryCardsProps = {
  compact?: boolean;
  isLoading?: boolean;
  showPerformanceCards?: boolean;
  className?: string;
};

type SummaryCardTone =
  | "primary"
  | "positive"
  | "negative"
  | "warning"
  | "neutral";

type InvestmentSummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: SummaryCardTone;
  secondaryDetail?: string;
};

export default function InvestmentSummaryCards({
  compact = false,
  isLoading = false,
  showPerformanceCards = true,
  className = "",
}: InvestmentSummaryCardsProps) {
  const {
    investmentAccounts,
    holdings,
    totalCashBalance,
    totalHoldingsMarketValue,
    totalInvestmentValue,
    totalCostBasis,
    totalUnrealizedGain,
    totalUnrealizedGainPercentage,
    totalAnnualDividendIncome,
  } = useInvestments();

  const topHolding =
    useMemo(
      () =>
        getTopHolding(
          holdings,
        ),
      [
        holdings,
      ],
    );

  const bestPerformer =
    useMemo(
      () =>
        getBestPerformer(
          holdings,
        ),
      [
        holdings,
      ],
    );

  const worstPerformer =
    useMemo(
      () =>
        getWorstPerformer(
          holdings,
        ),
      [
        holdings,
      ],
    );

  const cashAllocationPercentage =
    calculatePercentage(
      totalCashBalance,
      totalInvestmentValue,
    );

  const holdingsAllocationPercentage =
    calculatePercentage(
      totalHoldingsMarketValue,
      totalInvestmentValue,
    );

  const hasInvestmentData =
    investmentAccounts.length >
      0 ||
    holdings.length >
      0 ||
    totalInvestmentValue >
      0;

  if (
    isLoading
  ) {
    return (
      <InvestmentSummaryLoading
        compact={
          compact
        }
        showPerformanceCards={
          showPerformanceCards
        }
        className={
          className
        }
      />
    );
  }

  if (
    !hasInvestmentData
  ) {
    return (
      <InvestmentSummaryEmptyState
        className={
          className
        }
      />
    );
  }

  return (
    <section
      aria-label="Investment summary"
      className={[
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        compact
          ? "xl:grid-cols-4"
          : "xl:grid-cols-4",
        className,
      ].join(
        " ",
      )}
    >
      <InvestmentSummaryCard
        label="Portfolio Value"
        value={
          formatCurrency(
            totalInvestmentValue,
          )
        }
        detail={`${investmentAccounts.length} ${
          investmentAccounts.length ===
          1
            ? "account"
            : "accounts"
        } · ${holdings.length} ${
          holdings.length ===
          1
            ? "holding"
            : "holdings"
        }`}
        icon={
          <PortfolioIcon />
        }
        tone="primary"
      />

      <InvestmentSummaryCard
        label="Cash Balance"
        value={
          formatCurrency(
            totalCashBalance,
          )
        }
        detail={`${formatPercentage(
          cashAllocationPercentage,
        )} of portfolio`}
        secondaryDetail="Available across included investment accounts"
        icon={
          <CashIcon />
        }
        tone="neutral"
      />

      <InvestmentSummaryCard
        label="Holdings Value"
        value={
          formatCurrency(
            totalHoldingsMarketValue,
          )
        }
        detail={`${formatPercentage(
          holdingsAllocationPercentage,
        )} of portfolio`}
        secondaryDetail={`Cost basis ${formatCurrency(
          totalCostBasis,
        )}`}
        icon={
          <HoldingsIcon />
        }
        tone="neutral"
      />

      <InvestmentSummaryCard
        label="Unrealized Gain / Loss"
        value={
          formatSignedCurrency(
            totalUnrealizedGain,
          )
        }
        detail={
          formatSignedPercentage(
            totalUnrealizedGainPercentage,
          )
        }
        secondaryDetail="Compared with current cost basis"
        icon={
          totalUnrealizedGain >=
          0
            ? <TrendUpIcon />
            : <TrendDownIcon />
        }
        tone={
          totalUnrealizedGain >
          0
            ? "positive"
            : totalUnrealizedGain <
                0
              ? "negative"
              : "neutral"
        }
      />

      <InvestmentSummaryCard
        label="Annual Dividend Income"
        value={
          formatCurrency(
            totalAnnualDividendIncome,
          )
        }
        detail={`${formatCurrency(
          totalAnnualDividendIncome /
            12,
        )} estimated monthly`}
        secondaryDetail="Based on current holding estimates"
        icon={
          <DividendIcon />
        }
        tone="positive"
      />

      <InvestmentSummaryCard
        label="Top Holding"
        value={
          topHolding
            ? formatCurrency(
                topHolding.marketValue,
              )
            : "—"
        }
        detail={
          topHolding
            ? getHoldingDisplayName(
                topHolding,
              )
            : "No holdings available"
        }
        secondaryDetail={
          topHolding
            ? `${formatPercentage(
                calculatePercentage(
                  topHolding.marketValue,
                  totalHoldingsMarketValue,
                ),
              )} of holdings value`
            : undefined
        }
        icon={
          <TopHoldingIcon />
        }
        tone="primary"
      />

      {showPerformanceCards ? (
        <>
          <InvestmentSummaryCard
            label="Best Performer"
            value={
              bestPerformer
                ? formatSignedPercentage(
                    bestPerformer.unrealizedGainPercentage,
                  )
                : "—"
            }
            detail={
              bestPerformer
                ? getHoldingDisplayName(
                    bestPerformer,
                  )
                : "No gain data available"
            }
            secondaryDetail={
              bestPerformer
                ? formatSignedCurrency(
                    bestPerformer.unrealizedGain,
                  )
                : undefined
            }
            icon={
              <AwardIcon />
            }
            tone={
              bestPerformer &&
              bestPerformer.unrealizedGain >
                0
                ? "positive"
                : "neutral"
            }
          />

          <InvestmentSummaryCard
            label="Worst Performer"
            value={
              worstPerformer
                ? formatSignedPercentage(
                    worstPerformer.unrealizedGainPercentage,
                  )
                : "—"
            }
            detail={
              worstPerformer
                ? getHoldingDisplayName(
                    worstPerformer,
                  )
                : "No loss data available"
            }
            secondaryDetail={
              worstPerformer
                ? formatSignedCurrency(
                    worstPerformer.unrealizedGain,
                  )
                : undefined
            }
            icon={
              <WarningTrendIcon />
            }
            tone={
              worstPerformer &&
              worstPerformer.unrealizedGain <
                0
                ? "negative"
                : "neutral"
            }
          />
        </>
      ) : null}
    </section>
  );
}

function InvestmentSummaryCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
  secondaryDetail,
}: InvestmentSummaryCardProps) {
  const iconClassName =
    getIconClassName(
      tone,
    );

  const valueClassName =
    getValueClassName(
      tone,
    );

  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {label}
          </p>

          <p
            className={[
              "mt-3 truncate text-2xl font-bold tracking-tight",
              valueClassName,
            ].join(
              " ",
            )}
          >
            {value}
          </p>
        </div>

        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            iconClassName,
          ].join(
            " ",
          )}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 truncate text-sm font-semibold text-[var(--text-primary)]">
        {detail}
      </p>

      {secondaryDetail ? (
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {secondaryDetail}
        </p>
      ) : null}
    </article>
  );
}

function InvestmentSummaryLoading({
  compact,
  showPerformanceCards,
  className,
}: {
  compact: boolean;
  showPerformanceCards: boolean;
  className: string;
}) {
  const cardCount =
    showPerformanceCards
      ? 8
      : 6;

  return (
    <section
      aria-label="Loading investment summary"
      aria-busy="true"
      className={[
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        compact
          ? "xl:grid-cols-4"
          : "xl:grid-cols-4",
        className,
      ].join(
        " ",
      )}
    >
      {Array.from(
        {
          length:
            cardCount,
        },
        (
          _,
          index,
        ) => (
          <div
            key={
              index
            }
            className="animate-pulse rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-3 w-28 rounded bg-[var(--surface-muted)]" />
                <div className="mt-4 h-7 w-36 rounded bg-[var(--surface-muted)]" />
              </div>

              <div className="h-11 w-11 rounded-2xl bg-[var(--surface-muted)]" />
            </div>

            <div className="mt-4 h-4 w-32 rounded bg-[var(--surface-muted)]" />
            <div className="mt-2 h-3 w-full rounded bg-[var(--surface-muted)]" />
          </div>
        ),
      )}
    </section>
  );
}

function InvestmentSummaryEmptyState({
  className,
}: {
  className: string;
}) {
  return (
    <section
      aria-label="Investment summary"
      className={[
        "rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-10 text-center shadow-sm",
        className,
      ].join(
        " ",
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <PortfolioIcon />
      </div>

      <h2 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        No investment summary yet
      </h2>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--text-muted)]">
        Add an investment account and
        at least one holding to begin
        tracking portfolio value,
        performance, dividends, and
        allocation.
      </p>
    </section>
  );
}

function getTopHolding(
  holdings:
    InvestmentHoldingData[],
) {
  if (
    holdings.length ===
    0
  ) {
    return null;
  }

  return holdings.reduce(
    (
      currentTopHolding,
      holding,
    ) =>
      holding.marketValue >
      currentTopHolding.marketValue
        ? holding
        : currentTopHolding,
  );
}

function getBestPerformer(
  holdings:
    InvestmentHoldingData[],
) {
  const performanceHoldings =
    holdings.filter(
      (
        holding,
      ) =>
        Number.isFinite(
          holding.unrealizedGainPercentage,
        ) &&
        holding.costBasis >
          0,
    );

  if (
    performanceHoldings.length ===
    0
  ) {
    return null;
  }

  return performanceHoldings.reduce(
    (
      currentBestHolding,
      holding,
    ) =>
      holding.unrealizedGainPercentage >
      currentBestHolding.unrealizedGainPercentage
        ? holding
        : currentBestHolding,
  );
}

function getWorstPerformer(
  holdings:
    InvestmentHoldingData[],
) {
  const performanceHoldings =
    holdings.filter(
      (
        holding,
      ) =>
        Number.isFinite(
          holding.unrealizedGainPercentage,
        ) &&
        holding.costBasis >
          0,
    );

  if (
    performanceHoldings.length ===
    0
  ) {
    return null;
  }

  return performanceHoldings.reduce(
    (
      currentWorstHolding,
      holding,
    ) =>
      holding.unrealizedGainPercentage <
      currentWorstHolding.unrealizedGainPercentage
        ? holding
        : currentWorstHolding,
  );
}

function getHoldingDisplayName(
  holding:
    InvestmentHoldingData,
) {
  return holding.symbol
    ? `${holding.symbol} · ${holding.name}`
    : holding.name;
}

function calculatePercentage(
  value:
    number,
  total:
    number,
) {
  if (
    !Number.isFinite(
      value,
    ) ||
    !Number.isFinite(
      total,
    ) ||
    total <=
      0
  ) {
    return 0;
  }

  return (
    value /
    total
  ) *
  100;
}

function formatCurrency(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatSignedCurrency(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  if (
    normalizedValue >
    0
  ) {
    return `+${formatCurrency(
      normalizedValue,
    )}`;
  }

  return formatCurrency(
    normalizedValue,
  );
}

function formatPercentage(
  value:
    number,
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

function formatSignedPercentage(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  const prefix =
    normalizedValue >
    0
      ? "+"
      : "";

  return `${prefix}${normalizedValue.toFixed(
    2,
  )}%`;
}

function getIconClassName(
  tone:
    SummaryCardTone,
) {
  switch (
    tone
  ) {
    case "primary":
      return "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]";

    case "positive":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "negative":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "warning":
      return "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]";

    case "neutral":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function getValueClassName(
  tone:
    SummaryCardTone,
) {
  switch (
    tone
  ) {
    case "positive":
      return "text-[var(--success)]";

    case "negative":
      return "text-[var(--danger)]";

    case "warning":
      return "text-[var(--warning)]";

    case "primary":
    case "neutral":
    default:
      return "text-[var(--text-primary)]";
  }
}

function PortfolioIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-7" />
    </svg>
  );
}

function CashIcon() {
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
      <rect
        x="3"
        y="6"
        width="18"
        height="12"
        rx="2"
      />
      <circle
        cx="12"
        cy="12"
        r="2"
      />
      <path d="M7 9h.01" />
      <path d="M17 15h.01" />
    </svg>
  );
}

function HoldingsIcon() {
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
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

function TrendUpIcon() {
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
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function TrendDownIcon() {
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
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </svg>
  );
}

function DividendIcon() {
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
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10" />
      <path d="M15 9.5c-.7-.9-1.7-1.5-3-1.5-1.7 0-3 1-3 2.4 0 1.6 1.3 2.1 3 2.6 1.7.5 3 1 3 2.6 0 1.4-1.3 2.4-3 2.4-1.3 0-2.5-.6-3.2-1.6" />
    </svg>
  );
}

function TopHoldingIcon() {
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
      <path d="M12 3v18" />
      <path d="m18 9-6-6-6 6" />
      <path d="M5 21h14" />
    </svg>
  );
}

function AwardIcon() {
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
      <circle cx="12" cy="8" r="5" />
      <path d="M8.5 12 7 21l5-3 5 3-1.5-9" />
    </svg>
  );
}

function WarningTrendIcon() {
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
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </svg>
  );
}
