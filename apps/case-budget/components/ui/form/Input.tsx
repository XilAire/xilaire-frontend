import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type InputSize =
  | "sm"
  | "md"
  | "lg";

export type InputProps =
  InputHTMLAttributes<HTMLInputElement> & {
    inputSize?: InputSize;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    isInvalid?: boolean;
    containerClassName?: string;
    leftIconClassName?: string;
    rightIconClassName?: string;
  };

const sizeClasses: Record<
  InputSize,
  string
> = {
  sm: "min-h-9 px-3 py-2 text-xs",
  md: "min-h-11 px-3.5 py-2.5 text-sm",
  lg: "min-h-12 px-4 py-3 text-base",
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

const Input = forwardRef<
  HTMLInputElement,
  InputProps
>(function Input(
  {
    inputSize = "md",
    leftIcon,
    rightIcon,
    isInvalid = false,
    containerClassName = "",
    leftIconClassName = "",
    rightIconClassName = "",
    className = "",
    disabled,
    "aria-describedby":
      ariaDescribedBy,
    ...inputProps
  },
  ref,
) {
  return (
    <div
      className={joinClassNames(
        "relative",
        "w-full",
        containerClassName,
      )}
    >
      {leftIcon ? (
        <span
          aria-hidden="true"
          className={joinClassNames(
            "pointer-events-none",
            "absolute",
            "inset-y-0",
            "left-3",
            "z-10",
            "flex",
            "items-center",
            "text-[var(--text-muted)]",
            leftIconClassName,
          )}
        >
          {leftIcon}
        </span>
      ) : null}

      <input
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
        className={joinClassNames(
          "w-full",
          "rounded-xl",
          "border",
          "bg-[var(--surface-default)]",
          "text-[var(--text-primary)]",
          "shadow-[var(--shadow-xs)]",
          "outline-none",
          "transition-[background-color,border-color,box-shadow,color]",
          "duration-[var(--motion-fast)]",
          "ease-out",
          "placeholder:text-[var(--text-muted)]",
          "hover:bg-[var(--surface-muted)]",
          "focus:bg-[var(--surface-default)]",
          "focus:ring-2",
          "focus:ring-offset-0",
          "disabled:cursor-not-allowed",
          "disabled:bg-[var(--surface-muted)]",
          "disabled:text-[var(--text-disabled)]",
          "disabled:opacity-70",
          "read-only:cursor-default",
          "read-only:bg-[var(--surface-muted)]",
          sizeClasses[inputSize],
          leftIcon
            ? "pl-10"
            : undefined,
          rightIcon
            ? "pr-10"
            : undefined,
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
        {...inputProps}
      />

      {rightIcon ? (
        <span
          aria-hidden="true"
          className={joinClassNames(
            "pointer-events-none",
            "absolute",
            "inset-y-0",
            "right-3",
            "z-10",
            "flex",
            "items-center",
            "text-[var(--text-muted)]",
            rightIconClassName,
          )}
        >
          {rightIcon}
        </span>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

export default Input;