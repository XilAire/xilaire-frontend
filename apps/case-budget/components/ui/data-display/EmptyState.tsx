import type {
  HTMLAttributes,
  ReactNode,
} from "react";

import Button from "@/components/ui/button";

type EmptyStateProps =
  HTMLAttributes<HTMLDivElement> & {
    title: string;
    description: string;
    icon?: ReactNode;
    illustration?: ReactNode;
    actionLabel?: string;
    secondaryActionLabel?: string;
    onAction?: () => void;
    onSecondaryAction?: () => void;
  };

function DefaultIllustration() {
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl" />

      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-emerald-500/20 bg-slate-900">
        <svg
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-400"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="16"
            rx="3"
          />

          <path d="M7 10h10" />
          <path d="M7 15h6" />
        </svg>
      </div>
    </div>
  );
}

export default function EmptyState({
  title,
  description,
  icon,
  illustration,
  actionLabel,
  secondaryActionLabel,
  onAction,
  onSecondaryAction,
  className = "",
  ...props
}: EmptyStateProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-3xl",
        "border",
        "border-dashed",
        "border-white/10",
        "bg-slate-900/40",
        "px-8",
        "py-12",
        "text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center">
        {illustration ?? (
          <>
            {icon ? (
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                {icon}
              </div>
            ) : (
              <DefaultIllustration />
            )}
          </>
        )}

        <h2 className="mt-8 text-2xl font-bold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
          {description}
        </p>

        {(actionLabel ||
          secondaryActionLabel) && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {actionLabel && (
              <Button
                variant="primary"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}

            {secondaryActionLabel && (
              <Button
                variant="outline"
                onClick={
                  onSecondaryAction
                }
              >
                {
                  secondaryActionLabel
                }
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}