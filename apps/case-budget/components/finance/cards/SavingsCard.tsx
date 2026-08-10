import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  PiggyBank,
  Target,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type SavingsCardStatus =
  | "not-started"
  | "in-progress"
  | "completed";

export type SavingsCardProps = {
  title: string;
  currentAmount: number;
  targetAmount: number;
  currency?: string;
  locale?: string;
  description?: string;
  targetDate?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function getSavingsStatus(
  currentAmount: number,
  targetAmount: number,
): SavingsCardStatus {
  if (targetAmount > 0 && currentAmount >= targetAmount) {
    return "completed";
  }

  if (currentAmount > 0) {
    return "in-progress";
  }

  return "not-started";
}

function formatDate(
  value: string,
  locale: string,
) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const statusConfig: Record<
  SavingsCardStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  "not-started": {
    label: "Not started",
    textClass: "text-slate-300",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
    progressClass: "bg-slate-500",
    icon: (
      <Target
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "in-progress": {
    label: "In progress",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    progressClass: "bg-sky-500",
    icon: (
      <PiggyBank
        size={14}
        aria-hidden="true"
      />
    ),
  },
  completed: {
    label: "Completed",
    textClass: "text-emerald-400",
    backgroundClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/20",
    progressClass: "bg-emerald-500",
    icon: (
      <CheckCircle2
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function SavingsCard({
  title,
  currentAmount,
  targetAmount,
  currency = "USD",
  locale = "en-US",
  description,
  targetDate,
  icon,
  href,
  className,
}: SavingsCardProps) {
  const remainingAmount = Math.max(
    targetAmount - currentAmount,
    0,
  );

  const percentageComplete =
    targetAmount > 0
      ? (currentAmount / targetAmount) * 100
      : 0;

  const progressPercentage = Math.min(
    Math.max(percentageComplete, 0),
    100,
  );

  const status = getSavingsStatus(
    currentAmount,
    targetAmount,
  );

  const currentStatus = statusConfig[status];

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sky-400">
            {icon ?? (
              <PiggyBank
                size={21}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-200">
              {title}
            </h3>

            {description ? (
              <p className="mt-1 truncate text-xs text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <span
          className={joinClassNames(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            currentStatus.textClass,
            currentStatus.backgroundClass,
            currentStatus.borderClass,
          )}
        >
          {currentStatus.icon}

          {currentStatus.label}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-500">
          Saved
        </p>

        <MoneyDisplay
          amount={currentAmount}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className="mt-1 text-white"
        />
      </div>

      <div className="mt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={joinClassNames(
              "h-full rounded-full transition-[width] duration-300",
              currentStatus.progressClass,
            )}
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {percentageComplete.toFixed(0)}% complete
          </span>

          <span className="inline-flex items-center gap-1">
            Goal
            <MoneyDisplay
              amount={targetAmount}
              currency={currency}
              locale={locale}
              showColor={false}
              size="sm"
              className="text-slate-300"
            />
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Target
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              Remaining
            </span>
          </div>

          <MoneyDisplay
            amount={remainingAmount}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-sky-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CalendarDays
              size={16}
              aria-hidden="true"
            />

            <span className="text-xs font-medium">
              Target date
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold text-slate-200">
            {targetDate
              ? formatDate(targetDate, locale)
              : "No target date"}
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View savings goal: ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          className,
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <article
      className={joinClassNames(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className,
      )}
    >
      {content}
    </article>
  );
}