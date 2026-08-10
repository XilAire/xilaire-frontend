"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useApp,
} from "@/components/providers/AppProvider";

type ActivityCategory =
  | "all"
  | "budget"
  | "transactions"
  | "bills"
  | "goals"
  | "debts"
  | "accounts"
  | "household"
  | "security";

type HouseholdActivityItem = {
  id: string;
  category:
    Exclude<
      ActivityCategory,
      "all"
    >;
  title: string;
  description: string;
  actorName: string;
  occurredAt: Date;
};

const activityFilters: {
  id: ActivityCategory;
  label: string;
}[] = [
  {
    id: "all",
    label: "All activity",
  },
  {
    id: "budget",
    label: "Budget",
  },
  {
    id: "transactions",
    label: "Transactions",
  },
  {
    id: "bills",
    label: "Bills",
  },
  {
    id: "goals",
    label: "Goals",
  },
  {
    id: "accounts",
    label: "Accounts",
  },
  {
    id: "household",
    label: "Household",
  },
  {
    id: "security",
    label: "Security",
  },
];

export default function HouseholdActivityOverview() {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<ActivityCategory>(
      "all",
    );

  const activityItems =
    useMemo<
      HouseholdActivityItem[]
    >(
      () => {
        if (
          !currentUser
        ) {
          return [];
        }

        return [];
      },
      [
        currentUser,
      ],
    );

  const filteredActivity =
    useMemo(
      () => {
        if (
          selectedCategory ===
          "all"
        ) {
          return activityItems;
        }

        return activityItems.filter(
          (
            item,
          ) =>
            item.category ===
            selectedCategory,
        );
      },
      [
        activityItems,
        selectedCategory,
      ],
    );

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader />

      <ActivitySummary
        workspaceName={
          workspaceName
        }
        totalActivity={
          activityItems.length
        }
        memberCount={
          currentUser
            ? 1
            : 0
        }
      />

      <ActivitySection
        activityItems={
          filteredActivity
        }
        selectedCategory={
          selectedCategory
        }
        onCategoryChange={
          setSelectedCategory
        }
      />

      <ActivityInformation />
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
        Household
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
        Activity
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        Review financial and account activity across your shared household
        workspace.
      </p>
    </header>
  );
}

function ActivitySummary({
  workspaceName,
  totalActivity,
  memberCount,
}: {
  workspaceName:
    string;

  totalActivity:
    number;

  memberCount:
    number;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <ActivityIcon />
          </div>

          <h2 className="mt-4 truncate text-xl font-bold text-[var(--text-primary)]">
            Household activity
          </h2>

          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {workspaceName}
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 py-1.5 text-xs font-bold text-[var(--success)]">
          <CheckIcon />

          Activity tracking
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryMetric
          label="Activity"
          value={
            String(
              totalActivity,
            )
          }
          description="Recorded workspace events"
        />

        <SummaryMetric
          label="Members"
          value={
            String(
              memberCount,
            )
          }
          description="People with workspace access"
        />

        <SummaryMetric
          label="History"
          value="Active"
          description="Household activity tracking"
        />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  description,
}: {
  label:
    string;

  value:
    string;

  description:
    string;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-muted)] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function ActivitySection({
  activityItems,
  selectedCategory,
  onCategoryChange,
}: {
  activityItems:
    HouseholdActivityItem[];

  selectedCategory:
    ActivityCategory;

  onCategoryChange:
    (
      category:
        ActivityCategory,
    ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Activity history
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          See important changes made across your household financial plan.
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {activityFilters.map(
            (
              filter,
            ) => {
              const isSelected =
                selectedCategory ===
                filter.id;

              return (
                <button
                  key={
                    filter.id
                  }
                  type="button"
                  onClick={
                    () =>
                      onCategoryChange(
                        filter.id,
                      )
                  }
                  className={[
                    "shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                  ].join(
                    " ",
                  )}
                >
                  {filter.label}
                </button>
              );
            },
          )}
        </div>
      </div>

      {activityItems.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {activityItems.map(
            (
              item,
            ) => (
              <ActivityRow
                key={
                  item.id
                }
                item={
                  item
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyActivityState
          selectedCategory={
            selectedCategory
          }
        />
      )}
    </section>
  );
}

function ActivityRow({
  item,
}: {
  item:
    HouseholdActivityItem;
}) {
  return (
    <article className="flex gap-4 p-5 sm:p-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)]">
        <ActivityCategoryIcon
          category={
            item.category
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {item.title}
            </h3>

            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              {item.description}
            </p>
          </div>

          <time
            dateTime={
              item.occurredAt.toISOString()
            }
            className="shrink-0 text-xs text-[var(--text-muted)]"
          >
            {formatActivityDate(
              item.occurredAt,
            )}
          </time>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[9px] font-black text-[var(--primary)]">
            {getInitials(
              item.actorName,
            )}
          </div>

          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {item.actorName}
          </span>

          <span className="text-[var(--text-muted)]">
            ·
          </span>

          <span className="text-xs capitalize text-[var(--text-muted)]">
            {item.category}
          </span>
        </div>
      </div>
    </article>
  );
}

function EmptyActivityState({
  selectedCategory,
}: {
  selectedCategory:
    ActivityCategory;
}) {
  const isFiltered =
    selectedCategory !==
    "all";

  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <ActivityIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {isFiltered
          ? "No matching activity"
          : "No household activity yet"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {isFiltered
          ? "There are no recorded household events in this category yet."
          : "Important household financial changes will appear here as you and your household use CASE Budget."}
      </p>
    </div>
  );
}

function ActivityInformation() {
  return (
    <section className="rounded-2xl border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <ShieldIcon />
        </div>

        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Know what changes in your household
          </h2>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
            Household activity provides visibility into important changes
            across shared budgets, transactions, bills, goals, accounts,
            members, and security settings.
          </p>
        </div>
      </div>
    </section>
  );
}

function ActivityCategoryIcon({
  category,
}: {
  category:
    HouseholdActivityItem["category"];
}) {
  if (
    category ===
    "security"
  ) {
    return (
      <ShieldIcon />
    );
  }

  if (
    category ===
    "household"
  ) {
    return (
      <UsersIcon />
    );
  }

  return (
    <ActivityIcon />
  );
}

function formatActivityDate(
  date:
    Date,
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",

      hour:
        "numeric",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function getInitials(
  name:
    string,
) {
  return (
    name
      .trim()
      .split(
        /\s+/,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join(
        "",
      )
      .slice(
        0,
        2,
      )
      .toUpperCase() ||
    "CB"
  );
}

function ActivityIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

function UsersIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="4"
      />

      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 3.5a4 4 0 0 1 0 8" />
      <path d="M18 15a6 6 0 0 1 4 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6Z" />

      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 12 4 4 8-8" />
    </svg>
  );
}