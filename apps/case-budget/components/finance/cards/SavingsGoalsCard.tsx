import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Flag,
  PiggyBank,
  Target,
} from "lucide-react";

import MoneyDisplay from "../display/MoneyDisplay";

export type SavingsGoalStatus =
  | "on-track"
  | "behind"
  | "completed"
  | "paused";

export type SavingsGoalItem = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetDate?: Date | string;
  status?: SavingsGoalStatus;
  monthlyContribution?: number;
  icon?: ReactNode;
};

export type SavingsGoalsCardProps = {
  goals: SavingsGoalItem[];
  currency?: string;
  locale?: string;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxGoals?: number;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

function joinClassNames(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function parseDateValue(value?: Date | string) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function normalizeDate(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getDaysUntilDate(
  targetDate: Date,
  currentDate: Date
) {
  const normalizedTargetDate =
    normalizeDate(targetDate);

  const normalizedCurrentDate =
    normalizeDate(currentDate);

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.round(
    (normalizedTargetDate.getTime() -
      normalizedCurrentDate.getTime()) /
      millisecondsPerDay
  );
}

function formatTargetDate(
  value: Date | string,
  locale: string
) {
  const targetDate = parseDateValue(value);

  if (!targetDate) {
    return "No target date";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(targetDate);
}

function getTargetDateLabel(
  value: Date | string | undefined,
  locale: string,
  currentDate: Date
) {
  const targetDate = parseDateValue(value);

  if (!targetDate) {
    return "No target date";
  }

  const daysUntilTarget = getDaysUntilDate(
    targetDate,
    currentDate
  );

  if (daysUntilTarget < 0) {
    const overdueDays = Math.abs(
      daysUntilTarget
    );

    return overdueDays === 1
      ? "Target was 1 day ago"
      : `Target was ${overdueDays} days ago`;
  }

  if (daysUntilTarget === 0) {
    return "Target date is today";
  }

  if (daysUntilTarget === 1) {
    return "Target date is tomorrow";
  }

  if (daysUntilTarget <= 30) {
    return `${daysUntilTarget} days remaining`;
  }

  return formatTargetDate(
    targetDate,
    locale
  );
}

function calculateProgress(
  currentAmount: number,
  targetAmount: number
) {
  if (targetAmount <= 0) {
    return currentAmount > 0 ? 100 : 0;
  }

  return (
    (currentAmount / targetAmount) *
    100
  );
}

function resolveGoalStatus(
  goal: SavingsGoalItem,
  progress: number,
  currentDate: Date
): SavingsGoalStatus {
  if (goal.status === "paused") {
    return "paused";
  }

  if (
    goal.status === "completed" ||
    progress >= 100
  ) {
    return "completed";
  }

  if (
    goal.status === "on-track" ||
    goal.status === "behind"
  ) {
    return goal.status;
  }

  const targetDate = parseDateValue(
    goal.targetDate
  );

  if (!targetDate) {
    return "on-track";
  }

  const daysUntilTarget = getDaysUntilDate(
    targetDate,
    currentDate
  );

  if (daysUntilTarget < 0) {
    return "behind";
  }

  const remainingAmount = Math.max(
    goal.targetAmount -
      goal.currentAmount,
    0
  );

  if (
    typeof goal.monthlyContribution !==
      "number" ||
    goal.monthlyContribution <= 0
  ) {
    return "on-track";
  }

  const estimatedMonthsNeeded =
    remainingAmount /
    goal.monthlyContribution;

  const monthsRemaining =
    daysUntilTarget / 30.44;

  return estimatedMonthsNeeded <=
    monthsRemaining
    ? "on-track"
    : "behind";
}

const goalStatusConfig: Record<
  SavingsGoalStatus,
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
      <Target
        size={13}
        aria-hidden="true"
      />
    ),
  },
  behind: {
    label: "Behind",
    textClass: "text-amber-400",
    backgroundClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    progressClass: "bg-amber-500",
    icon: (
      <Flag
        size={13}
        aria-hidden="true"
      />
    ),
  },
  completed: {
    label: "Completed",
    textClass: "text-sky-400",
    backgroundClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    progressClass: "bg-sky-500",
    icon: (
      <CheckCircle2
        size={13}
        aria-hidden="true"
      />
    ),
  },
  paused: {
    label: "Paused",
    textClass: "text-slate-400",
    backgroundClass: "bg-slate-500/10",
    borderClass: "border-slate-500/20",
    progressClass: "bg-slate-500",
    icon: (
      <Flag
        size={13}
        aria-hidden="true"
      />
    ),
  },
};

export default function SavingsGoalsCard({
  goals,
  currency = "USD",
  locale = "en-US",
  title = "Savings Goals",
  description = "Track progress toward your financial goals",
  emptyTitle = "No savings goals",
  emptyDescription =
    "Create a savings goal to start building toward something important.",
  maxGoals = 5,
  icon,
  href,
  className,
}: SavingsGoalsCardProps) {
  const currentDate = new Date();

  const resolvedGoals = goals
    .map((goal) => {
      const normalizedCurrentAmount =
        Math.max(goal.currentAmount, 0);

      const normalizedTargetAmount =
        Math.max(goal.targetAmount, 0);

      const progress = calculateProgress(
        normalizedCurrentAmount,
        normalizedTargetAmount
      );

      const normalizedProgress =
        Math.min(
          Math.max(progress, 0),
          100
        );

      const remainingAmount = Math.max(
        normalizedTargetAmount -
          normalizedCurrentAmount,
        0
      );

      const status = resolveGoalStatus(
        {
          ...goal,
          currentAmount:
            normalizedCurrentAmount,
          targetAmount:
            normalizedTargetAmount,
        },
        progress,
        currentDate
      );

      return {
        ...goal,
        currentAmount:
          normalizedCurrentAmount,
        targetAmount:
          normalizedTargetAmount,
        progress,
        normalizedProgress,
        remainingAmount,
        status,
      };
    })
    .sort((firstGoal, secondGoal) => {
      if (
        firstGoal.status === "completed" &&
        secondGoal.status !== "completed"
      ) {
        return 1;
      }

      if (
        secondGoal.status === "completed" &&
        firstGoal.status !== "completed"
      ) {
        return -1;
      }

      if (
        firstGoal.status === "behind" &&
        secondGoal.status !== "behind"
      ) {
        return -1;
      }

      if (
        secondGoal.status === "behind" &&
        firstGoal.status !== "behind"
      ) {
        return 1;
      }

      return (
        secondGoal.normalizedProgress -
        firstGoal.normalizedProgress
      );
    })
    .slice(0, Math.max(maxGoals, 0));

  const totalSaved = resolvedGoals.reduce(
    (total, goal) => {
      return total + goal.currentAmount;
    },
    0
  );

  const totalTarget = resolvedGoals.reduce(
    (total, goal) => {
      return total + goal.targetAmount;
    },
    0
  );

  const overallProgress =
    totalTarget > 0
      ? (totalSaved / totalTarget) * 100
      : totalSaved > 0
        ? 100
        : 0;

  const normalizedOverallProgress =
    Math.min(
      Math.max(overallProgress, 0),
      100
    );

  const completedCount =
    resolvedGoals.filter((goal) => {
      return goal.status === "completed";
    }).length;

  const behindCount =
    resolvedGoals.filter((goal) => {
      return goal.status === "behind";
    }).length;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-400">
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

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-400">
          {resolvedGoals.length}{" "}
          {resolvedGoals.length === 1
            ? "goal"
            : "goals"}
        </span>
      </div>

      {resolvedGoals.length > 0 ? (
        <>
          <div className="mt-6">
            <p className="text-xs font-medium text-slate-500">
              Total saved
            </p>

            <MoneyDisplay
              amount={totalSaved}
              currency={currency}
              locale={locale}
              showColor={false}
              size="xl"
              className="mt-1 text-white"
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-slate-500">
                Overall progress
              </span>

              <span className="text-xs font-semibold tabular-nums text-slate-300">
                {overallProgress.toFixed(0)}%
              </span>
            </div>

            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{
                  width: `${normalizedOverallProgress}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Saved{" "}
                <MoneyDisplay
                  amount={totalSaved}
                  currency={currency}
                  locale={locale}
                  showColor={false}
                  size="sm"
                  className="text-slate-300"
                />
              </span>

              <span>
                Target{" "}
                <MoneyDisplay
                  amount={totalTarget}
                  currency={currency}
                  locale={locale}
                  showColor={false}
                  size="sm"
                  className="text-slate-300"
                />
              </span>
            </div>
          </div>

          {completedCount > 0 ||
          behindCount > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {completedCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400">
                  <CheckCircle2
                    size={13}
                    aria-hidden="true"
                  />

                  {completedCount} completed
                </span>
              ) : null}

              {behindCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
                  <Flag
                    size={13}
                    aria-hidden="true"
                  />

                  {behindCount} behind
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {resolvedGoals.map((goal) => {
              const statusConfig =
                goalStatusConfig[goal.status];

              const targetDateLabel =
                getTargetDateLabel(
                  goal.targetDate,
                  locale,
                  currentDate
                );

              return (
                <div
                  key={goal.id}
                  className={joinClassNames(
                    "rounded-xl border bg-white/[0.025] p-4",
                    goal.status === "behind"
                      ? "border-amber-500/20"
                      : goal.status === "completed"
                        ? "border-sky-500/20"
                        : "border-white/10"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={joinClassNames(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                          statusConfig.textClass,
                          statusConfig.backgroundClass,
                          statusConfig.borderClass
                        )}
                      >
                        {goal.icon ?? (
                          <Target
                            size={18}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-200">
                          {goal.name}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <CalendarDays
                            size={13}
                            aria-hidden="true"
                          />

                          <span className="truncate">
                            {targetDateLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={joinClassNames(
                        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                        statusConfig.textClass,
                        statusConfig.backgroundClass,
                        statusConfig.borderClass
                      )}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3">
                      <MoneyDisplay
                        amount={goal.currentAmount}
                        currency={currency}
                        locale={locale}
                        showColor={false}
                        size="sm"
                        className="text-slate-200"
                      />

                      <span className="text-xs font-semibold tabular-nums text-slate-400">
                        {goal.progress.toFixed(0)}%
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={joinClassNames(
                          "h-full rounded-full transition-[width] duration-300",
                          statusConfig.progressClass
                        )}
                        style={{
                          width: `${goal.normalizedProgress}%`,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        Goal{" "}
                        <MoneyDisplay
                          amount={goal.targetAmount}
                          currency={currency}
                          locale={locale}
                          showColor={false}
                          size="sm"
                          className="text-slate-300"
                        />
                      </span>

                      <span>
                        Remaining{" "}
                        <MoneyDisplay
                          amount={goal.remainingAmount}
                          currency={currency}
                          locale={locale}
                          showColor={false}
                          size="sm"
                          className="text-slate-300"
                        />
                      </span>
                    </div>

                    {typeof goal.monthlyContribution ===
                    "number" ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Monthly contribution{" "}
                        <MoneyDisplay
                          amount={Math.max(
                            goal.monthlyContribution,
                            0
                          )}
                          currency={currency}
                          locale={locale}
                          showColor={false}
                          size="sm"
                          className="text-slate-300"
                        />
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <PiggyBank
              size={21}
              aria-hidden="true"
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-300">
            {emptyTitle}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {emptyDescription}
          </p>
        </div>
      )}
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
          behindCount > 0 &&
            "border-amber-500/20",
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
        behindCount > 0 &&
          "border-amber-500/20",
        "hover:border-white/15 hover:bg-white/[0.04]",
        className
      )}
    >
      {content}
    </article>
  );
}