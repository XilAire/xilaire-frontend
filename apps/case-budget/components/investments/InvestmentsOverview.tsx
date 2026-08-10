"use client";

import Link from "next/link";
import {
  useMemo,
} from "react";

import InvestmentAccountList from "@/components/investments/InvestmentAccountList";
import InvestmentHoldingsTable from "@/components/investments/InvestmentHoldingsTable";
import InvestmentPerformanceChart, {
  type InvestmentPerformancePoint,
} from "@/components/investments/InvestmentPerformanceChart";
import InvestmentSummaryCards from "@/components/investments/InvestmentSummaryCards";
import InvestmentsHeader from "@/components/investments/InvestmentsHeader";

import PageContainer from "@/components/layout/PageContainer";

import {
  useInvestments,
  type InvestmentActivityData,
  type InvestmentActivityType,
} from "@/components/providers/InvestmentsProvider";

const RECENT_ACTIVITY_LIMIT =
  8;

/**
 * Historical portfolio snapshots are intentionally empty until
 * InvestmentsProvider exposes persisted performance history.
 *
 * Do not synthesize historical values from the current portfolio.
 */
const INVESTMENT_PERFORMANCE_HISTORY:
  InvestmentPerformancePoint[] = [];

export default function InvestmentsOverview() {
  const {
    investmentAccounts,
    holdings,
    activities,
  } = useInvestments();

  const recentActivities =
    useMemo(
      () =>
        [...activities]
          .sort(
            (
              firstActivity,
              secondActivity,
            ) => {
              const dateComparison =
                secondActivity.date.localeCompare(
                  firstActivity.date,
                );

              if (
                dateComparison !==
                0
              ) {
                return dateComparison;
              }

              return secondActivity.createdAt.localeCompare(
                firstActivity.createdAt,
              );
            },
          )
          .slice(
            0,
            RECENT_ACTIVITY_LIMIT,
          ),
      [
        activities,
      ],
    );

  const hasInvestmentData =
    investmentAccounts.length >
      0 ||
    holdings.length >
      0 ||
    activities.length >
      0;

  return (
    <PageContainer>
      <div className="space-y-6 pb-8 sm:space-y-8">
        <InvestmentsHeader />

        {!hasInvestmentData ? (
          <InvestmentsEmptyState />
        ) : (
          <>
            <InvestmentSummaryCards />

            <InvestmentPerformanceChart
              data={
                INVESTMENT_PERFORMANCE_HISTORY
              }
              defaultRange="1Y"
              emptyTitle="Portfolio history is not available yet"
              emptyDescription="CASE Budget will display portfolio performance after historical investment snapshots are stored by the Investments provider."
            />

            <InvestmentAccountList />

            <InvestmentHoldingsTable />

            <RecentInvestmentActivity
              activities={
                recentActivities
              }
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}

function InvestmentsEmptyState() {
  return (
    <section className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <PortfolioIcon />
      </div>

      <h2 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        Build your investment portfolio
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
        Add an investment account,
        enter your current holdings,
        and begin tracking portfolio
        value, gains, dividends, and
        investment activity.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href="/dashboard/investments?action=add-account"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <AccountIcon />

          Add your first account
        </Link>

        <Link
          href="/dashboard/accounts"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          View financial accounts
        </Link>
      </div>
    </section>
  );
}

function RecentInvestmentActivity({
  activities,
}: {
  activities:
    InvestmentActivityData[];
}) {
  const {
    investmentAccounts,
    holdings,
  } = useInvestments();

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Recent Investment Activity
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Latest contributions,
            trades, dividends,
            withdrawals, and fees.
          </p>
        </div>

        <Link
          href="/dashboard/investments?action=add-activity"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <PlusIcon />

          Record activity
        </Link>
      </header>

      {activities.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {activities.map(
            (
              activity,
            ) => {
              const account =
                investmentAccounts.find(
                  (
                    currentAccount,
                  ) =>
                    currentAccount.id ===
                    activity.investmentAccountId,
                );

              const holding =
                holdings.find(
                  (
                    currentHolding,
                  ) =>
                    currentHolding.id ===
                    activity.holdingId,
                );

              return (
                <Link
                  key={
                    activity.id
                  }
                  href={`/dashboard/investments?action=edit-activity&activityId=${encodeURIComponent(
                    activity.id,
                  )}`}
                  className="flex items-center gap-3 px-4 py-4 outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                    {getActivityIcon(
                      activity.type,
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {formatActivityType(
                        activity.type,
                      )}

                      {holding
                        ? ` · ${
                            holding.symbol ??
                            holding.name
                          }`
                        : ""}
                    </p>

                    <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {account?.name ??
                        "Unknown account"}

                      {" · "}

                      {formatDate(
                        activity.date,
                      )}

                      {activity.description
                        ? ` · ${activity.description}`
                        : ""}
                    </p>
                  </div>

                  <p
                    className={[
                      "shrink-0 text-sm font-bold",
                      getActivityAmountClassName(
                        activity.type,
                      ),
                    ].join(
                      " ",
                    )}
                  >
                    {getActivityAmountPrefix(
                      activity.type,
                    )}

                    {formatCurrency(
                      activity.amount,
                    )}
                  </p>
                </Link>
              );
            },
          )}
        </div>
      ) : (
        <RecentActivityEmptyState />
      )}
    </section>
  );
}

function RecentActivityEmptyState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <ActivityIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        No investment activity
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Contributions, trades,
        dividends, fees, and transfers
        will appear here.
      </p>

      <Link
        href="/dashboard/investments?action=add-activity"
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <PlusIcon />

        Record activity
      </Link>
    </div>
  );
}

function formatActivityType(
  type:
    InvestmentActivityType,
) {
  switch (
    type
  ) {
    case "contribution":
      return "Contribution";

    case "withdrawal":
      return "Withdrawal";

    case "buy":
      return "Buy";

    case "sell":
      return "Sell";

    case "dividend":
      return "Dividend";

    case "interest":
      return "Interest";

    case "fee":
      return "Fee";

    case "transfer":
      return "Transfer";

    case "adjustment":
    default:
      return "Adjustment";
  }
}

function getActivityAmountPrefix(
  type:
    InvestmentActivityType,
) {
  if (
    type ===
      "contribution" ||
    type ===
      "dividend" ||
    type ===
      "interest" ||
    type ===
      "sell"
  ) {
    return "+";
  }

  if (
    type ===
      "withdrawal" ||
    type ===
      "fee" ||
    type ===
      "buy"
  ) {
    return "-";
  }

  return "";
}

function getActivityAmountClassName(
  type:
    InvestmentActivityType,
) {
  if (
    type ===
      "contribution" ||
    type ===
      "dividend" ||
    type ===
      "interest" ||
    type ===
      "sell"
  ) {
    return "text-[var(--success)]";
  }

  if (
    type ===
      "withdrawal" ||
    type ===
      "fee"
  ) {
    return "text-[var(--danger)]";
  }

  return "text-[var(--text-primary)]";
}

function getActivityIcon(
  type:
    InvestmentActivityType,
) {
  switch (
    type
  ) {
    case "dividend":
    case "interest":
      return <DividendIcon />;

    case "buy":
      return <ArrowDownIcon />;

    case "sell":
      return <ArrowUpIcon />;

    case "contribution":
      return <PlusIcon />;

    case "withdrawal":
      return <MinusIcon />;

    case "fee":
      return <ReceiptIcon />;

    case "transfer":
      return <ActivityIcon />;

    case "adjustment":
    default:
      return <HoldingIcon />;
  }
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

function formatDate(
  value:
    string,
) {
  const date =
    new Date(
      `${value.slice(
        0,
        10,
      )}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    },
  );
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

function AccountIcon() {
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />

      <path d="M3 10h18" />
    </svg>
  );
}

function HoldingIcon() {
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
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
      />
    </svg>
  );
}

function ActivityIcon() {
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
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}

function DividendIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="8"
      />

      <path d="M12 7v10" />
      <path d="M15 9.5c-.7-.9-1.7-1.5-3-1.5-1.7 0-3 1-3 2.4 0 1.6 1.3 2.1 3 2.6 1.7.5 3 1 3 2.6 0 1.4-1.3 2.4-3 2.4-1.3 0-2.5-.6-3.2-1.6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
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

function MinusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      width="17"
      height="17"
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
