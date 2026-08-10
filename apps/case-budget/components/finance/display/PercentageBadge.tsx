import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";

export type PercentageBadgeProps = {
  value: number;
  decimals?: number;
  showArrow?: boolean;
  showPlusSign?: boolean;
  positiveIsGood?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-2.5 py-1.5",
  lg: "text-base px-3 py-2",
} as const;

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

export default function PercentageBadge({
  value,
  decimals = 1,
  showArrow = true,
  showPlusSign = true,
  positiveIsGood = true,
  size = "md",
  className,
}: PercentageBadgeProps) {
  const positive = value > 0;
  const negative = value < 0;
  const neutral = value === 0;

  const isPositiveState = positiveIsGood
    ? positive
    : negative;

  const colorClasses = neutral
    ? "border-slate-700 bg-slate-800/50 text-slate-300"
    : isPositiveState
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-rose-500/30 bg-rose-500/10 text-rose-400";

  const formattedValue = `${showPlusSign && positive ? "+" : ""}${value.toFixed(
    decimals,
  )}%`;

  return (
    <span
      className={joinClassNames(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        sizeClasses[size],
        colorClasses,
        className,
      )}
    >
      {showArrow &&
        (neutral ? (
          <Minus size={14} />
        ) : positive ? (
          <ArrowUpRight size={14} />
        ) : (
          <ArrowDownRight size={14} />
        ))}

      <span className="tabular-nums">
        {formattedValue}
      </span>
    </span>
  );
}