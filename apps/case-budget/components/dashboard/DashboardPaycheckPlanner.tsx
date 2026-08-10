"use client";

import Link from "next/link";
import {
  useMemo,
  type ReactNode,
} from "react";

import {
  usePayCycles,
} from "@/components/providers/PayCyclesProvider";

import type {
  BillPaymentPriority,
  BillPaymentRecommendation,
  BillPaymentRecommendationReason,
  BillPaymentRecommendationStatus,
  PayCycleData,
  PayPeriodBillPlan,
  PayPeriodData,
} from "@/types/pay-cycle";

export type DashboardPaycheckPlannerProps = {
  title?: string;
  description?: string;
  payCyclesHref?: string;
  billsHref?: string;
  transactionsHref?: string;
  maxVisibleRecommendations?: number;
  showHeader?: boolean;
  showInsights?: boolean;
  showWarnings?: boolean;
  showQuickActions?: boolean;
};

type PlannerInsightTone =
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "neutral";

type PlannerInsight = {
  id: string;
  title: string;
  description: string;
  tone: PlannerInsightTone;
};

type PlannerWarning = {
  id: string;
  title: string;
  description: string;
  tone:
    | "warning"
    | "danger";
};

type PlannerSummaryMetric = {
  id: string;
  label: string;
  value: string;
  supportingText: string;
  tone: PlannerInsightTone;
  icon: ReactNode;
};

export default function DashboardPaycheckPlanner({
  title = "Paycheck Planner",
  description =
    "See which bills should be funded from your next paycheck.",
  payCyclesHref =
    "/dashboard/pay-cycles",
  billsHref =
    "/dashboard/bills",
  transactionsHref =
    "/dashboard/transactions",
  maxVisibleRecommendations = 6,
  showHeader = true,
  showInsights = true,
  showWarnings = true,
  showQuickActions = true,
}: DashboardPaycheckPlannerProps) {
  const {
    activePayCycles,
    nextPayCycle,
    nextPayPeriod,
    nextBillPlan,
    plannerSummary,
  } = usePayCycles();

  const recommendations =
    useMemo(
      () =>
        nextBillPlan?.recommendations ??
        [],
      [
        nextBillPlan,
      ],
    );

  const visibleRecommendations =
    recommendations.slice(
      0,
      Math.max(
        0,
        maxVisibleRecommendations,
      ),
    );

  const hiddenRecommendationCount =
    Math.max(
      0,
      recommendations.length -
        visibleRecommendations.length,
    );

  const insights =
    useMemo(
      () =>
        createPlannerInsights(
          nextPayCycle,
          nextPayPeriod,
          nextBillPlan,
        ),
      [
        nextBillPlan,
        nextPayCycle,
        nextPayPeriod,
      ],
    );

  const warnings =
    useMemo(
      () =>
        createPlannerWarnings(
          nextPayCycle,
          nextPayPeriod,
          nextBillPlan,
        ),
      [
        nextBillPlan,
        nextPayCycle,
        nextPayPeriod,
      ],
    );

  const summaryMetrics =
    useMemo<
      PlannerSummaryMetric[]
    >(
      () =>
        createSummaryMetrics(
          nextBillPlan,
          plannerSummary,
        ),
      [
        nextBillPlan,
        plannerSummary,
      ],
    );

  return (
    <section
      aria-labelledby="dashboard-paycheck-planner-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <PlannerHeader
          title={
            title
          }
          description={
            description
          }
          nextPayCycle={
            nextPayCycle
          }
          nextPayPeriod={
            nextPayPeriod
          }
          payCyclesHref={
            payCyclesHref
          }
        />
      ) : null}

      {activePayCycles.length ===
      0 ? (
        <NoPayCycleState
          payCyclesHref={
            payCyclesHref
          }
        />
      ) : !nextPayCycle ||
        !nextPayPeriod ? (
        <NoProjectionState
          payCyclesHref={
            payCyclesHref
          }
        />
      ) : !nextBillPlan ? (
        <NoPlanState
          payCyclesHref={
            payCyclesHref
          }
          billsHref={
            billsHref
          }
        />
      ) : (
        <div className="p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.38fr)]">
            <div className="space-y-4">
              <PaycheckHero
                payCycle={
                  nextPayCycle
                }
                payPeriod={
                  nextPayPeriod
                }
                plan={
                  nextBillPlan
                }
              />

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {summaryMetrics.map(
                  (
                    metric,
                  ) => (
                    <PlannerMetricCard
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
            </div>

            <CashFlowPreview
              plan={
                nextBillPlan
              }
            />
          </div>

          {showWarnings &&
          warnings.length >
            0 ? (
            <PlannerWarnings
              warnings={
                warnings
              }
            />
          ) : null}

          <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Recommended Bills
                </h3>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Recommendations are
                  ordered by urgency,
                  priority, due date, and
                  available cash.
                </p>
              </div>

              <span className="inline-flex min-h-8 items-center rounded-full bg-[var(--surface-default)] px-3 text-xs font-bold text-[var(--text-muted)]">
                {
                  recommendations.length
                }{" "}
                {recommendations.length ===
                1
                  ? "recommendation"
                  : "recommendations"}
              </span>
            </div>

            {visibleRecommendations.length >
            0 ? (
              <>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {visibleRecommendations.map(
                    (
                      recommendation,
                    ) => (
                      <RecommendationRow
                        key={
                          recommendation.id
                        }
                        recommendation={
                          recommendation
                        }
                        billsHref={
                          billsHref
                        }
                      />
                    ),
                  )}
                </div>

                {hiddenRecommendationCount >
                0 ? (
                  <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      {
                        hiddenRecommendationCount
                      }{" "}
                      additional{" "}
                      {hiddenRecommendationCount ===
                      1
                        ? "recommendation"
                        : "recommendations"}{" "}
                      not shown
                    </p>

                    <Link
                      href={
                        billsHref
                      }
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[var(--primary)] outline-none transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      View all bills

                      <ArrowRightIcon />
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <RecommendationEmptyState
                billsHref={
                  billsHref
                }
              />
            )}
          </section>

          {showInsights &&
          insights.length >
            0 ? (
            <PlannerInsights
              insights={
                insights
              }
            />
          ) : null}

          {showQuickActions ? (
            <QuickActions
              payCyclesHref={
                payCyclesHref
              }
              billsHref={
                billsHref
              }
              transactionsHref={
                transactionsHref
              }
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

type PlannerHeaderProps = {
  title: string;
  description: string;
  nextPayCycle:
    PayCycleData | null;
  nextPayPeriod:
    PayPeriodData | null;
  payCyclesHref: string;
};

function PlannerHeader({
  title,
  description,
  nextPayCycle,
  nextPayPeriod,
  payCyclesHref,
}: PlannerHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <PaycheckIcon />
        </div>

        <div className="min-w-0">
          <h2
            id="dashboard-paycheck-planner-title"
            className="text-base font-bold text-[var(--text-primary)]"
          >
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {nextPayCycle &&
        nextPayPeriod ? (
          <span className="inline-flex min-h-9 items-center rounded-lg bg-[var(--surface-muted)] px-3 text-xs font-bold text-[var(--text-muted)]">
            {formatDate(
              nextPayPeriod.expectedPayDate,
            )}
          </span>
        ) : null}

        <Link
          href={
            payCyclesHref
          }
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-xs font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Manage pay cycles

          <ArrowRightIcon />
        </Link>
      </div>
    </header>
  );
}

function PaycheckHero({
  payCycle,
  payPeriod,
  plan,
}: {
  payCycle: PayCycleData;
  payPeriod: PayPeriodData;
  plan: PayPeriodBillPlan;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
            Next paycheck
          </p>

          <h3 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)] sm:text-2xl">
            {payCycle.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
            {payCycle.employerName ? (
              <span>
                {
                  payCycle.employerName
                }
              </span>
            ) : null}

            {payCycle.employerName ? (
              <span aria-hidden="true">
                ·
              </span>
            ) : null}

            <span>
              {formatFrequency(
                payCycle.frequency,
              )}
            </span>

            <span aria-hidden="true">
              ·
            </span>

            <span>
              {formatDate(
                payPeriod.expectedPayDate,
              )}
            </span>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            Expected deposit
          </p>

          <p className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)]">
            {formatCurrency(
              plan.expectedIncome,
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <HeroDetail
          label="Available to allocate"
          value={formatCurrency(
            plan.availableToAllocate,
          )}
        />

        <HeroDetail
          label="Recommended payments"
          value={formatCurrency(
            plan.allocatedAmount,
          )}
        />

        <HeroDetail
          label="Remaining after plan"
          value={formatCurrency(
            plan.remainingAfterAllocation,
          )}
          tone={
            plan.remainingAfterAllocation >
            0
              ? "success"
              : "default"
          }
        />
      </div>
    </article>
  );
}

function HeroDetail({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "success";
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-default)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-bold",
          tone ===
          "success"
            ? "text-[var(--success)]"
            : "text-[var(--text-primary)]",
        ].join(
          " ",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PlannerMetricCard({
  metric,
}: {
  metric: PlannerSummaryMetric;
}) {
  const toneClasses =
    getToneClasses(
      metric.tone,
    );

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-muted)]">
            {metric.label}
          </p>

          <p className="mt-2 truncate text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
            {metric.value}
          </p>
        </div>

        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            toneClasses.iconBackground,
            toneClasses.iconText,
          ].join(
            " ",
          )}
        >
          {metric.icon}
        </div>
      </div>

      <p
        className={[
          "mt-4 truncate text-xs font-semibold",
          toneClasses.supportingText,
        ].join(
          " ",
        )}
      >
        {metric.supportingText}
      </p>
    </article>
  );
}

function CashFlowPreview({
  plan,
}: {
  plan: PayPeriodBillPlan;
}) {
  const availableBeforeReserve =
    normalizeCurrency(
      plan.availableToAllocate +
        plan.minimumCashReserve,
    );

  const allocatedPercentage =
    calculatePercentage(
      plan.allocatedAmount,
      plan.availableToAllocate,
    );

  return (
    <aside className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Cash Flow Preview
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            How the next paycheck is
            currently allocated.
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <FlowIcon />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <FlowRow
          label="Incoming pay and cash"
          value={formatCurrency(
            availableBeforeReserve,
          )}
          tone="primary"
          icon={
            <IncomeIcon />
          }
        />

        <FlowConnector />

        <FlowRow
          label="Cash reserve protected"
          value={formatCurrency(
            plan.minimumCashReserve,
          )}
          tone="warning"
          icon={
            <ReserveIcon />
          }
        />

        <FlowConnector />

        <FlowRow
          label="Recommended bills"
          value={formatCurrency(
            plan.allocatedAmount,
          )}
          tone="danger"
          icon={
            <BillsIcon />
          }
        />

        <FlowConnector />

        <FlowRow
          label="Remaining available"
          value={formatCurrency(
            plan.remainingAfterAllocation,
          )}
          tone={
            plan.remainingAfterAllocation >
            0
              ? "success"
              : "neutral"
          }
          icon={
            <WalletIcon />
          }
        />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--text-muted)]">
          <span>
            Paycheck allocated
          </span>

          <span>
            {formatPercentage(
              allocatedPercentage,
            )}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-default)]">
          <div
            className={[
              "h-full rounded-full transition-[width] duration-500",
              allocatedPercentage >
              100
                ? "bg-[var(--danger)]"
                : allocatedPercentage >=
                    85
                  ? "bg-[var(--warning)]"
                  : "bg-[var(--primary)]",
            ].join(
              " ",
            )}
            style={{
              width:
                `${Math.min(
                  100,
                  Math.max(
                    0,
                    allocatedPercentage,
                  ),
                )}%`,
            }}
          />
        </div>
      </div>
    </aside>
  );
}

function FlowRow({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: PlannerInsightTone;
  icon: ReactNode;
}) {
  const classes =
    getToneClasses(
      tone,
    );

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-default)] p-3">
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          classes.iconBackground,
          classes.iconText,
        ].join(
          " ",
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-bold text-[var(--text-primary)]">
          {value}
        </p>
      </div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex justify-center">
      <ArrowDownIcon />
    </div>
  );
}

function PlannerWarnings({
  warnings,
}: {
  warnings: PlannerWarning[];
}) {
  return (
    <section className="mt-5 grid gap-3 lg:grid-cols-2">
      {warnings.map(
        (
          warning,
        ) => (
          <article
            key={
              warning.id
            }
            className={[
              "flex items-start gap-3 rounded-2xl border p-4",
              warning.tone ===
              "danger"
                ? "border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface-muted))]"
                : "border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-muted))]",
            ].join(
              " ",
            )}
          >
            <div
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                warning.tone ===
                "danger"
                  ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
                  : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
              ].join(
                " ",
              )}
            >
              <AlertIcon />
            </div>

            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {warning.title}
              </h3>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {
                  warning.description
                }
              </p>
            </div>
          </article>
        ),
      )}
    </section>
  );
}

function RecommendationRow({
  recommendation,
  billsHref,
}: {
  recommendation:
    BillPaymentRecommendation;
  billsHref: string;
}) {
  return (
    <Link
      href={`${billsHref}?billId=${encodeURIComponent(
        recommendation.billId,
      )}`}
      className="block px-4 py-4 outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              getRecommendationIconClasses(
                recommendation.status,
              ),
            ].join(
              " ",
            )}
          >
            <RecommendationStatusIcon
              status={
                recommendation.status
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
                {
                  recommendation.billName
                }
              </h4>

              <PriorityBadge
                priority={
                  recommendation.priority
                }
              />

              <RecommendationStatusBadge
                status={
                  recommendation.status
                }
              />
            </div>

            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              {
                recommendation.explanation
              }
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--surface-default)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)]">
                Due{" "}
                {formatDate(
                  recommendation.billDueDate,
                )}
              </span>

              {recommendation.isPastDue ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--danger)]">
                  Past due
                </span>
              ) : null}

              {recommendation.isAutopay ? (
                <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--primary)]">
                  Autopay
                </span>
              ) : null}

              {recommendation.reasons
                .slice(
                  0,
                  2,
                )
                .map(
                  (
                    reason,
                  ) => (
                    <span
                      key={`${recommendation.id}-${reason}`}
                      className="rounded-full bg-[var(--surface-default)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)]"
                    >
                      {formatReason(
                        reason,
                      )}
                    </span>
                  ),
                )}
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-[240px]">
          <RecommendationAmount
            label="Recommended"
            value={
              recommendation.recommendedAmount
            }
            tone={
              recommendation.recommendedAmount >
              0
                ? "primary"
                : "danger"
            }
          />

          <RecommendationAmount
            label="Still needed"
            value={
              recommendation.remainingBillAmount
            }
            tone={
              recommendation.remainingBillAmount >
              0
                ? "danger"
                : "success"
            }
          />
        </div>
      </div>
    </Link>
  );
}

function RecommendationAmount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "primary"
    | "success"
    | "danger";
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-default)] p-3 text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 truncate text-sm font-bold",
          tone ===
          "success"
            ? "text-[var(--success)]"
            : tone ===
                "danger"
              ? "text-[var(--danger)]"
              : "text-[var(--primary)]",
        ].join(
          " ",
        )}
      >
        {formatCurrency(
          value,
        )}
      </p>
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority:
    BillPaymentPriority;
}) {
  const label =
    priority ===
    "critical"
      ? "Critical"
      : priority ===
          "high"
        ? "High"
        : priority ===
            "low"
          ? "Low"
          : "Normal";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
        priority ===
        "critical"
          ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
          : priority ===
              "high"
            ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
            : priority ===
                "low"
              ? "bg-[var(--surface-default)] text-[var(--text-muted)]"
              : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
      ].join(
        " ",
      )}
    >
      {label}
    </span>
  );
}

function RecommendationStatusBadge({
  status,
}: {
  status:
    BillPaymentRecommendationStatus;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
        getRecommendationStatusBadgeClasses(
          status,
        ),
      ].join(
        " ",
      )}
    >
      {formatRecommendationStatus(
        status,
      )}
    </span>
  );
}

function PlannerInsights({
  insights,
}: {
  insights: PlannerInsight[];
}) {
  return (
    <section className="mt-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <SparklesIcon />
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Planner Insights
          </h3>

          <p className="text-xs text-[var(--text-muted)]">
            Clear explanations based on
            the current plan.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {insights.map(
          (
            insight,
          ) => {
            const classes =
              getToneClasses(
                insight.tone,
              );

            return (
              <article
                key={
                  insight.id
                }
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      classes.iconBackground,
                      classes.iconText,
                    ].join(
                      " ",
                    )}
                  >
                    <InsightIcon
                      tone={
                        insight.tone
                      }
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {
                        insight.title
                      }
                    </h4>

                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      {
                        insight.description
                      }
                    </p>
                  </div>
                </div>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}

function QuickActions({
  payCyclesHref,
  billsHref,
  transactionsHref,
}: {
  payCyclesHref: string;
  billsHref: string;
  transactionsHref: string;
}) {
  const actions = [
    {
      id:
        "manage-pay-cycle",
      label:
        "Manage Pay Cycle",
      href:
        payCyclesHref,
      icon:
        <CalendarIcon />,
    },
    {
      id:
        "record-paycheck",
      label:
        "Record Paycheck",
      href:
        `${transactionsHref}?action=add&type=income`,
      icon:
        <IncomeIcon />,
    },
    {
      id:
        "view-bills",
      label:
        "View Bills",
      href:
        billsHref,
      icon:
        <BillsIcon />,
    },
    {
      id:
        "adjust-plan",
      label:
        "Adjust Recommendations",
      href:
        `${payCyclesHref}?view=preferences`,
      icon:
        <SlidersIcon />,
    },
  ];

  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">
        Quick Actions
      </h3>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(
          (
            action,
          ) => (
            <Link
              key={
                action.id
              }
              href={
                action.href
              }
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                {
                  action.icon
                }
              </div>

              <span className="text-sm font-bold text-[var(--text-primary)]">
                {
                  action.label
                }
              </span>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

function NoPayCycleState({
  payCyclesHref,
}: {
  payCyclesHref: string;
}) {
  return (
    <EmptyState
      icon={
        <PaycheckIcon />
      }
      title="Set up your first pay cycle"
      description="Add your paycheck frequency, expected take-home pay, and next payday to begin receiving bill recommendations."
      actionLabel="Set up pay cycle"
      actionHref={
        payCyclesHref
      }
    />
  );
}

function NoProjectionState({
  payCyclesHref,
}: {
  payCyclesHref: string;
}) {
  return (
    <EmptyState
      icon={
        <CalendarIcon />
      }
      title="No upcoming paycheck found"
      description="Review the pay-cycle start date, next payday, frequency, and active status."
      actionLabel="Review pay cycles"
      actionHref={
        payCyclesHref
      }
    />
  );
}

function NoPlanState({
  payCyclesHref,
  billsHref,
}: {
  payCyclesHref: string;
  billsHref: string;
}) {
  return (
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
      <EmptyStateCard
        icon={
          <BillsIcon />
        }
        title="No bill plan is available"
        description="Add unpaid bills with valid due dates so CASE Budget can assign them to the next paycheck."
        actionLabel="Review bills"
        actionHref={
          billsHref
        }
      />

      <EmptyStateCard
        icon={
          <SlidersIcon />
        }
        title="Review planning preferences"
        description="Confirm that this pay cycle is enabled for bill planning and that the cash-reserve rules are correct."
        actionLabel="Planning settings"
        actionHref={
          payCyclesHref
        }
      />
    </div>
  );
}

function RecommendationEmptyState({
  billsHref,
}: {
  billsHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
        <CheckIcon />
      </div>

      <h4 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        No bills need this paycheck
      </h4>

      <p className="mt-1 max-w-md text-xs leading-5 text-[var(--text-muted)]">
        There are no unpaid bills inside
        the current planning window.
      </p>

      <Link
        href={
          billsHref
        }
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        View bills

        <ArrowRightIcon />
      </Link>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        {icon}
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>

      <Link
        href={
          actionHref
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        {actionLabel}

        <ArrowRightIcon />
      </Link>
    </div>
  );
}

function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>

      <Link
        href={
          actionHref
        }
        className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {actionLabel}

        <ArrowRightIcon />
      </Link>
    </article>
  );
}

function createSummaryMetrics(
  plan: PayPeriodBillPlan | null,
  plannerSummary: ReturnType<
    typeof usePayCycles
  >["plannerSummary"],
): PlannerSummaryMetric[] {
  return [
    {
      id:
        "bills-covered",
      label:
        "Bills covered",
      value:
        String(
          plan?.coveredBillCount ??
            0,
        ),
      supportingText:
        `${plan?.partiallyCoveredBillCount ?? 0} partially funded`,
      tone:
        (
          plan?.uncoveredBillCount ??
          0
        ) >
        0
          ? "warning"
          : "success",
      icon:
        <CheckIcon />,
    },
    {
      id:
        "uncovered-bills",
      label:
        "Bills uncovered",
      value:
        String(
          plan?.uncoveredBillCount ??
            0,
        ),
      supportingText:
        `${plannerSummary.insufficientFundsBillCount} insufficient-funds warnings`,
      tone:
        (
          plan?.uncoveredBillCount ??
          0
        ) >
        0
          ? "danger"
          : "success",
      icon:
        <AlertIcon />,
    },
    {
      id:
        "past-due",
      label:
        "Past due",
      value:
        String(
          plan?.pastDueBillCount ??
            0,
        ),
      supportingText:
        (
          plan?.pastDueBillCount ??
          0
        ) >
        0
          ? "Needs immediate attention"
          : "No overdue bills",
      tone:
        (
          plan?.pastDueBillCount ??
          0
        ) >
        0
          ? "danger"
          : "success",
      icon:
        <ClockIcon />,
    },
    {
      id:
        "cash-reserve",
      label:
        "Cash reserve",
      value:
        formatCurrency(
          plan?.minimumCashReserve ??
            0,
        ),
      supportingText:
        "Protected from recommendations",
      tone:
        "warning",
      icon:
        <ReserveIcon />,
    },
  ];
}

function createPlannerInsights(
  payCycle: PayCycleData | null,
  payPeriod: PayPeriodData | null,
  plan: PayPeriodBillPlan | null,
): PlannerInsight[] {
  if (
    !payCycle ||
    !payPeriod ||
    !plan
  ) {
    return [];
  }

  const insights:
    PlannerInsight[] = [];

  if (
    plan.uncoveredBillCount ===
    0 &&
    plan.pastDueBillCount ===
    0
  ) {
    insights.push({
      id:
        "all-covered",
      title:
        "All recommended bills are covered",
      description:
        `The current plan can fund every recommended bill before the next projected paycheck while protecting the ${formatCurrency(
          plan.minimumCashReserve,
        )} cash reserve.`,
      tone:
        "success",
    });
  }

  if (
    plan.remainingAfterAllocation >
    0
  ) {
    insights.push({
      id:
        "remaining-surplus",
      title:
        "Cash remains after the plan",
      description:
        `${formatCurrency(
          plan.remainingAfterAllocation,
        )} remains available after recommended bills and the protected reserve.`,
      tone:
        "primary",
    });
  }

  const earliestRecommendation =
    [
      ...plan.recommendations,
    ].sort(
      (
        firstRecommendation,
        secondRecommendation,
      ) =>
        firstRecommendation.billDueDate.localeCompare(
          secondRecommendation.billDueDate,
        ),
    )[
      0
    ];

  if (
    earliestRecommendation
  ) {
    insights.push({
      id:
        "earliest-bill",
      title:
        `${earliestRecommendation.billName} is the earliest obligation`,
      description:
        `It is due ${formatDate(
          earliestRecommendation.billDueDate,
        )} and should be handled before later-due recommendations.`,
      tone:
        earliestRecommendation.isPastDue
          ? "danger"
          : "neutral",
    });
  }

  const partialRecommendation =
    plan.recommendations.find(
      (
        recommendation,
      ) =>
        recommendation.status ===
        "partially-funded",
    );

  if (
    partialRecommendation
  ) {
    insights.push({
      id:
        "partial-funding",
      title:
        `${partialRecommendation.billName} still needs funding`,
      description:
        `This paycheck can reserve ${formatCurrency(
          partialRecommendation.recommendedAmount,
        )}, but another ${formatCurrency(
          partialRecommendation.remainingBillAmount,
        )} is still needed.`,
      tone:
        "warning",
    });
  }

  return insights.slice(
    0,
    4,
  );
}

function createPlannerWarnings(
  payCycle: PayCycleData | null,
  payPeriod: PayPeriodData | null,
  plan: PayPeriodBillPlan | null,
): PlannerWarning[] {
  if (
    !payCycle ||
    !payPeriod ||
    !plan
  ) {
    return [];
  }

  const warnings:
    PlannerWarning[] = [];

  if (
    plan.pastDueBillCount >
    0
  ) {
    warnings.push({
      id:
        "past-due-bills",
      title:
        `${plan.pastDueBillCount} ${
          plan.pastDueBillCount ===
          1
            ? "bill is"
            : "bills are"
        } past due`,
      description:
        "Review overdue obligations before approving lower-priority recommendations.",
      tone:
        "danger",
    });
  }

  if (
    plan.uncoveredBillCount >
    0
  ) {
    warnings.push({
      id:
        "uncovered-bills",
      title:
        `${plan.uncoveredBillCount} ${
          plan.uncoveredBillCount ===
          1
            ? "bill is"
            : "bills are"
        } not fully covered`,
      description:
        "The current paycheck and available cash are not enough to fully fund every recommended obligation.",
      tone:
        "danger",
    });
  }

  if (
    plan.availableToAllocate <=
    0
  ) {
    warnings.push({
      id:
        "no-allocatable-cash",
      title:
        "No cash is available for bill planning",
      description:
        "The expected paycheck and current balance do not exceed the protected cash reserve.",
      tone:
        "warning",
    });
  }

  const paycheckGap =
    plan.nextExpectedPayDate
      ? differenceInCalendarDays(
          plan.nextExpectedPayDate,
          plan.expectedPayDate,
        )
      : 0;

  if (
    paycheckGap >
    31
  ) {
    warnings.push({
      id:
        "large-paycheck-gap",
      title:
        "Long gap before the following paycheck",
      description:
        `The next projected paycheck is ${paycheckGap} days later. Review flexible spending and reserve levels carefully.`,
      tone:
        "warning",
    });
  }

  return warnings;
}

function formatRecommendationStatus(
  status:
    BillPaymentRecommendationStatus,
) {
  switch (status) {
    case "recommended":
      return "Recommended";

    case "partially-funded":
      return "Partial";

    case "fully-funded":
      return "Covered";

    case "scheduled":
      return "Scheduled";

    case "paid":
      return "Paid";

    case "deferred":
      return "Deferred";

    case "insufficient-funds":
      return "Uncovered";

    case "manual-review":
    default:
      return "Review";
  }
}

function getRecommendationStatusBadgeClasses(
  status:
    BillPaymentRecommendationStatus,
) {
  switch (status) {
    case "fully-funded":
    case "scheduled":
    case "paid":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "partially-funded":
      return "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]";

    case "insufficient-funds":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "recommended":
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";

    case "deferred":
    case "manual-review":
    default:
      return "bg-[var(--surface-default)] text-[var(--text-muted)]";
  }
}

function getRecommendationIconClasses(
  status:
    BillPaymentRecommendationStatus,
) {
  switch (status) {
    case "fully-funded":
    case "scheduled":
    case "paid":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "partially-funded":
      return "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]";

    case "insufficient-funds":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "recommended":
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";

    case "deferred":
    case "manual-review":
    default:
      return "bg-[var(--surface-default)] text-[var(--text-muted)]";
  }
}

function RecommendationStatusIcon({
  status,
}: {
  status:
    BillPaymentRecommendationStatus;
}) {
  switch (status) {
    case "fully-funded":
    case "scheduled":
    case "paid":
      return (
        <CheckIcon />
      );

    case "partially-funded":
      return (
        <HalfCircleIcon />
      );

    case "insufficient-funds":
      return (
        <AlertIcon />
      );

    case "recommended":
      return (
        <BillsIcon />
      );

    case "deferred":
    case "manual-review":
    default:
      return (
        <ClockIcon />
      );
  }
}

function formatReason(
  reason:
    BillPaymentRecommendationReason,
) {
  switch (reason) {
    case "due-before-next-paycheck":
      return "Due before next pay";

    case "past-due":
      return "Past due";

    case "critical-service":
      return "Critical service";

    case "minimum-debt-payment":
      return "Minimum debt payment";

    case "autopay-before-next-paycheck":
      return "Autopay";

    case "insufficient-future-income":
      return "Insufficient income";

    case "cash-flow-optimization":
      return "Cash-flow optimized";

    case "user-priority":
      return "Priority";

    case "manual-selection":
    default:
      return "Manual";
  }
}

function formatFrequency(
  value:
    PayCycleData["frequency"],
) {
  switch (value) {
    case "weekly":
      return "Weekly";

    case "biweekly":
      return "Biweekly";

    case "semimonthly":
      return "Semimonthly";

    case "monthly":
      return "Monthly";

    case "quarterly":
      return "Quarterly";

    case "irregular":
      return "Irregular";

    case "custom":
    default:
      return "Custom";
  }
}

function getToneClasses(
  tone:
    PlannerInsightTone,
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
          "bg-[var(--surface-default)]",
        iconText:
          "text-[var(--text-muted)]",
        supportingText:
          "text-[var(--text-muted)]",
      };
  }
}

function InsightIcon({
  tone,
}: {
  tone:
    PlannerInsightTone;
}) {
  if (
    tone ===
    "success"
  ) {
    return (
      <CheckIcon />
    );
  }

  if (
    tone ===
      "warning" ||
    tone ===
      "danger"
  ) {
    return (
      <AlertIcon />
    );
  }

  return (
    <SparklesIcon />
  );
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
    total <=
      0
  ) {
    return 0;
  }

  return (
    value /
    total
  ) * 100;
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
      value *
        100,
    ) /
    100
  );
}

function differenceInCalendarDays(
  firstDate: string,
  secondDate: string,
) {
  const firstTime =
    new Date(
      `${firstDate}T00:00:00`,
    ).getTime();

  const secondTime =
    new Date(
      `${secondDate}T00:00:00`,
    ).getTime();

  if (
    Number.isNaN(
      firstTime,
    ) ||
    Number.isNaN(
      secondTime,
    )
  ) {
    return 0;
  }

  return Math.round(
    (
      firstTime -
      secondTime
    ) /
      86400000,
  );
}

function formatCurrency(
  value: number,
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

function formatPercentage(
  value: number,
) {
  const safeValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  return `${safeValue.toFixed(
    safeValue >=
      100
      ? 0
      : 1,
  )}%`;
}

function formatDate(
  value: string,
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

function PaycheckIcon() {
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
      <path d="M8 15h3" />
      <path d="M16 13v4" />
      <path d="M14 15h4" />
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
      <path d="M12 21V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13h14" />
    </svg>
  );
}

function BillsIcon() {
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

function ReserveIcon() {
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

function FlowIcon() {
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
      <path d="M12 3v18" />
      <path d="m7 8 5-5 5 5" />
      <path d="m7 16 5 5 5-5" />
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

function CheckIcon() {
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

function ClockIcon() {
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
      <path d="M12 7v5l3 2" />
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
    </svg>
  );
}

function SlidersIcon() {
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
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M1 14h6" />
      <path d="M9 8h6" />
      <path d="M17 16h6" />
    </svg>
  );
}

function SparklesIcon() {
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
      <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8Z" />
      <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z" />
    </svg>
  );
}

function HalfCircleIcon() {
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
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 0 1 0 18Z" />
    </svg>
  );
}

function ArrowDownIcon() {
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
      className="text-[var(--text-muted)]"
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
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
