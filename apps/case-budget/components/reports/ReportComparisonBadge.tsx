import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

export type ReportComparisonDirection =
  | "up"
  | "down"
  | "flat";

export type ReportComparisonTone =
  | "positive"
  | "negative"
  | "neutral";

export type ReportComparisonBadgeProps = {
  amount: number;
  percentage: number | null;
  comparisonLabel?: string;
  positiveIsGood?: boolean;
  formatValue?: (
    value: number,
  ) => string;
};

export default function ReportComparisonBadge({
  amount,
  percentage,
  comparisonLabel =
    "vs previous period",
  positiveIsGood =
    true,
  formatValue =
    formatCurrency,
}: ReportComparisonBadgeProps) {
  const direction =
    getDirection(
      amount,
    );

  const tone =
    getTone({
      direction,
      positiveIsGood,
    });

  const DirectionIcon =
    direction ===
    "up"
      ? ArrowUpRight
      : direction ===
        "down"
      ? ArrowDownRight
      : ArrowRight;

  const formattedAmount =
    `${amount > 0 ? "+" : ""}${formatValue(
      amount,
    )}`;

  const formattedPercentage =
    percentage ===
    null
      ? null
      : `${percentage > 0 ? "+" : ""}${formatPercentage(
          percentage,
        )}%`;

  return (
    <div
      className={[
        "mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold",
        getToneClassName(
          tone,
        ),
      ].join(
        " ",
      )}
    >
      <DirectionIcon className="h-3.5 w-3.5 shrink-0" />

      <span className="truncate">
        {formattedAmount}

        {formattedPercentage ? (
          <>
            {" "}
            (
            {
              formattedPercentage
            }
            )
          </>
        ) : null}

        {" "}
        <span className="font-semibold opacity-75">
          {
            comparisonLabel
          }
        </span>
      </span>
    </div>
  );
}

function getDirection(
  amount: number,
): ReportComparisonDirection {
  if (
    amount >
    0
  ) {
    return "up";
  }

  if (
    amount <
    0
  ) {
    return "down";
  }

  return "flat";
}

function getTone({
  direction,
  positiveIsGood,
}: {
  direction:
    ReportComparisonDirection;
  positiveIsGood:
    boolean;
}): ReportComparisonTone {
  if (
    direction ===
    "flat"
  ) {
    return "neutral";
  }

  if (
    direction ===
    "up"
  ) {
    return positiveIsGood
      ? "positive"
      : "negative";
  }

  return positiveIsGood
    ? "negative"
    : "positive";
}

function getToneClassName(
  tone:
    ReportComparisonTone,
) {
  switch (
    tone
  ) {
    case "positive":
      return "bg-emerald-50 text-emerald-700";

    case "negative":
      return "bg-rose-50 text-rose-700";

    case "neutral":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",

      currency:
        "USD",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}

function formatPercentage(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits:
        1,

      maximumFractionDigits:
        1,
    },
  ).format(
    value,
  );
}