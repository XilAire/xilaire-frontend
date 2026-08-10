"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type RadioProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: ReactNode;
  description?: ReactNode;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

const Radio = forwardRef<HTMLInputElement, RadioProps>(
  function Radio(
    {
      label,
      description,
      className,
      disabled,
      id,
      ...props
    },
    ref,
  ) {
    return (
      <label
        htmlFor={id}
        className={joinClassNames(
          "flex cursor-pointer items-start gap-3",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="radio"
            disabled={disabled}
            className={joinClassNames(
              "peer h-5 w-5 cursor-pointer appearance-none rounded-full border",
              "border-white/15 bg-white/[0.04]",
              "transition duration-200",
              "checked:border-emerald-500 checked:bg-emerald-500",
              "focus-visible:outline-none",
              "focus-visible:ring-2",
              "focus-visible:ring-emerald-500/30",
              "focus-visible:ring-offset-2",
              "focus-visible:ring-offset-slate-950",
              "disabled:cursor-not-allowed",
            )}
            {...props}
          />

          <span
            aria-hidden="true"
            className={joinClassNames(
              "pointer-events-none absolute h-2 w-2 scale-0 rounded-full bg-white",
              "transition-transform duration-200",
              "peer-checked:scale-100",
            )}
          />
        </span>

        {label || description ? (
          <span className="min-w-0 flex-1">
            {label ? (
              <span className="block text-sm font-medium text-slate-200">
                {label}
              </span>
            ) : null}

            {description ? (
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {description}
              </span>
            ) : null}
          </span>
        ) : null}
      </label>
    );
  },
);

Radio.displayName = "Radio";

export default Radio;