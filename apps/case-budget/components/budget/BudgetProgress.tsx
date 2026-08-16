import ProgressBar from "@/components/ui/ProgressBar";

export type BudgetProgressProps = {
  assignedAmount: number;
  spentAmount: number;

  /**
   * Canonical available_amount for this budget item.
   *
   * This already includes rollover and transaction activity and should be
   * used for all "remaining/available" presentation.
   */
  availableAmount: number;

  showLabel?: boolean;
  className?: string;
};

const currencyFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

/**
 * Progress percentage is a visualization only.
 *
 * assignedAmount and spentAmount are canonical values already returned by
 * getBudget(). This helper does not reconstruct transaction activity or
 * available money.
 */
function getSpentPercentage(
  assignedAmount: number,
  spentAmount: number,
) {
  if (assignedAmount <= 0) {
    return spentAmount > 0
      ? 100
      : 0;
  }

  return Math.max(
    (spentAmount /
      assignedAmount) *
      100,
    0,
  );
}

function getProgressTone(
  assignedAmount: number,
  spentAmount: number,
  availableAmount: number,
):
  | "primary"
  | "success"
  | "warning"
  | "danger" {
  if (availableAmount < 0) {
    return "danger";
  }

  const percentage =
    getSpentPercentage(
      assignedAmount,
      spentAmount,
    );

  if (percentage >= 90) {
    return "warning";
  }

  if (percentage >= 75) {
    return "primary";
  }

  return "success";
}

function getProgressLabel(
  assignedAmount: number,
  spentAmount: number,
  availableAmount: number,
) {
  if (
    assignedAmount <= 0 &&
    spentAmount <= 0 &&
    availableAmount === 0
  ) {
    return "No money assigned";
  }

  if (availableAmount < 0) {
    return `${currencyFormatter.format(
      -availableAmount,
    )} overspent`;
  }

  if (
    assignedAmount <= 0 &&
    spentAmount > 0
  ) {
    return `${currencyFormatter.format(
      spentAmount,
    )} spent without an assigned amount`;
  }

  if (availableAmount === 0) {
    return "Fully spent";
  }

  return `${currencyFormatter.format(
    availableAmount,
  )} available`;
}

export default function BudgetProgress({
  assignedAmount,
  spentAmount,
  availableAmount,
  showLabel = true,
  className,
}: BudgetProgressProps) {
  const percentage =
    getSpentPercentage(
      assignedAmount,
      spentAmount,
    );

  const progressTone =
    getProgressTone(
      assignedAmount,
      spentAmount,
      availableAmount,
    );

  const progressMaximum =
    assignedAmount > 0
      ? assignedAmount
      : spentAmount > 0
        ? spentAmount
        : 1;

  /*
   * ProgressBar is bounded visually at 100%. Overspending is represented by
   * the danger tone and canonical negative availableAmount rather than by
   * forcing the progress primitive beyond its maximum.
   */
  const progressValue =
    Math.min(
      Math.max(
        spentAmount,
        0,
      ),
      progressMaximum,
    );

  const isOverspent =
    availableAmount < 0;

  return (
    <div
      className={joinClassNames(
        "space-y-2",
        className,
      )}
    >
      {showLabel ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span
            className={joinClassNames(
              "font-medium",
              isOverspent
                ? "text-[var(--danger)]"
                : "text-[var(--text-muted)]",
            )}
          >
            {getProgressLabel(
              assignedAmount,
              spentAmount,
              availableAmount,
            )}
          </span>

          <span
            className={joinClassNames(
              "shrink-0",
              "font-semibold",
              isOverspent
                ? "text-[var(--danger)]"
                : "text-[var(--text-secondary)]",
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
      ) : null}

      <ProgressBar
        value={progressValue}
        max={progressMaximum}
        tone={progressTone}
        size="sm"
        showValue={false}
      />
    </div>
  );
}
