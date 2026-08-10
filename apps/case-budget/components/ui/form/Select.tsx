"use client";

import {
  forwardRef,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps =
  SelectHTMLAttributes<HTMLSelectElement> & {
    options?: SelectOption[];
    placeholder?: string;
    leftIcon?: ReactNode;
    isInvalid?: boolean;
    containerClassName?: string;
    leftIconClassName?: string;
    chevronClassName?: string;
  };

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

const Select = forwardRef<
  HTMLSelectElement,
  SelectProps
>(function Select(
  {
    options = [],
    placeholder,
    leftIcon,
    isInvalid = false,
    containerClassName = "",
    leftIconClassName = "",
    chevronClassName = "",
    className = "",
    disabled,
    children,
    defaultValue,
    value,
    "aria-describedby":
      ariaDescribedBy,
    ...selectProps
  },
  ref,
) {
  const hasControlledValue =
    value !== undefined;

  const hasDefaultValue =
    defaultValue !== undefined;

  const resolvedDefaultValue =
    !hasControlledValue &&
    !hasDefaultValue &&
    placeholder
      ? ""
      : defaultValue;

  return (
    <div
      className={joinClassNames(
        "relative",
        "w-full",
        containerClassName,
      )}
    >
      {leftIcon ? (
        <div
          aria-hidden="true"
          className={joinClassNames(
            "pointer-events-none",
            "absolute",
            "left-3",
            "top-1/2",
            "z-10",
            "flex",
            "-translate-y-1/2",
            "items-center",
            "text-[var(--text-muted)]",
            leftIconClassName,
          )}
        >
          {leftIcon}
        </div>
      ) : null}

      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={
          isInvalid
            ? true
            : undefined
        }
        aria-describedby={
          ariaDescribedBy
        }
        value={value}
        defaultValue={
          resolvedDefaultValue
        }
        className={joinClassNames(
          "min-h-11",
          "w-full",
          "appearance-none",
          "rounded-xl",
          "border",
          "bg-[var(--surface-default)]",
          "py-2.5",
          "text-sm",
          "text-[var(--text-primary)]",
          "shadow-[var(--shadow-xs)]",
          "outline-none",
          "transition-[background-color,border-color,box-shadow,color]",
          "duration-[var(--motion-fast)]",
          "ease-out",
          "hover:bg-[var(--surface-muted)]",
          "focus:bg-[var(--surface-default)]",
          "focus:ring-2",
          "focus:ring-offset-0",
          "disabled:cursor-not-allowed",
          "disabled:bg-[var(--surface-muted)]",
          "disabled:text-[var(--text-disabled)]",
          "disabled:opacity-70",
          "[&>option]:bg-[var(--surface-elevated)]",
          "[&>option]:text-[var(--text-primary)]",
          leftIcon
            ? "pl-10 pr-10"
            : "pl-3.5 pr-10",
          isInvalid
            ? [
                "border-[var(--danger)]",
                "focus:border-[var(--danger)]",
                "focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]",
              ].join(" ")
            : [
                "border-[var(--border-default)]",
                "focus:border-[var(--primary)]",
                "focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
              ].join(" "),
          className,
        )}
        {...selectProps}
      >
        {placeholder ? (
          <option
            value=""
            disabled
          >
            {placeholder}
          </option>
        ) : null}

        {children ??
          options.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
                disabled={
                  option.disabled
                }
              >
                {option.label}
              </option>
            ),
          )}
      </select>

      <ChevronDown
        aria-hidden="true"
        size={18}
        className={joinClassNames(
          "pointer-events-none",
          "absolute",
          "right-3",
          "top-1/2",
          "-translate-y-1/2",
          "text-[var(--text-muted)]",
          chevronClassName,
        )}
      />
    </div>
  );
});

Select.displayName = "Select";

export default Select;