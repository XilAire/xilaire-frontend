"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isInvalid?: boolean;
  allowNegative?: boolean;
  allowDecimal?: boolean;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

const NumberInput = forwardRef<
  HTMLInputElement,
  NumberInputProps
>(function NumberInput(
  {
    leftIcon,
    rightIcon,
    isInvalid = false,
    allowNegative = true,
    allowDecimal = true,
    className,
    disabled,
    onKeyDown,
    inputMode,
    step,
    ...inputProps
  },
  ref,
) {
  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }

    const allowedNavigationKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "Home",
      "End",
      "Enter",
      "Escape",
    ];

    if (allowedNavigationKeys.includes(event.key)) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      return;
    }

    if (
      allowDecimal &&
      event.key === "." &&
      !event.currentTarget.value.includes(".")
    ) {
      return;
    }

    if (
      allowNegative &&
      event.key === "-" &&
      event.currentTarget.selectionStart === 0 &&
      !event.currentTarget.value.includes("-")
    ) {
      return;
    }

    event.preventDefault();
  }

  return (
    <div className="relative w-full">
      {leftIcon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500"
        >
          {leftIcon}
        </span>
      ) : null}

      <input
        ref={ref}
        type="text"
        inputMode={
          inputMode ??
          (allowDecimal ? "decimal" : "numeric")
        }
        step={step ?? (allowDecimal ? "any" : "1")}
        disabled={disabled}
        aria-invalid={isInvalid || undefined}
        onKeyDown={handleKeyDown}
        className={joinClassNames(
          "min-h-11 w-full rounded-xl border bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition duration-200",
          "placeholder:text-slate-600",
          "hover:bg-white/[0.06]",
          "focus:bg-white/[0.06] focus:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          leftIcon ? "pl-10" : undefined,
          rightIcon ? "pr-10" : undefined,
          isInvalid
            ? "border-rose-500/70 focus:border-rose-400 focus:ring-rose-500/20"
            : "border-white/10 focus:border-emerald-400/70 focus:ring-emerald-500/20",
          className,
        )}
        {...inputProps}
      />

      {rightIcon ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500"
        >
          {rightIcon}
        </span>
      ) : null}
    </div>
  );
});

NumberInput.displayName = "NumberInput";

export default NumberInput;