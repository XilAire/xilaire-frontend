"use client";

import {
  forwardRef,
  useMemo,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Eye, EyeOff } from "lucide-react";

export type PasswordStrength =
  | "weak"
  | "fair"
  | "good"
  | "strong";

export type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  leftIcon?: ReactNode;
  isInvalid?: boolean;
  showStrength?: boolean;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

function calculatePasswordStrength(
  password: string,
): PasswordStrength {
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score <= 2) {
    return "weak";
  }

  if (score === 3) {
    return "fair";
  }

  if (score === 4) {
    return "good";
  }

  return "strong";
}

const strengthWidthClasses: Record<
  PasswordStrength,
  string
> = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
};

const strengthColorClasses: Record<
  PasswordStrength,
  string
> = {
  weak: "bg-rose-500",
  fair: "bg-amber-500",
  good: "bg-sky-500",
  strong: "bg-emerald-500",
};

const strengthTextClasses: Record<
  PasswordStrength,
  string
> = {
  weak: "text-rose-400",
  fair: "text-amber-400",
  good: "text-sky-400",
  strong: "text-emerald-400",
};

const PasswordInput = forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(function PasswordInput(
  {
    leftIcon,
    isInvalid = false,
    showStrength = false,
    className,
    disabled,
    value,
    defaultValue,
    onChange,
    ...inputProps
  },
  ref,
) {
  const [isVisible, setIsVisible] = useState(false);

  const isControlled = value !== undefined;

  const [internalValue, setInternalValue] = useState(() => {
    if (defaultValue === undefined || defaultValue === null) {
      return "";
    }

    return String(defaultValue);
  });

  const currentValue = isControlled
    ? String(value ?? "")
    : internalValue;

  const strength = useMemo(
    () => calculatePasswordStrength(currentValue),
    [currentValue],
  );

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!isControlled) {
      setInternalValue(event.target.value);
    }

    onChange?.(event);
  }

  function toggleVisibility() {
    setIsVisible((current) => !current);
  }

  return (
    <div className="w-full">
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
          type={isVisible ? "text" : "password"}
          disabled={disabled}
          value={currentValue}
          aria-invalid={isInvalid || undefined}
          onChange={handleChange}
          className={joinClassNames(
            "min-h-11 w-full rounded-xl border bg-white/[0.04] py-2.5 pr-12 text-sm text-white outline-none transition duration-200",
            "placeholder:text-slate-600",
            "hover:bg-white/[0.06]",
            "focus:bg-white/[0.06] focus:ring-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon ? "pl-10" : "pl-3.5",
            isInvalid
              ? "border-rose-500/70 focus:border-rose-400 focus:ring-rose-500/20"
              : "border-white/10 focus:border-emerald-400/70 focus:ring-emerald-500/20",
            className,
          )}
          {...inputProps}
        />

        <button
          type="button"
          disabled={disabled}
          aria-label={
            isVisible ? "Hide password" : "Show password"
          }
          aria-pressed={isVisible}
          onClick={toggleVisibility}
          className={joinClassNames(
            "absolute inset-y-0 right-2 flex items-center rounded-lg px-2 text-slate-500 transition",
            "hover:bg-white/10 hover:text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isVisible ? (
            <EyeOff size={18} aria-hidden="true" />
          ) : (
            <Eye size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      {showStrength && currentValue.length > 0 ? (
        <div className="mt-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-800"
            aria-hidden="true"
          >
            <div
              className={joinClassNames(
                "h-full rounded-full transition-all duration-300",
                strengthWidthClasses[strength],
                strengthColorClasses[strength],
              )}
            />
          </div>

          <p
            className={joinClassNames(
              "mt-2 text-xs font-medium capitalize",
              strengthTextClasses[strength],
            )}
          >
            Password strength: {strength}
          </p>
        </div>
      ) : null}
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;