"use client";

import type {
  HTMLAttributes,
} from "react";

export type LoadingSpinnerSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";

export type LoadingSpinnerTone =
  | "primary"
  | "secondary"
  | "white"
  | "current";

export type LoadingSpinnerProps =
  HTMLAttributes<HTMLDivElement> & {
    size?: LoadingSpinnerSize;
    tone?: LoadingSpinnerTone;
    label?: string;
  };

const sizeClasses: Record<
  LoadingSpinnerSize,
  string
> = {
  xs: "h-3 w-3 border",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
  xl: "h-12 w-12 border-4",
};

const toneClasses: Record<
  LoadingSpinnerTone,
  string
> = {
  primary: [
    "border-[var(--border-default)]",
    "border-t-[var(--primary)]",
  ].join(" "),

  secondary: [
    "border-[var(--border-default)]",
    "border-t-[var(--text-secondary)]",
  ].join(" "),

  white: [
    "border-white/25",
    "border-t-white",
  ].join(" "),

  current: [
    "border-current/20",
    "border-t-current",
  ].join(" "),
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

export default function LoadingSpinner({
  size = "md",
  tone = "primary",
  label = "Loading",
  className = "",
  ...spinnerProps
}: LoadingSpinnerProps) {
  return (
    <div
      {...spinnerProps}
      role="status"
      aria-live="polite"
      aria-label={label}
      className={joinClassNames(
        "inline-flex",
        "items-center",
        "justify-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={joinClassNames(
          "animate-case-budget-spin",
          "rounded-full",
          "border-solid",
          sizeClasses[size],
          toneClasses[tone],
        )}
      />

      <span className="sr-only">
        {label}
      </span>
    </div>
  );
}