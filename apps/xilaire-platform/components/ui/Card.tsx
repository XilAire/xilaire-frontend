import type { HTMLAttributes } from "react";
import clsx from "clsx";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        "rounded-lg border border-slate-200 bg-white",
        className
      )}
    >
      {children}
    </div>
  );
}
