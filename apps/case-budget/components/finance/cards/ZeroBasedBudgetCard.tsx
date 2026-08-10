import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  MinusCircle,
  WalletCards,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type ZeroBasedBudgetStatus =
  | "balanced"
  | "unassigned"
  | "over-assigned";

export type ZeroBasedBudgetCardProps = {
  income: number;
  assigned: number;
  spent?: number;
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  incomeLabel?: string;
  assignedLabel?: string;
  spentLabel?: string;
  remainingLabel?: string;
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
  remainingToAssign: number
): ZeroBasedBudgetStatus {
  if (remainingToAssign > 0) {
    return "unassigned";
  }

  if (remainingToAssign < 0) {
    return "over-assigned";
  }

  return "balanced";
}

const statusConfig: Record<
  ZeroBasedBudgetStatus,
  {
    label: string;
    description: string;
    textClass: string;
    backgroundClass: string;
    borderClass: string;
    progressClass: string;
    icon: ReactNode;
  }
> = {
  balanced: {
    label: "Every dollar assigned",
    description:
      "Your income has been fully assigned to budget categories.",
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
  unassigned: {
    label: "Money left to assign",
    description:
      "Assign the remaining income to categories, savings, or debt.",
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
  "over-assigned": {
    label: "Budget over-assigned",
    description:
      "Reduce category assignments until the remaining amount reaches zero.",
    textClass: "text-rose-400",
    backgroundClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    progressClass: "bg-rose-500",
    icon: (
      <MinusCircle
        size={14}
        aria-hidden="true"
      />
    ),
  },
};

export default function ZeroBasedBudgetCard({
  income,
  assigned,
  spent = 0,
  currency = "USD",
  locale = "en-US",
  title = "Zero-Based Budget",
  description = "Give every dollar a purpose",
  incomeLabel = "Monthly income",
  assignedLabel = "Assigned",
  spentLabel = "Spent",
  remainingLabel = "Left to assign",
  icon,
  href,
  className,
}: ZeroBasedBudgetCardProps) {
  const normalizedIncome = Math.max(income, 0);
  const normalizedAssigned = Math.max(assigned, 0);
  const normalizedSpent = Math.max(spent, 0);

  const remainingToAssign =
    normalizedIncome - normalizedAssigned;

  const status = getBudgetStatus(
    remainingToAssign
  );

  const currentStatus = statusConfig[status];

  const assignmentPercentage =
    normalizedIncome > 0
      ? (normalizedAssigned / normalizedIncome) *
        100
      : normalizedAssigned > 0
        ? 100
        : 0;

  const progressPercentage = Math.min(
    Math.max(assignmentPercentage, 0),
    100
  );

  const spentPercentage =
    normalizedAssigned > 0
      ? (normalizedSpent / normalizedAssigned) *
        100
      : normalizedSpent > 0
        ? 100
        : 0;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-400">
            {icon ?? (
              <WalletCards
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
            currentStatus.borderClass
          )}
        >
          {currentStatus.icon}
          {currentStatus.label}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-medium text-slate-500">
          {remainingLabel}
        </p>

        <MoneyDisplay
          amount={Math.abs(remainingToAssign)}
          currency={currency}
          locale={locale}
          showColor={false}
          size="xl"
          className={joinClassNames(
            "mt-1",
            status === "balanced"
              ? "text-emerald-400"
              : status === "unassigned"
                ? "text-amber-400"
                : "text-rose-400"
          )}
        />

        {status === "over-assigned" ? (
          <p className="mt-2 text-xs font-medium text-rose-400">
            You have assigned more than your available
            income.
          </p>
        ) : null}
      </div>

      <div
        className={joinClassNames(
          "mt-5 rounded-xl border p-4",
          currentStatus.backgroundClass,
          currentStatus.borderClass
        )}
      >
        <div className="flex items-start gap-3">
          <CircleDollarSign
            size={18}
            className={joinClassNames(
              "mt-0.5 shrink-0",
              currentStatus.textClass
            )}
            aria-hidden="true"
          />

          <div>
            <p
              className={joinClassNames(
                "text-sm font-semibold",
                currentStatus.textClass
              )}
            >
              {currentStatus.label}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              {currentStatus.description}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">
            Income assigned
          </span>

          <span className="text-xs font-semibold tabular-nums text-slate-300">
            {assignmentPercentage.toFixed(0)}%
          </span>
        </div>

        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={joinClassNames(
              "h-full rounded-full transition-[width] duration-300",
              currentStatus.progressClass
            )}
            style={{
              width: `${progressPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-medium text-slate-500">
            {incomeLabel}
          </p>

          <MoneyDisplay
            amount={normalizedIncome}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-emerald-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-medium text-slate-500">
            {assignedLabel}
          </p>

          <MoneyDisplay
            amount={normalizedAssigned}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-sky-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-medium text-slate-500">
            {spentLabel}
          </p>

          <MoneyDisplay
            amount={normalizedSpent}
            currency={currency}
            locale={locale}
            showColor={false}
            size="md"
            className="mt-2 text-slate-200"
          />

          <p className="mt-1 text-xs text-slate-500">
            {spentPercentage.toFixed(0)}% of assigned
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        aria-label={`View ${title}`}
        className={joinClassNames(
          "group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm transition duration-200",
          "hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05] hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          className
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
        status === "over-assigned" &&
          "border-rose-500/20",
        status === "unassigned" &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}