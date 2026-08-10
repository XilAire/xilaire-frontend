"use client";

type TransactionsHeaderProps = {
  onAddTransaction: () => void;
  onImportTransactions?: () => void;
  onExportTransactions?: () => void;
  totalCount?: number;
  filteredCount?: number;
  lastUpdatedAt?: string;
  isImporting?: boolean;
  isExporting?: boolean;
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

export default function TransactionsHeader({
  onAddTransaction,
  onImportTransactions,
  onExportTransactions,
  totalCount,
  filteredCount,
  lastUpdatedAt,
  isImporting = false,
  isExporting = false,
}: TransactionsHeaderProps) {
  const hasCountInformation =
    typeof totalCount ===
    "number";

  const hasFilteredCount =
    typeof filteredCount ===
      "number" &&
    typeof totalCount ===
      "number" &&
    filteredCount !==
      totalCount;

  return (
    <header className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Activity
            </p>

            {hasCountInformation ? (
              <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {hasFilteredCount
                  ? `${filteredCount} of ${totalCount}`
                  : totalCount}{" "}
                {totalCount ===
                1
                  ? "transaction"
                  : "transactions"}
              </span>
            ) : null}
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Transactions
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Review your income,
            expenses, transfers,
            pending purchases, and
            cleared activity across
            all of your accounts.
          </p>

          {lastUpdatedAt ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
              <RefreshIcon />

              Updated{" "}
              {formatRelativeDate(
                lastUpdatedAt,
              )}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          {onImportTransactions ? (
            <button
              type="button"
              onClick={
                onImportTransactions
              }
              disabled={
                isImporting
              }
              className={joinClassNames(
                "inline-flex",
                "min-h-11",
                "w-full",
                "shrink-0",
                "items-center",
                "justify-center",
                "gap-2",
                "whitespace-nowrap",
                "rounded-xl",
                "border",
                "border-[var(--border-default)]",
                "bg-[var(--surface-default)]",
                "px-4",
                "py-2.5",
                "text-sm",
                "font-bold",
                "leading-none",
                "text-[var(--text-primary)]",
                "outline-none",
                "transition-[background-color,border-color,color,box-shadow]",
                "hover:border-[var(--primary)]",
                "hover:bg-[var(--surface-muted)]",
                "hover:text-[var(--primary)]",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--primary)]",
                "focus-visible:ring-offset-2",
                "focus-visible:ring-offset-[var(--background)]",
                "disabled:cursor-not-allowed",
                "disabled:opacity-60",
                "sm:w-auto",
              )}
            >
              {isImporting ? (
                <SpinnerIcon />
              ) : (
                <ImportIcon />
              )}

              {isImporting
                ? "Importing..."
                : "Import"}
            </button>
          ) : null}

          {onExportTransactions ? (
            <button
              type="button"
              onClick={
                onExportTransactions
              }
              disabled={
                isExporting
              }
              className={joinClassNames(
                "inline-flex",
                "min-h-11",
                "w-full",
                "shrink-0",
                "items-center",
                "justify-center",
                "gap-2",
                "whitespace-nowrap",
                "rounded-xl",
                "border",
                "border-[var(--border-default)]",
                "bg-[var(--surface-default)]",
                "px-4",
                "py-2.5",
                "text-sm",
                "font-bold",
                "leading-none",
                "text-[var(--text-primary)]",
                "outline-none",
                "transition-[background-color,border-color,color,box-shadow]",
                "hover:border-[var(--primary)]",
                "hover:bg-[var(--surface-muted)]",
                "hover:text-[var(--primary)]",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--primary)]",
                "focus-visible:ring-offset-2",
                "focus-visible:ring-offset-[var(--background)]",
                "disabled:cursor-not-allowed",
                "disabled:opacity-60",
                "sm:w-auto",
              )}
            >
              {isExporting ? (
                <SpinnerIcon />
              ) : (
                <ExportIcon />
              )}

              {isExporting
                ? "Exporting..."
                : "Export"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={
              onAddTransaction
            }
            className={joinClassNames(
              "inline-flex",
              "min-h-11",
              "w-full",
              "shrink-0",
              "items-center",
              "justify-center",
              "gap-2",
              "whitespace-nowrap",
              "rounded-xl",
              "bg-[var(--primary)]",
              "px-5",
              "py-2.5",
              "text-sm",
              "font-bold",
              "leading-none",
              "text-white",
              "outline-none",
              "transition-[filter,box-shadow]",
              "hover:brightness-95",
              "focus-visible:ring-2",
              "focus-visible:ring-[var(--primary)]",
              "focus-visible:ring-offset-2",
              "focus-visible:ring-offset-[var(--background)]",
              "sm:w-auto",
            )}
          >
            <PlusIcon />

            Add Transaction
          </button>
        </div>
      </div>
    </header>
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
    Math.floor(
      (
        now.getTime() -
        date.getTime()
      ) /
        60000,
    );

  if (
    differenceInMinutes <
    1
  ) {
    return "just now";
  }

  if (
    differenceInMinutes <
    60
  ) {
    return `${differenceInMinutes}m ago`;
  }

  const differenceInHours =
    Math.floor(
      differenceInMinutes /
        60,
    );

  if (
    differenceInHours <
    24
  ) {
    return `${differenceInHours}h ago`;
  }

  const differenceInDays =
    Math.floor(
      differenceInHours /
        24,
    );

  if (
    differenceInDays ===
    1
  ) {
    return "yesterday";
  }

  if (
    differenceInDays <
    7
  ) {
    return `${differenceInDays}d ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    },
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

function ImportIcon() {
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

function ExportIcon() {
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
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </svg>
  );
}

function RefreshIcon() {
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
      <path d="M20 7h-5V2" />
      <path d="M20 7a9 9 0 1 0 2 5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}