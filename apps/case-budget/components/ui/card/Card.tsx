import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type CardVariant =
  | "default"
  | "elevated"
  | "muted"
  | "outline"
  | "success"
  | "warning"
  | "danger";

export type CardPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

export type CardProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    variant?: CardVariant;
    padding?: CardPadding;
    interactive?: boolean;
  };

export type CardHeaderProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
  };

export type CardTitleProps =
  HTMLAttributes<HTMLHeadingElement> & {
    children: ReactNode;
    as?: "h2" | "h3" | "h4";
  };

export type CardDescriptionProps =
  HTMLAttributes<HTMLParagraphElement> & {
    children: ReactNode;
  };

export type CardContentProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
  };

export type CardFooterProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
  };

const variantClasses: Record<
  CardVariant,
  string
> = {
  default: [
    "border",
    "border-[var(--border-default)]",
    "bg-[var(--surface-card)]",
    "shadow-[var(--shadow-xs)]",
  ].join(" "),

  elevated: [
    "border",
    "border-[var(--border-default)]",
    "bg-[var(--surface-elevated)]",
    "shadow-[var(--shadow-lg)]",
  ].join(" "),

  muted: [
    "border",
    "border-[var(--border-subtle)]",
    "bg-[var(--surface-muted)]",
  ].join(" "),

  outline: [
    "border",
    "border-[var(--border-strong)]",
    "bg-transparent",
  ].join(" "),

  success: [
    "border",
    "border-[color-mix(in_srgb,var(--success)_24%,transparent)]",
    "bg-[var(--success-soft)]",
  ].join(" "),

  warning: [
    "border",
    "border-[color-mix(in_srgb,var(--warning)_24%,transparent)]",
    "bg-[var(--warning-soft)]",
  ].join(" "),

  danger: [
    "border",
    "border-[color-mix(in_srgb,var(--danger)_24%,transparent)]",
    "bg-[var(--danger-soft)]",
  ].join(" "),
};

const paddingClasses: Record<
  CardPadding,
  string
> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
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

export default function Card({
  children,
  variant = "default",
  padding = "md",
  interactive = false,
  className = "",
  ...cardProps
}: CardProps) {
  return (
    <div
      {...cardProps}
      className={joinClassNames(
        "rounded-2xl",
        "text-[var(--text-primary)]",
        "transition-colors",
        "duration-200",
        variantClasses[variant],
        paddingClasses[padding],
        interactive
          ? [
              "cursor-pointer",
              "transition",
              "duration-200",
              "ease-out",
              "hover:-translate-y-0.5",
              "hover:border-[var(--border-strong)]",
              "hover:bg-[var(--surface-hover)]",
              "hover:shadow-[var(--shadow-lg)]",
              "focus-within:ring-2",
              "focus-within:ring-[var(--focus-ring)]",
              "focus-within:ring-offset-2",
              "focus-within:ring-offset-[var(--background)]",
              "motion-reduce:transform-none",
              "motion-reduce:transition-none",
            ].join(" ")
          : "",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  ...headerProps
}: CardHeaderProps) {
  return (
    <div
      {...headerProps}
      className={joinClassNames(
        "flex",
        "flex-col",
        "gap-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  as: HeadingTag = "h3",
  className = "",
  ...titleProps
}: CardTitleProps) {
  return (
    <HeadingTag
      {...titleProps}
      className={joinClassNames(
        "text-base",
        "font-bold",
        "tracking-tight",
        "text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </HeadingTag>
  );
}

export function CardDescription({
  children,
  className = "",
  ...descriptionProps
}: CardDescriptionProps) {
  return (
    <p
      {...descriptionProps}
      className={joinClassNames(
        "text-sm",
        "leading-6",
        "text-[var(--text-muted)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
  ...contentProps
}: CardContentProps) {
  return (
    <div
      {...contentProps}
      className={joinClassNames(
        "mt-5",
        "text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...footerProps
}: CardFooterProps) {
  return (
    <div
      {...footerProps}
      className={joinClassNames(
        "mt-5",
        "flex",
        "items-center",
        "gap-3",
        "border-t",
        "border-[var(--border-default)]",
        "pt-5",
        className,
      )}
    >
      {children}
    </div>
  );
}