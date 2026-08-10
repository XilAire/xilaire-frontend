"use client";

import Link from "next/link";
import {
  useMemo,
} from "react";

import {
  useDebts,
} from "@/components/providers/DebtsProvider";

export type DashboardDebtType =
  | "credit-card"
  | "auto-loan"
  | "student-loan"
  | "personal-loan"
  | "mortgage"
  | "medical"
  | "other";

export type DashboardDebtAccount = {
  id: string;
  name: string;
  lender?: string;
  type: DashboardDebtType;
  originalBalance: number;
  currentBalance: number;
  minimumPayment: number;
  interestRate?: number;
  nextPaymentDate?: string;
  payoffDate?: string;
  status?:
    | "current"
    | "due-soon"
    | "past-due"
    | "paid-off";
};

export type DashboardDebtProgressProps = {
  debts?: DashboardDebtAccount[];
  title?: string;
  description?: string;
  maxVisible?: number;
  showHeader?: boolean;
  showSummary?: boolean;
  debtsHref?: string;
  addDebtHref?: string;
  payoffMethod?:
    | "snowball"
    | "avalanche"
    | "custom";
};

type DebtSummary = {
  originalBalance: number;
  currentBalance: number;
  amountPaid: number;
  totalMinimumPayments: number;
  averageInterestRate: number;
  payoffPercentage: number;
  activeDebtCount: number;
  paidOffDebtCount: number;
  nextDebt: DashboardDebtAccount | null;
};

const defaultDebts:
  DashboardDebtAccount[] = [
    {
      id: "capital-one",
      name: "Capital One",
      lender: "Capital One",
      type: "credit-card",
      originalBalance: 8500,
      currentBalance: 6240.18,
      minimumPayment: 185,
      interestRate: 24.99,
      nextPaymentDate:
        "2026-08-12",
      payoffDate:
        "2028-04-01",
      status: "current",
    },
    {
      id: "auto-loan",
      name: "Vehicle Loan",
      lender:
        "Navy Federal Credit Union",
      type: "auto-loan",
      originalBalance: 38500,
      currentBalance: 28420.72,
      minimumPayment: 684.12,
      interestRate: 5.49,
      nextPaymentDate:
        "2026-08-15",
      payoffDate:
        "2030-02-01",
      status: "current",
    },
    {
      id: "student-loan",
      name: "Student Loan",
      lender: "MOHELA",
      type: "student-loan",
      originalBalance: 18500,
      currentBalance: 14390.5,
      minimumPayment: 224.35,
      interestRate: 4.75,
      nextPaymentDate:
        "2026-08-18",
      payoffDate:
        "2032-06-01",
      status: "current",
    },
    {
      id: "medical-debt",
      name: "Medical Balance",
      lender:
        "Palm Beach Medical Center",
      type: "medical",
      originalBalance: 3200,
      currentBalance: 1150,
      minimumPayment: 125,
      interestRate: 0,
      nextPaymentDate:
        "2026-08-05",
      payoffDate:
        "2027-05-01",
      status: "due-soon",
    },
  ];

export default function DashboardDebtProgress({
  debts: debtsOverride,
  title = "Debt Progress",
  description =
    "Track balances, payments, and progress toward becoming debt-free.",
  maxVisible = 4,
  showHeader = true,
  showSummary = true,
  debtsHref = "/dashboard/debts",
  addDebtHref =
    "/dashboard/debts?action=add",
  payoffMethod = "snowball",
}: DashboardDebtProgressProps) {
  const {
    debts: providerDebts,
  } = useDebts();

  const debts =
    debtsOverride ??
    providerDebts.map(
      (
        debt,
      ) => ({
        id: debt.id,
        name: debt.name,
        lender: debt.lender,
        type: debt.type,
        originalBalance:
          debt.originalBalance,
        currentBalance:
          debt.currentBalance,
        minimumPayment:
          debt.minimumPayment,
        interestRate:
          debt.interestRate,
        status:
          debt.status ===
          "paid-off"
            ? "paid-off"
            : "current",
      }),
    );

  const sortedDebts =
    useMemo(
      () =>
        sortDebts(
          debts,
          payoffMethod,
        ),
      [
        debts,
        payoffMethod,
      ],
    );

  const summary =
    useMemo(
      () =>
        calculateDebtSummary(
          debts,
          sortedDebts,
        ),
      [
        debts,
        sortedDebts,
      ],
    );

  const visibleDebts =
    sortedDebts.slice(
      0,
      Math.max(
        0,
        maxVisible,
      ),
    );

  const hiddenDebtCount =
    Math.max(
      0,
      sortedDebts.length -
        visibleDebts.length,
    );

  return (
    <section
      aria-labelledby="dashboard-debt-progress-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <DebtProgressHeader
          title={
            title
          }
          description={
            description
          }
          debtCount={
            summary.activeDebtCount
          }
          debtsHref={
            debtsHref
          }
        />
      ) : null}

      {debts.length >
      0 ? (
        <>
          {showSummary ? (
            <DebtSummarySection
              summary={
                summary
              }
              payoffMethod={
                payoffMethod
              }
            />
          ) : null}

          <div className="divide-y divide-[var(--border-subtle)]">
            {visibleDebts.map(
              (
                debt,
                index,
              ) => (
                <DebtProgressRow
                  key={
                    debt.id
                  }
                  debt={
                    debt
                  }
                  priority={
                    index + 1
                  }
                  payoffMethod={
                    payoffMethod
                  }
                  debtsHref={
                    debtsHref
                  }
                />
              ),
            )}
          </div>

          {hiddenDebtCount >
          0 ? (
            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {hiddenDebtCount}{" "}
                additional{" "}
                {hiddenDebtCount ===
                1
                  ? "debt"
                  : "debts"}{" "}
                not shown
              </p>

              <Link
                href={
                  debtsHref
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                View all debts

                <ArrowRightIcon />
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <DebtProgressEmptyState
          addDebtHref={
            addDebtHref
          }
        />
      )}
    </section>
  );
}

type DebtProgressHeaderProps = {
  title: string;
  description: string;
  debtCount: number;
  debtsHref: string;
};

function DebtProgressHeader({
  title,
  description,
  debtCount,
  debtsHref,
}: DebtProgressHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <DebtIcon />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dashboard-debt-progress-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              {title}
            </h2>

            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
              {debtCount}
            </span>
          </div>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={
          debtsHref
        }
        className="inline-flex min-h-9 items-center gap-1 self-start text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-auto"
      >
        View debts

        <ChevronRightIcon />
      </Link>
    </header>
  );
}

type DebtSummarySectionProps = {
  summary: DebtSummary;
  payoffMethod:
    DashboardDebtProgressProps["payoffMethod"];
};

function DebtSummarySection({
  summary,
  payoffMethod,
}: DebtSummarySectionProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DebtSummaryMetric
          label="Total Remaining"
          value={formatCurrency(
            summary.currentBalance,
          )}
          icon={<BalanceIcon />}
          tone="primary"
        />

        <DebtSummaryMetric
          label="Paid Down"
          value={formatCurrency(
            summary.amountPaid,
          )}
          supportingText={`${formatPercentage(
            summary.payoffPercentage,
          )} complete`}
          icon={<ProgressIcon />}
          tone="success"
        />

        <DebtSummaryMetric
          label="Minimum Payments"
          value={formatCurrency(
            summary.totalMinimumPayments,
          )}
          supportingText="Per month"
          icon={<PaymentIcon />}
          tone="neutral"
        />

        <DebtSummaryMetric
          label="Average Interest"
          value={formatPercentage(
            summary.averageInterestRate,
          )}
          supportingText="Weighted average"
          icon={<InterestIcon />}
          tone={
            summary.averageInterestRate >=
            15
              ? "danger"
              : summary.averageInterestRate >=
                  8
                ? "warning"
                : "neutral"
          }
        />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
              <TargetIcon />
            </div>

            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Payoff strategy:{" "}
                {getPayoffMethodLabel(
                  payoffMethod,
                )}
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {summary.nextDebt
                  ? `${summary.nextDebt.name} is currently your next payoff priority.`
                  : "No active debt payoff priority is available."}
              </p>
            </div>
          </div>

          {summary.nextDebt ? (
            <Link
              href={`/dashboard/debts?debtId=${encodeURIComponent(
                summary.nextDebt.id,
              )}`}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              View priority

              <ArrowRightIcon />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type DebtSummaryMetricProps = {
  label: string;
  value: string;
  supportingText?: string;
  icon: React.ReactNode;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral";
};

function DebtSummaryMetric({
  label,
  value,
  supportingText,
  icon,
  tone,
}: DebtSummaryMetricProps) {
  const toneClasses =
    getSummaryToneClasses(
      tone,
    );

  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          toneClasses.iconBackground,
          toneClasses.iconText,
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-bold tracking-tight text-[var(--text-primary)]">
        {value}
      </p>

      {supportingText ? (
        <p
          className={[
            "mt-1 truncate text-xs font-semibold",
            toneClasses.supportingText,
          ].join(" ")}
        >
          {supportingText}
        </p>
      ) : null}
    </article>
  );
}

type DebtProgressRowProps = {
  debt: DashboardDebtAccount;
  priority: number;
  payoffMethod:
    DashboardDebtProgressProps["payoffMethod"];
  debtsHref: string;
};

function DebtProgressRow({
  debt,
  priority,
  payoffMethod,
  debtsHref,
}: DebtProgressRowProps) {
  const progress =
    calculateDebtProgress(
      debt,
    );

  const remainingAmount =
    Math.max(
      0,
      debt.currentBalance,
    );

  const detailHref =
    `${debtsHref}?debtId=${encodeURIComponent(
      debt.id,
    )}`;

  return (
    <article className="px-4 py-5 transition hover:bg-[var(--surface-muted)] sm:px-5">
      <div className="flex items-start gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <DebtTypeIcon
            type={
              debt.type
            }
          />

          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--surface-default)] bg-[var(--primary)] px-1 text-[9px] font-black text-white">
            {priority}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-base">
                  {debt.name}
                </h3>

                <DebtStatusBadge
                  status={
                    debt.status ??
                    "current"
                  }
                />
              </div>

              <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                {debt.lender ??
                  getDebtTypeLabel(
                    debt.type,
                  )}
              </p>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-base font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  remainingAmount,
                )}
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                remaining
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                {formatCurrency(
                  progress.amountPaid,
                )}{" "}
                paid of{" "}
                {formatCurrency(
                  debt.originalBalance,
                )}
              </p>

              <p className="text-xs font-bold text-[var(--text-primary)]">
                {formatPercentage(
                  progress.percentage,
                )}
              </p>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div
                className={[
                  "h-full rounded-full transition-[width] duration-500",
                  progress.percentage >=
                  100
                    ? "bg-[var(--success)]"
                    : "bg-[var(--primary)]",
                ].join(" ")}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      progress.percentage,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <DebtMetadataBadge
                label="Minimum"
                value={formatCurrency(
                  debt.minimumPayment,
                )}
              />

              {typeof debt.interestRate ===
                "number" ? (
                <DebtMetadataBadge
                  label="APR"
                  value={formatPercentage(
                    debt.interestRate,
                  )}
                  tone={
                    debt.interestRate >=
                    15
                      ? "danger"
                      : debt.interestRate >=
                          8
                        ? "warning"
                        : "default"
                  }
                />
              ) : null}

              {debt.nextPaymentDate ? (
                <DebtMetadataBadge
                  label="Next payment"
                  value={formatDate(
                    debt.nextPaymentDate,
                  )}
                  tone={
                    debt.status ===
                    "past-due"
                      ? "danger"
                      : debt.status ===
                          "due-soon"
                        ? "warning"
                        : "default"
                  }
                />
              ) : null}
            </div>

            <Link
              href={
                detailHref
              }
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-lg px-3 text-xs font-bold text-[var(--primary)] outline-none transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-auto"
            >
              {priority === 1
                ? getPriorityActionLabel(
                    payoffMethod,
                  )
                : "View debt"}

              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

type DebtMetadataBadgeProps = {
  label: string;
  value: string;
  tone?:
    | "default"
    | "warning"
    | "danger";
};

function DebtMetadataBadge({
  label,
  value,
  tone = "default",
}: DebtMetadataBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
        tone ===
        "danger"
          ? "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
          : tone ===
              "warning"
            ? "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      ].join(" ")}
    >
      <span>
        {label}
      </span>

      <strong className="font-bold">
        {value}
      </strong>
    </span>
  );
}

type DebtStatusBadgeProps = {
  status: NonNullable<
    DashboardDebtAccount["status"]
  >;
};

function DebtStatusBadge({
  status,
}: DebtStatusBadgeProps) {
  const config =
    getDebtStatusConfig(
      status,
    );

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
        config.classes,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

type DebtProgressEmptyStateProps = {
  addDebtHref: string;
};

function DebtProgressEmptyState({
  addDebtHref,
}: DebtProgressEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <DebtIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        No debts added yet
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Add credit cards, loans, and
        other balances to build a
        personalized debt payoff plan.
      </p>

      <Link
        href={
          addDebtHref
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        Add your first debt

        <PlusIcon />
      </Link>
    </div>
  );
}

function calculateDebtSummary(
  debts: DashboardDebtAccount[],
  sortedDebts: DashboardDebtAccount[],
): DebtSummary {
  const activeDebts =
    debts.filter(
      (
        debt,
      ) =>
        debt.currentBalance >
          0.005 &&
        debt.status !==
          "paid-off",
    );

  const paidOffDebts =
    debts.filter(
      (
        debt,
      ) =>
        debt.currentBalance <=
          0.005 ||
        debt.status ===
          "paid-off",
    );

  const originalBalance =
    activeDebts.reduce(
      (
        total,
        debt,
      ) =>
        total +
        Math.max(
          0,
          debt.originalBalance,
        ),
      0,
    );

  const currentBalance =
    activeDebts.reduce(
      (
        total,
        debt,
      ) =>
        total +
        Math.max(
          0,
          debt.currentBalance,
        ),
      0,
    );

  const amountPaid =
    Math.max(
      0,
      originalBalance -
        currentBalance,
    );

  const totalMinimumPayments =
    activeDebts.reduce(
      (
        total,
        debt,
      ) =>
        total +
        Math.max(
          0,
          debt.minimumPayment,
        ),
      0,
    );

  const weightedInterestTotal =
    activeDebts.reduce(
      (
        total,
        debt,
      ) =>
        total +
        Math.max(
          0,
          debt.currentBalance,
        ) *
          Math.max(
            0,
            debt.interestRate ??
              0,
          ),
      0,
    );

  const averageInterestRate =
    currentBalance > 0
      ? weightedInterestTotal /
        currentBalance
      : 0;

  const payoffPercentage =
    originalBalance > 0
      ? (amountPaid /
          originalBalance) *
        100
      : debts.length > 0
        ? 100
        : 0;

  const nextDebt =
    sortedDebts.find(
      (
        debt,
      ) =>
        debt.currentBalance >
          0.005 &&
        debt.status !==
          "paid-off",
    ) ?? null;

  return {
    originalBalance:
      normalizeCurrency(
        originalBalance,
      ),
    currentBalance:
      normalizeCurrency(
        currentBalance,
      ),
    amountPaid:
      normalizeCurrency(
        amountPaid,
      ),
    totalMinimumPayments:
      normalizeCurrency(
        totalMinimumPayments,
      ),
    averageInterestRate:
      normalizePercentage(
        averageInterestRate,
      ),
    payoffPercentage:
      normalizePercentage(
        payoffPercentage,
      ),
    activeDebtCount:
      activeDebts.length,
    paidOffDebtCount:
      paidOffDebts.length,
    nextDebt,
  };
}

function calculateDebtProgress(
  debt: DashboardDebtAccount,
) {
  const originalBalance =
    Math.max(
      0,
      debt.originalBalance,
    );

  const currentBalance =
    Math.max(
      0,
      debt.currentBalance,
    );

  const amountPaid =
    Math.max(
      0,
      originalBalance -
        currentBalance,
    );

  const percentage =
    originalBalance > 0
      ? (amountPaid /
          originalBalance) *
        100
      : currentBalance <= 0
        ? 100
        : 0;

  return {
    amountPaid:
      normalizeCurrency(
        amountPaid,
      ),
    percentage:
      normalizePercentage(
        percentage,
      ),
  };
}

function sortDebts(
  debts: DashboardDebtAccount[],
  payoffMethod:
    DashboardDebtProgressProps["payoffMethod"],
) {
  return [
    ...debts,
  ].sort(
    (
      firstDebt,
      secondDebt,
    ) => {
      const firstPaidOff =
        firstDebt.currentBalance <=
          0.005 ||
        firstDebt.status ===
          "paid-off";

      const secondPaidOff =
        secondDebt.currentBalance <=
          0.005 ||
        secondDebt.status ===
          "paid-off";

      if (
        firstPaidOff !==
        secondPaidOff
      ) {
        return firstPaidOff
          ? 1
          : -1;
      }

      if (
        payoffMethod ===
        "avalanche"
      ) {
        const interestDifference =
          (secondDebt.interestRate ??
            0) -
          (firstDebt.interestRate ??
            0);

        if (
          interestDifference !==
          0
        ) {
          return interestDifference;
        }
      }

      if (
        payoffMethod ===
        "snowball"
      ) {
        const balanceDifference =
          firstDebt.currentBalance -
          secondDebt.currentBalance;

        if (
          balanceDifference !==
          0
        ) {
          return balanceDifference;
        }
      }

      const statusDifference =
        getDebtStatusPriority(
          firstDebt.status ??
            "current",
        ) -
        getDebtStatusPriority(
          secondDebt.status ??
            "current",
        );

      if (
        statusDifference !==
        0
      ) {
        return statusDifference;
      }

      return firstDebt.name.localeCompare(
        secondDebt.name,
      );
    },
  );
}

function getPayoffMethodLabel(
  payoffMethod:
    DashboardDebtProgressProps["payoffMethod"],
) {
  switch (payoffMethod) {
    case "avalanche":
      return "Debt Avalanche";

    case "custom":
      return "Custom Order";

    case "snowball":
    default:
      return "Debt Snowball";
  }
}

function getPriorityActionLabel(
  payoffMethod:
    DashboardDebtProgressProps["payoffMethod"],
) {
  switch (payoffMethod) {
    case "avalanche":
      return "Highest APR";

    case "custom":
      return "Priority debt";

    case "snowball":
    default:
      return "Smallest balance";
  }
}

function getDebtTypeLabel(
  type: DashboardDebtType,
) {
  switch (type) {
    case "credit-card":
      return "Credit Card";

    case "auto-loan":
      return "Auto Loan";

    case "student-loan":
      return "Student Loan";

    case "personal-loan":
      return "Personal Loan";

    case "mortgage":
      return "Mortgage";

    case "medical":
      return "Medical Debt";

    case "other":
    default:
      return "Other Debt";
  }
}

function getDebtStatusPriority(
  status: NonNullable<
    DashboardDebtAccount["status"]
  >,
) {
  switch (status) {
    case "past-due":
      return 0;

    case "due-soon":
      return 1;

    case "current":
      return 2;

    case "paid-off":
      return 3;

    default:
      return 4;
  }
}

function getDebtStatusConfig(
  status: NonNullable<
    DashboardDebtAccount["status"]
  >,
) {
  switch (status) {
    case "past-due":
      return {
        label: "Past due",
        classes:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
      };

    case "due-soon":
      return {
        label: "Due soon",
        classes:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
      };

    case "paid-off":
      return {
        label: "Paid off",
        classes:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
      };

    case "current":
    default:
      return {
        label: "Current",
        classes:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
      };
  }
}

function getSummaryToneClasses(
  tone:
    DebtSummaryMetricProps["tone"],
) {
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
          "bg-[var(--surface-muted)]",
        iconText:
          "text-[var(--text-muted)]",
        supportingText:
          "text-[var(--text-muted)]",
      };
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

function formatDate(
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

function DebtTypeIcon({
  type,
}: {
  type: DashboardDebtType;
}) {
  switch (type) {
    case "credit-card":
      return (
        <CreditCardIcon />
      );

    case "auto-loan":
      return (
        <VehicleIcon />
      );

    case "student-loan":
      return (
        <EducationIcon />
      );

    case "personal-loan":
      return (
        <PersonalLoanIcon />
      );

    case "mortgage":
      return (
        <HomeIcon />
      );

    case "medical":
      return (
        <MedicalIcon />
      );

    case "other":
    default:
      return (
        <DebtIcon />
      );
  }
}

function DebtIcon() {
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
      <path d="M6 3h12v18H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h4" />
      <path d="M9 16h6" />
    </svg>
  );
}

function CreditCardIcon() {
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

function VehicleIcon() {
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

function EducationIcon() {
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
      <path d="m3 10 9-5 9 5-9 5Z" />
      <path d="M7 12v5c3 2 7 2 10 0v-5" />
      <path d="M21 10v6" />
    </svg>
  );
}

function PersonalLoanIcon() {
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
      <circle
        cx="12"
        cy="8"
        r="4"
      />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <path d="M12 12v5" />
      <path d="M10 15h4" />
    </svg>
  );
}

function HomeIcon() {
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
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function MedicalIcon() {
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
      <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z" />
    </svg>
  );
}

function BalanceIcon() {
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
      <path d="M4 7h16" />
      <path d="M6 3h12v18H6Z" />
      <path d="M9 12h6" />
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

function PaymentIcon() {
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
      <path d="M7 15h3" />
    </svg>
  );
}

function InterestIcon() {
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
      <path d="m19 5-14 14" />
      <circle
        cx="7"
        cy="7"
        r="2"
      />
      <circle
        cx="17"
        cy="17"
        r="2"
      />
    </svg>
  );
}

function TargetIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="5"
      />
      <circle
        cx="12"
        cy="12"
        r="1"
      />
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