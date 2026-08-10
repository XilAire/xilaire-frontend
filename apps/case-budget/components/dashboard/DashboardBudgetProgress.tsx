"use client";

import Link from "next/link";
import {
  useMemo,
  type ReactNode,
} from "react";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

export type DashboardBudgetProgressProps = {
  title?: string;
  description?: string;
  budgetHref?: string;
  maxVisibleItems?: number;
  showHeader?: boolean;
  showGroupSummary?: boolean;
};

type BudgetItemStatus =
  | "unfunded"
  | "available"
  | "near-limit"
  | "fully-spent"
  | "overspent";

type BudgetProgressItem = {
  id: string;
  name: string;
  groupName: string;
  assignedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  spentPercentage: number;
  status: BudgetItemStatus;
};

type BudgetProgressGroup = {
  id: string;
  name: string;
  assignedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  spentPercentage: number;
  itemCount: number;
  overspentItemCount: number;
};

type BudgetProgressSummary = {
  plannedIncome: number;
  receivedIncome: number;
  assignedAmount: number;
  spentAmount: number;
  remainingToAssign: number;
  remainingBudget: number;
  assignedPercentage: number;
  spentPercentage: number;
  itemCount: number;
  overspentItemCount: number;
  unfundedItemCount: number;
};

export default function DashboardBudgetProgress({
  title = "Budget Progress",
  description =
    "Monitor assigned amounts, cleared spending, and remaining balances.",
  budgetHref = "/dashboard/budget",
  maxVisibleItems = 8,
  showHeader = true,
  showGroupSummary = true,
}: DashboardBudgetProgressProps) {
  const {
    hasSelectedBudget,
    budgetGroups,
    totals,
    monthNavigation,
  } = useBudget();

  const items =
    useMemo<
      BudgetProgressItem[]
    >(
      () =>
        budgetGroups
          .flatMap(
            (
              group,
            ) =>
              group.categories.map(
                (
                  item,
                ): BudgetProgressItem => {
                  const assignedAmount =
                    normalizeCurrency(
                      item.assignedAmount,
                    );

                  const spentAmount =
                    normalizeCurrency(
                      item.spentAmount,
                    );

                  const remainingAmount =
                    normalizeCurrency(
                      assignedAmount -
                        spentAmount,
                    );

                  const spentPercentage =
                    calculatePercentage(
                      spentAmount,
                      assignedAmount,
                    );

                  return {
                    id:
                      item.id,
                    name:
                      item.name,
                    groupName:
                      group.name,
                    assignedAmount,
                    spentAmount,
                    remainingAmount,
                    spentPercentage,
                    status:
                      getBudgetItemStatus(
                        assignedAmount,
                        spentAmount,
                      ),
                  };
                },
              ),
          )
          .sort(
            (
              firstItem,
              secondItem,
            ) => {
              const priorityDifference =
                getStatusPriority(
                  secondItem.status,
                ) -
                getStatusPriority(
                  firstItem.status,
                );

              if (
                priorityDifference !==
                0
              ) {
                return priorityDifference;
              }

              return (
                secondItem.spentPercentage -
                firstItem.spentPercentage
              );
            },
          ),
      [
        budgetGroups,
      ],
    );

  const groups =
    useMemo<
      BudgetProgressGroup[]
    >(
      () =>
        budgetGroups
          .map(
            (
              group,
            ): BudgetProgressGroup => {
              const assignedAmount =
                normalizeCurrency(
                  group.categories.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.assignedAmount,
                    0,
                  ),
                );

              const spentAmount =
                normalizeCurrency(
                  group.categories.reduce(
                    (
                      total,
                      item,
                    ) =>
                      total +
                      item.spentAmount,
                    0,
                  ),
                );

              return {
                id:
                  group.id,
                name:
                  group.name,
                assignedAmount,
                spentAmount,
                remainingAmount:
                  normalizeCurrency(
                    assignedAmount -
                      spentAmount,
                  ),
                spentPercentage:
                  calculatePercentage(
                    spentAmount,
                    assignedAmount,
                  ),
                itemCount:
                  group.categories.length,
                overspentItemCount:
                  group.categories.filter(
                    (
                      item,
                    ) =>
                      item.spentAmount >
                      item.assignedAmount +
                        0.005,
                  ).length,
              };
            },
          )
          .sort(
            (
              firstGroup,
              secondGroup,
            ) => {
              if (
                firstGroup.overspentItemCount !==
                secondGroup.overspentItemCount
              ) {
                return (
                  secondGroup.overspentItemCount -
                  firstGroup.overspentItemCount
                );
              }

              return (
                secondGroup.spentPercentage -
                firstGroup.spentPercentage
              );
            },
          ),
      [
        budgetGroups,
      ],
    );

  const summary =
    useMemo<
      BudgetProgressSummary
    >(
      () => {
        const plannedIncome =
          normalizeCurrency(
            totals.plannedIncome,
          );

        const receivedIncome =
          normalizeCurrency(
            totals.receivedIncome,
          );

        const assignedAmount =
          normalizeCurrency(
            totals.assignedAmount,
          );

        const spentAmount =
          normalizeCurrency(
            totals.spentAmount,
          );

        return {
          plannedIncome,
          receivedIncome,
          assignedAmount,
          spentAmount,
          remainingToAssign:
            normalizeCurrency(
              plannedIncome -
                assignedAmount,
            ),
          remainingBudget:
            normalizeCurrency(
              assignedAmount -
                spentAmount,
            ),
          assignedPercentage:
            calculatePercentage(
              assignedAmount,
              plannedIncome,
            ),
          spentPercentage:
            calculatePercentage(
              spentAmount,
              assignedAmount,
            ),
          itemCount:
            items.length,
          overspentItemCount:
            items.filter(
              (
                item,
              ) =>
                item.status ===
                "overspent",
            ).length,
          unfundedItemCount:
            items.filter(
              (
                item,
              ) =>
                item.status ===
                "unfunded",
            ).length,
        };
      },
      [
        items,
        totals,
      ],
    );

  const visibleItems =
    items.slice(
      0,
      Math.max(
        0,
        maxVisibleItems,
      ),
    );

  const hiddenItemCount =
    Math.max(
      0,
      items.length -
        visibleItems.length,
    );

  return (
    <section
      aria-labelledby="dashboard-budget-progress-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <BudgetProgressHeader
          title={
            title
          }
          description={
            description
          }
          monthLabel={
            monthNavigation.monthLabel
          }
          budgetHref={
            budgetHref
          }
        />
      ) : null}

      {!hasSelectedBudget ? (
        <BudgetEmptyState
          title={`No budget exists for ${monthNavigation.monthLabel}`}
          description="Create or copy a monthly budget before budget progress can be displayed."
          actionLabel="Create monthly budget"
          budgetHref={
            budgetHref
          }
          icon={
            <CalendarIcon />
          }
        />
      ) : items.length ===
        0 ? (
        <BudgetEmptyState
          title={`Your ${monthNavigation.monthLabel} budget is empty`}
          description="Add budget groups and items to begin assigning income and tracking cleared spending."
          actionLabel="Add budget items"
          budgetHref={
            budgetHref
          }
          icon={
            <BudgetIcon />
          }
        />
      ) : (
        <div className="p-4 sm:p-5">
          <BudgetSummary
            summary={
              summary
            }
            budgetHref={
              budgetHref
            }
          />

          {showGroupSummary &&
          groups.length >
            0 ? (
            <GroupSummary
              groups={
                groups
              }
              budgetHref={
                budgetHref
              }
            />
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Budget Items
                </h3>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Cleared spending updates
                  these totals automatically.
                </p>
              </div>

              <span className="text-xs font-bold text-[var(--text-muted)]">
                {summary.itemCount}{" "}
                {summary.itemCount ===
                1
                  ? "item"
                  : "items"}
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {visibleItems.map(
                (
                  item,
                ) => (
                  <BudgetItemRow
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                    budgetHref={
                      budgetHref
                    }
                  />
                ),
              )}
            </div>

            {hiddenItemCount >
            0 ? (
              <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-[var(--text-muted)]">
                  {hiddenItemCount}{" "}
                  additional{" "}
                  {hiddenItemCount ===
                  1
                    ? "item"
                    : "items"}{" "}
                  not shown
                </p>

                <Link
                  href={
                    budgetHref
                  }
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[var(--primary)] outline-none transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  View full budget

                  <ArrowRightIcon />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

type BudgetProgressHeaderProps = {
  title: string;
  description: string;
  monthLabel: string;
  budgetHref: string;
};

function BudgetProgressHeader({
  title,
  description,
  monthLabel,
  budgetHref,
}: BudgetProgressHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <BudgetIcon />
        </div>

        <div className="min-w-0">
          <h2
            id="dashboard-budget-progress-title"
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
        <span className="inline-flex min-h-9 items-center rounded-lg bg-[var(--surface-muted)] px-3 text-xs font-bold text-[var(--text-muted)]">
          {monthLabel}
        </span>

        <Link
          href={
            budgetHref
          }
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-xs font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Open budget

          <ArrowRightIcon />
        </Link>
      </div>
    </header>
  );
}

function BudgetSummary({
  summary,
  budgetHref,
}: {
  summary: BudgetProgressSummary;
  budgetHref: string;
}) {
  const isOverassigned =
    summary.remainingToAssign <
    -0.005;

  const isOverspent =
    summary.remainingBudget <
      -0.005 ||
    summary.overspentItemCount >
      0;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.38fr)]">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          label="Planned income"
          value={
            formatCurrency(
              summary.plannedIncome,
            )
          }
          supportingText={`${formatCurrency(
            summary.receivedIncome,
          )} received`}
          tone="primary"
          icon={
            <IncomeIcon />
          }
        />

        <MetricCard
          label="Assigned"
          value={
            formatCurrency(
              summary.assignedAmount,
            )
          }
          supportingText={`${formatPercentage(
            summary.assignedPercentage,
          )} of income`}
          tone={
            isOverassigned
              ? "danger"
              : summary.remainingToAssign ===
                  0
                ? "success"
                : "primary"
          }
          icon={
            <AssignedIcon />
          }
        />

        <MetricCard
          label="Spent"
          value={
            formatCurrency(
              summary.spentAmount,
            )
          }
          supportingText={`${formatPercentage(
            summary.spentPercentage,
          )} of assigned`}
          tone={
            isOverspent
              ? "danger"
              : summary.spentPercentage >=
                  85
                ? "warning"
                : "neutral"
          }
          icon={
            <SpentIcon />
          }
        />

        <MetricCard
          label="Budget remaining"
          value={
            formatCurrency(
              summary.remainingBudget,
            )
          }
          supportingText={
            isOverspent
              ? "Budget is overspent"
              : "Available across items"
          }
          tone={
            isOverspent
              ? "danger"
              : "success"
          }
          icon={
            <WalletIcon />
          }
        />
      </div>

      <StatusCard
        summary={
          summary
        }
        budgetHref={
          budgetHref
        }
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  supportingText,
  tone,
  icon,
}: {
  label: string;
  value: string;
  supportingText: string;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral";
  icon: ReactNode;
}) {
  const classes =
    getToneClasses(
      tone,
    );

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
            {label}
          </p>

          <p className="mt-2 truncate text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
            {value}
          </p>
        </div>

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
      </div>

      <p
        className={[
          "mt-4 truncate text-xs font-semibold",
          classes.supportingText,
        ].join(
          " ",
        )}
      >
        {supportingText}
      </p>
    </article>
  );
}

function StatusCard({
  summary,
  budgetHref,
}: {
  summary: BudgetProgressSummary;
  budgetHref: string;
}) {
  const isOverspent =
    summary.remainingBudget <
      -0.005 ||
    summary.overspentItemCount >
      0;

  const isOverassigned =
    summary.remainingToAssign <
    -0.005;

  const tone =
    isOverspent ||
    isOverassigned
      ? "danger"
      : summary.unfundedItemCount >
          0 ||
        summary.remainingToAssign >
          0.005
        ? "warning"
        : "success";

  const title =
    isOverspent
      ? "Budget needs attention"
      : isOverassigned
        ? "Income is overassigned"
        : summary.unfundedItemCount >
            0
          ? "Some items are unfunded"
          : summary.remainingToAssign >
              0.005
            ? "Income remains unassigned"
            : "Budget is on track";

  return (
    <aside
      className={[
        "rounded-2xl border p-4 sm:p-5",
        tone ===
        "danger"
          ? "border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface-muted))]"
          : tone ===
              "warning"
            ? "border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-muted))]"
            : "border-[color-mix(in_srgb,var(--success)_22%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface-muted))]",
      ].join(
        " ",
      )}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          tone ===
          "danger"
            ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            : tone ===
                "warning"
              ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
              : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
        ].join(
          " ",
        )}
      >
        {tone ===
        "success" ? (
          <CheckIcon />
        ) : (
          <AlertIcon />
        )}
      </div>

      <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <dl className="mt-4 space-y-3">
        <StatusRow
          label="Remaining to assign"
          value={
            formatCurrency(
              summary.remainingToAssign,
            )
          }
          tone={
            summary.remainingToAssign <
            0
              ? "danger"
              : "default"
          }
        />

        <StatusRow
          label="Overspent items"
          value={
            String(
              summary.overspentItemCount,
            )
          }
          tone={
            summary.overspentItemCount >
            0
              ? "danger"
              : "default"
          }
        />

        <StatusRow
          label="Unfunded items"
          value={
            String(
              summary.unfundedItemCount,
            )
          }
          tone={
            summary.unfundedItemCount >
            0
              ? "warning"
              : "default"
          }
        />
      </dl>

      <Link
        href={
          budgetHref
        }
        className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Review budget

        <ArrowRightIcon />
      </Link>
    </aside>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "default"
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
          "danger"
            ? "text-[var(--danger)]"
            : tone ===
                "warning"
              ? "text-[var(--warning)]"
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

function GroupSummary({
  groups,
  budgetHref,
}: {
  groups: BudgetProgressGroup[];
  budgetHref: string;
}) {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Group Progress
          </h3>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Highest-use and overspent
            groups appear first.
          </p>
        </div>

        <Link
          href={
            budgetHref
          }
          className="inline-flex min-h-9 items-center gap-1 text-xs font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          View all

          <ChevronRightIcon />
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {groups
          .slice(
            0,
            4,
          )
          .map(
            (
              group,
            ) => (
              <GroupCard
                key={
                  group.id
                }
                group={
                  group
                }
                budgetHref={
                  budgetHref
                }
              />
            ),
          )}
      </div>
    </section>
  );
}

function GroupCard({
  group,
  budgetHref,
}: {
  group: BudgetProgressGroup;
  budgetHref: string;
}) {
  const isOverspent =
    group.remainingAmount <
      -0.005 ||
    group.overspentItemCount >
      0;

  return (
    <Link
      href={`${budgetHref}?groupId=${encodeURIComponent(
        group.id,
      )}`}
      className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
            {group.name}
          </h4>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {group.itemCount}{" "}
            {group.itemCount ===
            1
              ? "item"
              : "items"}
          </p>
        </div>

        {isOverspent ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-2 py-1 text-[10px] font-bold text-[var(--danger)]">
            Over
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-sm font-bold text-[var(--text-primary)]">
          {formatCurrency(
            group.spentAmount,
          )}
        </p>

        <p
          className={[
            "text-xs font-bold",
            isOverspent
              ? "text-[var(--danger)]"
              : "text-[var(--text-muted)]",
          ].join(
            " ",
          )}
        >
          {formatPercentage(
            group.spentPercentage,
          )}
        </p>
      </div>

      <ProgressBar
        percentage={
          group.spentPercentage
        }
        status={
          isOverspent
            ? "overspent"
            : group.spentPercentage >=
                85
              ? "near-limit"
              : "available"
        }
      />

      <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">
        {formatCurrency(
          group.remainingAmount,
        )}{" "}
        remaining
      </p>
    </Link>
  );
}

function BudgetItemRow({
  item,
  budgetHref,
}: {
  item: BudgetProgressItem;
  budgetHref: string;
}) {
  return (
    <Link
      href={`${budgetHref}?itemId=${encodeURIComponent(
        item.id,
      )}`}
      className="block px-4 py-4 outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">
              {item.name}
            </h4>

            <StatusBadge
              status={
                item.status
              }
            />
          </div>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {item.groupName}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:w-[340px]">
          <Amount
            label="Assigned"
            value={
              item.assignedAmount
            }
          />

          <Amount
            label="Spent"
            value={
              item.spentAmount
            }
          />

          <Amount
            label="Remaining"
            value={
              item.remainingAmount
            }
            danger={
              item.remainingAmount <
              0
            }
          />
        </div>
      </div>

      <ProgressBar
        percentage={
          item.spentPercentage
        }
        status={
          item.status
        }
      />
    </Link>
  );
}

function Amount({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="min-w-0 text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 truncate text-xs font-bold sm:text-sm",
          danger
            ? "text-[var(--danger)]"
            : "text-[var(--text-primary)]",
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

function ProgressBar({
  percentage,
  status,
}: {
  percentage: number;
  status: BudgetItemStatus;
}) {
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-default)]">
      <div
        className={[
          "h-full rounded-full transition-[width] duration-500",
          getProgressClass(
            status,
          ),
        ].join(
          " ",
        )}
        style={{
          width:
            `${Math.min(
              100,
              Math.max(
                0,
                percentage,
              ),
            )}%`,
        }}
      />
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: BudgetItemStatus;
}) {
  const label =
    status ===
    "overspent"
      ? "Overspent"
      : status ===
          "fully-spent"
        ? "Fully spent"
        : status ===
            "near-limit"
          ? "Near limit"
          : status ===
              "unfunded"
            ? "Unfunded"
            : "Available";

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
        status ===
        "overspent"
          ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
          : status ===
              "near-limit"
            ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
            : status ===
                "fully-spent"
              ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
              : status ===
                  "unfunded"
                ? "bg-[var(--surface-default)] text-[var(--text-muted)]"
                : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
      ].join(
        " ",
      )}
    >
      {label}
    </span>
  );
}

function BudgetEmptyState({
  title,
  description,
  actionLabel,
  budgetHref,
  icon,
}: {
  title: string;
  description: string;
  actionLabel: string;
  budgetHref: string;
  icon: ReactNode;
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
          budgetHref
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        {actionLabel}

        <ArrowRightIcon />
      </Link>
    </div>
  );
}

function getBudgetItemStatus(
  assignedAmount: number,
  spentAmount: number,
): BudgetItemStatus {
  if (
    assignedAmount <=
      0 &&
    spentAmount <=
      0
  ) {
    return "unfunded";
  }

  if (
    spentAmount >
    assignedAmount +
      0.005
  ) {
    return "overspent";
  }

  if (
    assignedAmount >
      0 &&
    Math.abs(
      spentAmount -
        assignedAmount,
    ) <
      0.01
  ) {
    return "fully-spent";
  }

  if (
    calculatePercentage(
      spentAmount,
      assignedAmount,
    ) >=
    85
  ) {
    return "near-limit";
  }

  return "available";
}

function getStatusPriority(
  status: BudgetItemStatus,
) {
  switch (status) {
    case "overspent":
      return 5;
    case "near-limit":
      return 4;
    case "fully-spent":
      return 3;
    case "unfunded":
      return 2;
    case "available":
    default:
      return 1;
  }
}

function getProgressClass(
  status: BudgetItemStatus,
) {
  switch (status) {
    case "overspent":
      return "bg-[var(--danger)]";
    case "near-limit":
      return "bg-[var(--warning)]";
    case "fully-spent":
      return "bg-[var(--primary)]";
    case "unfunded":
      return "bg-[var(--text-muted)]";
    case "available":
    default:
      return "bg-[var(--success)]";
  }
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

function BudgetIcon() {
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
      <path d="M8 14h4" />
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

function SpentIcon() {
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

function CalendarIcon() {
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
        height="16"
        rx="2"
      />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
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
