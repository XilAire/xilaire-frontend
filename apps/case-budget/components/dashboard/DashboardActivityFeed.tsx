"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useApp,
} from "@/components/providers/AppProvider";
import {
  useBills,
} from "@/components/providers/BillsProvider";
import {
  useDebts,
} from "@/components/providers/DebtsProvider";
import {
  useGoals,
} from "@/components/providers/GoalsProvider";
import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";
import {
  buildDashboardActivityFeed,
} from "@/lib/dashboard/buildDashboardActivityFeed";

export type DashboardActivityType =
  | "income-added"
  | "transaction-added"
  | "transaction-pending"
  | "transaction-cleared"
  | "transaction-transfer"
  | "transaction-categorized"
  | "bill-added"
  | "bill-paid"
  | "budget-updated"
  | "goal-created"
  | "goal-contribution"
  | "debt-payment"
  | "account-added"
  | "account-connected"
  | "account-balance-updated"
  | "member-added"
  | "workspace-updated"
  | "security"
  | "general";

export type DashboardActivityCategory =
  | "budget"
  | "transactions"
  | "bills"
  | "goals"
  | "debts"
  | "accounts"
  | "workspace"
  | "security"
  | "all";

export type DashboardActivityActor = {
  id?: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
};

export type DashboardActivityAction = {
  label: string;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  type: DashboardActivityType;
  category: Exclude<DashboardActivityCategory, "all">;
  title: string;
  description?: string;
  occurredAt: string;
  actor?: DashboardActivityActor;
  amount?: number;
  metadata?: string[];
  action?: DashboardActivityAction;
  isUnread?: boolean;
};

export type DashboardActivityFeedProps = {
  activities?: DashboardActivityItem[];
  title?: string;
  description?: string;
  maxVisible?: number;
  initialCategory?: DashboardActivityCategory;
  showHeader?: boolean;
  showFilters?: boolean;
  showViewAll?: boolean;
  activityHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onActivityClick?: (
    activity: DashboardActivityItem,
  ) => void;
  onMarkRead?: (
    activity: DashboardActivityItem,
  ) => void;
};

type ActivityFilter = {
  value: DashboardActivityCategory;
  label: string;
};

const activityFilters: ActivityFilter[] = [
  { value: "all", label: "All" },
  { value: "budget", label: "Budget" },
  { value: "transactions", label: "Transactions" },
  { value: "bills", label: "Bills" },
  { value: "goals", label: "Goals" },
  { value: "debts", label: "Debts" },
  { value: "accounts", label: "Accounts" },
  { value: "workspace", label: "Workspace" },
];

export default function DashboardActivityFeed({
  activities: activitiesOverride,
  title = "Recent Activity",
  description =
    "See the latest changes across your household finances.",
  maxVisible = 8,
  initialCategory = "all",
  showHeader = true,
  showFilters = true,
  showViewAll = true,
  activityHref = "/dashboard/activity",
  emptyTitle = "No activity to display",
  emptyDescription =
    "Financial and workspace activity will appear here as changes are made.",
  onActivityClick,
  onMarkRead,
}: DashboardActivityFeedProps) {
  const { accounts } = useAccounts();
  const { activeWorkspace } = useApp();
  const { bills } = useBills();
  const { debts } = useDebts();
  const { goals } = useGoals();
  const { transactions } = useTransactions();

  const defaultActor = useMemo<DashboardActivityActor>(
    () => ({
      id: "current-user",
      name: "You",
      initials: "YOU",
    }),
    [],
  );

  const generatedActivities = useMemo<DashboardActivityItem[]>(
    () =>
      buildDashboardActivityFeed({
        transactions,
        bills,
        goals,
        debts,
        accounts,
        defaultActor,
        workspaceActivities: activeWorkspace
          ? [
              {
                id: activeWorkspace.id,
                type: "workspace-updated",
                title: `${activeWorkspace.name} workspace available`,
                description:
                  "This workspace is active and available across CASE Budget.",
                occurredAt: new Date(0).toISOString(),
                metadata: [
                  formatWorkspaceType(activeWorkspace.type),
                  activeWorkspace.memberCount !== undefined
                    ? `${activeWorkspace.memberCount} ${
                        activeWorkspace.memberCount === 1
                          ? "member"
                          : "members"
                      }`
                    : undefined,
                ].filter(
                  (value): value is string =>
                    typeof value === "string",
                ),
                action: {
                  label: "Workspace settings",
                  href: "/dashboard/settings?section=workspace",
                },
                isUnread: false,
              },
            ]
          : [],
        maxItems: 100,
      }),
    [
      accounts,
      activeWorkspace,
      bills,
      debts,
      defaultActor,
      goals,
      transactions,
    ],
  );

  const activities =
    activitiesOverride ?? generatedActivities;

  const [selectedCategory, setSelectedCategory] =
    useState<DashboardActivityCategory>(initialCategory);

  const [locallyReadIds, setLocallyReadIds] =
    useState<string[]>([]);

  const normalizedActivities = useMemo(
    () =>
      activities
        .map((activity) => ({
          ...activity,
          isUnread:
            activity.isUnread === true &&
            !locallyReadIds.includes(activity.id),
        }))
        .sort(
          (firstActivity, secondActivity) =>
            new Date(secondActivity.occurredAt).getTime() -
            new Date(firstActivity.occurredAt).getTime(),
        ),
    [activities, locallyReadIds],
  );

  const filteredActivities = useMemo(
    () =>
      selectedCategory === "all"
        ? normalizedActivities
        : normalizedActivities.filter(
            (activity) =>
              activity.category === selectedCategory,
          ),
    [normalizedActivities, selectedCategory],
  );

  const visibleActivities = filteredActivities.slice(
    0,
    Math.max(0, maxVisible),
  );

  const hiddenActivityCount = Math.max(
    0,
    filteredActivities.length - visibleActivities.length,
  );

  const unreadCount = normalizedActivities.filter(
    (activity) => activity.isUnread,
  ).length;

  function handleActivityClick(
    activity: DashboardActivityItem,
  ) {
    if (activity.isUnread) {
      setLocallyReadIds((currentIds) =>
        currentIds.includes(activity.id)
          ? currentIds
          : [...currentIds, activity.id],
      );

      onMarkRead?.(activity);
    }

    onActivityClick?.(activity);
  }

  function handleMarkAllRead() {
    const unreadActivities = normalizedActivities.filter(
      (activity) => activity.isUnread,
    );

    setLocallyReadIds((currentIds) =>
      Array.from(
        new Set([
          ...currentIds,
          ...unreadActivities.map(
            (activity) => activity.id,
          ),
        ]),
      ),
    );

    unreadActivities.forEach((activity) => {
      onMarkRead?.(activity);
    });
  }

  return (
    <section
      aria-labelledby="dashboard-activity-feed-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <ActivityFeedHeader
          title={title}
          description={description}
          unreadCount={unreadCount}
          showViewAll={showViewAll}
          activityHref={activityHref}
          onMarkAllRead={handleMarkAllRead}
        />
      ) : null}

      {showFilters ? (
        <ActivityFilters
          selectedCategory={selectedCategory}
          activities={normalizedActivities}
          onCategoryChange={setSelectedCategory}
        />
      ) : null}

      {visibleActivities.length > 0 ? (
        <>
          <div className="divide-y divide-[var(--border-subtle)]">
            {visibleActivities.map((activity, index) => (
              <ActivityFeedRow
                key={activity.id}
                activity={activity}
                showTimelineLine={
                  index !== visibleActivities.length - 1
                }
                onActivityClick={handleActivityClick}
              />
            ))}
          </div>

          {hiddenActivityCount > 0 ? (
            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">
                {hiddenActivityCount} additional {" "}
                {hiddenActivityCount === 1
                  ? "activity"
                  : "activities"}{" "}
                not shown
              </p>

              <Link
                href={createActivityHref(
                  activityHref,
                  selectedCategory,
                )}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                View full activity
                <ArrowRightIcon />
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <ActivityFeedEmptyState
          title={emptyTitle}
          description={emptyDescription}
          selectedCategory={selectedCategory}
          onShowAll={() => setSelectedCategory("all")}
        />
      )}
    </section>
  );
}

type ActivityFeedHeaderProps = {
  title: string;
  description: string;
  unreadCount: number;
  showViewAll: boolean;
  activityHref: string;
  onMarkAllRead: () => void;
};

function ActivityFeedHeader({
  title,
  description,
  unreadCount,
  showViewAll,
  activityHref,
  onMarkAllRead,
}: ActivityFeedHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <ActivityIcon />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dashboard-activity-feed-title"
              className="text-base font-bold text-[var(--text-primary)]"
            >
              {title}
            </h2>

            {unreadCount > 0 ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </div>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Mark all read
          </button>
        ) : null}

        {showViewAll ? (
          <Link
            href={activityHref}
            className="inline-flex min-h-9 items-center gap-1 text-sm font-bold text-[var(--primary)] outline-none transition hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            View all
            <ChevronRightIcon />
          </Link>
        ) : null}
      </div>
    </header>
  );
}

type ActivityFiltersProps = {
  selectedCategory: DashboardActivityCategory;
  activities: DashboardActivityItem[];
  onCategoryChange: (
    category: DashboardActivityCategory,
  ) => void;
};

function ActivityFilters({
  selectedCategory,
  activities,
  onCategoryChange,
}: ActivityFiltersProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 sm:px-5">
      <div
        role="tablist"
        aria-label="Filter recent activity"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {activityFilters.map((filter) => {
          const isSelected =
            selectedCategory === filter.value;

          const count = getCategoryCount(
            activities,
            filter.value,
          );

          return (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() =>
                onCategoryChange(filter.value)
              }
              className={[
                "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                isSelected
                  ? "border-[color-mix(in_srgb,var(--primary)_28%,var(--border-subtle))] bg-[var(--surface-default)] text-[var(--primary)] shadow-sm"
                  : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface-default)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {filter.label}

              <span
                className={[
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                  isSelected
                    ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                    : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ActivityFeedRowProps = {
  activity: DashboardActivityItem;
  showTimelineLine: boolean;
  onActivityClick: (
    activity: DashboardActivityItem,
  ) => void;
};

function ActivityFeedRow({
  activity,
  showTimelineLine,
  onActivityClick,
}: ActivityFeedRowProps) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="relative flex shrink-0 flex-col items-center">
        <div
          className={[
            "relative z-10 flex h-10 w-10 items-center justify-center rounded-xl",
            getActivityToneClasses(activity.type),
          ].join(" ")}
        >
          <ActivityTypeIcon type={activity.type} />

          {activity.isUnread ? (
            <span
              aria-label="Unread activity"
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface-default)] bg-[var(--primary)]"
            />
          ) : null}
        </div>

        {showTimelineLine ? (
          <span
            aria-hidden="true"
            className="absolute top-10 h-[calc(100%+1rem)] w-px bg-[var(--border-subtle)]"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={[
                  "text-sm text-[var(--text-primary)]",
                  activity.isUnread
                    ? "font-black"
                    : "font-bold",
                ].join(" ")}
              >
                {activity.title}
              </h3>

              <ActivityCategoryBadge
                category={activity.category}
              />
            </div>

            {activity.description ? (
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                {activity.description}
              </p>
            ) : null}
          </div>

          <time
            dateTime={activity.occurredAt}
            title={formatFullDate(activity.occurredAt)}
            className="shrink-0 text-xs font-medium text-[var(--text-muted)]"
          >
            {formatRelativeDate(activity.occurredAt)}
          </time>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {activity.actor ? (
              <ActorBadge actor={activity.actor} />
            ) : null}

            {typeof activity.amount === "number" &&
            Number.isFinite(activity.amount) ? (
              <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]">
                {formatCurrency(activity.amount)}
              </span>
            ) : null}

            {activity.metadata?.map((item) => (
              <span
                key={`${activity.id}-${item}`}
                className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]"
              >
                {item}
              </span>
            ))}
          </div>

          {activity.action ? (
            <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-lg px-3 text-xs font-bold text-[var(--primary)] transition group-hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] sm:self-auto">
              {activity.action.label}
              <ArrowRightIcon />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  const className = [
    "group block w-full px-4 py-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-5",
    activity.isUnread
      ? "bg-[color-mix(in_srgb,var(--primary)_3%,var(--surface-default))] hover:bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface-muted))]"
      : "hover:bg-[var(--surface-muted)]",
  ].join(" ");

  if (activity.action) {
    return (
      <Link
        href={activity.action.href}
        onClick={() => onActivityClick(activity)}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onActivityClick(activity)}
      className={className}
    >
      {content}
    </button>
  );
}

function ActorBadge({
  actor,
}: {
  actor: DashboardActivityActor;
}) {
  const initials =
    actor.initials ?? createInitials(actor.name);

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] py-1 pl-1 pr-2.5 text-xs font-semibold text-[var(--text-muted)]">
      {actor.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={actor.avatarUrl}
          alt=""
          className="h-6 w-6 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[9px] font-black text-[var(--primary)]">
          {initials}
        </span>
      )}

      {actor.name}
    </span>
  );
}

function ActivityCategoryBadge({
  category,
}: {
  category: Exclude<
    DashboardActivityCategory,
    "all"
  >;
}) {
  return (
    <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {getCategoryLabel(category)}
    </span>
  );
}

function ActivityFeedEmptyState({
  title,
  description,
  selectedCategory,
  onShowAll,
}: {
  title: string;
  description: string;
  selectedCategory: DashboardActivityCategory;
  onShowAll: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
        <ActivityIcon />
      </div>

      <h3 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        {selectedCategory === "all"
          ? title
          : `No ${getCategoryLabel(
              selectedCategory,
            ).toLowerCase()} activity`}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {selectedCategory === "all"
          ? description
          : "There are no recent entries in this activity category."}
      </p>

      {selectedCategory !== "all" ? (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Show all activity
        </button>
      ) : (
        <Link
          href="/dashboard"
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          Return to dashboard
        </Link>
      )}
    </div>
  );
}

function getActivityToneClasses(
  type: DashboardActivityType,
) {
  switch (type) {
    case "income-added":
    case "transaction-cleared":
    case "bill-paid":
    case "goal-contribution":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "transaction-pending":
    case "debt-payment":
      return "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]";

    case "security":
      return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";

    case "transaction-transfer":
    case "account-added":
    case "account-connected":
    case "account-balance-updated":
      return "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]";

    case "member-added":
    case "workspace-updated":
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";

    case "transaction-added":
    case "transaction-categorized":
    case "bill-added":
    case "budget-updated":
    case "goal-created":
    case "general":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function ActivityTypeIcon({
  type,
}: {
  type: DashboardActivityType;
}) {
  switch (type) {
    case "income-added":
      return <IncomeIcon />;

    case "transaction-pending":
      return <PendingIcon />;

    case "transaction-cleared":
      return <ClearedIcon />;

    case "transaction-transfer":
      return <TransferIcon />;

    case "transaction-added":
    case "transaction-categorized":
      return <TransactionIcon />;

    case "bill-added":
      return <BillIcon />;

    case "bill-paid":
      return <BillPaidIcon />;

    case "budget-updated":
      return <BudgetIcon />;

    case "goal-created":
      return <GoalIcon />;

    case "goal-contribution":
      return <GoalContributionIcon />;

    case "debt-payment":
      return <DebtIcon />;

    case "account-added":
      return <AccountIcon />;

    case "account-connected":
      return <BankIcon />;

    case "account-balance-updated":
      return <BalanceUpdateIcon />;

    case "member-added":
      return <MemberIcon />;

    case "workspace-updated":
      return <WorkspaceIcon />;

    case "security":
      return <SecurityIcon />;

    case "general":
    default:
      return <ActivityIcon />;
  }
}

function formatWorkspaceType(value: string) {
  return value
    .split("-")
    .map(
      (word) =>
        `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

function getCategoryCount(
  activities: DashboardActivityItem[],
  category: DashboardActivityCategory,
) {
  if (category === "all") {
    return activities.length;
  }

  return activities.filter(
    (activity) => activity.category === category,
  ).length;
}

function getCategoryLabel(
  category: DashboardActivityCategory,
) {
  switch (category) {
    case "budget":
      return "Budget";
    case "transactions":
      return "Transactions";
    case "bills":
      return "Bills";
    case "goals":
      return "Goals";
    case "debts":
      return "Debts";
    case "accounts":
      return "Accounts";
    case "workspace":
      return "Workspace";
    case "security":
      return "Security";
    case "all":
    default:
      return "All";
  }
}

function createActivityHref(
  baseHref: string,
  category: DashboardActivityCategory,
) {
  if (category === "all") {
    return baseHref;
  }

  const separator = baseHref.includes("?")
    ? "&"
    : "?";

  return `${baseHref}${separator}category=${encodeURIComponent(
    category,
  )}`;
}

function createInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(
    Number.isFinite(value) ? Math.abs(value) : 0,
  );
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const differenceInMilliseconds =
    now.getTime() - date.getTime();
  const differenceInMinutes = Math.floor(
    differenceInMilliseconds / 60000,
  );

  if (differenceInMinutes < 1) {
    return "Just now";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60,
  );

  if (differenceInHours < 24) {
    return `${differenceInHours}h ago`;
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24,
  );

  if (differenceInDays === 1) {
    return "Yesterday";
  }

  if (differenceInDays < 7) {
    return `${differenceInDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() !== now.getFullYear()
        ? "numeric"
        : undefined,
  });
}

function formatFullDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Icon({
  children,
}: {
  children: ReactNode;
}) {
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
      {children}
    </svg>
  );
}

function ActivityIcon() {
  return (
    <Icon>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </Icon>
  );
}

function IncomeIcon() {
  return (
    <Icon>
      <path d="M12 21V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13h14" />
    </Icon>
  );
}

function PendingIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

function ClearedIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </Icon>
  );
}

function TransferIcon() {
  return (
    <Icon>
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </Icon>
  );
}

function TransactionIcon() {
  return <TransferIcon />;
}

function BillIcon() {
  return (
    <Icon>
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </Icon>
  );
}

function BillPaidIcon() {
  return (
    <Icon>
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

function BudgetIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 14h4" />
      <path d="M16 13v4" />
      <path d="M14 15h4" />
    </Icon>
  );
}

function GoalIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}

function GoalContributionIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M7 12h10" />
    </Icon>
  );
}

function DebtIcon() {
  return (
    <Icon>
      <path d="M6 3h12v18H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h4" />
      <path d="m14 17 2 2 4-4" />
    </Icon>
  );
}

function AccountIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 15h3" />
      <path d="M17 13v4" />
      <path d="M15 15h4" />
    </Icon>
  );
}

function BankIcon() {
  return (
    <Icon>
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10v7" />
      <path d="M9 10v7" />
      <path d="M15 10v7" />
      <path d="M19 10v7" />
      <path d="M3 20h18" />
    </Icon>
  );
}

function BalanceUpdateIcon() {
  return (
    <Icon>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </Icon>
  );
}

function MemberIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M19 8v6" />
      <path d="M16 11h6" />
    </Icon>
  );
}

function WorkspaceIcon() {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 4v16" />
      <path d="M8 10h13" />
    </Icon>
  );
}

function SecurityIcon() {
  return (
    <Icon>
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
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
