"use client";

import Link from "next/link";
import {
  useMemo,
} from "react";

export type DashboardQuickActionIcon =
  | "income"
  | "budget-item"
  | "budget-group"
  | "transaction"
  | "import"
  | "reconcile"
  | "bill"
  | "bill-paid"
  | "goal"
  | "debt"
  | "account"
  | "bank"
  | "reports"
  | "workspace";

export type DashboardQuickActionCategory =
  | "budget"
  | "transactions"
  | "bills"
  | "goals"
  | "debts"
  | "accounts"
  | "reports"
  | "settings";

export type DashboardQuickAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: DashboardQuickActionIcon;
  category: DashboardQuickActionCategory;
  disabled?: boolean;
  comingSoon?: boolean;
  badge?: string;
};

export type DashboardQuickActionsProps = {
  actions?: DashboardQuickAction[];
  maxVisible?: number;
  compact?: boolean;
  showHeader?: boolean;
  showViewAll?: boolean;
  viewAllHref?: string;
  onActionClick?: (
    action: DashboardQuickAction,
  ) => void;
};

const defaultActions:
  DashboardQuickAction[] = [
    {
      id: "add-income",
      label: "Add Income",
      description:
        "Add income to the current monthly budget.",
      href:
        "/dashboard/budget?action=add-income",
      icon: "income",
      category: "budget",
    },
    {
      id: "add-budget-item",
      label: "Add Budget Item",
      description:
        "Create a new spending or savings item.",
      href:
        "/dashboard/budget?action=add-item",
      icon: "budget-item",
      category: "budget",
    },
    {
      id: "add-transaction",
      label: "Add Transaction",
      description:
        "Record a new income or expense transaction.",
      href:
        "/dashboard/transactions?action=add",
      icon: "transaction",
      category: "transactions",
    },
    {
      id: "add-bill",
      label: "Add Bill",
      description:
        "Create a bill and configure its reminders.",
      href:
        "/dashboard/bills?action=add",
      icon: "bill",
      category: "bills",
    },
    {
      id: "add-goal",
      label: "Add Savings Goal",
      description:
        "Create a new savings target and timeline.",
      href:
        "/dashboard/goals?action=add",
      icon: "goal",
      category: "goals",
    },
    {
      id: "add-debt",
      label: "Add Debt",
      description:
        "Add a debt account to your payoff plan.",
      href:
        "/dashboard/debts?action=add",
      icon: "debt",
      category: "debts",
    },
    {
      id: "add-account",
      label: "Add Account",
      description:
        "Add a checking, savings, credit, or cash account.",
      href:
        "/dashboard/accounts?action=add",
      icon: "account",
      category: "accounts",
    },
    {
      id: "connect-bank",
      label: "Connect Bank",
      description:
        "Securely connect a supported financial institution.",
      href:
        "/dashboard/accounts?action=connect-bank",
      icon: "bank",
      category: "accounts",
      comingSoon: true,
      badge: "Premium",
    },
    {
      id: "view-reports",
      label: "View Reports",
      description:
        "Review spending, income, cash flow, and trends.",
      href:
        "/dashboard/reports",
      icon: "reports",
      category: "reports",
    },
    {
      id: "manage-workspace",
      label: "Manage Workspace",
      description:
        "Update members, roles, preferences, and settings.",
      href:
        "/dashboard/settings",
      icon: "workspace",
      category: "settings",
    },
  ];

export default function DashboardQuickActions({
  actions = defaultActions,
  maxVisible = 8,
  compact = false,
  showHeader = true,
  showViewAll = true,
  viewAllHref =
    "/dashboard/quick-actions",
  onActionClick,
}: DashboardQuickActionsProps) {
  const visibleActions =
    useMemo(
      () =>
        actions.slice(
          0,
          Math.max(
            0,
            maxVisible,
          ),
        ),
      [
        actions,
        maxVisible,
      ],
    );

  const hiddenCount =
    Math.max(
      0,
      actions.length -
        visibleActions.length,
    );

  return (
    <section
      aria-labelledby="dashboard-quick-actions-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <QuickActionsHeader
          actionCount={
            actions.length
          }
          showViewAll={
            showViewAll
          }
          viewAllHref={
            viewAllHref
          }
        />
      ) : null}

      {visibleActions.length >
      0 ? (
        <>
          <div
            className={[
              "grid gap-4 p-4 sm:p-6",
              compact
                ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
            ].join(" ")}
          >
            {visibleActions.map(
              (
                action,
              ) => (
                <QuickActionCard
                  key={
                    action.id
                  }
                  action={
                    action
                  }
                  compact={
                    compact
                  }
                  onActionClick={
                    onActionClick
                  }
                />
              ),
            )}
          </div>

          {hiddenCount >
          0 ? (
            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {hiddenCount}{" "}
                additional{" "}
                {hiddenCount ===
                1
                  ? "action"
                  : "actions"}{" "}
                available
              </p>

              <Link
                href={
                  viewAllHref
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                View all actions

                <ArrowRightIcon />
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <QuickActionsEmptyState />
      )}
    </section>
  );
}

type QuickActionsHeaderProps = {
  actionCount: number;
  showViewAll: boolean;
  viewAllHref: string;
};

function QuickActionsHeader({
  actionCount,
  showViewAll,
  viewAllHref,
}: QuickActionsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <LightningIcon />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dashboard-quick-actions-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              Quick Actions
            </h2>

            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--text-muted)]">
              {actionCount}
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-5 text-[var(--text-muted)]">
            Quickly access your most
            common financial tasks.
          </p>
        </div>
      </div>

      {showViewAll ? (
        <Link
          href={
            viewAllHref
          }
          className="inline-flex min-h-9 items-center gap-1 self-start text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:self-auto"
        >
          View all

          <ChevronRightIcon />
        </Link>
      ) : null}
    </header>
  );
}

type QuickActionCardProps = {
  action: DashboardQuickAction;
  compact: boolean;
  onActionClick?: (
    action: DashboardQuickAction,
  ) => void;
};

function QuickActionCard({
  action,
  compact,
  onActionClick,
}: QuickActionCardProps) {
  const isUnavailable =
    action.disabled ||
    action.comingSoon;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)] transition group-hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]">
          <QuickActionIcon
            icon={
              action.icon
            }
          />
        </div>

        <div className="flex flex-wrap justify-end gap-1.5">
          {action.badge ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--primary)]">
              {
                action.badge
              }
            </span>
          ) : null}

          {action.comingSoon ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--warning)]">
              Coming soon
            </span>
          ) : null}
        </div>
      </div>

      <h3
        className={[
          "font-bold text-[var(--text-primary)]",
          compact
            ? "mt-3 text-sm"
            : "mt-4 text-base",
        ].join(" ")}
      >
        {action.label}
      </h3>

      {!compact ? (
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          {action.description}
        </p>
      ) : null}

      <div className="mt-auto pt-4">
        <span
          className={[
            "inline-flex items-center gap-1.5 text-xs font-bold",
            isUnavailable
              ? "text-[var(--text-muted)]"
              : "text-[var(--primary)]",
          ].join(" ")}
        >
          {action.comingSoon
            ? "Not available yet"
            : action.disabled
              ? "Unavailable"
              : "Open"}

          {!isUnavailable ? (
            <ArrowRightIcon />
          ) : null}
        </span>
      </div>
    </>
  );

  const sharedClasses = [
    "group flex min-h-full flex-col rounded-2xl border p-4 text-left outline-none transition sm:p-5",
    isUnavailable
      ? "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--surface-muted)] opacity-70"
      : "border-[var(--border-subtle)] bg-[var(--surface-default)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--primary)_32%,var(--border-subtle))] hover:shadow-lg hover:shadow-black/5 focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
  ].join(" ");

  if (
    isUnavailable
  ) {
    return (
      <div
        aria-disabled="true"
        className={
          sharedClasses
        }
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={
        action.href
      }
      onClick={() =>
        onActionClick?.(
          action,
        )
      }
      className={
        sharedClasses
      }
    >
      {content}
    </Link>
  );
}

function QuickActionsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <LightningIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        No quick actions available
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Quick actions will appear here
        when financial features are
        available for your workspace.
      </p>

      <Link
        href="/dashboard"
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        Return to dashboard
      </Link>
    </div>
  );
}

type QuickActionIconProps = {
  icon:
    DashboardQuickActionIcon;
};

function QuickActionIcon({
  icon,
}: QuickActionIconProps) {
  switch (icon) {
    case "income":
      return (
        <IncomeIcon />
      );

    case "budget-item":
      return (
        <BudgetItemIcon />
      );

    case "budget-group":
      return (
        <BudgetGroupIcon />
      );

    case "transaction":
      return (
        <TransactionIcon />
      );

    case "import":
      return (
        <ImportIcon />
      );

    case "reconcile":
      return (
        <ReconcileIcon />
      );

    case "bill":
      return (
        <BillIcon />
      );

    case "bill-paid":
      return (
        <BillPaidIcon />
      );

    case "goal":
      return (
        <GoalIcon />
      );

    case "debt":
      return (
        <DebtIcon />
      );

    case "account":
      return (
        <AccountIcon />
      );

    case "bank":
      return (
        <BankIcon />
      );

    case "reports":
      return (
        <ReportsIcon />
      );

    case "workspace":
      return (
        <WorkspaceIcon />
      );

    default:
      return (
        <LightningIcon />
      );
  }
}

function LightningIcon() {
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
      <path d="m13 2-9 12h8l-1 8 9-12h-8Z" />
    </svg>
  );
}

function IncomeIcon() {
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
      <path d="M12 2v20" />
      <path d="m17 7-5-5-5 5" />
      <path d="M5 12h14" />
    </svg>
  );
}

function BudgetItemIcon() {
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
      <path d="M8 14h4" />
      <path d="M16 13v4" />
      <path d="M14 15h4" />
    </svg>
  );
}

function BudgetGroupIcon() {
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
        y="4"
        width="8"
        height="7"
        rx="1"
      />

      <rect
        x="13"
        y="4"
        width="8"
        height="7"
        rx="1"
      />

      <rect
        x="3"
        y="13"
        width="8"
        height="7"
        rx="1"
      />

      <path d="M17 14v6" />
      <path d="M14 17h6" />
    </svg>
  );
}

function TransactionIcon() {
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
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function ImportIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

function ReconcileIcon() {
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
      <path d="M20 7h-7" />
      <path d="m17 3 4 4-4 4" />
      <path d="M4 17h7" />
      <path d="m7 13-4 4 4 4" />
      <path d="m10 10 2 2 4-4" />
    </svg>
  );
}

function BillIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </svg>
  );
}

function BillPaidIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function GoalIcon() {
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
      <path d="m14 17 2 2 4-4" />
    </svg>
  );
}

function AccountIcon() {
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
      <path d="M17 13v4" />
      <path d="M15 15h4" />
    </svg>
  );
}

function BankIcon() {
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
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10v7" />
      <path d="M9 10v7" />
      <path d="M15 10v7" />
      <path d="M19 10v7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function ReportsIcon() {
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
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </svg>
  );
}

function WorkspaceIcon() {
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
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M8 4v16" />
      <path d="M8 10h13" />
      <path d="M14 14h4" />
      <path d="M16 12v4" />
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