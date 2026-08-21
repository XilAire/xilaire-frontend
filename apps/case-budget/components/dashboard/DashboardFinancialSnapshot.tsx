"use client";

import Link from "next/link";
import {
  useMemo,
} from "react";

export type DashboardFinancialSnapshotData = {
  plannedIncome: number;
  receivedIncome: number;
  monthlyAssigned: number;
  monthlyExpenses: number;
  billsTotal: number;
  upcomingBillsTotal: number;
  upcomingBillsCount: number;
};

export type DashboardFinancialSnapshotProps = {
  data?: DashboardFinancialSnapshotData;
  monthLabel?: string;
  budgetHref?: string;
  reportsHref?: string;
  billsHref?: string;
  showHeader?: boolean;
};

type SnapshotMetric = {
  id: string;
  label: string;
  value: string;
  supportingText: string;
  icon:
    | "income"
    | "assigned"
    | "remaining"
    | "expenses"
    | "savings"
    | "cash-flow"
    | "bills"
    | "due-soon";
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral";
};

type ProgressMetric = {
  id: string;
  label: string;
  value: number;
  total: number;
  formattedValue: string;
  formattedTotal: string;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger";
};

const fallbackSnapshotData:
  DashboardFinancialSnapshotData = {
    plannedIncome: 0,
    receivedIncome: 0,
    monthlyAssigned: 0,
    monthlyExpenses: 0,
    billsTotal: 0,
    upcomingBillsTotal: 0,
    upcomingBillsCount: 0,
  };

export default function DashboardFinancialSnapshot({
  data = fallbackSnapshotData,
  monthLabel = "August 2026",
  budgetHref = "/dashboard/budget",
  reportsHref = "/dashboard/reports",
  billsHref = "/dashboard/bills",
  showHeader = true,
}: DashboardFinancialSnapshotProps) {
  const safeData =
    useMemo<
      DashboardFinancialSnapshotData
    >(
      () => ({
        plannedIncome:
          normalizeNonNegativeCurrency(
            data.plannedIncome,
          ),
        receivedIncome:
          normalizeNonNegativeCurrency(
            data.receivedIncome,
          ),
        monthlyAssigned:
          normalizeNonNegativeCurrency(
            data.monthlyAssigned,
          ),
        monthlyExpenses:
          normalizeNonNegativeCurrency(
            data.monthlyExpenses,
          ),
        billsTotal:
          normalizeNonNegativeCurrency(
            data.billsTotal,
          ),
        upcomingBillsTotal:
          normalizeNonNegativeCurrency(
            data.upcomingBillsTotal,
          ),
        upcomingBillsCount:
          normalizeNonNegativeInteger(
            data.upcomingBillsCount,
          ),
      }),
      [
        data,
      ],
    );

  const calculations =
    useMemo(
      () =>
        calculateSnapshot(
          safeData,
        ),
      [
        safeData,
      ],
    );

  const metrics =
    useMemo<SnapshotMetric[]>(
      () => [
        {
          id: "income",
          label: "Planned Income",
          value:
            formatCurrency(
              safeData.plannedIncome,
            ),
          supportingText:
            `${monthLabel} expected income`,
          icon: "income",
          tone: "primary",
        },
        {
          id: "assigned",
          label: "Assigned",
          value:
            formatCurrency(
              safeData.monthlyAssigned,
            ),
          supportingText:
            `${formatPercentage(
              calculations.assignedPercentage,
            )} of planned income`,
          icon: "assigned",
          tone:
            calculations.isOverassigned
              ? "danger"
              : calculations.isBudgetComplete
                ? "success"
                : "primary",
        },
        {
          id: "remaining",
          label: "Remaining to Assign",
          value:
            formatCurrency(
              calculations.remainingToAssign,
            ),
          supportingText:
            calculations.isOverassigned
              ? "Assigned above available income"
              : calculations.isBudgetComplete
                ? "Budget fully assigned"
                : "Still available to assign",
          icon: "remaining",
          tone:
            calculations.remainingToAssign >
            0
              ? "warning"
              : calculations.remainingToAssign <
                  0
                ? "danger"
                : "success",
        },
        {
          id: "expenses",
          label: "Monthly Expenses",
          value:
            formatCurrency(
              safeData.monthlyExpenses,
            ),
          supportingText:
            `${formatPercentage(
              calculations.expensePercentage,
            )} of received income`,
          icon: "expenses",
          tone:
            calculations.expensePercentage >
            100
              ? "danger"
              : calculations.expensePercentage >=
                  85
                ? "warning"
                : "neutral",
        },
        {
          id: "savings",
          label: "Savings Rate",
          value:
            formatPercentage(
              calculations.savingsRate,
            ),
          supportingText:
            calculations.actualSavings >=
            0
              ? `${formatCurrency(
                  calculations.actualSavings,
                )} retained`
              : `${formatCurrency(
                  Math.abs(
                    calculations.actualSavings,
                  ),
                )} shortfall`,
          icon: "savings",
          tone:
            calculations.actualSavings <
            0
              ? "danger"
              : calculations.savingsRate >=
                  20
                ? "success"
                : calculations.savingsRate >=
                    10
                  ? "primary"
                  : "warning",
        },
        {
          id: "cash-flow",
          label: "Net Cash Flow",
          value:
            formatCurrency(
              calculations.netCashFlow,
            ),
          supportingText:
            calculations.netCashFlow >=
            0
              ? "Positive this month"
              : "Expenses exceed income",
          icon: "cash-flow",
          tone:
            calculations.netCashFlow >=
            0
              ? "success"
              : "danger",
        },
        {
          id: "bills",
          label: "Bills This Month",
          value:
            formatCurrency(
              safeData.billsTotal,
            ),
          supportingText:
            "Scheduled bill total",
          icon: "bills",
          tone: "neutral",
        },
        {
          id: "due-soon",
          label: "Upcoming Due",
          value:
            formatCurrency(
              safeData.upcomingBillsTotal,
            ),
          supportingText:
            `${safeData.upcomingBillsCount} ${
              safeData.upcomingBillsCount ===
              1
                ? "bill"
                : "bills"
            } remaining`,
          icon: "due-soon",
          tone:
            safeData.upcomingBillsCount >
            0
              ? "warning"
              : "success",
        },
      ],
      [
        calculations,
        monthLabel,
        safeData,
      ],
    );

  const progressMetrics =
    useMemo<ProgressMetric[]>(
      () => [
        {
          id: "income-progress",
          label: "Income Received",
          value:
            safeData.receivedIncome,
          total:
            safeData.plannedIncome,
          formattedValue:
            formatCurrency(
              safeData.receivedIncome,
            ),
          formattedTotal:
            formatCurrency(
              safeData.plannedIncome,
            ),
          tone:
            safeData.receivedIncome >=
            safeData.plannedIncome &&
            safeData.plannedIncome >
            0
              ? "success"
              : "primary",
        },
        {
          id: "assigned-progress",
          label: "Assigned",
          value:
            safeData.monthlyAssigned,
          total:
            Math.max(
              safeData.plannedIncome,
              safeData.monthlyAssigned,
            ),
          formattedValue:
            formatCurrency(
              safeData.monthlyAssigned,
            ),
          formattedTotal:
            formatCurrency(
              safeData.plannedIncome,
            ),
          tone:
            calculations.isOverassigned
              ? "danger"
              : calculations.isBudgetComplete
                ? "success"
                : "primary",
        },
        {
          id: "spent-progress",
          label: "Spent",
          value:
            safeData.monthlyExpenses,
          total:
            Math.max(
              safeData.receivedIncome,
              safeData.monthlyExpenses,
            ),
          formattedValue:
            formatCurrency(
              safeData.monthlyExpenses,
            ),
          formattedTotal:
            formatCurrency(
              safeData.receivedIncome,
            ),
          tone:
            calculations.expensePercentage >
            100
              ? "danger"
              : calculations.expensePercentage >=
                  85
                ? "warning"
                : "primary",
        },
        {
          id: "savings-progress",
          label:
            calculations.actualSavings >=
            0
              ? "Retained"
              : "Shortfall",
          value:
            Math.abs(
              calculations.actualSavings,
            ),
          total:
            Math.max(
              safeData.receivedIncome,
              Math.abs(
                calculations.actualSavings,
              ),
            ),
          formattedValue:
            formatCurrency(
              Math.abs(
                calculations.actualSavings,
              ),
            ),
          formattedTotal:
            formatCurrency(
              safeData.receivedIncome,
            ),
          tone:
            calculations.actualSavings >=
            0
              ? "success"
              : "danger",
        },
      ],
      [
        calculations,
        safeData,
      ],
    );

  return (
    <section
      aria-labelledby="dashboard-financial-snapshot-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <FinancialSnapshotHeader
          monthLabel={
            monthLabel
          }
          reportsHref={
            reportsHref
          }
        />
      ) : null}

      <div className="p-4 sm:p-5">
        <BudgetHealthBanner
          remainingToAssign={
            calculations.remainingToAssign
          }
          plannedIncome={
            safeData.plannedIncome
          }
          monthlyAssigned={
            safeData.monthlyAssigned
          }
          isBudgetComplete={
            calculations.isBudgetComplete
          }
          isOverassigned={
            calculations.isOverassigned
          }
          budgetHref={
            budgetHref
          }
        />

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(
            (
              metric,
            ) => (
              <FinancialMetricCard
                key={
                  metric.id
                }
                metric={
                  metric
                }
              />
            ),
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <FinancialProgressCard
            progressMetrics={
              progressMetrics
            }
          />

          <SnapshotSummaryCard
            plannedIncome={
              safeData.plannedIncome
            }
            receivedIncome={
              safeData.receivedIncome
            }
            monthlyExpenses={
              safeData.monthlyExpenses
            }
            actualSavings={
              calculations.actualSavings
            }
            netCashFlow={
              calculations.netCashFlow
            }
            savingsRate={
              calculations.savingsRate
            }
            billsHref={
              billsHref
            }
            upcomingBillsCount={
              safeData.upcomingBillsCount
            }
          />
        </div>
      </div>
    </section>
  );
}

type FinancialSnapshotHeaderProps = {
  monthLabel: string;
  reportsHref: string;
};

function FinancialSnapshotHeader({
  monthLabel,
  reportsHref,
}: FinancialSnapshotHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <SnapshotIcon />
        </div>

        <div className="min-w-0">
          <h2
            id="dashboard-financial-snapshot-title"
            className="text-base font-bold text-[var(--text-primary)]"
          >
            Financial Snapshot
          </h2>

          <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
            {monthLabel} overview
          </p>
        </div>
      </div>

      <Link
        href={
          reportsHref
        }
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg px-3 text-xs font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        View reports

        <ChevronRightIcon />
      </Link>
    </header>
  );
}

type BudgetHealthBannerProps = {
  remainingToAssign: number;
  plannedIncome: number;
  monthlyAssigned: number;
  isBudgetComplete: boolean;
  isOverassigned: boolean;
  budgetHref: string;
};

function BudgetHealthBanner({
  remainingToAssign,
  plannedIncome,
  monthlyAssigned,
  isBudgetComplete,
  isOverassigned,
  budgetHref,
}: BudgetHealthBannerProps) {
  if (
    plannedIncome <=
      0 &&
    monthlyAssigned <=
      0
  ) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_18%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--primary)_5%,var(--surface-muted))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <IncomeIcon />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Add income to begin this
              month&apos;s plan
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Add the income you expect
              this month, then assign it
              across your budget items.
            </p>
          </div>
        </div>

        <Link
          href={
            budgetHref
          }
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Open budget

          <ArrowRightIcon />
        </Link>
      </div>
    );
  }

  if (
    isOverassigned
  ) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--danger)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_5%,var(--surface-muted))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
            <AlertIcon />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Your budget is overassigned
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Reduce assigned amounts by{" "}
              {formatCurrency(
                Math.abs(
                  remainingToAssign,
                ),
              )}{" "}
              to bring the monthly plan
              back into balance.
            </p>
          </div>
        </div>

        <Link
          href={
            budgetHref
          }
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
        >
          Fix budget

          <ArrowRightIcon />
        </Link>
      </div>
    );
  }

  if (
    isBudgetComplete
  ) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--success)_20%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_5%,var(--surface-muted))] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
            <CheckCircleIcon />
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Your monthly budget is
              complete
            </p>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              All available income has
              been assigned to a budget
              item.
            </p>
          </div>
        </div>

        <Link
          href={
            budgetHref
          }
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--success)_24%,var(--border-subtle))] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--success)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--success)]"
        >
          Review budget

          <ArrowRightIcon />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--warning)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_5%,var(--surface-muted))] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
          <WalletIcon />
        </div>

        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatCurrency(
              remainingToAssign,
            )}{" "}
            still needs to be assigned
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Finish assigning your
            available income to complete
            the monthly plan.
          </p>
        </div>
      </div>

      <Link
        href={
          budgetHref
        }
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--warning)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--warning)]"
      >
        Finish budget

        <ArrowRightIcon />
      </Link>
    </div>
  );
}

type FinancialMetricCardProps = {
  metric: SnapshotMetric;
};

function FinancialMetricCard({
  metric,
}: FinancialMetricCardProps) {
  const tone =
    getMetricTone(
      metric.tone,
    );

  return (
    <article className="min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
            {metric.label}
          </p>

          <p className="mt-2 truncate text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
            {metric.value}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            tone.iconBackground,
            tone.iconText,
          ].join(" ")}
        >
          <SnapshotMetricIcon
            icon={
              metric.icon
            }
          />
        </div>
      </div>

      <p
        className={[
          "mt-4 truncate text-xs font-semibold",
          tone.supportingText,
        ].join(" ")}
      >
        {metric.supportingText}
      </p>
    </article>
  );
}

type FinancialProgressCardProps = {
  progressMetrics: ProgressMetric[];
};

function FinancialProgressCard({
  progressMetrics,
}: FinancialProgressCardProps) {
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <ProgressIcon />
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Monthly Progress
          </h3>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Income allocation and
            spending activity.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {progressMetrics.map(
          (
            progress,
          ) => (
            <FinancialProgressRow
              key={
                progress.id
              }
              progress={
                progress
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

type FinancialProgressRowProps = {
  progress: ProgressMetric;
};

function FinancialProgressRow({
  progress,
}: FinancialProgressRowProps) {
  const percentage =
    progress.value <=
      0 &&
    progress.total <=
      0
      ? 0
      : calculatePercentage(
          progress.value,
          progress.total,
        );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {progress.label}
          </p>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {
              progress.formattedValue
            }{" "}
            of{" "}
            {
              progress.formattedTotal
            }
          </p>
        </div>

        <span className="shrink-0 text-sm font-bold text-[var(--text-primary)]">
          {formatPercentage(
            percentage,
          )}
        </span>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--surface-default)]">
        <div
          className={[
            "h-full rounded-full transition-[width] duration-500",
            getProgressBarClass(
              progress.tone,
            ),
          ].join(" ")}
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                percentage,
              ),
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

type SnapshotSummaryCardProps = {
  plannedIncome: number;
  receivedIncome: number;
  monthlyExpenses: number;
  actualSavings: number;
  netCashFlow: number;
  savingsRate: number;
  billsHref: string;
  upcomingBillsCount: number;
};

function SnapshotSummaryCard({
  plannedIncome,
  receivedIncome,
  monthlyExpenses,
  actualSavings,
  netCashFlow,
  savingsRate,
  billsHref,
  upcomingBillsCount,
}: SnapshotSummaryCardProps) {
  return (
    <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
          <HealthIcon />
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Financial Health
          </h3>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Key monthly indicators.
          </p>
        </div>
      </div>

      <dl className="mt-5 space-y-4">
        <SummaryRow
          label="Planned income"
          value={formatCurrency(
            plannedIncome,
          )}
        />

        <SummaryRow
          label="Income received"
          value={formatCurrency(
            receivedIncome,
          )}
          valueTone={
            receivedIncome >
            0
              ? "success"
              : "default"
          }
        />

        <SummaryRow
          label="Expenses"
          value={formatCurrency(
            monthlyExpenses,
          )}
        />

        <SummaryRow
          label={
            actualSavings >=
            0
              ? "Monthly retained"
              : "Monthly shortfall"
          }
          value={formatCurrency(
            actualSavings,
          )}
          valueTone={
            actualSavings >=
            0
              ? "success"
              : "danger"
          }
        />

        <SummaryRow
          label="Savings rate"
          value={formatPercentage(
            savingsRate,
          )}
          valueTone={
            savingsRate <
            0
              ? "danger"
              : savingsRate >=
                  20
                ? "success"
                : "default"
          }
        />

        <SummaryRow
          label="Net cash flow"
          value={formatCurrency(
            netCashFlow,
          )}
          valueTone={
            netCashFlow >=
            0
              ? "success"
              : "danger"
          }
        />
      </dl>

      <Link
        href={
          billsHref
        }
        className="mt-5 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <span>
          {upcomingBillsCount}{" "}
          upcoming{" "}
          {upcomingBillsCount ===
          1
            ? "bill"
            : "bills"}
        </span>

        <ArrowRightIcon />
      </Link>
    </section>
  );
}

type SummaryRowProps = {
  label: string;
  value: string;
  valueTone?:
    | "default"
    | "success"
    | "danger";
};

function SummaryRow({
  label,
  value,
  valueTone = "default",
}: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-[var(--text-muted)]">
        {label}
      </dt>

      <dd
        className={[
          "text-sm font-bold",
          valueTone ===
          "success"
            ? "text-[var(--success)]"
            : valueTone ===
                "danger"
              ? "text-[var(--danger)]"
              : "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

type SnapshotCalculation = {
  remainingToAssign: number;
  netCashFlow: number;
  actualSavings: number;
  assignedPercentage: number;
  expensePercentage: number;
  savingsRate: number;
  isBudgetComplete: boolean;
  isOverassigned: boolean;
};

function calculateSnapshot(
  data: DashboardFinancialSnapshotData,
): SnapshotCalculation {
  const remainingToAssign =
    normalizeCurrency(
      data.plannedIncome -
        data.monthlyAssigned,
    );

  const netCashFlow =
    normalizeCurrency(
      data.receivedIncome -
        data.monthlyExpenses,
    );

  const assignedPercentage =
    calculatePercentage(
      data.monthlyAssigned,
      data.plannedIncome,
    );

  const expensePercentage =
    calculatePercentage(
      data.monthlyExpenses,
      data.receivedIncome,
    );

  const actualSavings =
    normalizeCurrency(
      data.receivedIncome -
        data.monthlyExpenses,
    );

  const savingsRate =
    calculatePercentage(
      actualSavings,
      data.receivedIncome,
    );

  const hasPlannedIncome =
    data.plannedIncome >
    0;

  return {
    remainingToAssign,
    netCashFlow,
    actualSavings,
    assignedPercentage,
    expensePercentage,
    savingsRate,
    isBudgetComplete:
      hasPlannedIncome &&
      Math.abs(
        remainingToAssign,
      ) < 0.01,
    isOverassigned:
      data.monthlyAssigned >
      data.plannedIncome +
        0.01,
  };
}

function calculatePercentage(
  value: number,
  total: number,
) {
  if (
    !Number.isFinite(
      value,
    ) ||
    !Number.isFinite(
      total,
    ) ||
    total <= 0
  ) {
    return 0;
  }

  return (
    value /
    total
  ) * 100;
}

function normalizeNonNegativeCurrency(
  value: number,
) {
  return Math.max(
    0,
    normalizeCurrency(
      value,
    ),
  );
}

function normalizeNonNegativeInteger(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      value,
    ),
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
    normalizedValue >=
      100
      ? 0
      : 1,
  )}%`;
}

type MetricTone = {
  iconBackground: string;
  iconText: string;
  supportingText: string;
};

function getMetricTone(
  tone: SnapshotMetric["tone"],
): MetricTone {
  switch (tone) {
    case "success":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        iconText:
          "text-[var(--success)]",
        supportingText:
          "text-[var(--success)]",
      };

    case "warning":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        iconText:
          "text-[var(--warning)]",
        supportingText:
          "text-[var(--warning)]",
      };

    case "danger":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        iconText:
          "text-[var(--danger)]",
        supportingText:
          "text-[var(--danger)]",
      };

    case "primary":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        iconText:
          "text-[var(--primary)]",
        supportingText:
          "text-[var(--primary)]",
      };

    case "neutral":
    default:
      return {
        iconBackground:
          "bg-[var(--surface-default)]",
        iconText:
          "text-[var(--text-muted)]",
        supportingText:
          "text-[var(--text-muted)]",
      };
  }
}

function getProgressBarClass(
  tone: ProgressMetric["tone"],
) {
  switch (tone) {
    case "success":
      return "bg-[var(--success)]";

    case "warning":
      return "bg-[var(--warning)]";

    case "danger":
      return "bg-[var(--danger)]";

    case "primary":
    default:
      return "bg-[var(--primary)]";
  }
}

function SnapshotMetricIcon({
  icon,
}: {
  icon:
    SnapshotMetric["icon"];
}) {
  switch (icon) {
    case "income":
      return (
        <IncomeIcon />
      );

    case "assigned":
      return (
        <AssignedIcon />
      );

    case "remaining":
      return (
        <WalletIcon />
      );

    case "expenses":
      return (
        <ExpensesIcon />
      );

    case "savings":
      return (
        <SavingsIcon />
      );

    case "cash-flow":
      return (
        <CashFlowIcon />
      );

    case "bills":
      return (
        <BillIcon />
      );

    case "due-soon":
      return (
        <CalendarIcon />
      );

    default:
      return (
        <SnapshotIcon />
      );
  }
}

function SnapshotIcon() {
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
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
      <path d="m4 7 6-4 6 7 5-4" />
    </svg>
  );
}

function IncomeIcon() {
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
      <path d="M12 2v20" />
      <path d="m17 7-5-5-5 5" />
      <path d="M5 12h14" />
    </svg>
  );
}

function AssignedIcon() {
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
      <path d="m8 15 2 2 4-4" />
    </svg>
  );
}

function WalletIcon() {
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
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h.01" />
    </svg>
  );
}

function ExpensesIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
    </svg>
  );
}

function SavingsIcon() {
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
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
    </svg>
  );
}

function CashFlowIcon() {
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
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function BillIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </svg>
  );
}

function CalendarIcon() {
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
        height="16"
        rx="2"
      />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function ProgressIcon() {
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
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function HealthIcon() {
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
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckCircleIcon() {
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
        r="9"
      />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function AlertIcon() {
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
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
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