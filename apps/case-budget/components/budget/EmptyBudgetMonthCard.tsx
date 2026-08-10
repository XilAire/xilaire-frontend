"use client";

export type EmptyBudgetMonthCardProps = {
  monthLabel: string;
  previousMonthLabel?: string;
  canCopyPreviousMonth?: boolean;
  onCreateBlankBudget: () => void;
  onCopyPreviousMonth: () => void;
  onReturnToExistingBudget?: () => void;
};

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M8 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 3v3M17 3v3M4 9h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />

      <rect
        height="17"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="4"
      />

      <path
        d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m15 18-6-6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function EmptyBudgetMonthCard({
  monthLabel,
  previousMonthLabel,
  canCopyPreviousMonth = false,
  onCreateBlankBudget,
  onCopyPreviousMonth,
  onReturnToExistingBudget,
}: EmptyBudgetMonthCardProps) {
  return (
    <section
      aria-labelledby="empty-budget-month-heading"
      className="overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <CalendarIcon />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              New Budget Month
            </p>

            <h2
              id="empty-budget-month-heading"
              className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
            >
              No budget exists for {monthLabel}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
              Create this month only when you are ready to use it.
              CASE Budget will not save or create any monthly budget data
              until you choose an option below.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <button
            className="group flex min-h-40 w-full flex-col items-start rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary)]/5 p-5 text-left transition hover:bg-[var(--primary)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] sm:p-6"
            onClick={onCreateBlankBudget}
            type="button"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-sm">
              <PlusIcon />
            </span>

            <span className="mt-5 text-base font-bold text-[var(--text-primary)] sm:text-lg">
              Create Blank Budget
            </span>

            <span className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Start {monthLabel} with no income or budget categories and
              build the month from scratch.
            </span>
          </button>

          <button
            className="group flex min-h-40 w-full flex-col items-start rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 text-left transition hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--border-subtle)] disabled:hover:bg-[var(--surface-default)] sm:p-6"
            disabled={!canCopyPreviousMonth}
            onClick={onCopyPreviousMonth}
            type="button"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--primary)]">
              <CopyIcon />
            </span>

            <span className="mt-5 text-base font-bold text-[var(--text-primary)] sm:text-lg">
              Copy Previous Month
            </span>

            <span className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              {canCopyPreviousMonth
                ? `Carry forward planned income and assigned categories from ${
                    previousMonthLabel ?? "the previous month"
                  }. Received and spent amounts will reset to $0.`
                : "There is no existing budget in the previous month to copy."}
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:px-5">
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Creating a budget for {monthLabel} is an explicit action.
            Simply viewing or navigating to this month will not create any
            records.
          </p>
        </div>

        {onReturnToExistingBudget ? (
          <div className="flex justify-center sm:justify-start">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              onClick={onReturnToExistingBudget}
              type="button"
            >
              <ArrowLeftIcon />
              Return to an existing budget
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}