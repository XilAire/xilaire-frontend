import { ArrowDownLeft, ArrowUpRight, Repeat } from "lucide-react";

import MoneyDisplay from "./MoneyDisplay";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer";

export type TransactionAmountProps = {
  amount: number;
  type: TransactionType;
  currency?: string;
  locale?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

const typeStyles: Record<
  TransactionType,
  {
    icon: React.ReactNode;
    color: string;
    label: string;
  }
> = {
  income: {
    icon: <ArrowDownLeft size={18} />,
    color: "text-emerald-400",
    label: "Income",
  },
  expense: {
    icon: <ArrowUpRight size={18} />,
    color: "text-rose-400",
    label: "Expense",
  },
  transfer: {
    icon: <Repeat size={18} />,
    color: "text-sky-400",
    label: "Transfer",
  },
};

export default function TransactionAmount({
  amount,
  type,
  currency = "USD",
  locale = "en-US",
  showIcon = true,
  size = "md",
  className,
}: TransactionAmountProps) {
  const style = typeStyles[type];

  const displayAmount =
    type === "expense"
      ? -Math.abs(amount)
      : Math.abs(amount);

  return (
    <div
      className={joinClassNames(
        "inline-flex items-center gap-2",
        style.color,
        className,
      )}
      title={style.label}
    >
      {showIcon && (
        <span className="shrink-0">
          {style.icon}
        </span>
      )}

      <MoneyDisplay
        amount={displayAmount}
        currency={currency}
        locale={locale}
        showSign
        showColor={false}
        size={size}
      />
    </div>
  );
}