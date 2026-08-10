"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
} from "react";

export type CheckboxProps = Omit<
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

const Checkbox = forwardRef<
  HTMLInputElement,
  CheckboxProps
>(function Checkbox(
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
        "flex cursor-pointer items-start gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className={joinClassNames(
          "mt-0.5 h-5 w-5 rounded-md border border-white/15",
          "bg-white/[0.04]",
          "text-emerald-500",
          "transition",
          "focus:ring-2",
          "focus:ring-emerald-500/30",
          "focus:ring-offset-2",
          "focus:ring-offset-slate-950",
        )}
        {...props}
      />

      {(label || description) && (
        <div className="min-w-0">
          {label ? (
            <p className="text-sm font-medium text-slate-200">
              {label}
            </p>
          ) : null}

          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = "Checkbox";

export default Checkbox;