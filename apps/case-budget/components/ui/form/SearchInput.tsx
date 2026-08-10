"use client";

import {
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Search, X } from "lucide-react";

export type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  leftIcon?: ReactNode;
  isInvalid?: boolean;
  onClear?: () => void;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

const SearchInput = forwardRef<
  HTMLInputElement,
  SearchInputProps
>(function SearchInput(
  {
    leftIcon,
    isInvalid = false,
    onClear,
    className,
    disabled,
    value,
    defaultValue,
    onChange,
    ...inputProps
  },
  ref,
) {
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

  function handleChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    if (!isControlled) {
      setInternalValue(event.target.value);
    }

    onChange?.(event);
  }

  function handleClear() {
    if (!isControlled) {
      setInternalValue("");
    }

    onClear?.();
  }

  return (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500"
      >
        {leftIcon ?? <Search size={18} />}
      </span>

      <input
        ref={ref}
        type="search"
        disabled={disabled}
        value={currentValue}
        aria-invalid={isInvalid || undefined}
        onChange={handleChange}
        className={joinClassNames(
          "min-h-11 w-full rounded-xl border bg-white/[0.04] py-2.5 pl-10 pr-11 text-sm text-white outline-none transition duration-200",
          "placeholder:text-slate-600",
          "hover:bg-white/[0.06]",
          "focus:bg-white/[0.06] focus:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-search-cancel-button]:hidden",
          "[&::-webkit-search-decoration]:hidden",
          isInvalid
            ? "border-rose-500/70 focus:border-rose-400 focus:ring-rose-500/20"
            : "border-white/10 focus:border-emerald-400/70 focus:ring-emerald-500/20",
          className,
        )}
        {...inputProps}
      />

      {currentValue.length > 0 && !disabled ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className="absolute inset-y-0 right-2 flex items-center rounded-lg px-2 text-slate-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});

SearchInput.displayName = "SearchInput";

export default SearchInput;