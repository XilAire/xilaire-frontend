import ProgressBar from "@/components/ui/ProgressBar";

export type BudgetProgressProps = {
  assignedAmount: number;
  spentAmount: number;
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
):
  | "primary"
  | "success"
  | "warning"
  | "danger" {
  if (
    spentAmount >
    assignedAmount
  ) {
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
) {
  if (
    assignedAmount <= 0 &&
    spentAmount <= 0
  ) {
    return "No money assigned";
  }

  if (
    assignedAmount <= 0 &&
    spentAmount > 0
  ) {
    return `${currencyFormatter.format(
      spentAmount,
    )} spent without an assigned amount`;
  }

  if (
    spentAmount >
    assignedAmount
  ) {
    const overspentAmount =
      spentAmount -
      assignedAmount;

    return `${currencyFormatter.format(
      overspentAmount,
    )} overspent`;
  }

  const remainingAmount =
    assignedAmount -
    spentAmount;

  if (remainingAmount === 0) {
    return "Fully spent";
  }

  return `${currencyFormatter.format(
    remainingAmount,
  )} remaining`;
}

export default function BudgetProgress({
  assignedAmount,
  spentAmount,
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
    );

  const progressMaximum =
    assignedAmount > 0
      ? assignedAmount
      : spentAmount > 0
        ? spentAmount
        : 1;

  const progressValue =
    Math.min(
      Math.max(
        spentAmount,
        0,
      ),
      progressMaximum,
    );

  const isOverspent =
    spentAmount >
    assignedAmount;

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