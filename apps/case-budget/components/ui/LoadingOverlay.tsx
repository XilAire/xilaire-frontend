"use client";

import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";

export type LoadingOverlayPosition =
  | "fixed"
  | "absolute";

export type LoadingOverlayTone =
  | "default"
  | "transparent"
  | "blurred";

export type LoadingOverlayProps =
  HTMLAttributes<HTMLDivElement> & {
    isVisible?: boolean;
    label?: ReactNode;
    description?: ReactNode;
    position?: LoadingOverlayPosition;
    tone?: LoadingOverlayTone;
    spinnerSize?: "sm" | "md" | "lg";
    fullScreen?: boolean;
    showPanel?: boolean;
    preventInteraction?: boolean;
    panelClassName?: string;
    spinnerClassName?: string;
  };

const positionClasses: Record<
  LoadingOverlayPosition,
  string
> = {
  fixed: "fixed inset-0",
  absolute: "absolute inset-0",
};

const toneClasses: Record<
  LoadingOverlayTone,
  string
> = {
  default:
    "bg-[var(--surface-overlay)]",

  transparent:
    "bg-transparent",

  blurred: [
    "bg-[var(--surface-overlay)]",
    "backdrop-blur-sm",
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

export default function LoadingOverlay({
  isVisible = true,
  label = "Loading",
  description,
  position = "absolute",
  tone = "blurred",
  spinnerSize = "md",
  fullScreen = false,
  showPanel = true,
  preventInteraction = true,
  className = "",
  panelClassName = "",
  spinnerClassName = "",
  role = "status",
  "aria-live": ariaLive = "polite",
  "aria-label": ariaLabel,
  ...overlayProps
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  const resolvedPosition =
    fullScreen
      ? "fixed"
      : position;

  return (
    <div
      {...overlayProps}
      role={role}
      aria-live={ariaLive}
      aria-label={
        ariaLabel ??
        (typeof label === "string"
          ? label
          : "Loading")
      }
      aria-busy="true"
      className={joinClassNames(
        "z-[var(--z-loading)]",
        "flex",
        "items-center",
        "justify-center",
        "p-4",
        "animate-case-budget-fade-in",
        positionClasses[
          resolvedPosition
        ],
        toneClasses[tone],
        preventInteraction
          ? "pointer-events-auto"
          : "pointer-events-none",
        className,
      )}
    >
      {showPanel ? (
        <div
          className={joinClassNames(
            "flex",
            "max-w-sm",
            "flex-col",
            "items-center",
            "justify-center",
            "gap-4",
            "rounded-2xl",
            "border",
            "border-[var(--border-default)]",
            "bg-[var(--surface-elevated)]",
            "px-6",
            "py-5",
            "text-center",
            "text-[var(--text-primary)]",
            "shadow-[var(--shadow-xl)]",
            "sm:px-8",
            "sm:py-6",
            panelClassName,
          )}
        >
          <div
            className={joinClassNames(
              "flex",
              "items-center",
              "justify-center",
              spinnerClassName,
            )}
          >
            <LoadingSpinner
              size={spinnerSize}
            />
          </div>

          {label ||
          description ? (
            <div className="space-y-1.5">
              {label ? (
                <div
                  className={joinClassNames(
                    "text-sm",
                    "font-semibold",
                    "text-[var(--text-primary)]",
                    "sm:text-base",
                  )}
                >
                  {label}
                </div>
              ) : null}

              {description ? (
                <div
                  className={joinClassNames(
                    "text-sm",
                    "leading-6",
                    "text-[var(--text-muted)]",
                  )}
                >
                  {description}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={joinClassNames(
            "flex",
            "items-center",
            "justify-center",
            spinnerClassName,
          )}
        >
          <LoadingSpinner
            size={spinnerSize}
          />
        </div>
      )}

      <span className="sr-only">
        {typeof label === "string"
          ? label
          : "Loading"}
      </span>
    </div>
  );
}