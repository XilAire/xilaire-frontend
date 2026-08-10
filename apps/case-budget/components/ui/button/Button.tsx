"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon";

export type ButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
  };

const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary: [
    "border",
    "border-transparent",
    "bg-[var(--primary)]",
    "text-[var(--primary-foreground)]",
    "shadow-[var(--shadow-xs)]",
    "hover:bg-[var(--primary-hover)]",
    "active:bg-[var(--primary-active)]",
  ].join(" "),

  secondary: [
    "border",
    "border-[var(--border-default)]",
    "bg-[var(--secondary)]",
    "text-[var(--secondary-foreground)]",
    "shadow-[var(--shadow-xs)]",
    "hover:border-[var(--border-strong)]",
    "hover:bg-[var(--secondary-hover)]",
    "active:bg-[var(--secondary-active)]",
  ].join(" "),

  outline: [
    "border",
    "border-[var(--border-default)]",
    "bg-transparent",
    "text-[var(--text-primary)]",
    "hover:border-[var(--border-strong)]",
    "hover:bg-[var(--surface-hover)]",
    "active:bg-[var(--surface-active)]",
  ].join(" "),

  ghost: [
    "border",
    "border-transparent",
    "bg-transparent",
    "text-[var(--text-secondary)]",
    "hover:bg-[var(--surface-hover)]",
    "hover:text-[var(--text-primary)]",
    "active:bg-[var(--surface-active)]",
  ].join(" "),

  danger: [
    "border",
    "border-transparent",
    "bg-[var(--danger)]",
    "text-[var(--danger-foreground)]",
    "shadow-[var(--shadow-xs)]",
    "hover:bg-[var(--danger-hover)]",
    "active:brightness-90",
  ].join(" "),

  success: [
    "border",
    "border-transparent",
    "bg-[var(--success)]",
    "text-[var(--success-foreground)]",
    "shadow-[var(--shadow-xs)]",
    "hover:brightness-110",
    "active:brightness-90",
  ].join(" "),
};

const sizeClasses: Record<
  ButtonSize,
  string
> = {
  sm: [
    "min-h-9",
    "rounded-lg",
    "px-3",
    "py-1.5",
    "text-sm",
  ].join(" "),

  md: [
    "min-h-11",
    "rounded-xl",
    "px-4",
    "py-2.5",
    "text-sm",
  ].join(" "),

  lg: [
    "min-h-12",
    "rounded-xl",
    "px-5",
    "py-3",
    "text-base",
  ].join(" "),

  icon: [
    "h-11",
    "w-11",
    "rounded-xl",
    "p-0",
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

const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled = false,
    className = "",
    type = "button",
    ...buttonProps
  },
  ref,
) {
  const isDisabled =
    disabled ||
    isLoading;

  const accessibleLabel =
    buttonProps["aria-label"];

  const requiresAccessibleLabel =
    size === "icon" &&
    !children &&
    !accessibleLabel;

  if (
    process.env.NODE_ENV !== "production" &&
    requiresAccessibleLabel
  ) {
    console.warn(
      "Icon-only Button components should include an aria-label.",
    );
  }

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={
        isLoading
          ? true
          : undefined
      }
      className={joinClassNames(
        "relative",
        "inline-flex",
        "shrink-0",
        "items-center",
        "justify-center",
        "gap-2",
        "font-semibold",
        "tracking-tight",
        "transition",
        "duration-200",
        "ease-out",
        "select-none",
        "focus:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--focus-ring)]",
        "focus-visible:ring-offset-2",
        "focus-visible:ring-offset-[var(--background)]",
        "disabled:pointer-events-none",
        "disabled:cursor-not-allowed",
        "disabled:opacity-50",
        "motion-reduce:transition-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth
          ? "w-full"
          : "",
        className,
      )}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center"
        >
          <LoadingSpinner
            size={
              size === "lg"
                ? "md"
                : "sm"
            }
          />
        </span>
      ) : leftIcon ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center"
        >
          {leftIcon}
        </span>
      ) : null}

      {children ? (
        <span>
          {isLoading &&
          loadingText
            ? loadingText
            : children}
        </span>
      ) : isLoading &&
        loadingText ? (
        <span>
          {loadingText}
        </span>
      ) : null}

      {!isLoading &&
      rightIcon ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center"
        >
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
});

Button.displayName =
  "Button";

export default Button;