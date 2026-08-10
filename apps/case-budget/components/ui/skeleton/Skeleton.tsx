import type { HTMLAttributes } from "react";

export type SkeletonRounded =
  | "none"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "full";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: string | number;
  height?: string | number;
  rounded?: SkeletonRounded;
  animate?: boolean;
};

const roundedClasses: Record<SkeletonRounded, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

export default function Skeleton({
  width,
  height,
  rounded = "lg",
  animate = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={joinClassNames(
        "relative overflow-hidden bg-white/[0.06]",
        roundedClasses[rounded],
        className,
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    >
      {animate ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="h-full w-1/2 -translate-x-full animate-[case-budget-skeleton-shimmer_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent motion-reduce:animate-none" />
        </div>
      ) : null}
    </div>
  );
}