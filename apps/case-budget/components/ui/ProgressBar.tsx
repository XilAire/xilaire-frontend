import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type ProgressBarTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type ProgressBarSize =
  | "sm"
  | "md"
  | "lg";

export type ProgressBarProps =
  Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
  > & {
    value: number;
    max?: number;
    label?: ReactNode;
    valueLabel?: ReactNode;
    tone?: ProgressBarTone;
    size?: ProgressBarSize;
    showValue?: boolean;
    rounded?: boolean;
    animated?: boolean;
    trackClassName?: string;
    indicatorClassName?: string;
  };

const toneClasses: Record<
  ProgressBarTone,
  string
> = {
  primary:
    "bg-[var(--primary)]",

  success:
    "bg-[var(--success)]",

  warning:
    "bg-[var(--warning)]",

  danger:
    "bg-[var(--danger)]",

  info:
    "bg-[var(--info)]",
};

const sizeClasses: Record<
  ProgressBarSize,
  string
> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
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

function normalizeProgress(
  value: number,
  max: number,
) {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(max) ||
    max <= 0
  ) {
    return 0;
  }

  const percentage =
    (value / max) * 100;

  return Math.min(
    Math.max(
      percentage,
      0,
    ),
    100,
  );
}

function formatPercentage(
  percentage: number,
) {
  return `${Math.round(
    percentage,
  )}%`;
}

export default function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  tone = "primary",
  size = "md",
  showValue = false,
  rounded = true,
  animated = true,
  className = "",
  trackClassName = "",
  indicatorClassName = "",
  ...progressProps
}: ProgressBarProps) {
  const percentage =
    normalizeProgress(
      value,
      max,
    );

  const displayedValue =
    valueLabel ??
    formatPercentage(
      percentage,
    );

  const hasHeader =
    Boolean(label) ||
    showValue ||
    Boolean(valueLabel);

  return (
    <div
      {...progressProps}
      className={joinClassNames(
        "w-full",
        className,
      )}
    >
      {hasHeader ? (
        <div
          className={joinClassNames(
            "mb-2",
            "flex",
            "items-center",
            "justify-between",
            "gap-3",
            "text-sm",
          )}
        >
          {label ? (
            <div
              className={joinClassNames(
                "min-w-0",
                "font-medium",
                "text-[var(--text-secondary)]",
              )}
            >
              {label}
            </div>
          ) : (
            <span />
          )}

          {showValue ||
          valueLabel ? (
            <div
              className={joinClassNames(
                "shrink-0",
                "font-semibold",
                "tabular-nums",
                "text-[var(--text-primary)]",
              )}
            >
              {displayedValue}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(
          Math.max(
            value,
            0,
          ),
          max,
        )}
        aria-valuetext={
          typeof displayedValue ===
          "string"
            ? displayedValue
            : undefined
        }
        className={joinClassNames(
          "relative",
          "w-full",
          "overflow-hidden",
          "bg-[var(--surface-muted)]",
          "ring-1",
          "ring-inset",
          "ring-[var(--border-subtle)]",
          sizeClasses[size],
          rounded
            ? "rounded-full"
            : "rounded-none",
          trackClassName,
        )}
      >
        <div
          className={joinClassNames(
            "h-full",
            "origin-left",
            toneClasses[tone],
            rounded
              ? "rounded-full"
              : "rounded-none",
            animated
              ? [
                  "transition-[width]",
                  "duration-500",
                  "ease-out",
                  "motion-reduce:transition-none",
                ].join(" ")
              : "",
            indicatorClassName,
          )}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}