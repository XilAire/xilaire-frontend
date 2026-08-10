import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet"
  | "outline";

export type BadgeSize = "sm" | "md";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: [
    "border",
    "border-white/10",
    "bg-white/[0.05]",
    "text-slate-300",
  ].join(" "),

  success: [
    "border",
    "border-emerald-500/20",
    "bg-emerald-500/10",
    "text-emerald-300",
  ].join(" "),

  warning: [
    "border",
    "border-amber-500/20",
    "bg-amber-500/10",
    "text-amber-300",
  ].join(" "),

  danger: [
    "border",
    "border-rose-500/20",
    "bg-rose-500/10",
    "text-rose-300",
  ].join(" "),

  info: [
    "border",
    "border-sky-500/20",
    "bg-sky-500/10",
    "text-sky-300",
  ].join(" "),

  violet: [
    "border",
    "border-violet-500/20",
    "bg-violet-500/10",
    "text-violet-300",
  ].join(" "),

  outline: [
    "border",
    "border-white/15",
    "bg-transparent",
    "text-slate-300",
  ].join(" "),
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "min-h-6 px-2 py-0.5 text-[10px]",
  md: "min-h-7 px-2.5 py-1 text-xs",
};

const dotClasses: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-sky-400",
  violet: "bg-violet-400",
  outline: "bg-slate-400",
};

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  icon,
  className = "",
  ...badgeProps
}: BadgeProps) {
  return (
    <span
      {...badgeProps}
      className={[
        "inline-flex",
        "w-fit",
        "shrink-0",
        "items-center",
        "justify-center",
        "gap-1.5",
        "rounded-full",
        "font-bold",
        "leading-none",
        "tracking-wide",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot ? (
        <span
          className={[
            "h-1.5",
            "w-1.5",
            "shrink-0",
            "rounded-full",
            dotClasses[variant],
          ].join(" ")}
          aria-hidden="true"
        />
      ) : null}

      {icon ? (
        <span
          className="flex shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}

      <span>{children}</span>
    </span>
  );
}