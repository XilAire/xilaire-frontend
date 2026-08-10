import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";
import PercentageBadge from "../display/PercentageBadge";

export type BudgetCardStatus =
  | "on-track"
  | "warning"
  | "over-budget";

export type BudgetCardProps = {
  title: string;
  budgeted: number;
  spent: number;
  currency?: string;
  locale?: string;
  description?: string;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function getBudgetStatus(
  spent: number,
  budgeted: number,
): BudgetCardStatus {
  if (budgeted <= 0) {
    return spent > 0 ? "over-budget" : "on-track";
  }

  const percentageUsed = (spent / budgeted) * 100;

  if (percentageUsed > 100) {
    return "over-budget";
  }

  if (percentageUsed >= 80) {
    return "warning";
  }

  return "on-track";
}

const statusConfig: Record<
  BudgetCardStatus,
  {
    label: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  "on-track": {
    label: "On track",
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
  warning: {
    label: "Near limit",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    progressClass: "bg-amber-500",
    icon: (
      <AlertTriangle
        size={14}
        aria-hidden="true"
      />
    ),
  },
  "over-budget": {
    label: "Over budget",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    progressClass: "bg-rose-500",
    icon: (
      <AlertTriangle
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function BudgetCard({
  title,
  budgeted,
  spent,
  currency = "USD",
  locale = "en-US",
  description,
  icon,
  href,
  className,
}: BudgetCardProps) {
  const remaining = budgeted - spent;

  const percentageUsed =
    budgeted > 0
      ? (spent / budgeted) * 100
      : spent > 0
        ? 100
        : 0;

  const progressPercentage = Math.min(
    Math.max(percentageUsed, 0),
    100,
  );

  const status = getBudgetStatus(
    spent,
    budgeted,
  );

  const currentStatus = statusConfig[status];

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-400">
            {icon ?? (
              <CircleDollarSign
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

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Spent
          </p>

          <MoneyDisplay
            amount={spent}
            currency={currency}
            locale={locale}
            showColor={false}
            size="lg"
            className="mt-1 text-white"
          />
        </div>

        <PercentageBadge
          value={percentageUsed}
          decimals={0}
          showArrow={false}
          showPlusSign={false}
          positiveIsGood={false}
          size="sm"
        />
      </div>

      <div className="mt-4">
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
            {percentageUsed.toFixed(0)}% used
          </span>

          <span>
            Budgeted{" "}
            <MoneyDisplay
              amount={budgeted}
              currency={currency}
              locale={locale}
              showColor={false}
              size="sm"
              className="text-slate-300"
            />
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
        <p className="text-xs font-medium text-slate-500">
          {remaining >= 0
            ? "Remaining"
            : "Over by"}
        </p>

        <MoneyDisplay
          amount={Math.abs(remaining)}
          currency={currency}
          locale={locale}
          showColor={false}
          size="md"
          className={joinClassNames(
            "mt-1",
            remaining >= 0
              ? "text-emerald-400"
              : "text-rose-400",
          )}
        />
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View ${title} budget`}
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