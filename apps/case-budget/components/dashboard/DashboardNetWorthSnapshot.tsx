"use client";

import Link from "next/link";
import {
  useMemo,
} from "react";

import {
  type AccountData,
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  type NetWorthHistoryPoint,
  useNetWorth,
} from "@/components/providers/NetWorthProvider";

export type DashboardNetWorthAccountType =
  | "checking"
  | "savings"
  | "cash"
  | "investment"
  | "retirement"
  | "real-estate"
  | "vehicle"
  | "credit-card"
  | "mortgage"
  | "loan"
  | "other";

export type DashboardNetWorthAccount = {
  id: string;
  name: string;
  institution?: string;
  type: DashboardNetWorthAccountType;
  balance: number;
  category:
    | "asset"
    | "liability";
  updatedAt?: string;
  included?: boolean;
};

export type DashboardNetWorthHistoryPoint = {
  id: string;
  label: string;
  value: number;
};

export type DashboardNetWorthSnapshotProps = {
  accounts?: DashboardNetWorthAccount[];
  history?: DashboardNetWorthHistoryPoint[];
  title?: string;
  description?: string;
  showHeader?: boolean;
  showAccountBreakdown?: boolean;
  maxAccountsPerGroup?: number;
  netWorthHref?: string;
  accountsHref?: string;
};

type NetWorthSummary = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  previousNetWorth: number;
  changeAmount: number;
  changePercentage: number;
  assetCount: number;
  liabilityCount: number;
  includedAccountCount: number;
};

type AccountGroup = {
  id: string;
  label: string;
  category:
    | "asset"
    | "liability";
  total: number;
  accounts: DashboardNetWorthAccount[];
};

const defaultAccounts:
  DashboardNetWorthAccount[] = [
    {
      id: "primary-checking",
      name: "Primary Checking",
      institution:
        "Navy Federal Credit Union",
      type: "checking",
      balance: 8240.55,
      category: "asset",
      updatedAt:
        "2026-08-02T12:00:00.000Z",
      included: true,
    },
    {
      id: "emergency-savings",
      name: "Emergency Savings",
      institution:
        "Navy Federal Credit Union",
      type: "savings",
      balance: 12500,
      category: "asset",
      updatedAt:
        "2026-08-02T12:00:00.000Z",
      included: true,
    },
    {
      id: "roth-ira",
      name: "Roth IRA",
      institution: "Fidelity",
      type: "retirement",
      balance: 28750.42,
      category: "asset",
      updatedAt:
        "2026-08-01T12:00:00.000Z",
      included: true,
    },
    {
      id: "brokerage",
      name: "Brokerage Account",
      institution: "Fidelity",
      type: "investment",
      balance: 18420.85,
      category: "asset",
      updatedAt:
        "2026-08-01T12:00:00.000Z",
      included: true,
    },
    {
      id: "primary-home",
      name: "Primary Residence",
      type: "real-estate",
      balance: 425000,
      category: "asset",
      updatedAt:
        "2026-07-31T12:00:00.000Z",
      included: true,
    },
    {
      id: "family-vehicle",
      name: "Family Vehicle",
      type: "vehicle",
      balance: 31500,
      category: "asset",
      updatedAt:
        "2026-07-31T12:00:00.000Z",
      included: true,
    },
    {
      id: "mortgage",
      name: "Mortgage",
      institution:
        "Rocket Mortgage",
      type: "mortgage",
      balance: 286450.34,
      category: "liability",
      updatedAt:
        "2026-08-01T12:00:00.000Z",
      included: true,
    },
    {
      id: "vehicle-loan",
      name: "Vehicle Loan",
      institution:
        "Navy Federal Credit Union",
      type: "loan",
      balance: 28420.72,
      category: "liability",
      updatedAt:
        "2026-08-01T12:00:00.000Z",
      included: true,
    },
    {
      id: "capital-one",
      name: "Capital One",
      institution: "Capital One",
      type: "credit-card",
      balance: 6240.18,
      category: "liability",
      updatedAt:
        "2026-08-02T12:00:00.000Z",
      included: true,
    },
    {
      id: "student-loan",
      name: "Student Loan",
      institution: "MOHELA",
      type: "loan",
      balance: 14390.5,
      category: "liability",
      updatedAt:
        "2026-08-01T12:00:00.000Z",
      included: true,
    },
  ];

const defaultHistory:
  DashboardNetWorthHistoryPoint[] = [
    {
      id: "march-2026",
      label: "Mar",
      value: 165240,
    },
    {
      id: "april-2026",
      label: "Apr",
      value: 170480,
    },
    {
      id: "may-2026",
      label: "May",
      value: 173920,
    },
    {
      id: "june-2026",
      label: "Jun",
      value: 180650,
    },
    {
      id: "july-2026",
      label: "Jul",
      value: 184920,
    },
    {
      id: "august-2026",
      label: "Aug",
      value: 189460.08,
    },
  ];

export default function DashboardNetWorthSnapshot({
  accounts: accountsOverride,
  history: historyOverride,
  title = "Net Worth",
  description =
    "Track the value of everything you own and owe.",
  showHeader = true,
  showAccountBreakdown = true,
  maxAccountsPerGroup = 4,
  netWorthHref =
    "/dashboard/net-worth",
  accountsHref =
    "/dashboard/accounts",
}: DashboardNetWorthSnapshotProps) {
  const {
    accounts: providerAccounts,
    includedNetWorthAccounts:
      providerIncludedNetWorthAccounts,
    totalAssets:
      providerTotalAssets,
    totalLiabilities:
      providerTotalLiabilities,
    netWorth:
      providerNetWorth,
  } = useAccounts();

  const {
    history: providerHistory,
  } = useNetWorth();

  const accounts =
    useMemo<
      DashboardNetWorthAccount[]
    >(
      () =>
        accountsOverride ??
        providerAccounts.map(
          (
            account:
              AccountData,
          ): DashboardNetWorthAccount => ({
            id:
              account.id,
            name:
              account.name,
            institution:
              account.institution,
            type:
              account.type,
            balance:
              account.balance,
            category:
              account.classification,
            updatedAt:
              account.updatedAt,
            included:
              account.isIncludedInNetWorth,
          }),
      ),
      [
        accountsOverride,
        providerAccounts,
      ],
    );

  const history =
    useMemo<
      DashboardNetWorthHistoryPoint[]
    >(
      () => {
        if (
          historyOverride
        ) {
          return historyOverride;
        }

        const mappedHistory =
          providerHistory.map(
            (
              point:
                NetWorthHistoryPoint,
            ): DashboardNetWorthHistoryPoint => ({
              id:
                point.id,
              label:
                formatHistoryLabel(
                  point.date,
                ),
              value:
                point.netWorth,
            }),
          );

        if (
          accountsOverride
        ) {
          return mappedHistory;
        }

        const currentDate =
          new Date();

        const currentMonthId =
          `net-worth-${currentDate.getFullYear()}-${String(
            currentDate.getMonth() +
              1,
          ).padStart(
            2,
            "0",
          )}`;

        const currentPoint:
          DashboardNetWorthHistoryPoint = {
            id:
              currentMonthId,
            label:
              currentDate.toLocaleDateString(
                "en-US",
                {
                  month:
                    "short",
                },
              ),
            value:
              providerNetWorth,
          };

        const existingCurrentIndex =
          mappedHistory.findIndex(
            (
              point,
            ) =>
              point.id ===
              currentMonthId,
          );

        if (
          existingCurrentIndex >=
          0
        ) {
          return mappedHistory.map(
            (
              point,
              index,
            ) =>
              index ===
              existingCurrentIndex
                ? currentPoint
                : point,
          );
        }

        return [
          ...mappedHistory,
          currentPoint,
        ];
      },
      [
        accountsOverride,
        historyOverride,
        providerHistory,
        providerNetWorth,
      ],
    );

  const includedAccounts =
    useMemo(
      () => {
        if (
          accountsOverride
        ) {
          return accounts.filter(
            (
              account,
            ) =>
              account.included !==
              false,
          );
        }

        const includedIds =
          new Set(
            providerIncludedNetWorthAccounts.map(
              (
                account,
              ) =>
                account.id,
            ),
          );

        return accounts.filter(
          (
            account,
          ) =>
            includedIds.has(
              account.id,
            ),
        );
      },
      [
        accounts,
        accountsOverride,
        providerIncludedNetWorthAccounts,
      ],
    );

  const excludedAccountCount =
    useMemo(
      () =>
        Math.max(
          0,
          accounts.length -
          includedAccounts.length,
        ),
      [
        accounts.length,
        includedAccounts.length,
      ],
    );

  const summary =
    useMemo(
      () => {
        const calculatedSummary =
          calculateNetWorthSummary(
            includedAccounts,
            history,
          );

        if (
          accountsOverride
        ) {
          return calculatedSummary;
        }

        const previousHistoryPoint =
          history.length >=
          2
            ? history[
                history.length -
                2
              ]
            : null;

        const previousNetWorth =
          previousHistoryPoint?.value ??
          providerNetWorth;

        const changeAmount =
          providerNetWorth -
          previousNetWorth;

        const changePercentage =
          previousNetWorth !==
          0
            ? (
                changeAmount /
                Math.abs(
                  previousNetWorth,
                )
              ) *
              100
            : changeAmount !==
                0
              ? 100
              : 0;

        return {
          ...calculatedSummary,
          totalAssets:
            normalizeCurrency(
              providerTotalAssets,
            ),
          totalLiabilities:
            normalizeCurrency(
              providerTotalLiabilities,
            ),
          netWorth:
            normalizeCurrency(
              providerNetWorth,
            ),
          previousNetWorth:
            normalizeCurrency(
              previousNetWorth,
            ),
          changeAmount:
            normalizeCurrency(
              changeAmount,
            ),
          changePercentage:
            normalizePercentage(
              changePercentage,
            ),
          includedAccountCount:
            providerIncludedNetWorthAccounts.length,
        };
      },
      [
        accountsOverride,
        history,
        includedAccounts,
        providerIncludedNetWorthAccounts.length,
        providerNetWorth,
        providerTotalAssets,
        providerTotalLiabilities,
      ],
    );

  const accountGroups =
    useMemo(
      () =>
        createAccountGroups(
          includedAccounts,
        ),
      [
        includedAccounts,
      ],
    );

  return (
    <section
      aria-labelledby="dashboard-net-worth-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <NetWorthHeader
          title={
            title
          }
          description={
            description
          }
          netWorthHref={
            netWorthHref
          }
        />
      ) : null}

      {includedAccounts.length >
      0 ? (
        <>
          <NetWorthSummarySection
            summary={
              summary
            }
            history={
              history
            }
            excludedAccountCount={
              excludedAccountCount
            }
          />

          {showAccountBreakdown ? (
            <div className="grid gap-5 border-t border-[var(--border-subtle)] p-4 sm:p-5 xl:grid-cols-2">
              {accountGroups.map(
                (
                  group,
                ) => (
                  <NetWorthAccountGroup
                    key={
                      group.id
                    }
                    group={
                      group
                    }
                    maxVisible={
                      maxAccountsPerGroup
                    }
                    accountsHref={
                      accountsHref
                    }
                  />
                ),
              )}
            </div>
          ) : null}
        </>
      ) : (
        <NetWorthEmptyState
          accountsHref={
            accountsHref
          }
        />
      )}
    </section>
  );
}

type NetWorthHeaderProps = {
  title: string;
  description: string;
  netWorthHref: string;
};

function NetWorthHeader({
  title,
  description,
  netWorthHref,
}: NetWorthHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <NetWorthIcon />
        </div>

        <div className="min-w-0">
          <h2
            id="dashboard-net-worth-title"
            className="text-base font-bold text-[var(--text-primary)]"
          >
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={
          netWorthHref
        }
        className="inline-flex min-h-9 items-center gap-1 self-start text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-auto"
      >
        View details

        <ChevronRightIcon />
      </Link>
    </header>
  );
}

type NetWorthSummarySectionProps = {
  summary: NetWorthSummary;
  history: DashboardNetWorthHistoryPoint[];
  excludedAccountCount: number;
};

function NetWorthSummarySection({
  summary,
  history,
  excludedAccountCount,
}: NetWorthSummarySectionProps) {
  return (
    <div className="bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Current net worth
          </p>

          <p
            className={[
              "mt-3 text-3xl font-black tracking-tight sm:text-4xl",
              summary.netWorth >=
              0
                ? "text-[var(--text-primary)]"
                : "text-[var(--danger)]",
            ].join(" ")}
          >
            {formatCurrency(
              summary.netWorth,
            )}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <NetWorthChangeBadge
              changeAmount={
                summary.changeAmount
              }
              changePercentage={
                summary.changePercentage
              }
            />

            <span className="text-xs font-medium text-[var(--text-muted)]">
              compared with the previous
              period
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <span>
              {summary.includedAccountCount}{" "}
              {summary.includedAccountCount ===
              1
                ? "account"
                : "accounts"}{" "}
              included
            </span>

            {excludedAccountCount >
            0 ? (
              <>
                <span aria-hidden="true">
                  ·
                </span>

                <span>
                  {excludedAccountCount}{" "}
                  {excludedAccountCount ===
                  1
                    ? "account"
                    : "accounts"}{" "}
                  excluded
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <SummaryMetric
              label="Total assets"
              value={formatCurrency(
                summary.totalAssets,
              )}
              count={
                summary.assetCount
              }
              tone="success"
              icon={
                <AssetIcon />
              }
            />

            <SummaryMetric
              label="Liabilities"
              value={formatCurrency(
                summary.totalLiabilities,
              )}
              count={
                summary.liabilityCount
              }
              tone="danger"
              icon={
                <LiabilityIcon />
              }
            />
          </div>
        </div>

        <NetWorthHistoryChart
          history={
            history
          }
        />
      </div>
    </div>
  );
}

type NetWorthChangeBadgeProps = {
  changeAmount: number;
  changePercentage: number;
};

function NetWorthChangeBadge({
  changeAmount,
  changePercentage,
}: NetWorthChangeBadgeProps) {
  const isPositive =
    changeAmount > 0.005;

  const isNegative =
    changeAmount < -0.005;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        isPositive
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : isNegative
            ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      ].join(" ")}
    >
      {isPositive ? (
        <TrendUpIcon />
      ) : isNegative ? (
        <TrendDownIcon />
      ) : (
        <MinusIcon />
      )}

      {isPositive
        ? "+"
        : ""}
      {formatCurrency(
        changeAmount,
      )}

      <span>
        (
        {isPositive
          ? "+"
          : ""}
        {formatPercentage(
          changePercentage,
        )}
        )
      </span>
    </span>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string;
  count: number;
  tone:
    | "success"
    | "danger";
  icon: React.ReactNode;
};

function SummaryMetric({
  label,
  value,
  count,
  tone,
  icon,
}: SummaryMetricProps) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          tone ===
          "success"
            ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
            : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-base font-bold text-[var(--text-primary)] sm:text-lg">
        {value}
      </p>

      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {count}{" "}
        {count === 1
          ? "account"
          : "accounts"}
      </p>
    </div>
  );
}

type NetWorthHistoryChartProps = {
  history: DashboardNetWorthHistoryPoint[];
};

function NetWorthHistoryChart({
  history,
}: NetWorthHistoryChartProps) {
  const chartData =
    useMemo(
      () =>
        calculateChartData(
          history,
        ),
      [
        history,
      ],
    );

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Net Worth Trend
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Progress across recent
            periods.
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <ChartIcon />
        </div>
      </div>

      {chartData.length >
      0 ? (
        <>
          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
            {chartData.map(
              (
                item,
              ) => (
                <div
                  key={
                    item.id
                  }
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-2 hidden text-[10px] font-bold text-[var(--text-muted)] sm:block">
                    {formatCompactCurrency(
                      item.value,
                    )}
                  </span>

                  <div className="flex h-32 w-full items-end overflow-hidden rounded-t-lg bg-[var(--surface-muted)]">
                    <div
                      className="w-full rounded-t-lg bg-[var(--primary)] transition-[height] duration-500"
                      style={{
                        height: `${item.heightPercentage}%`,
                      }}
                      title={`${item.label}: ${formatCurrency(
                        item.value,
                      )}`}
                    />
                  </div>

                  <span className="mt-2 truncate text-[10px] font-semibold text-[var(--text-muted)] sm:text-xs">
                    {
                      item.label
                    }
                  </span>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">
                Lowest
              </p>

              <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  Math.min(
                    ...history.map(
                      (
                        item,
                      ) =>
                        item.value,
                    ),
                  ),
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-[var(--text-muted)]">
                Highest
              </p>

              <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  Math.max(
                    ...history.map(
                      (
                        item,
                      ) =>
                        item.value,
                    ),
                  ),
                )}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center text-center">
          <ChartIcon />

          <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
            No history available
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Historical net worth data
            will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

type NetWorthAccountGroupProps = {
  group: AccountGroup;
  maxVisible: number;
  accountsHref: string;
};

function NetWorthAccountGroup({
  group,
  maxVisible,
  accountsHref,
}: NetWorthAccountGroupProps) {
  const visibleAccounts =
    group.accounts.slice(
      0,
      Math.max(
        0,
        maxVisible,
      ),
    );

  const hiddenCount =
    Math.max(
      0,
      group.accounts.length -
        visibleAccounts.length,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-9 w-9 items-center justify-center rounded-xl",
              group.category ===
              "asset"
                ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                : "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
            ].join(" ")}
          >
            {group.category ===
            "asset" ? (
              <AssetIcon />
            ) : (
              <LiabilityIcon />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {group.label}
            </h3>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              {
                group.accounts
                  .length
              }{" "}
              {group.accounts
                .length === 1
                ? "account"
                : "accounts"}
            </p>
          </div>
        </div>

        <p
          className={[
            "text-sm font-bold",
            group.category ===
            "asset"
              ? "text-[var(--success)]"
              : "text-[var(--danger)]",
          ].join(" ")}
        >
          {formatCurrency(
            group.total,
          )}
        </p>
      </header>

      <div className="divide-y divide-[var(--border-subtle)]">
        {visibleAccounts.map(
          (
            account,
          ) => (
            <NetWorthAccountRow
              key={
                account.id
              }
              account={
                account
              }
              accountsHref={
                accountsHref
              }
            />
          ),
        )}
      </div>

      {hiddenCount >
      0 ? (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <Link
            href={
              accountsHref
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            View {hiddenCount} more{" "}
            {hiddenCount ===
            1
              ? "account"
              : "accounts"}

            <ArrowRightIcon />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

type NetWorthAccountRowProps = {
  account: DashboardNetWorthAccount;
  accountsHref: string;
};

function NetWorthAccountRow({
  account,
  accountsHref,
}: NetWorthAccountRowProps) {
  const detailHref =
    `${accountsHref}?accountId=${encodeURIComponent(
      account.id,
    )}`;

  return (
    <Link
      href={
        detailHref
      }
      className="flex items-center gap-3 px-4 py-4 outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--text-muted)]">
        <AccountTypeIcon
          type={
            account.type
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--text-primary)]">
          {account.name}
        </p>

        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {account.institution ??
            getAccountTypeLabel(
              account.type,
            )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p
          className={[
            "text-sm font-bold",
            account.category ===
            "asset"
              ? "text-[var(--text-primary)]"
              : "text-[var(--danger)]",
          ].join(" ")}
        >
          {account.category ===
          "liability"
            ? "-"
            : ""}
          {formatCurrency(
            Math.abs(
              account.balance,
            ),
          )}
        </p>

        {account.updatedAt ? (
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
            Updated{" "}
            {formatRelativeDate(
              account.updatedAt,
            )}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

type NetWorthEmptyStateProps = {
  accountsHref: string;
};

function NetWorthEmptyState({
  accountsHref,
}: NetWorthEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <NetWorthIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        Start tracking your net worth
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Add assets and liabilities to
        see your complete financial
        position and monitor progress
        over time.
      </p>

      <Link
        href={`${accountsHref}?action=add`}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        Add your first account

        <PlusIcon />
      </Link>
    </div>
  );
}

function calculateNetWorthSummary(
  accounts: DashboardNetWorthAccount[],
  history: DashboardNetWorthHistoryPoint[],
): NetWorthSummary {
  const assets =
    accounts.filter(
      (
        account,
      ) =>
        account.category ===
        "asset",
    );

  const liabilities =
    accounts.filter(
      (
        account,
      ) =>
        account.category ===
        "liability",
    );

  const totalAssets =
    assets.reduce(
      (
        total,
        account,
      ) =>
        total +
        Math.abs(
          account.balance,
        ),
      0,
    );

  const totalLiabilities =
    liabilities.reduce(
      (
        total,
        account,
      ) =>
        total +
        Math.abs(
          account.balance,
        ),
      0,
    );

  const netWorth =
    totalAssets -
    totalLiabilities;

  const previousHistoryPoint =
    history.length >=
    2
      ? history[
          history.length -
            2
        ]
      : null;

  const previousNetWorth =
    previousHistoryPoint?.value ??
    netWorth;

  const changeAmount =
    netWorth -
    previousNetWorth;

  const changePercentage =
    previousNetWorth !==
    0
      ? (changeAmount /
          Math.abs(
            previousNetWorth,
          )) *
        100
      : changeAmount !==
          0
        ? 100
        : 0;

  return {
    totalAssets:
      normalizeCurrency(
        totalAssets,
      ),
    totalLiabilities:
      normalizeCurrency(
        totalLiabilities,
      ),
    netWorth:
      normalizeCurrency(
        netWorth,
      ),
    previousNetWorth:
      normalizeCurrency(
        previousNetWorth,
      ),
    changeAmount:
      normalizeCurrency(
        changeAmount,
      ),
    changePercentage:
      normalizePercentage(
        changePercentage,
      ),
    assetCount:
      assets.length,
    liabilityCount:
      liabilities.length,
    includedAccountCount:
      accounts.length,
  };
}

function createAccountGroups(
  accounts: DashboardNetWorthAccount[],
): AccountGroup[] {
  const assets =
    accounts
      .filter(
        (
          account,
        ) =>
          account.category ===
          "asset",
      )
      .sort(
        (
          firstAccount,
          secondAccount,
        ) =>
          secondAccount.balance -
          firstAccount.balance,
      );

  const liabilities =
    accounts
      .filter(
        (
          account,
        ) =>
          account.category ===
          "liability",
      )
      .sort(
        (
          firstAccount,
          secondAccount,
        ) =>
          Math.abs(
            secondAccount.balance,
          ) -
          Math.abs(
            firstAccount.balance,
          ),
      );

  return [
    {
      id: "assets",
      label: "Assets",
      category: "asset",
      total:
        assets.reduce(
          (
            total,
            account,
          ) =>
            total +
            Math.max(
              0,
              account.balance,
            ),
          0,
        ),
      accounts:
        assets,
    },
    {
      id: "liabilities",
      label: "Liabilities",
      category: "liability",
      total:
        liabilities.reduce(
          (
            total,
            account,
          ) =>
            total +
            Math.abs(
              account.balance,
            ),
          0,
        ),
      accounts:
        liabilities,
    },
  ];
}

function calculateChartData(
  history: DashboardNetWorthHistoryPoint[],
) {
  if (
    history.length ===
    0
  ) {
    return [];
  }

  const values =
    history.map(
      (
        item,
      ) =>
        item.value,
    );

  const minimumValue =
    Math.min(
      ...values,
    );

  const maximumValue =
    Math.max(
      ...values,
    );

  const valueRange =
    maximumValue -
    minimumValue;

  return history.map(
    (
      item,
    ) => {
      const normalizedValue =
        valueRange >
        0
          ? (item.value -
              minimumValue) /
            valueRange
          : 1;

      return {
        ...item,
        heightPercentage:
          35 +
          normalizedValue *
            65,
      };
    },
  );
}

function getAccountTypeLabel(
  type: DashboardNetWorthAccountType,
) {
  switch (type) {
    case "checking":
      return "Checking";

    case "savings":
      return "Savings";

    case "cash":
      return "Cash";

    case "investment":
      return "Investment";

    case "retirement":
      return "Retirement";

    case "real-estate":
      return "Real Estate";

    case "vehicle":
      return "Vehicle";

    case "credit-card":
      return "Credit Card";

    case "mortgage":
      return "Mortgage";

    case "loan":
      return "Loan";

    case "other":
    default:
      return "Other";
  }
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatCompactCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatPercentage(
  value: number,
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

function formatHistoryLabel(
  value: string,
) {
  const normalizedValue =
    value.slice(
      0,
      10,
    );

  const date =
    new Date(
      `${normalizedValue}T00:00:00`,
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
      month: "short",
    },
  );
}

function formatRelativeDate(
  value: string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  const now =
    new Date();

  const differenceInDays =
    Math.floor(
      (now.getTime() -
        date.getTime()) /
        86400000,
    );

  if (
    differenceInDays <=
    0
  ) {
    return "today";
  }

  if (
    differenceInDays ===
    1
  ) {
    return "yesterday";
  }

  if (
    differenceInDays <=
    7
  ) {
    return `${differenceInDays} days ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );
}

function normalizeCurrency(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value * 100,
    ) / 100
  );
}

function normalizePercentage(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value * 10,
    ) / 10
  );
}

function AccountTypeIcon({
  type,
}: {
  type:
    DashboardNetWorthAccountType;
}) {
  switch (type) {
    case "checking":
      return (
        <CheckingIcon />
      );

    case "savings":
      return (
        <SavingsIcon />
      );

    case "cash":
      return (
        <CashIcon />
      );

    case "investment":
      return (
        <InvestmentIcon />
      );

    case "retirement":
      return (
        <RetirementIcon />
      );

    case "real-estate":
      return (
        <HomeIcon />
      );

    case "vehicle":
      return (
        <VehicleIcon />
      );

    case "credit-card":
      return (
        <CreditCardIcon />
      );

    case "mortgage":
      return (
        <MortgageIcon />
      );

    case "loan":
      return (
        <LoanIcon />
      );

    case "other":
    default:
      return (
        <AccountIcon />
      );
  }
}

function NetWorthIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </svg>
  );
}

function AssetIcon() {
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
      <path d="M12 21V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13h14" />
    </svg>
  );
}

function LiabilityIcon() {
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
      <path d="M12 3v18" />
      <path d="m7 16 5 5 5-5" />
      <path d="M5 11h14" />
    </svg>
  );
}

function ChartIcon() {
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
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function CheckingIcon() {
  return (
    <svg
      width="19"
      height="19"
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
      <path d="M7 15h4" />
    </svg>
  );
}

function SavingsIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg
      width="19"
      height="19"
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
        r="3"
      />
      <path d="M7 9h.01" />
      <path d="M17 15h.01" />
    </svg>
  );
}

function InvestmentIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </svg>
  );
}

function RetirementIcon() {
  return (
    <svg
      width="19"
      height="19"
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
        r="9"
      />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function VehicleIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 11 2-5h10l2 5" />
      <rect
        x="3"
        y="11"
        width="18"
        height="7"
        rx="2"
      />
      <path d="M5 18v2" />
      <path d="M19 18v2" />
      <path d="M7 14h.01" />
      <path d="M17 14h.01" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg
      width="19"
      height="19"
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
      <path d="M7 15h4" />
    </svg>
  );
}

function MortgageIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 14h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function LoanIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h4" />
      <path d="M9 16h6" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      width="19"
      height="19"
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
        cy="8"
        r="4"
      />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
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
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 7 6 6 4-4 8 8" />
      <path d="M15 17h6v-6" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
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

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}