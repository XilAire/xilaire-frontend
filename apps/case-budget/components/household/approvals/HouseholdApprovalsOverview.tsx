"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useApp,
} from "@/components/providers/AppProvider";

type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

type ApprovalType =
  | "transaction"
  | "budget"
  | "bill"
  | "goal"
  | "account"
  | "member"
  | "security"
  | "other";

type HouseholdApproval = {
  id:
    string;

  title:
    string;

  description:
    string;

  type:
    ApprovalType;

  status:
    ApprovalStatus;

  requestedBy:
    string;

  requestedAt:
    Date;

  amount?:
    number;
};

type ApprovalFilter =
  | "pending"
  | "all"
  | "approved"
  | "rejected";

const approvalFilters: {
  id:
    ApprovalFilter;

  label:
    string;
}[] = [
  {
    id:
      "pending",

    label:
      "Pending",
  },
  {
    id:
      "all",

    label:
      "All approvals",
  },
  {
    id:
      "approved",

    label:
      "Approved",
  },
  {
    id:
      "rejected",

    label:
      "Rejected",
  },
];

export default function HouseholdApprovalsOverview() {
  const {
    currentUser,
    activeWorkspace,
  } =
    useApp();

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<ApprovalFilter>(
      "pending",
    );

  /*
   * Approval persistence is not connected yet.
   *
   * Keep the initial collection empty rather than displaying
   * fake household approval requests.
   */
  const approvals =
    useMemo<
      HouseholdApproval[]
    >(
      () => {
        void currentUser;

        return [];
      },
      [
        currentUser,
      ],
    );

  const filteredApprovals =
    useMemo(
      () => {
        if (
          selectedFilter ===
          "all"
        ) {
          return approvals;
        }

        return approvals.filter(
          (
            approval,
          ) =>
            approval.status ===
            selectedFilter,
        );
      },
      [
        approvals,
        selectedFilter,
      ],
    );

  const pendingCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "pending",
    ).length;

  const approvedCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "approved",
    ).length;

  const rejectedCount =
    approvals.filter(
      (
        approval,
      ) =>
        approval.status ===
        "rejected",
    ).length;

  const workspaceName =
    activeWorkspace?.name ??
    "Personal workspace";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader />

      <ApprovalSummary
        workspaceName={
          workspaceName
        }
        pendingCount={
          pendingCount
        }
        approvedCount={
          approvedCount
        }
        rejectedCount={
          rejectedCount
        }
      />

      <ApprovalQueue
        approvals={
          filteredApprovals
        }
        selectedFilter={
          selectedFilter
        }
        onFilterChange={
          setSelectedFilter
        }
      />

      <ApprovalPolicySection />
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
        Approvals
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
        Review household financial requests that require authorization before
        changes are applied to the shared workspace.
      </p>
    </header>
  );
}

function ApprovalSummary({
  workspaceName,
  pendingCount,
  approvedCount,
  rejectedCount,
}: {
  workspaceName:
    string;

  pendingCount:
    number;

  approvedCount:
    number;

  rejectedCount:
    number;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            <ApprovalIcon />
          </div>

          <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
            Approval center
          </h2>

          <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
            {workspaceName}
          </p>
        </div>

        <span
          className={[
            "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold",
            pendingCount >
            0
              ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
              : "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
          ].join(
            " ",
          )}
        >
          {pendingCount >
          0 ? (
            <ClockIcon />
          ) : (
            <CheckIcon />
          )}

          {pendingCount >
          0
            ? `${pendingCount} pending`
            : "Up to date"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryMetric
          label="Pending"
          value={
            String(
              pendingCount,
            )
          }
          description="Waiting for a decision"
        />

        <SummaryMetric
          label="Approved"
          value={
            String(
              approvedCount,
            )
          }
          description="Requests accepted"
        />

        <SummaryMetric
          label="Rejected"
          value={
            String(
              rejectedCount,
            )
          }
          description="Requests declined"
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

      <p className="mt-2 text-lg font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </div>
  );
}

function ApprovalQueue({
  approvals,
  selectedFilter,
  onFilterChange,
}: {
  approvals:
    HouseholdApproval[];

  selectedFilter:
    ApprovalFilter;

  onFilterChange:
    (
      filter:
        ApprovalFilter,
    ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)]">
      <div className="border-b border-[var(--border-subtle)] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Approval requests
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          Review requests from household members before protected financial
          actions are completed.
        </p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {approvalFilters.map(
            (
              filter,
            ) => {
              const isSelected =
                selectedFilter ===
                filter.id;

              return (
                <button
                  key={
                    filter.id
                  }
                  type="button"
                  onClick={
                    () => {
                      onFilterChange(
                        filter.id,
                      );
                    }
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

      {approvals.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {approvals.map(
            (
              approval,
            ) => (
              <ApprovalRow
                key={
                  approval.id
                }
                approval={
                  approval
                }
              />
            ),
          )}
        </div>
      ) : (
        <EmptyApprovalsState
          selectedFilter={
            selectedFilter
          }
        />
      )}
    </section>
  );
}

function ApprovalRow({
  approval,
}: {
  approval:
    HouseholdApproval;
}) {
  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)]">
            <ApprovalTypeIcon
              type={
                approval.type
              }
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {approval.title}
              </h3>

              <ApprovalStatusBadge
                status={
                  approval.status
                }
              />
            </div>

            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {approval.description}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>
                Requested by{" "}
                <strong className="font-semibold text-[var(--text-primary)]">
                  {approval.requestedBy}
                </strong>
              </span>

              <span>
                ·
              </span>

              <time
                dateTime={
                  approval.requestedAt.toISOString()
                }
              >
                {formatApprovalDate(
                  approval.requestedAt,
                )}
              </time>

              {approval.amount !==
              undefined ? (
                <>
                  <span>
                    ·
                  </span>

                  <strong className="font-bold text-[var(--text-primary)]">
                    {formatCurrency(
                      approval.amount,
                    )}
                  </strong>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {approval.status ===
        "pending" ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Reject
            </button>

            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <CheckIcon />

              Approve
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ApprovalStatusBadge({
  status,
}: {
  status:
    ApprovalStatus;
}) {
  const className =
    status ===
    "approved"
      ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
      : status ===
        "rejected"
        ? "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]"
        : status ===
          "pending"
          ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
          : "bg-[var(--surface-muted)] text-[var(--text-muted)]";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        className,
      ].join(
        " ",
      )}
    >
      {formatApprovalStatus(
        status,
      )}
    </span>
  );
}

function EmptyApprovalsState({
  selectedFilter,
}: {
  selectedFilter:
    ApprovalFilter;
}) {
  const isPending =
    selectedFilter ===
    "pending";

  const isAll =
    selectedFilter ===
    "all";

  return (
    <div className="flex flex-col items-center px-5 py-14 text-center sm:px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <ApprovalIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {isPending
          ? "You're all caught up"
          : isAll
            ? "No approval history yet"
            : `No ${selectedFilter} requests`}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        {isPending
          ? "There are no household requests waiting for your approval."
          : isAll
            ? "Household requests and their decisions will appear here once approval rules are in use."
            : `There are no household requests with a ${selectedFilter} status yet.`}
      </p>
    </div>
  );
}

function ApprovalPolicySection() {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
          Approval controls
        </p>

        <h2 className="mt-2 text-lg font-bold text-[var(--text-primary)]">
          Protect important household decisions
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
          Approval rules can help household owners control which financial
          actions members can complete independently and which actions require
          authorization first.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ApprovalPolicyCard
          icon={
            <MoneyIcon />
          }
          title="Large transactions"
          description="Require approval when a household transaction exceeds a configured spending threshold."
        />

        <ApprovalPolicyCard
          icon={
            <BudgetIcon />
          }
          title="Budget changes"
          description="Protect important changes to shared category assignments and monthly planning."
        />

        <ApprovalPolicyCard
          icon={
            <AccountIcon />
          }
          title="Account changes"
          description="Require authorization before adding, removing, or changing shared financial accounts."
        />

        <ApprovalPolicyCard
          icon={
            <SecurityIcon />
          }
          title="Sensitive actions"
          description="Add an extra authorization step for membership, security, and other high-impact workspace changes."
        />
      </div>
    </section>
  );
}

function ApprovalPolicyCard({
  icon,
  title,
  description,
}: {
  icon:
    React.ReactNode;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
          {icon}
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ApprovalTypeIcon({
  type,
}: {
  type:
    ApprovalType;
}) {
  switch (
    type
  ) {
    case "budget":
      return (
        <BudgetIcon />
      );

    case "account":
      return (
        <AccountIcon />
      );

    case "security":
    case "member":
      return (
        <SecurityIcon />
      );

    case "transaction":
    case "bill":
      return (
        <MoneyIcon />
      );

    default:
      return (
        <ApprovalIcon />
      );
  }
}

function formatApprovalStatus(
  status:
    ApprovalStatus,
) {
  if (
    status ===
    "cancelled"
  ) {
    return "Cancelled";
  }

  return `${status
    .charAt(
      0,
    )
    .toUpperCase()}${status.slice(
    1,
  )}`;
}

function formatApprovalDate(
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

function formatCurrency(
  amount:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",
    },
  ).format(
    amount,
  );
}

function ApprovalIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 11 12 14 20 6" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function CheckIcon() {
  return (
    <svg
      width="15"
      height="15"
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

function MoneyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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

      <path d="M7 9h10" />
      <path d="M7 15h4" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h16" />

      <circle
        cx="8"
        cy="6.5"
        r="1.5"
      />

      <circle
        cx="15"
        cy="12"
        r="1.5"
      />

      <circle
        cx="11"
        cy="17.5"
        r="1.5"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
      />

      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg
      width="18"
      height="18"
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