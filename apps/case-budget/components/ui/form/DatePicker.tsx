"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Calendar } from "lucide-react";

export type DatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "min" | "max"
> & {
  leftIcon?: ReactNode;
  isInvalid?: boolean;
  minDate?: string;
  maxDate?: string;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

const DatePicker = forwardRef<
  HTMLInputElement,
  DatePickerProps
>(function DatePicker(
  {
    leftIcon,
    isInvalid = false,
    minDate,
    maxDate,
    className,
    disabled,
    ...inputProps
  },
  ref,
) {
  return (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500"
      >
        {leftIcon ?? <Calendar size={18} />}
      </span>

      <input
        ref={ref}
        type="date"
        min={minDate}
        max={maxDate}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        className={joinClassNames(
          "min-h-11 w-full rounded-xl border bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm text-white outline-none transition duration-200",
          "hover:bg-white/[0.06]",
          "focus:bg-white/[0.06] focus:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[color-scheme:dark]",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-70",
          "[&::-webkit-calendar-picker-indicator]:transition",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100",
          isInvalid
            ? "border-rose-500/70 focus:border-rose-400 focus:ring-rose-500/20"
            : "border-white/10 focus:border-emerald-400/70 focus:ring-emerald-500/20",
          className,
        )}
        {...inputProps}
      />
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export default DatePicker;