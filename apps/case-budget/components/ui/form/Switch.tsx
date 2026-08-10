"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
} from "react";

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  description?: string;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

const Switch = forwardRef<
  HTMLInputElement,
  SwitchProps
>(function Switch(
  {
    label,
    description,
    className,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <label
      className={joinClassNames(
        "flex cursor-pointer items-center justify-between gap-4",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {label ? (
          <p className="text-sm font-semibold text-slate-200">
            {label}
          </p>
        ) : null}

        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />

        <div
          className={joinClassNames(
            "h-7 w-12 rounded-full border transition-all duration-200",
            "border-white/10 bg-slate-700",
            "peer-checked:border-emerald-500",
            "peer-checked:bg-emerald-500",
            "peer-focus-visible:ring-2",
            "peer-focus-visible:ring-emerald-400",
            "peer-focus-visible:ring-offset-2",
            "peer-focus-visible:ring-offset-slate-950",
          )}
        />

        <div
          className={joinClassNames(
            "absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200",
            "peer-checked:translate-x-5",
          )}
        />
      </div>
    </label>
  );
});

Switch.displayName = "Switch";

export default Switch;