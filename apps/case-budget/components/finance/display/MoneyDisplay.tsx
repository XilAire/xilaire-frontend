import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export type MoneyDisplayProps = {
  amount: number;
  currency?: string;
  locale?: string;
  showSign?: boolean;
  showColor?: boolean;
  showTrendIcon?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
} as const;

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(
  amount: number,
  locale: string,
  currency: string,
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export default function MoneyDisplay({
  amount,
  currency = "USD",
  locale = "en-US",
  showSign = false,
  showColor = true,
  showTrendIcon = false,
  size = "md",
  className,
}: MoneyDisplayProps) {
  const positive = amount > 0;
  const negative = amount < 0;

  const colorClass = !showColor
    ? ""
    : positive
      ? "text-emerald-400"
      : negative
        ? "text-rose-400"
        : "text-slate-200";

  const value =
    showSign && positive
      ? `+${formatMoney(amount, locale, currency)}`
      : formatMoney(amount, locale, currency);

  return (
    <div
      className={joinClassNames(
        "inline-flex items-center gap-2",
        sizeClasses[size],
        colorClass,
        className,
      )}
    >
      {showTrendIcon && positive && (
        <ArrowUpRight
          size={18}
          className="shrink-0"
        />
      )}

      {showTrendIcon && negative && (
        <ArrowDownRight
          size={18}
          className="shrink-0"
        />
      )}

      <span className="font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}