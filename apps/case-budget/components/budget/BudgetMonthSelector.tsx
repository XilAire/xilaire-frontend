"use client";

export type BudgetMonthSelectorProps = {
  monthLabel: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onMonthClick?: () => void;
  disabled?: boolean;
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

export default function BudgetMonthSelector({
  monthLabel,
  previousMonthLabel = "Previous month",
  nextMonthLabel = "Next month",
  onPreviousMonth,
  onNextMonth,
  onMonthClick,
  disabled = false,
}: BudgetMonthSelectorProps) {
  return (
    <div
      className={joinClassNames(
        "inline-flex",
        "w-full",
        "items-center",
        "justify-between",
        "rounded-2xl",
        "border",
        "border-[var(--border-default)]",
        "bg-[var(--surface-default)]",
        "p-1.5",
        "shadow-[var(--shadow-xs)]",
        "sm:w-auto",
      )}
    >
      <button
        type="button"
        aria-label={previousMonthLabel}
        title={previousMonthLabel}
        onClick={onPreviousMonth}
        disabled={disabled}
        className={joinClassNames(
          "inline-flex",
          "h-10",
          "w-10",
          "shrink-0",
          "items-center",
          "justify-center",
          "rounded-xl",
          "text-[var(--text-muted)]",
          "outline-none",
          "transition-[background-color,color,box-shadow]",
          "duration-[var(--motion-fast)]",
          "hover:bg-[var(--surface-muted)]",
          "hover:text-[var(--text-primary)]",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--primary)]",
          "focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[var(--background)]",
          "disabled:cursor-not-allowed",
          "disabled:opacity-50",
        )}
      >
        <ChevronLeftIcon />
      </button>

      <button
        type="button"
        onClick={onMonthClick}
        disabled={disabled}
        aria-label={`Select budget month. Current month is ${monthLabel}`}
        className={joinClassNames(
          "min-w-0",
          "flex-1",
          "rounded-xl",
          "px-4",
          "py-2",
          "text-center",
          "outline-none",
          "transition-[background-color,box-shadow]",
          "duration-[var(--motion-fast)]",
          "hover:bg-[var(--surface-muted)]",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--primary)]",
          "focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[var(--background)]",
          "disabled:cursor-not-allowed",
          "disabled:opacity-50",
          "sm:min-w-44",
        )}
      >
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Budget month
        </span>

        <span className="mt-0.5 block truncate text-sm font-bold text-[var(--text-primary)]">
          {monthLabel}
        </span>
      </button>

      <button
        type="button"
        aria-label={nextMonthLabel}
        title={nextMonthLabel}
        onClick={onNextMonth}
        disabled={disabled}
        className={joinClassNames(
          "inline-flex",
          "h-10",
          "w-10",
          "shrink-0",
          "items-center",
          "justify-center",
          "rounded-xl",
          "text-[var(--text-muted)]",
          "outline-none",
          "transition-[background-color,color,box-shadow]",
          "duration-[var(--motion-fast)]",
          "hover:bg-[var(--surface-muted)]",
          "hover:text-[var(--text-primary)]",
          "focus-visible:ring-2",
          "focus-visible:ring-[var(--primary)]",
          "focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[var(--background)]",
          "disabled:cursor-not-allowed",
          "disabled:opacity-50",
        )}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

function ChevronLeftIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}