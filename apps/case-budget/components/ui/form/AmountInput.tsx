"use client";

import { forwardRef } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import CurrencyInput, {
  type CurrencyInputProps,
} from "./CurrencyInput";

export type AmountType = "income" | "expense" | "transfer";

export type AmountInputProps = CurrencyInputProps & {
  amountType?: AmountType;
  showIndicator?: boolean;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

const indicatorStyles: Record<
  AmountType,
  {
    icon: React.ReactNode;
    text: string;
    color: string;
  }
> = {
  income: {
    icon: <ArrowDownLeft size={16} />,
    text: "Income",
    color:
      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  expense: {
    icon: <ArrowUpRight size={16} />,
    text: "Expense",
    color:
      "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  transfer: {
    icon: (
      <span className="text-xs font-bold">
        ⇄
      </span>
    ),
    text: "Transfer",
    color:
      "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
};

const AmountInput = forwardRef<
  HTMLInputElement,
  AmountInputProps
>(function AmountInput(
  {
    amountType = "expense",
    showIndicator = true,
    className,
    ...props
  },
  ref,
) {
  const indicator =
    indicatorStyles[amountType];

  return (
    <div className="space-y-2">
      {showIndicator ? (
        <div
          className={joinClassNames(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
            indicator.color,
          )}
        >
          {indicator.icon}

          <span>{indicator.text}</span>
        </div>
      ) : null}

      <CurrencyInput
        ref={ref}
        className={className}
        {...props}
      />
    </div>
  );
});

AmountInput.displayName = "AmountInput";

export default AmountInput;