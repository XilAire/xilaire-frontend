"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import PayCyclePreferencesPanel from "@/components/pay-cycles/PayCyclePreferencesPanel";
import PayCycleSetupFlow from "@/components/pay-cycles/PayCycleSetupFlow";
import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  usePayCycles,
} from "@/components/providers/PayCyclesProvider";

import type {
  PayCycleData,
  PayCycleProjection,
  PayPeriodBillPlan,
  PayPeriodData,
} from "@/types/pay-cycle";

export type PayCyclesOverviewProps = {
  title?: string;
  description?: string;
  dashboardHref?: string;
  billsHref?: string;
  transactionsHref?: string;
};

type PayCycleFilter =
  | "all"
  | "active"
  | "paused"
  | "archived";

export default function PayCyclesOverview({
  title = "Pay Cycles",
  description =
    "Manage paycheck schedules, projected deposits, and paycheck-to-bill planning.",
  dashboardHref =
    "/dashboard",
  billsHref =
    "/dashboard/bills",
  transactionsHref =
    "/dashboard/transactions",
}: PayCyclesOverviewProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const preferencesSectionRef =
    useRef<HTMLElement | null>(
      null,
    );

  const {
    accounts,
  } = useAccounts();

  const {
    payCycles,
    preferences,
    projectedPayPeriodsByCycle,
    billPlansByCycle,
    projectionsByCycle,
    setPayCycleStatus,
    deletePayCycle,
    updatePreferences,
    resetPreferences,
    regeneratePlans,
  } = usePayCycles();

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<PayCycleFilter>(
      "all",
    );

  const [
    isSetupOpen,
    setIsSetupOpen,
  ] = useState(
    false,
  );

  const [
    expandedPayCycleId,
    setExpandedPayCycleId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    pendingDeleteId,
    setPendingDeleteId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isPreferencesOpen,
    setIsPreferencesOpen,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      const requestedAction =
        searchParams.get(
          "action",
        );

      const requestedView =
        searchParams.get(
          "view",
        );

      if (
        requestedAction ===
        "add"
      ) {
        setIsSetupOpen(
          true,
        );

        const params =
          new URLSearchParams(
            searchParams.toString(),
          );

        params.delete(
          "action",
        );

        const query =
          params.toString();

        router.replace(
          query
            ? `${pathname}?${query}`
            : pathname,
          {
            scroll:
              false,
          },
        );
      }

      if (
        requestedView ===
        "preferences"
      ) {
        setIsPreferencesOpen(
          true,
        );

        window.setTimeout(
          () => {
            preferencesSectionRef.current?.scrollIntoView({
              behavior:
                "smooth",
              block:
                "start",
            });
          },
          50,
        );
      }
    },
    [
      pathname,
      router,
      searchParams,
    ],
  );

  const filteredPayCycles =
    useMemo(
      () =>
        payCycles.filter(
          (
            payCycle,
          ) =>
            selectedFilter ===
              "all" ||
            payCycle.status ===
              selectedFilter,
        ),
      [
        payCycles,
        selectedFilter,
      ],
    );

  const summary =
    useMemo(
      () =>
        createOverviewSummary(
          payCycles,
          projectionsByCycle,
          billPlansByCycle,
        ),
      [
        billPlansByCycle,
        payCycles,
        projectionsByCycle,
      ],
    );

  function handleSetupComplete(
    payCycleId: string,
  ) {
    setIsSetupOpen(
      false,
    );

    setExpandedPayCycleId(
      payCycleId,
    );

    setSelectedFilter(
      "all",
    );
  }

  function handleDeleteConfirmed() {
    if (
      !pendingDeleteId
    ) {
      return;
    }

    deletePayCycle(
      pendingDeleteId,
    );

    if (
      expandedPayCycleId ===
      pendingDeleteId
    ) {
      setExpandedPayCycleId(
        null,
      );
    }

    setPendingDeleteId(
      null,
    );
  }

  if (
    isSetupOpen
  ) {
    return (
      <PayCycleSetupFlow
        onCancel={() =>
          setIsSetupOpen(
            false,
          )
        }
        onComplete={
          handleSetupComplete
        }
      />
    );
  }

  return (
    <div className="w-full space-y-5 px-4 pb-8 pt-4 sm:px-5 sm:pb-10 sm:pt-5 lg:px-6 lg:pb-12 lg:pt-6">
      <OverviewHeader
        title={
          title
        }
        description={
          description
        }
        dashboardHref={
          dashboardHref
        }
        onAddPayCycle={() =>
          setIsSetupOpen(
            true,
          )
        }
        onRegenerate={
          regeneratePlans
        }
        onOpenPreferences={() => {
          setIsPreferencesOpen(
            true,
          );

          const params =
            new URLSearchParams(
              searchParams.toString(),
            );

          params.set(
            "view",
            "preferences",
          );

          router.replace(
            `${pathname}?${params.toString()}`,
            {
              scroll:
                false,
            },
          );

          window.setTimeout(
            () => {
              preferencesSectionRef.current?.scrollIntoView({
                behavior:
                  "smooth",
                block:
                  "start",
              });
            },
            50,
          );
        }}
      />

      {isPreferencesOpen ? (
        <section
          ref={
            preferencesSectionRef
          }
          id="pay-cycle-planning-preferences"
          className="scroll-mt-24"
        >
          <PayCyclePreferencesPanel
            preferences={
              preferences
            }
            onSave={
              updatePreferences
            }
            onReset={
              resetPreferences
            }
            onCancel={() => {
              setIsPreferencesOpen(
                false,
              );

              const params =
                new URLSearchParams(
                  searchParams.toString(),
                );

              params.delete(
                "view",
              );

              const query =
                params.toString();

              router.replace(
                query
                  ? `${pathname}?${query}`
                  : pathname,
                {
                  scroll:
                    false,
                },
              );
            }}
          />
        </section>
      ) : null}

      <OverviewSummaryCards
        summary={
          summary
        }
        reserveAmount={
          preferences.minimumCashReserve
        }
      />

      <StatusFilters
        selectedFilter={
          selectedFilter
        }
        payCycles={
          payCycles
        }
        onChange={
          setSelectedFilter
        }
      />

      {payCycles.length ===
      0 ? (
        <PayCyclesEmptyState
          onAddPayCycle={() =>
            setIsSetupOpen(
              true,
            )
          }
        />
      ) : filteredPayCycles.length ===
        0 ? (
        <FilteredEmptyState
          selectedFilter={
            selectedFilter
          }
          onShowAll={() =>
            setSelectedFilter(
              "all",
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredPayCycles.map(
            (
              payCycle,
            ) => (
              <PayCycleCard
                key={
                  payCycle.id
                }
                payCycle={
                  payCycle
                }
                accountName={
                  accounts.find(
                    (
                      account,
                    ) =>
                      account.id ===
                      payCycle.accountId,
                  )?.name
                }
                payPeriods={
                  projectedPayPeriodsByCycle[
                    payCycle.id
                  ] ??
                  []
                }
                billPlans={
                  billPlansByCycle[
                    payCycle.id
                  ] ??
                  []
                }
                projection={
                  projectionsByCycle[
                    payCycle.id
                  ]
                }
                isExpanded={
                  expandedPayCycleId ===
                  payCycle.id
                }
                billsHref={
                  billsHref
                }
                transactionsHref={
                  transactionsHref
                }
                onToggleExpanded={() =>
                  setExpandedPayCycleId(
                    (
                      currentId,
                    ) =>
                      currentId ===
                      payCycle.id
                        ? null
                        : payCycle.id,
                  )
                }
                onSetStatus={(
                  status,
                ) =>
                  setPayCycleStatus(
                    payCycle.id,
                    status,
                  )
                }
                onDelete={() =>
                  setPendingDeleteId(
                    payCycle.id,
                  )
                }
              />
            ),
          )}
        </div>
      )}

      {pendingDeleteId ? (
        <DeleteConfirmation
          payCycleName={
            payCycles.find(
              (
                payCycle,
              ) =>
                payCycle.id ===
                pendingDeleteId,
            )?.name ??
            "this pay cycle"
          }
          onCancel={() =>
            setPendingDeleteId(
              null,
            )
          }
          onConfirm={
            handleDeleteConfirmed
          }
        />
      ) : null}
    </div>
  );
}

type OverviewHeaderProps = {
  title: string;
  description: string;
  dashboardHref: string;
  onAddPayCycle: () => void;
  onRegenerate: () => void;
  onOpenPreferences: () => void;
};

function OverviewHeader({
  title,
  description,
  dashboardHref,
  onAddPayCycle,
  onRegenerate,
  onOpenPreferences,
}: OverviewHeaderProps) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <PaycheckIcon />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
              Cash-flow planning
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              {title}
            </h1>
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={
            dashboardHref
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <ArrowLeftIcon />

          Dashboard
        </Link>

        <button
          type="button"
          onClick={
            onOpenPreferences
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <SettingsIcon />

          Preferences
        </button>

        <button
          type="button"
          onClick={
            onRegenerate
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <RefreshIcon />

          Refresh plans
        </button>

        <button
          type="button"
          onClick={
            onAddPayCycle
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <PlusIcon />

          Add pay cycle
        </button>
      </div>
    </section>
  );
}

type OverviewSummary = {
  activeCount: number;
  nextPayDate?: string;
  nextExpectedIncome: number;
  projectedIncome: number;
  uncoveredBillCount: number;
  uncoveredBillAmount: number;
};

function OverviewSummaryCards({
  summary,
  reserveAmount,
}: {
  summary: OverviewSummary;
  reserveAmount: number;
}) {
  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
      <SummaryCard
        label="Active cycles"
        value={
          String(
            summary.activeCount,
          )
        }
        description="Included in bill planning"
        tone="primary"
        icon={
          <PaycheckIcon />
        }
      />

      <SummaryCard
        label="Next payday"
        value={
          summary.nextPayDate
            ? formatDate(
                summary.nextPayDate,
              )
            : "Not scheduled"
        }
        description="Earliest projected paycheck"
        tone="neutral"
        icon={
          <CalendarIcon />
        }
      />

      <SummaryCard
        label="Next income"
        value={
          formatCurrency(
            summary.nextExpectedIncome,
          )
        }
        description="Expected next deposit"
        tone="success"
        icon={
          <IncomeIcon />
        }
      />

      <SummaryCard
        label="Projected income"
        value={
          formatCurrency(
            summary.projectedIncome,
          )
        }
        description="Across current projections"
        tone="success"
        icon={
          <TrendIcon />
        }
      />

      <SummaryCard
        label="Uncovered bills"
        value={
          String(
            summary.uncoveredBillCount,
          )
        }
        description={
          summary.uncoveredBillCount >
          0
            ? formatCurrency(
                summary.uncoveredBillAmount,
              )
            : "No projected shortage"
        }
        tone={
          summary.uncoveredBillCount >
          0
            ? "danger"
            : "success"
        }
        icon={
          <AlertIcon />
        }
      />

      <SummaryCard
        label="Cash reserve"
        value={
          formatCurrency(
            reserveAmount,
          )
        }
        description="Protected from allocations"
        tone="warning"
        icon={
          <ReserveIcon />
        }
      />
    </section>
  );
}

function SummaryCard({
  label,
  value,
  description,
  tone,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral";
  icon: ReactNode;
}) {
  const toneClasses =
    getToneClasses(
      tone,
    );

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm sm:p-5">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          toneClasses.background,
          toneClasses.text,
        ].join(
          " ",
        )}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-bold text-[var(--text-primary)] sm:text-xl">
        {value}
      </p>

      <p
        className={[
          "mt-1 truncate text-xs font-semibold",
          toneClasses.detail,
        ].join(
          " ",
        )}
      >
        {description}
      </p>
    </article>
  );
}

function StatusFilters({
  selectedFilter,
  payCycles,
  onChange,
}: {
  selectedFilter:
    PayCycleFilter;
  payCycles:
    PayCycleData[];
  onChange: (
    filter:
      PayCycleFilter,
  ) => void;
}) {
  const filters:
    {
      value:
        PayCycleFilter;
      label:
        string;
    }[] = [
      {
        value:
          "all",
        label:
          "All",
      },
      {
        value:
          "active",
        label:
          "Active",
      },
      {
        value:
          "paused",
        label:
          "Paused",
      },
      {
        value:
          "archived",
        label:
          "Archived",
      },
    ];

  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-3 shadow-sm">
      <div className="flex gap-2 overflow-x-auto">
        {filters.map(
          (
            filter,
          ) => {
            const isSelected =
              selectedFilter ===
              filter.value;

            const count =
              filter.value ===
              "all"
                ? payCycles.length
                : payCycles.filter(
                    (
                      payCycle,
                    ) =>
                      payCycle.status ===
                      filter.value,
                  ).length;

            return (
              <button
                key={
                  filter.value
                }
                type="button"
                onClick={() =>
                  onChange(
                    filter.value,
                  )
                }
                className={[
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isSelected
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-default))] text-[var(--primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                ].join(
                  " ",
                )}
              >
                {
                  filter.label
                }

                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}

type PayCycleCardProps = {
  payCycle:
    PayCycleData;
  accountName?: string;
  payPeriods:
    PayPeriodData[];
  billPlans:
    PayPeriodBillPlan[];
  projection?:
    PayCycleProjection;
  isExpanded: boolean;
  billsHref: string;
  transactionsHref: string;
  onToggleExpanded: () => void;
  onSetStatus: (
    status:
      PayCycleData["status"],
  ) => void;
  onDelete: () => void;
};

function PayCycleCard({
  payCycle,
  accountName,
  payPeriods,
  billPlans,
  projection,
  isExpanded,
  billsHref,
  transactionsHref,
  onToggleExpanded,
  onSetStatus,
  onDelete,
}: PayCycleCardProps) {
  const nextPayPeriod =
    payPeriods[
      0
    ];

  const nextBillPlan =
    billPlans[
      0
    ];

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                payCycle.status ===
                "active"
                  ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                  : payCycle.status ===
                      "paused"
                    ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
              ].join(
                " ",
              )}
            >
              <PaycheckIcon />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-[var(--text-primary)]">
                  {payCycle.name}
                </h2>

                <StatusBadge
                  status={
                    payCycle.status
                  }
                />
              </div>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {payCycle.employerName ??
                  formatIncomeType(
                    payCycle.incomeType,
                  )}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <MetadataBadge>
                  {formatFrequency(
                    payCycle.frequency,
                  )}
                </MetadataBadge>

                <MetadataBadge>
                  {formatAmountType(
                    payCycle.amountType,
                  )}
                </MetadataBadge>

                <MetadataBadge>
                  {accountName ??
                    "No deposit account"}
                </MetadataBadge>

                {payCycle.includeInBillPlanning ? (
                  <MetadataBadge tone="success">
                    Bill planning enabled
                  </MetadataBadge>
                ) : (
                  <MetadataBadge tone="warning">
                    Bill planning disabled
                  </MetadataBadge>
                )}

                {payCycle.includeInBudgetIncome ? (
                  <MetadataBadge tone="primary">
                    Included in budget
                  </MetadataBadge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[560px]">
            <CompactMetric
              label="Expected deposit"
              value={
                formatCurrency(
                  payCycle.expectedNetAmount,
                )
              }
            />

            <CompactMetric
              label="Next payday"
              value={
                nextPayPeriod
                  ? formatDate(
                      nextPayPeriod.expectedPayDate,
                    )
                  : formatDate(
                      payCycle.nextPayDate,
                    )
              }
            />

            <CompactMetric
              label="Bills allocated"
              value={
                formatCurrency(
                  nextBillPlan?.allocatedAmount ??
                    0,
                )
              }
            />

            <CompactMetric
              label="Remaining"
              value={
                formatCurrency(
                  nextBillPlan?.remainingAfterAllocation ??
                    payCycle.expectedNetAmount,
                )
              }
              tone={
                (
                  nextBillPlan?.remainingAfterAllocation ??
                  payCycle.expectedNetAmount
                ) >
                0
                  ? "success"
                  : "default"
              }
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {payCycle.status ===
            "active" ? (
              <ActionButton
                label="Pause"
                icon={
                  <PauseIcon />
                }
                onClick={() =>
                  onSetStatus(
                    "paused",
                  )
                }
              />
            ) : (
              <ActionButton
                label="Activate"
                icon={
                  <PlayIcon />
                }
                onClick={() =>
                  onSetStatus(
                    "active",
                  )
                }
              />
            )}

            {payCycle.status !==
            "archived" ? (
              <ActionButton
                label="Archive"
                icon={
                  <ArchiveIcon />
                }
                onClick={() =>
                  onSetStatus(
                    "archived",
                  )
                }
              />
            ) : null}

            <ActionButton
              label="Delete"
              icon={
                <TrashIcon />
              }
              tone="danger"
              onClick={
                onDelete
              }
            />
          </div>

          <button
            type="button"
            onClick={
              onToggleExpanded
            }
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            {isExpanded
              ? "Hide details"
              : "View details"}

            <ChevronIcon
              expanded={
                isExpanded
              }
            />
          </button>
        </div>
      </div>

      {isExpanded ? (
        <PayCycleDetails
          payCycle={
            payCycle
          }
          payPeriods={
            payPeriods
          }
          billPlans={
            billPlans
          }
          projection={
            projection
          }
          billsHref={
            billsHref
          }
          transactionsHref={
            transactionsHref
          }
        />
      ) : null}
    </article>
  );
}

function PayCycleDetails({
  payCycle,
  payPeriods,
  billPlans,
  projection,
  billsHref,
  transactionsHref,
}: {
  payCycle:
    PayCycleData;
  payPeriods:
    PayPeriodData[];
  billPlans:
    PayPeriodBillPlan[];
  projection?:
    PayCycleProjection;
  billsHref: string;
  transactionsHref: string;
}) {
  const visiblePayPeriods =
    payPeriods.slice(
      0,
      6,
    );

  const nextPlan =
    billPlans[
      0
    ];

  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)]">
          <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Upcoming Paychecks
              </h3>

              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Projected dates and expected
                deposits.
              </p>
            </div>

            <span className="text-xs font-bold text-[var(--text-muted)]">
              {payPeriods.length} projected
            </span>
          </header>

          {visiblePayPeriods.length >
          0 ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {visiblePayPeriods.map(
                (
                  payPeriod,
                  index,
                ) => {
                  const matchingPlan =
                    billPlans.find(
                      (
                        plan,
                      ) =>
                        plan.payPeriodId ===
                        payPeriod.id,
                    );

                  return (
                    <PayPeriodRow
                      key={
                        payPeriod.id
                      }
                      payPeriod={
                        payPeriod
                      }
                      plan={
                        matchingPlan
                      }
                      isNext={
                        index ===
                        0
                      }
                    />
                  );
                },
              )}
            </div>
          ) : (
            <InlineEmptyState
              title="No upcoming paychecks"
              description="Review the next payday and frequency for this pay cycle."
            />
          )}
        </section>

        <section className="space-y-4">
          <ProjectionSummary
            payCycle={
              payCycle
            }
            projection={
              projection
            }
          />

          <NextPlanSummary
            plan={
              nextPlan
            }
            billsHref={
              billsHref
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`${transactionsHref}?action=add&type=income`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <IncomeIcon />

              Record paycheck
            </Link>

            <Link
              href={
                billsHref
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              <BillsIcon />

              Review bills
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function PayPeriodRow({
  payPeriod,
  plan,
  isNext,
}: {
  payPeriod:
    PayPeriodData;
  plan?:
    PayPeriodBillPlan;
  isNext: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isNext
              ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
              : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
          ].join(
            " ",
          )}
        >
          <CalendarIcon />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {formatDate(
                payPeriod.expectedPayDate,
              )}
            </p>

            {isNext ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--primary)]">
                Next
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {formatDate(
              payPeriod.periodStartDate,
            )}{" "}
            –{" "}
            {formatDate(
              payPeriod.periodEndDate,
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:w-[360px]">
        <CompactMetric
          label="Income"
          value={
            formatCurrency(
              payPeriod.actualAmount ??
                payPeriod.expectedAmount,
            )
          }
        />

        <CompactMetric
          label="Bills"
          value={
            formatCurrency(
              plan?.allocatedAmount ??
                0,
            )
          }
        />

        <CompactMetric
          label="Remaining"
          value={
            formatCurrency(
              plan?.remainingAfterAllocation ??
                payPeriod.remainingAmount,
            )
          }
          tone="success"
        />
      </div>
    </div>
  );
}

function ProjectionSummary({
  payCycle,
  projection,
}: {
  payCycle:
    PayCycleData;
  projection?:
    PayCycleProjection;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <TrendIcon />
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Projection Summary
          </h3>

          <p className="text-xs text-[var(--text-muted)]">
            {formatFrequency(
              payCycle.frequency,
            )} income outlook
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-3">
        <DetailRow
          label="Projected income"
          value={
            formatCurrency(
              projection?.totalProjectedIncome ??
                0,
            )
          }
        />

        <DetailRow
          label="Recommended bill payments"
          value={
            formatCurrency(
              projection?.totalRecommendedBillPayments ??
                0,
            )
          }
        />

        <DetailRow
          label="Projected remaining cash"
          value={
            formatCurrency(
              projection?.projectedRemainingCash ??
                0,
            )
          }
          tone="success"
        />

        <DetailRow
          label="Uncovered bill amount"
          value={
            formatCurrency(
              projection?.uncoveredBillAmount ??
                0,
            )
          }
          tone={
            (
              projection?.uncoveredBillAmount ??
              0
            ) >
            0
              ? "danger"
              : "default"
          }
        />
      </dl>
    </section>
  );
}

function NextPlanSummary({
  plan,
  billsHref,
}: {
  plan?:
    PayPeriodBillPlan;
  billsHref: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Next Bill Plan
          </h3>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Coverage for the next paycheck.
          </p>
        </div>

        <Link
          href={
            billsHref
          }
          className="text-xs font-bold text-[var(--primary)] outline-none hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          View bills
        </Link>
      </div>

      {plan ? (
        <dl className="mt-4 space-y-3">
          <DetailRow
            label="Bills covered"
            value={
              String(
                plan.coveredBillCount,
              )
            }
            tone="success"
          />

          <DetailRow
            label="Partially funded"
            value={
              String(
                plan.partiallyCoveredBillCount,
              )
            }
            tone={
              plan.partiallyCoveredBillCount >
              0
                ? "warning"
                : "default"
            }
          />

          <DetailRow
            label="Uncovered"
            value={
              String(
                plan.uncoveredBillCount,
              )
            }
            tone={
              plan.uncoveredBillCount >
              0
                ? "danger"
                : "default"
            }
          />

          <DetailRow
            label="Past due"
            value={
              String(
                plan.pastDueBillCount,
              )
            }
            tone={
              plan.pastDueBillCount >
              0
                ? "danger"
                : "default"
            }
          />
        </dl>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">
          No bill plan is available for
          this paycheck.
        </p>
      )}
    </section>
  );
}

function CompactMetric({
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
    <div className="min-w-0 rounded-xl bg-[var(--surface-muted)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 truncate text-sm font-bold",
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

function DetailRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs font-medium text-[var(--text-muted)]">
        {label}
      </dt>

      <dd
        className={[
          "text-xs font-bold",
          tone ===
          "success"
            ? "text-[var(--success)]"
            : tone ===
                "warning"
              ? "text-[var(--warning)]"
              : tone ===
                  "danger"
                ? "text-[var(--danger)]"
                : "text-[var(--text-primary)]",
        ].join(
          " ",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    PayCycleData["status"];
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
        status ===
        "active"
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : status ===
              "paused"
            ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      ].join(
        " ",
      )}
    >
      {status}
    </span>
  );
}

function MetadataBadge({
  children,
  tone = "neutral",
}: {
  children:
    ReactNode;
  tone?:
    | "neutral"
    | "success"
    | "warning"
    | "primary";
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
        tone ===
        "success"
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : tone ===
              "warning"
            ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
            : tone ===
                "primary"
              ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
              : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      ].join(
        " ",
      )}
    >
      {children}
    </span>
  );
}

function ActionButton({
  label,
  icon,
  tone = "default",
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tone?:
    | "default"
    | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        tone ===
        "danger"
          ? "text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      ].join(
        " ",
      )}
    >
      {icon}

      {label}
    </button>
  );
}

function PayCyclesEmptyState({
  onAddPayCycle,
}: {
  onAddPayCycle: () => void;
}) {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-14 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <PaycheckIcon />
      </div>

      <h2 className="mt-5 text-xl font-bold text-[var(--text-primary)]">
        Set up your first pay cycle
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
        Add your paycheck frequency,
        expected take-home pay, next
        payday, and deposit account so
        CASE Budget can recommend which
        bills should be funded from each
        paycheck.
      </p>

      <button
        type="button"
        onClick={
          onAddPayCycle
        }
        className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <PlusIcon />

        Add pay cycle
      </button>
    </section>
  );
}

function FilteredEmptyState({
  selectedFilter,
  onShowAll,
}: {
  selectedFilter:
    PayCycleFilter;
  onShowAll: () => void;
}) {
  return (
    <section className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-12 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <FilterIcon />
      </div>

      <h2 className="mt-5 text-lg font-bold text-[var(--text-primary)]">
        No {selectedFilter} pay cycles
      </h2>

      <p className="mt-2 text-sm text-[var(--text-muted)]">
        No schedules match the selected
        status filter.
      </p>

      <button
        type="button"
        onClick={
          onShowAll
        }
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Show all pay cycles
      </button>
    </section>
  );
}

function InlineEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <h4 className="text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h4>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function DeleteConfirmation({
  payCycleName,
  onCancel,
  onConfirm,
}: {
  payCycleName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-pay-cycle-title"
        className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <TrashIcon />
        </div>

        <h2
          id="delete-pay-cycle-title"
          className="mt-4 text-lg font-bold text-[var(--text-primary)]"
        >
          Delete {payCycleName}?
        </h2>

        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          This removes the pay schedule,
          its projected pay periods, and
          its generated bill plans from
          this workspace.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={
              onCancel
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              onConfirm
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2"
          >
            <TrashIcon />

            Delete pay cycle
          </button>
        </div>
      </section>
    </div>
  );
}

function createOverviewSummary(
  payCycles:
    PayCycleData[],
  projectionsByCycle:
    Record<
      string,
      PayCycleProjection
    >,
  billPlansByCycle:
    Record<
      string,
      PayPeriodBillPlan[]
    >,
): OverviewSummary {
  const activePayCycles =
    payCycles.filter(
      (
        payCycle,
      ) =>
        payCycle.status ===
          "active" &&
        payCycle.includeInBillPlanning,
    );

  const nextPayCycle =
    [
      ...activePayCycles,
    ].sort(
      (
        firstPayCycle,
        secondPayCycle,
      ) =>
        firstPayCycle.nextPayDate.localeCompare(
          secondPayCycle.nextPayDate,
        ),
    )[
      0
    ];

  const projections =
    activePayCycles
      .map(
        (
          payCycle,
        ) =>
          projectionsByCycle[
            payCycle.id
          ],
      )
      .filter(
        (
          projection,
        ): projection is PayCycleProjection =>
          Boolean(
            projection,
          ),
      );

  const billPlans =
    activePayCycles.flatMap(
      (
        payCycle,
      ) =>
        billPlansByCycle[
          payCycle.id
        ] ??
        [],
    );

  const uncoveredRecommendations =
    billPlans.flatMap(
      (
        plan,
      ) =>
        plan.recommendations.filter(
          (
            recommendation,
          ) =>
            recommendation.status ===
              "insufficient-funds" ||
            recommendation.remainingBillAmount >
              0.005,
        ),
    );

  return {
    activeCount:
      activePayCycles.length,
    nextPayDate:
      nextPayCycle?.nextPayDate,
    nextExpectedIncome:
      nextPayCycle?.expectedNetAmount ??
      0,
    projectedIncome:
      projections.reduce(
        (
          total,
          projection,
        ) =>
          total +
          projection.totalProjectedIncome,
        0,
      ),
    uncoveredBillCount:
      uncoveredRecommendations.length,
    uncoveredBillAmount:
      uncoveredRecommendations.reduce(
        (
          total,
          recommendation,
        ) =>
          total +
          recommendation.remainingBillAmount,
        0,
      ),
  };
}

function getToneClasses(
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral",
) {
  switch (tone) {
    case "primary":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        text:
          "text-[var(--primary)]",
        detail:
          "text-[var(--primary)]",
      };

    case "success":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        text:
          "text-[var(--success)]",
        detail:
          "text-[var(--success)]",
      };

    case "warning":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        text:
          "text-[var(--warning)]",
        detail:
          "text-[var(--warning)]",
      };

    case "danger":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        text:
          "text-[var(--danger)]",
        detail:
          "text-[var(--danger)]",
      };

    case "neutral":
    default:
      return {
        background:
          "bg-[var(--surface-muted)]",
        text:
          "text-[var(--text-muted)]",
        detail:
          "text-[var(--text-muted)]",
      };
  }
}

function formatFrequency(
  frequency:
    PayCycleData["frequency"],
) {
  switch (frequency) {
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

function formatIncomeType(
  incomeType:
    PayCycleData["incomeType"],
) {
  return incomeType
    .split(
      "-",
    )
    .map(
      (
        word,
      ) =>
        `${word
          .charAt(
            0,
          )
          .toUpperCase()}${word.slice(
          1,
        )}`,
    )
    .join(
      " ",
    );
}

function formatAmountType(
  amountType:
    PayCycleData["amountType"],
) {
  return amountType
    .charAt(
      0,
    )
    .toUpperCase() +
    amountType.slice(
      1,
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

function TrendIcon() {
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
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
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

function SettingsIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function RefreshIcon() {
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
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function PauseIcon() {
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
      <path d="M8 5v14" />
      <path d="M16 5v14" />
    </svg>
  );
}

function PlayIcon() {
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
      <path d="m8 5 11 7-11 7Z" />
    </svg>
  );
}

function ArchiveIcon() {
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
      <path d="M3 6h18" />
      <path d="M5 6v14h14V6" />
      <path d="M9 10h6" />
      <path d="M4 3h16v3H4Z" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function FilterIcon() {
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
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}

function ChevronIcon({
  expanded,
}: {
  expanded: boolean;
}) {
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
      className={
        expanded
          ? "rotate-180 transition-transform"
          : "transition-transform"
      }
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
