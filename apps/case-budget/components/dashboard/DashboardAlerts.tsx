"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useBills,
} from "@/components/providers/BillsProvider";
import {
  useBudget,
} from "@/components/providers/BudgetProvider";
import {
  useGoals,
} from "@/components/providers/GoalsProvider";
import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";

export type DashboardAlertType =
  | "bill-overdue"
  | "bill-due-today"
  | "bill-due-soon"
  | "budget-over"
  | "budget-unassigned"
  | "low-balance"
  | "transaction-review"
  | "goal-milestone"
  | "general";

export type DashboardAlertSeverity =
  | "critical"
  | "warning"
  | "info"
  | "success";

export type DashboardAlertAction = {
  label: string;
  href: string;
};

export type DashboardAlert = {
  id: string;
  type: DashboardAlertType;
  severity: DashboardAlertSeverity;
  title: string;
  description: string;
  createdAt?: string;
  amount?: number;
  count?: number;
  action?: DashboardAlertAction;
  dismissible?: boolean;
};

export type DashboardAlertsProps = {
  alerts?: DashboardAlert[];
  maxVisible?: number;
  showHeader?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onDismiss?: (
    alert: DashboardAlert,
  ) => void;
};

export default function DashboardAlerts({
  alerts: alertsOverride,
  maxVisible = 5,
  showHeader = true,
  showViewAll = true,
  viewAllHref = "/dashboard/notifications",
  emptyTitle =
    "You are all caught up",
  emptyDescription =
    "There are no urgent financial alerts requiring your attention.",
  onDismiss,
}: DashboardAlertsProps) {
  const {
    accounts,
  } = useAccounts();

  const {
    bills,
  } = useBills();

  const {
    selectedMonth,
    totals,
    budgetGroups,
  } = useBudget();

  const {
    activeGoals,
  } = useGoals();

  const {
    transactions,
  } = useTransactions();

  const generatedAlerts =
    useMemo<
      DashboardAlert[]
    >(
      () =>
        buildDashboardAlerts({
          accounts,
          bills,
          selectedMonth,
          totals,
          budgetGroups,
          goals:
            activeGoals,
          transactions,
        }),
      [
        accounts,
        activeGoals,
        bills,
        budgetGroups,
        selectedMonth,
        totals,
        transactions,
      ],
    );

  const alerts =
    alertsOverride ??
    generatedAlerts;

  const [
    dismissedAlertIds,
    setDismissedAlertIds,
  ] = useState<string[]>([]);

  const activeAlerts =
    useMemo(
      () =>
        alerts
          .filter(
            (
              alert,
            ) =>
              !dismissedAlertIds.includes(
                alert.id,
              ),
          )
          .sort(
            (
              firstAlert,
              secondAlert,
            ) =>
              getSeverityPriority(
                firstAlert.severity,
              ) -
              getSeverityPriority(
                secondAlert.severity,
              ),
          ),
      [
        alerts,
        dismissedAlertIds,
      ],
    );

  const visibleAlerts =
    activeAlerts.slice(
      0,
      Math.max(
        0,
        maxVisible,
      ),
    );

  const hiddenAlertCount =
    Math.max(
      0,
      activeAlerts.length -
        visibleAlerts.length,
    );

  const criticalCount =
    activeAlerts.filter(
      (
        alert,
      ) =>
        alert.severity ===
        "critical",
    ).length;

  const warningCount =
    activeAlerts.filter(
      (
        alert,
      ) =>
        alert.severity ===
        "warning",
    ).length;

  function handleDismiss(
    alert: DashboardAlert,
  ) {
    if (
      alert.dismissible === false
    ) {
      return;
    }

    setDismissedAlertIds(
      (
        currentIds,
      ) => [
        ...currentIds,
        alert.id,
      ],
    );

    onDismiss?.(
      alert,
    );
  }

  return (
    <section
      aria-labelledby="dashboard-alerts-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <DashboardAlertsHeader
          criticalCount={
            criticalCount
          }
          warningCount={
            warningCount
          }
          totalCount={
            activeAlerts.length
          }
          showViewAll={
            showViewAll
          }
          viewAllHref={
            viewAllHref
          }
        />
      ) : null}

      {visibleAlerts.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {visibleAlerts.map(
            (
              alert,
            ) => (
              <DashboardAlertRow
                key={
                  alert.id
                }
                alert={
                  alert
                }
                onDismiss={
                  handleDismiss
                }
              />
            ),
          )}

          {hiddenAlertCount >
          0 ? (
            <div className="flex flex-col gap-3 bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {hiddenAlertCount}{" "}
                additional{" "}
                {hiddenAlertCount ===
                1
                  ? "alert"
                  : "alerts"}{" "}
                not shown
              </p>

              <Link
                href={
                  viewAllHref
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                View all alerts

                <ArrowRightIcon />
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <DashboardAlertsEmptyState
          title={
            emptyTitle
          }
          description={
            emptyDescription
          }
        />
      )}
    </section>
  );
}

type DashboardAlertsHeaderProps = {
  totalCount: number;
  criticalCount: number;
  warningCount: number;
  showViewAll: boolean;
  viewAllHref: string;
};

function DashboardAlertsHeader({
  totalCount,
  criticalCount,
  warningCount,
  showViewAll,
  viewAllHref,
}: DashboardAlertsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
          <AlertIcon />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dashboard-alerts-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              Financial Alerts
            </h2>

            {totalCount >
            0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
                {totalCount}
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Important items that may
            need your attention.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {criticalCount >
        0 ? (
          <AlertCountBadge
            label="Critical"
            count={
              criticalCount
            }
            severity="critical"
          />
        ) : null}

        {warningCount >
        0 ? (
          <AlertCountBadge
            label="Warning"
            count={
              warningCount
            }
            severity="warning"
          />
        ) : null}

        {showViewAll ? (
          <Link
            href={
              viewAllHref
            }
            className="ml-auto inline-flex min-h-9 items-center gap-1 text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:ml-2"
          >
            View all

            <ChevronRightIcon />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

type AlertCountBadgeProps = {
  label: string;
  count: number;
  severity:
    | "critical"
    | "warning";
};

function AlertCountBadge({
  label,
  count,
  severity,
}: AlertCountBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        severity ===
        "critical"
          ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
          : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          severity ===
          "critical"
            ? "bg-[var(--danger)]"
            : "bg-[var(--warning)]",
        ].join(" ")}
      />

      {count} {label}
    </span>
  );
}

type DashboardAlertRowProps = {
  alert: DashboardAlert;
  onDismiss: (
    alert: DashboardAlert,
  ) => void;
};

function DashboardAlertRow({
  alert,
  onDismiss,
}: DashboardAlertRowProps) {
  const tone =
    getAlertTone(
      alert.severity,
    );

  const metadata =
    getAlertMetadata(
      alert,
    );

  return (
    <article className="group relative px-4 py-4 transition hover:bg-[var(--surface-muted)] sm:px-5">
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            tone.iconBackground,
            tone.iconText,
          ].join(" ")}
        >
          <AlertTypeIcon
            type={
              alert.type
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {alert.title}
                </h3>

                <SeverityBadge
                  severity={
                    alert.severity
                  }
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                {
                  alert.description
                }
              </p>
            </div>

            {alert.createdAt ? (
              <time
                dateTime={
                  alert.createdAt
                }
                className="shrink-0 text-xs font-medium text-[var(--text-muted)]"
              >
                {formatRelativeDate(
                  alert.createdAt,
                )}
              </time>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {metadata.map(
                (
                  item,
                ) => (
                  <span
                    key={`${alert.id}-${item}`}
                    className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]"
                  >
                    {item}
                  </span>
                ),
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {alert.dismissible !==
              false ? (
                <button
                  type="button"
                  onClick={() =>
                    onDismiss(
                      alert,
                    )
                  }
                  className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  Dismiss
                </button>
              ) : null}

              {alert.action ? (
                <Link
                  href={
                    alert.action
                      .href
                  }
                  className={[
                    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold outline-none transition focus-visible:ring-2",
                    tone.actionClasses,
                  ].join(" ")}
                >
                  {
                    alert.action
                      .label
                  }

                  <ArrowRightIcon />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

type SeverityBadgeProps = {
  severity: DashboardAlertSeverity;
};

function SeverityBadge({
  severity,
}: SeverityBadgeProps) {
  const config =
    getSeverityBadgeConfig(
      severity,
    );

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
        config.classes,
      ].join(" ")}
    >
      {config.label}
    </span>
  );
}

type DashboardAlertsEmptyStateProps = {
  title: string;
  description: string;
};

function DashboardAlertsEmptyState({
  title,
  description,
}: DashboardAlertsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
        <CheckCircleIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {description}
      </p>

      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Refresh dashboard
      </Link>
    </div>
  );
}

type AlertTone = {
  iconBackground: string;
  iconText: string;
  actionClasses: string;
};

function getAlertTone(
  severity: DashboardAlertSeverity,
): AlertTone {
  switch (severity) {
    case "critical":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        iconText:
          "text-[var(--danger)]",
        actionClasses:
          "bg-[var(--danger)] text-white hover:opacity-90 focus-visible:ring-[var(--danger)]",
      };

    case "warning":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        iconText:
          "text-[var(--warning)]",
        actionClasses:
          "bg-[var(--warning)] text-white hover:opacity-90 focus-visible:ring-[var(--warning)]",
      };

    case "success":
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        iconText:
          "text-[var(--success)]",
        actionClasses:
          "bg-[var(--success)] text-white hover:opacity-90 focus-visible:ring-[var(--success)]",
      };

    case "info":
    default:
      return {
        iconBackground:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        iconText:
          "text-[var(--primary)]",
        actionClasses:
          "bg-[var(--primary)] text-white hover:opacity-90 focus-visible:ring-[var(--primary)]",
      };
  }
}

function getSeverityBadgeConfig(
  severity: DashboardAlertSeverity,
) {
  switch (severity) {
    case "critical":
      return {
        label:
          "Critical",
        classes:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
      };

    case "warning":
      return {
        label:
          "Warning",
        classes:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
      };

    case "success":
      return {
        label:
          "Success",
        classes:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
      };

    case "info":
    default:
      return {
        label:
          "Info",
        classes:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
      };
  }
}

type BuildDashboardAlertsInput = {
  accounts: ReturnType<
    typeof useAccounts
  >["accounts"];
  bills: ReturnType<
    typeof useBills
  >["bills"];
  selectedMonth: Date;
  totals: ReturnType<
    typeof useBudget
  >["totals"];
  budgetGroups: ReturnType<
    typeof useBudget
  >["budgetGroups"];
  goals: ReturnType<
    typeof useGoals
  >["activeGoals"];
  transactions: ReturnType<
    typeof useTransactions
  >["transactions"];
};

function buildDashboardAlerts({
  accounts,
  bills,
  selectedMonth,
  totals,
  budgetGroups,
  goals,
  transactions,
}: BuildDashboardAlertsInput): DashboardAlert[] {
  const now =
    startOfDay(
      new Date(),
    );

  const alerts:
    DashboardAlert[] = [];

  bills.forEach(
    (
      bill,
    ) => {
      if (
        bill.status ===
        "paid"
      ) {
        return;
      }

      const dueDate =
        createLocalDate(
          bill.dueDate,
        );

      if (!dueDate) {
        return;
      }

      const dayDifference =
        differenceInCalendarDays(
          dueDate,
          now,
        );

      if (
        dayDifference <
        0
      ) {
        alerts.push({
          id:
            `bill-overdue-${bill.id}`,
          type:
            "bill-overdue",
          severity:
            "critical",
          title:
            `${bill.name} is past due`,
          description:
            `${bill.name} was due ${formatAlertDate(
              bill.dueDate,
            )} and still needs attention.`,
          createdAt:
            new Date().toISOString(),
          amount:
            bill.amount,
          action: {
            label:
              "Review bill",
            href:
              `/dashboard/bills?billId=${encodeURIComponent(
                bill.id,
              )}`,
          },
          dismissible:
            false,
        });

        return;
      }

      if (
        dayDifference ===
        0
      ) {
        alerts.push({
          id:
            `bill-due-today-${bill.id}`,
          type:
            "bill-due-today",
          severity:
            "warning",
          title:
            `${bill.name} is due today`,
          description:
            "Confirm that this bill has been paid or scheduled.",
          createdAt:
            new Date().toISOString(),
          amount:
            bill.amount,
          action: {
            label:
              "View bill",
            href:
              `/dashboard/bills?billId=${encodeURIComponent(
                bill.id,
              )}`,
          },
          dismissible:
            true,
        });

        return;
      }

      if (
        dayDifference <=
        7
      ) {
        alerts.push({
          id:
            `bill-due-soon-${bill.id}`,
          type:
            "bill-due-soon",
          severity:
            "info",
          title:
            `${bill.name} is due soon`,
          description:
            `${bill.name} is due ${formatAlertDate(
              bill.dueDate,
            )}.`,
          createdAt:
            new Date().toISOString(),
          amount:
            bill.amount,
          action: {
            label:
              "View bill",
            href:
              `/dashboard/bills?billId=${encodeURIComponent(
                bill.id,
              )}`,
          },
          dismissible:
            true,
        });
      }
    },
  );

  const unassignedAmount =
    Math.max(
      0,
      totals.plannedIncome -
        totals.assignedAmount,
    );

  if (
    unassignedAmount >
    0.009
  ) {
    alerts.push({
      id:
        `budget-unassigned-${selectedMonth.getFullYear()}-${selectedMonth.getMonth() + 1}`,
      type:
        "budget-unassigned",
      severity:
        "warning",
      title:
        `${formatCurrency(
          unassignedAmount,
        )} remains unassigned`,
      description:
        "Finish assigning your available income so your monthly plan is complete.",
      createdAt:
        new Date().toISOString(),
      amount:
        unassignedAmount,
      action: {
        label:
          "Finish budget",
        href:
          "/dashboard/budget",
      },
      dismissible:
        true,
    });
  }

  budgetGroups.forEach(
    (
      group,
    ) => {
      group.categories.forEach(
        (
          item,
        ) => {
          const overage =
            item.spentAmount -
            item.assignedAmount;

          if (
            overage <=
            0.009
          ) {
            return;
          }

          alerts.push({
            id:
              `budget-over-${item.id}`,
            type:
              "budget-over",
            severity:
              overage >=
              Math.max(
                100,
                item.assignedAmount *
                  0.25,
              )
                ? "critical"
                : "warning",
            title:
              `${item.name} is over budget`,
            description:
              `${item.name} is ${formatCurrency(
                overage,
              )} over its assigned amount.`,
            createdAt:
              new Date().toISOString(),
            amount:
              overage,
            action: {
              label:
                "Review budget",
              href:
                "/dashboard/budget",
            },
            dismissible:
              true,
          });
        },
      );
    },
  );

  const uncategorizedTransactions =
    transactions.filter(
      (
        transaction,
      ) =>
        transaction.type !==
          "transfer" &&
        (
          !transaction.category ||
          !transaction.category.name?.trim()
        ),
    );

  if (
    uncategorizedTransactions.length >
    0
  ) {
    alerts.push({
      id:
        "transactions-need-review",
      type:
        "transaction-review",
      severity:
        "info",
      title:
        `${uncategorizedTransactions.length} ${
          uncategorizedTransactions.length ===
          1
            ? "transaction needs"
            : "transactions need"
        } review`,
      description:
        "Categorize recent transactions to keep your budget accurate.",
      createdAt:
        new Date().toISOString(),
      count:
        uncategorizedTransactions.length,
      action: {
        label:
          "Review transactions",
        href:
          "/dashboard/transactions?status=uncategorized",
      },
      dismissible:
        true,
    });
  }

  accounts.forEach(
    (
      account,
    ) => {
      if (
        account.classification !==
          "asset" ||
        account.type !==
          "checking"
      ) {
        return;
      }

      const balance =
        account.availableBalance ??
        account.balance;

      if (
        balance >=
        250
      ) {
        return;
      }

      alerts.push({
        id:
          `low-balance-${account.id}`,
        type:
          "low-balance",
        severity:
          balance < 0
            ? "critical"
            : "warning",
        title:
          `${account.name} balance is low`,
        description:
          `${account.name} has ${formatCurrency(
            balance,
          )} available.`,
        createdAt:
          account.updatedAt,
        amount:
          balance,
        action: {
          label:
            "View account",
          href:
            `/dashboard/accounts?accountId=${encodeURIComponent(
              account.id,
            )}`,
        },
        dismissible:
          true,
      });
    },
  );

  goals.forEach(
    (
      goal,
    ) => {
      if (
        goal.targetAmount <=
        0
      ) {
        return;
      }

      const progress =
        (
          goal.currentAmount /
          goal.targetAmount
        ) *
        100;

      const milestone =
        getGoalMilestone(
          progress,
        );

      if (!milestone) {
        return;
      }

      alerts.push({
        id:
          `goal-milestone-${goal.id}-${milestone}`,
        type:
          "goal-milestone",
        severity:
          "success",
        title:
          `${goal.name} reached ${milestone}%`,
        description:
          `You have saved ${formatCurrency(
            goal.currentAmount,
          )} toward your ${formatCurrency(
            goal.targetAmount,
          )} goal.`,
        createdAt:
          goal.updatedAt,
        action: {
          label:
            "View goal",
          href:
            `/dashboard/goals?goalId=${encodeURIComponent(
              goal.id,
            )}`,
        },
        dismissible:
          true,
      });
    },
  );

  accounts
    .filter(
      (
        account,
      ) =>
        account.connectionStatus ===
          "disconnected" ||
        account.connectionStatus ===
          "error",
    )
    .forEach(
      (
        account,
      ) => {
        alerts.push({
          id:
            `account-connection-${account.id}`,
          type:
            "general",
          severity:
            account.connectionStatus ===
            "error"
              ? "critical"
              : "warning",
          title:
            `${account.name} needs attention`,
          description:
            "Reconnect this account to continue receiving balance updates.",
          createdAt:
            account.updatedAt,
          action: {
            label:
              "Manage account",
            href:
              `/dashboard/accounts?accountId=${encodeURIComponent(
                account.id,
              )}`,
          },
          dismissible:
            true,
        });
      },
    );

  return alerts;
}

function createLocalDate(
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
    return null;
  }

  return date;
}

function startOfDay(
  value: Date,
) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  );
}

function differenceInCalendarDays(
  laterDate: Date,
  earlierDate: Date,
) {
  const millisecondsPerDay =
    24 *
    60 *
    60 *
    1000;

  return Math.round(
    (
      startOfDay(
        laterDate,
      ).getTime() -
      startOfDay(
        earlierDate,
      ).getTime()
    ) /
      millisecondsPerDay,
  );
}

function formatAlertDate(
  value: string,
) {
  const date =
    createLocalDate(
      value,
    );

  if (!date) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
    },
  );
}

function getGoalMilestone(
  progress: number,
) {
  if (
    !Number.isFinite(
      progress,
    ) ||
    progress <
      25
  ) {
    return null;
  }

  if (
    progress >=
    100
  ) {
    return 100;
  }

  if (
    progress >=
    75
  ) {
    return 75;
  }

  if (
    progress >=
    50
  ) {
    return 50;
  }

  return 25;
}

function getSeverityPriority(
  severity: DashboardAlertSeverity,
) {
  switch (severity) {
    case "critical":
      return 0;

    case "warning":
      return 1;

    case "info":
      return 2;

    case "success":
      return 3;

    default:
      return 4;
  }
}

function getAlertMetadata(
  alert: DashboardAlert,
) {
  const metadata:
    string[] = [];

  if (
    typeof alert.amount ===
      "number" &&
    Number.isFinite(
      alert.amount,
    )
  ) {
    metadata.push(
      formatCurrency(
        alert.amount,
      ),
    );
  }

  if (
    typeof alert.count ===
      "number" &&
    Number.isFinite(
      alert.count,
    )
  ) {
    metadata.push(
      `${alert.count} ${
        alert.count === 1
          ? "item"
          : "items"
      }`,
    );
  }

  metadata.push(
    getAlertTypeLabel(
      alert.type,
    ),
  );

  return metadata;
}

function getAlertTypeLabel(
  type: DashboardAlertType,
) {
  switch (type) {
    case "bill-overdue":
      return "Past due bill";

    case "bill-due-today":
      return "Due today";

    case "bill-due-soon":
      return "Upcoming bill";

    case "budget-over":
      return "Over budget";

    case "budget-unassigned":
      return "Budget incomplete";

    case "low-balance":
      return "Account balance";

    case "transaction-review":
      return "Transaction review";

    case "goal-milestone":
      return "Goal milestone";

    case "general":
    default:
      return "General alert";
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
    value,
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

  const differenceInMinutes =
    Math.round(
      (now.getTime() -
        date.getTime()) /
        60000,
    );

  if (
    Math.abs(
      differenceInMinutes,
    ) < 1
  ) {
    return "Just now";
  }

  if (
    differenceInMinutes >=
      1 &&
    differenceInMinutes <
      60
  ) {
    return `${differenceInMinutes}m ago`;
  }

  const differenceInHours =
    Math.round(
      differenceInMinutes /
        60,
    );

  if (
    differenceInHours >=
      1 &&
    differenceInHours <
      24
  ) {
    return `${differenceInHours}h ago`;
  }

  const differenceInDays =
    Math.round(
      differenceInHours /
        24,
    );

  if (
    differenceInDays === 1
  ) {
    return "Yesterday";
  }

  if (
    differenceInDays >
      1 &&
    differenceInDays <=
      7
  ) {
    return `${differenceInDays}d ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    },
  );
}

function AlertTypeIcon({
  type,
}: {
  type: DashboardAlertType;
}) {
  switch (type) {
    case "bill-overdue":
      return (
        <BillOverdueIcon />
      );

    case "bill-due-today":
    case "bill-due-soon":
      return (
        <CalendarIcon />
      );

    case "budget-over":
      return (
        <BudgetWarningIcon />
      );

    case "budget-unassigned":
      return (
        <WalletIcon />
      );

    case "low-balance":
      return (
        <AccountIcon />
      );

    case "transaction-review":
      return (
        <TransactionIcon />
      );

    case "goal-milestone":
      return (
        <GoalIcon />
      );

    case "general":
    default:
      return (
        <AlertIcon />
      );
  }
}

function AlertIcon() {
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

      <path d="M10 21h4" />
    </svg>
  );
}

function BillOverdueIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />

      <path d="M12 8v5" />
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
      <path d="M12 14v3" />
      <path d="M12 19h.01" />
    </svg>
  );
}

function BudgetWarningIcon() {
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
      <path d="M12 13v2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function WalletIcon() {
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
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />

      <path d="M16 13h.01" />
    </svg>
  );
}

function AccountIcon() {
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
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10v7" />
      <path d="M9 10v7" />
      <path d="M15 10v7" />
      <path d="M19 10v7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function TransactionIcon() {
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
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function GoalIcon() {
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

function CheckCircleIcon() {
  return (
    <svg
      width="26"
      height="26"
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