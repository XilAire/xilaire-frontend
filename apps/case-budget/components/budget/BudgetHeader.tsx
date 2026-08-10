import BudgetMonthSelector from "@/components/budget/BudgetMonthSelector";

export type BudgetHeaderProps = {
  title: string;
  description?: string;
  monthLabel: string;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onMonthClick?: () => void;
  disabled?: boolean;
};

export default function BudgetHeader({
  title,
  description,
  monthLabel,
  previousMonthLabel,
  nextMonthLabel,
  onPreviousMonth,
  onNextMonth,
  onMonthClick,
  disabled = false,
}: BudgetHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
          Zero-based budget
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      <BudgetMonthSelector
        monthLabel={monthLabel}
        previousMonthLabel={previousMonthLabel}
        nextMonthLabel={nextMonthLabel}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onMonthClick={onMonthClick}
        disabled={disabled}
      />
    </header>
  );
}