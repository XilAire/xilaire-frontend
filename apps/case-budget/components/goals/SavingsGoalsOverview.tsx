"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  MoreHorizontal,
  PauseCircle,
  PiggyBank,
  Target,
  TrendingUp,
} from "lucide-react";

import CreateGoalModal from "@/components/goals/CreateGoalModal";
import GoalDetailsModal from "@/components/goals/GoalDetailsModal";

import {
  type GoalData,
  useGoals,
} from "@/components/providers/GoalsProvider";

type GoalFilter =
  | "active"
  | "completed"
  | "all";

function formatCurrency(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(
    value,
  );
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  ).format(
    date,
  );
}

function getGoalProgress(
  goal: GoalData,
) {
  if (
    goal.targetAmount <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (
        goal.currentAmount /
        goal.targetAmount
      ) * 100,
    ),
  );
}

function getRemainingAmount(
  goal: GoalData,
) {
  return Math.max(
    0,
    goal.targetAmount -
      goal.currentAmount,
  );
}

function getDaysRemaining(
  targetDate?: string,
) {
  if (!targetDate) {
    return null;
  }

  const target =
    new Date(
      `${targetDate}T00:00:00`,
    );

  if (
    Number.isNaN(
      target.getTime(),
    )
  ) {
    return null;
  }

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

  return Math.ceil(
    (
      target.getTime() -
      today.getTime()
    ) /
      86400000,
  );
}

function getTargetDateLabel(
  goal: GoalData,
) {
  const formattedDate =
    formatDate(
      goal.targetDate,
    );

  if (!formattedDate) {
    return "No target date";
  }

  const daysRemaining =
    getDaysRemaining(
      goal.targetDate,
    );

  if (
    daysRemaining === null
  ) {
    return formattedDate;
  }

  if (
    goal.status ===
    "completed"
  ) {
    return `Target ${formattedDate}`;
  }

  if (
    daysRemaining < 0
  ) {
    return `Past due · ${formattedDate}`;
  }

  if (
    daysRemaining === 0
  ) {
    return "Target is today";
  }

  if (
    daysRemaining === 1
  ) {
    return "1 day remaining";
  }

  return `${daysRemaining} days remaining`;
}

export default function SavingsGoalsOverview() {
  const {
    goals,
    completedGoals,
    totalSaved,
    totalTarget,
  } =
    useGoals();

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<GoalFilter>(
      "active",
    );

  const [
    isCreateGoalOpen,
    setIsCreateGoalOpen,
  ] =
    useState(
      false,
    );

  const [
    selectedGoalId,
    setSelectedGoalId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const selectedGoal =
    useMemo(
      () =>
        selectedGoalId
          ? goals.find(
              (
                goal,
              ) =>
                goal.id ===
                selectedGoalId,
            ) ??
            null
          : null,
      [
        goals,
        selectedGoalId,
      ],
    );

  const filteredGoals =
    useMemo(
      () => {
        switch (
          selectedFilter
        ) {
          case "active":
            return goals.filter(
              (
                goal,
              ) =>
                goal.status ===
                  "active" ||
                goal.status ===
                  "paused",
            );

          case "completed":
            return completedGoals;

          case "all":
          default:
            return goals;
        }
      },
      [
        completedGoals,
        goals,
        selectedFilter,
      ],
    );

  const overallProgress =
    totalTarget > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              totalSaved /
              totalTarget
            ) * 100,
          ),
        )
      : 0;

  const remainingToSave =
    Math.max(
      0,
      totalTarget -
        totalSaved,
    );

  const activeGoalCount =
    goals.filter(
      (
        goal,
      ) =>
        goal.status ===
          "active" ||
        goal.status ===
          "paused",
    ).length;

  const hasGoals =
    goals.length > 0;

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Target
                  className="h-6 w-6"
                  strokeWidth={
                    2
                  }
                />
              </div>

              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                    Savings Goals
                  </h1>

                  {hasGoals ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {
                        activeGoalCount
                      }{" "}
                      active
                    </span>
                  ) : null}
                </div>

                <p className="max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Turn the things
                  you are saving
                  for into clear,
                  trackable
                  targets.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setIsCreateGoalOpen(
                  true,
                )
              }
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Target className="h-5 w-5" />

              Create goal
            </button>
          </div>
        </section>

        {hasGoals ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total saved"
                value={formatCurrency(
                  totalSaved,
                )}
                description="Across all savings goals"
                icon={
                  PiggyBank
                }
              />

              <SummaryCard
                label="Goal targets"
                value={formatCurrency(
                  totalTarget,
                )}
                description="Combined target amount"
                icon={
                  Target
                }
              />

              <SummaryCard
                label="Remaining"
                value={formatCurrency(
                  remainingToSave,
                )}
                description="Still needed to reach every goal"
                icon={
                  CircleDollarSign
                }
              />

              <SummaryCard
                label="Overall progress"
                value={`${overallProgress.toFixed(
                  1,
                )}%`}
                description={`${completedGoals.length} completed`}
                icon={
                  TrendingUp
                }
              />
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Your goals
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Track progress
                    and keep your
                    savings moving
                    forward.
                  </p>
                </div>

                <div className="flex w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
                  <FilterButton
                    label="Active"
                    count={
                      activeGoalCount
                    }
                    active={
                      selectedFilter ===
                      "active"
                    }
                    onClick={() =>
                      setSelectedFilter(
                        "active",
                      )
                    }
                  />

                  <FilterButton
                    label="Completed"
                    count={
                      completedGoals.length
                    }
                    active={
                      selectedFilter ===
                      "completed"
                    }
                    onClick={() =>
                      setSelectedFilter(
                        "completed",
                      )
                    }
                  />

                  <FilterButton
                    label="All"
                    count={
                      goals.length
                    }
                    active={
                      selectedFilter ===
                      "all"
                    }
                    onClick={() =>
                      setSelectedFilter(
                        "all",
                      )
                    }
                  />
                </div>
              </div>

              {filteredGoals.length >
              0 ? (
                <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-2">
                  {filteredGoals.map(
                    (
                      goal,
                    ) => (
                      <GoalCard
                        key={
                          goal.id
                        }
                        goal={
                          goal
                        }
                        onOpen={() =>
                          setSelectedGoalId(
                            goal.id,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <FilteredEmptyState
                  filter={
                    selectedFilter
                  }
                />
              )}
            </section>
          </>
        ) : (
          <EmptyGoalsState
            onCreateGoal={() =>
              setIsCreateGoalOpen(
                true,
              )
            }
          />
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <PiggyBank className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Make room in
                  your budget
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Give savings a
                  job in your
                  monthly plan so
                  your goals are
                  funded
                  intentionally.
                </p>

                <Link
                  href="/dashboard/budget"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800"
                >
                  Open budget

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Build momentum
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Small,
                  consistent
                  contributions
                  can turn a large
                  target into a
                  manageable
                  monthly plan.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <CreateGoalModal
        open={
          isCreateGoalOpen
        }
        onClose={() =>
          setIsCreateGoalOpen(
            false,
          )
        }
      />

      <GoalDetailsModal
        open={
          selectedGoal !==
          null
        }
        goal={
          selectedGoal
        }
        onClose={() =>
          setSelectedGoalId(
            null,
          )
        }
      />
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  icon:
    typeof PiggyBank;
};

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: SummaryCardProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {
              description
            }
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

type FilterButtonProps = {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
};

function FilterButton({
  label,
  count,
  active,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition sm:flex-none",
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-900",
      ].join(
        " ",
      )}
    >
      {label}

      <span
        className={[
          "rounded-full px-2 py-0.5 text-xs",
          active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-200 text-slate-600",
        ].join(
          " ",
        )}
      >
        {count}
      </span>
    </button>
  );
}

type GoalCardProps = {
  goal: GoalData;
  onOpen: () => void;
};

function GoalCard({
  goal,
  onOpen,
}: GoalCardProps) {
  const progress =
    getGoalProgress(
      goal,
    );

  const remaining =
    getRemainingAmount(
      goal,
    );

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
              goal.status ===
              "completed"
                ? "bg-emerald-100 text-emerald-700"
                : goal.status ===
                  "paused"
                ? "bg-amber-50 text-amber-600"
                : "bg-emerald-50 text-emerald-600",
            ].join(
              " ",
            )}
          >
            {goal.status ===
            "completed" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : goal.status ===
              "paused" ? (
              <PauseCircle className="h-5 w-5" />
            ) : (
              <Target className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-bold text-slate-950">
              {
                goal.name
              }
            </h3>

            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />

              {getTargetDateLabel(
                goal,
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onOpen
          }
          aria-label={`Open ${goal.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-bold text-slate-950">
              {formatCurrency(
                goal.currentAmount,
              )}
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              of{" "}
              {formatCurrency(
                goal.targetAmount,
              )}
            </p>
          </div>

          <p className="text-sm font-bold text-emerald-700">
            {progress.toFixed(
              0,
            )}
            %
          </p>
        </div>

        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width]"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4 text-xs">
          <span className="text-slate-500">
            {goal.status ===
            "completed"
              ? "Goal reached"
              : `${formatCurrency(
                  remaining,
                )} remaining`}
          </span>

          <span
            className={[
              "rounded-full px-2.5 py-1 font-semibold capitalize",
              goal.status ===
              "completed"
                ? "bg-emerald-50 text-emerald-700"
                : goal.status ===
                  "paused"
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600",
            ].join(
              " ",
            )}
          >
            {
              goal.status
            }
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={
          onOpen
        }
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
      >
        {goal.status ===
        "completed"
          ? "View goal"
          : "Add contribution"}

        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

type EmptyGoalsStateProps = {
  onCreateGoal:
    () => void;
};

function EmptyGoalsState({
  onCreateGoal,
}: EmptyGoalsStateProps) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-14 text-center sm:px-8 sm:py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
          <Target className="h-8 w-8" />
        </div>

        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
          Start saving toward
          something meaningful
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
          Create your first
          savings goal to track
          how much you have
          saved, how much is
          left, and when you
          want to reach it.
        </p>

        <button
          type="button"
          onClick={
            onCreateGoal
          }
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          <Target className="h-5 w-5" />

          Create your first goal

          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="mt-10 grid w-full gap-3 text-left sm:grid-cols-3">
          <EmptyBenefit
            title="Set a target"
            description="Choose exactly how much you want to save."
          />

          <EmptyBenefit
            title="Pick a date"
            description="Give your goal a target date when it matters."
          />

          <EmptyBenefit
            title="Track progress"
            description="Watch every contribution move you closer."
          />
        </div>
      </div>
    </section>
  );
}

type EmptyBenefitProps = {
  title: string;
  description: string;
};

function EmptyBenefit({
  title,
  description,
}: EmptyBenefitProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-950">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}

function FilteredEmptyState({
  filter,
}: {
  filter:
    GoalFilter;
}) {
  const title =
    filter ===
    "completed"
      ? "No completed goals yet"
      : filter ===
        "active"
      ? "No active goals"
      : "No goals to show";

  const description =
    filter ===
    "completed"
      ? "Goals you finish will appear here."
      : filter ===
        "active"
      ? "Create a goal or resume a paused goal to see it here."
      : "Create a savings goal to begin tracking your progress.";

  return (
    <div className="flex flex-col items-center px-5 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Target className="h-6 w-6" />
      </div>

      <h3 className="mt-4 font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        {
          description
        }
      </p>
    </div>
  );
}