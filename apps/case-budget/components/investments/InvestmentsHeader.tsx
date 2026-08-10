"use client";

import Link from "next/link";

export type InvestmentsHeaderProps = {
  title?: string;
  description?: string;

  compact?: boolean;

  showAddAccount?: boolean;
  showAddHolding?: boolean;
  showRecordActivity?: boolean;

  addAccountHref?: string;
  addHoldingHref?: string;
  recordActivityHref?: string;

  className?: string;
};

export default function InvestmentsHeader({
  title = "Investments",
  description = "Track investment accounts, holdings, portfolio performance, gains, dividends, and recent investment activity in one place.",
  compact = false,
  showAddAccount = true,
  showAddHolding = true,
  showRecordActivity = true,
  addAccountHref =
    "/dashboard/investments?action=add-account",
  addHoldingHref =
    "/dashboard/investments?action=add-holding",
  recordActivityHref =
    "/dashboard/investments?action=add-activity",
  className = "",
}: InvestmentsHeaderProps) {
  const hasActions =
    showAddAccount ||
    showAddHolding ||
    showRecordActivity;

  return (
    <section
      className={[
        "rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm",
        compact
          ? "p-5"
          : "p-6",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--primary)]">
            Wealth Building
          </p>

          <h1
            className={[
              "mt-2 font-bold tracking-tight text-[var(--text-primary)]",
              compact
                ? "text-2xl"
                : "text-3xl",
            ].join(" ")}
          >
            {title}
          </h1>

          <p
            className={[
              "mt-3 max-w-3xl leading-7 text-[var(--text-muted)]",
              compact
                ? "text-sm"
                : "text-base",
            ].join(" ")}
          >
            {description}
          </p>
        </div>

        {hasActions ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {showAddAccount ? (
              <Link
                href={addAccountHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <AccountIcon />
                <span>Add Account</span>
              </Link>
            ) : null}

            {showAddHolding ? (
              <Link
                href={addHoldingHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <HoldingIcon />
                <span>Add Holding</span>
              </Link>
            ) : null}

            {showRecordActivity ? (
              <Link
                href={recordActivityHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                <ActivityIcon />
                <span>Record Activity</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
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
    </svg>
  );
}

function HoldingIcon() {
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
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
      />

      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
      />
    </svg>
  );
}

function ActivityIcon() {
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
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  );
}