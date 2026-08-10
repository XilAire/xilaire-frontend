import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";

export type TrendDirection =
  | "up"
  | "down"
  | "flat";

export type TrendIndicatorProps = {
  direction: TrendDirection;
  label?: string;
  value?: string;
  positiveIsGood?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: {
    icon: 14,
    text: "text-xs",
  },
  md: {
    icon: 18,
    text: "text-sm",
  },
  lg: {
    icon: 22,
    text: "text-base",
  },
} as const;

function joinClassNames(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes.filter(Boolean).join(" ");
}

export default function TrendIndicator({
  direction,
  label,
  value,
  positiveIsGood = true,
  size = "md",
  className,
}: TrendIndicatorProps) {
  const isPositive =
    direction === "up"
      ? positiveIsGood
      : direction === "down"
        ? !positiveIsGood
        : false;

  const color =
    direction === "flat"
      ? "text-slate-400"
      : isPositive
        ? "text-emerald-400"
        : "text-rose-400";

  const Icon =
    direction === "up"
      ? ArrowUpRight
      : direction === "down"
        ? ArrowDownRight
        : ArrowRight;

  return (
    <div
      className={joinClassNames(
        "inline-flex items-center gap-2",
        color,
        sizeClasses[size].text,
        className,
      )}
    >
      <Icon
        size={sizeClasses[size].icon}
        className="shrink-0"
      />

      {label ? (
        <span className="font-medium">
          {label}
        </span>
      ) : null}

      {value ? (
        <span className="tabular-nums">
          {value}
        </span>
      ) : null}
    </div>
  );
}