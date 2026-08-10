"use client";

type EmptyTransactionsStateProps = {
  onAddTransaction: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

export default function EmptyTransactionsState({
  onAddTransaction,
  hasActiveFilters = false,
  onClearFilters,
}: EmptyTransactionsStateProps) {
  const content =
    getEmptyStateContent(
      hasActiveFilters,
    );

  return (
    <section
      aria-labelledby="empty-transactions-title"
      className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-12 text-center shadow-sm sm:px-8 sm:py-16"
    >
      <div
        className={[
          "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl",
          hasActiveFilters
            ? "bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]"
            : "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]",
        ].join(" ")}
      >
        {hasActiveFilters ? (
          <SearchEmptyIcon />
        ) : (
          <TransactionsIcon />
        )}
      </div>

      <div className="mx-auto mt-6 max-w-md">
        <p
          className={[
            "text-xs font-bold uppercase tracking-[0.16em]",
            hasActiveFilters
              ? "text-[var(--warning)]"
              : "text-[var(--primary)]",
          ].join(" ")}
        >
          {content.eyebrow}
        </p>

        <h2
          id="empty-transactions-title"
          className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
        >
          {content.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] sm:text-base">
          {content.description}
        </p>
      </div>

      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        {hasActiveFilters &&
        onClearFilters ? (
          <button
            type="button"
            onClick={
              onClearFilters
            }
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition-[background-color,border-color,color,box-shadow] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] sm:w-auto"
          >
            <ResetIcon />

            Clear Filters
          </button>
        ) : null}

        <button
          type="button"
          onClick={
            onAddTransaction
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)] sm:w-auto"
        >
          <PlusIcon />

          Add Transaction
        </button>
      </div>

      {!hasActiveFilters ? (
        <div className="mx-auto mt-8 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
          <EmptyStateFeature
            title="Track spending"
            description="Record purchases and assign them to the correct budget item."
            icon={
              <ExpenseIcon />
            }
            tone="expense"
          />

          <EmptyStateFeature
            title="Record income"
            description="Add paychecks, business income, bonuses, and other deposits."
            icon={
              <IncomeIcon />
            }
            tone="income"
          />

          <EmptyStateFeature
            title="Manage transfers"
            description="Track money moving between checking, savings, and other accounts."
            icon={
              <TransferIcon />
            }
            tone="transfer"
          />
        </div>
      ) : (
        <FilterSuggestions />
      )}
    </section>
  );
}

type EmptyStateContent = {
  eyebrow: string;
  title: string;
  description: string;
};

function getEmptyStateContent(
  hasActiveFilters: boolean,
): EmptyStateContent {
  if (
    hasActiveFilters
  ) {
    return {
      eyebrow:
        "No Matching Activity",
      title:
        "No transactions match your filters",
      description:
        "Try clearing one or more filters, changing the date range, or using a broader search term.",
    };
  }

  return {
    eyebrow:
      "Start Your History",
    title:
      "No transactions yet",
    description:
      "Add your first income, expense, or transfer to begin tracking your financial activity.",
  };
}

type EmptyStateFeatureProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone:
    | "income"
    | "expense"
    | "transfer";
};

function EmptyStateFeature({
  title,
  description,
  icon,
  tone,
}: EmptyStateFeatureProps) {
  return (
    <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg shadow-sm",
          getFeatureIconClassName(
            tone,
          ),
        ].join(" ")}
      >
        {icon}
      </div>

      <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>
    </article>
  );
}

function FilterSuggestions() {
  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 text-left sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-default)] text-[var(--primary)] shadow-sm">
          <FilterIcon />
        </div>

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Try adjusting your filters
          </h3>

          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[var(--text-muted)]">
            <li>
              Check the selected account or budget item.
            </li>

            <li>
              Expand the start and end dates.
            </li>

            <li>
              Remove the status or transaction type filter.
            </li>

            <li>
              Search with fewer words.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function getFeatureIconClassName(
  tone:
    | "income"
    | "expense"
    | "transfer",
) {
  if (
    tone ===
    "income"
  ) {
    return "bg-[color-mix(in_srgb,var(--success)_12%,var(--surface-default))] text-[var(--success)]";
  }

  if (
    tone ===
    "expense"
  ) {
    return "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-default))] text-[var(--danger)]";
  }

  return "bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface-default))] text-[var(--primary)]";
}

function TransactionsIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
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
      <path d="M7 15h3" />
      <path d="M14 15h3" />
    </svg>
  );
}

function SearchEmptyIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m20 20-3.5-3.5" />
      <path d="M8.5 11h5" />
    </svg>
  );
}

function ExpenseIcon() {
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
      <path d="M12 21V9" />
      <path d="m17 14-5-5-5 5" />
      <path d="M5 3h14" />
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function TransferIcon() {
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
      <path d="m7 7 3-3 3 3" />
      <path d="M10 4v12" />
      <path d="m17 17-3 3-3-3" />
      <path d="M14 20V8" />
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

function ResetIcon() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}