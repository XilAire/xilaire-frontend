import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

export default function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-sky-600 text-white hover:bg-sky-700",
        variant === "outline" &&
          "border border-slate-300 bg-white text-slate-700 hover:border-slate-400",
        className
      )}
    >
      {children}
    </button>
  );
}
