"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  PauseCircle,
  PlayCircle,
  Plus,
  Target,
  Trash2,
  X,
} from "lucide-react";

import {
  type GoalData,
  useGoals,
} from "@/components/providers/GoalsProvider";

type GoalDetailsModalProps = {
  open: boolean;
  goal: GoalData | null;
  onClose: () => void;
};

type EditGoalFormState = {
  name: string;
  targetAmount: string;
  targetDate: string;
  notes: string;
};

type EditGoalFormErrors = {
  name?: string;
  targetAmount?: string;
  targetDate?: string;
};

type GoalDetailsView =
  | "overview"
  | "contribute"
  | "edit"
  | "delete";

export default function GoalDetailsModal({
  open,
  goal,
  onClose,
}: GoalDetailsModalProps) {
  const {
    contributeToGoal,
    updateGoal,
    deleteGoal,
  } =
    useGoals();

  const [
    currentView,
    setCurrentView,
  ] =
    useState<GoalDetailsView>(
      "overview",
    );

  const [
    contributionAmount,
    setContributionAmount,
  ] =
    useState(
      "",
    );

  const [
    contributionError,
    setContributionError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    editFormState,
    setEditFormState,
  ] =
    useState<EditGoalFormState>({
      name: "",
      targetAmount: "",
      targetDate: "",
      notes: "",
    });

  const [
    editErrors,
    setEditErrors,
  ] =
    useState<EditGoalFormErrors>(
      {},
    );

  const [
    mutationError,
    setMutationError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      if (
        !open ||
        !goal
      ) {
        return;
      }

      setCurrentView(
        "overview",
      );

      setContributionAmount(
        "",
      );

      setContributionError(
        null,
      );

      setEditErrors(
        {},
      );

      setMutationError(
        null,
      );

      setIsSubmitting(
        false,
      );

      setEditFormState({
        name:
          goal.name,

        targetAmount:
          String(
            goal.targetAmount,
          ),

        targetDate:
          goal.targetDate ??
          "",

        notes:
          goal.notes ??
          "",
      });
    },
    [
      goal,
      open,
    ],
  );

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key !==
            "Escape" ||
          isSubmitting
        ) {
          return;
        }

        if (
          currentView !==
          "overview"
        ) {
          setCurrentView(
            "overview",
          );

          return;
        }

        onClose();
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      currentView,
      isSubmitting,
      onClose,
      open,
    ],
  );

  const progress =
    useMemo(
      () => {
        if (
          !goal ||
          goal.targetAmount <=
            0
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
      },
      [
        goal,
      ],
    );

  const remainingAmount =
    useMemo(
      () => {
        if (
          !goal
        ) {
          return 0;
        }

        return Math.max(
          0,
          goal.targetAmount -
            goal.currentAmount,
        );
      },
      [
        goal,
      ],
    );

  if (
    !open ||
    !goal
  ) {
    return null;
  }

  const resolvedGoal =
    goal;

  async function handleContributionSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    const amount =
      parseCurrencyValue(
        contributionAmount,
      );

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      setContributionError(
        "Enter a contribution greater than $0.",
      );

      return;
    }

    setContributionError(
      null,
    );
    setMutationError(
      null,
    );
    setIsSubmitting(
      true,
    );

    try {
      const result =
        await contributeToGoal(
          resolvedGoal.id,
          amount,
        );

      if (
        !result.success
      ) {
        setMutationError(
          result.error,
        );
        return;
      }

      setContributionAmount(
        "",
      );

      setCurrentView(
        "overview",
      );
    } catch (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Contribution failed.",
        error,
      );
      setMutationError(
        "CASE Budget could not record this contribution. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  async function handleEditSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    const nextErrors:
      EditGoalFormErrors =
      {};

    const normalizedName =
      editFormState.name.trim();

    const targetAmount =
      parseCurrencyValue(
        editFormState.targetAmount,
      );

    if (
      !normalizedName
    ) {
      nextErrors.name =
        "Enter a name for this goal.";
    }

    if (
      !Number.isFinite(
        targetAmount,
      ) ||
      targetAmount <= 0
    ) {
      nextErrors.targetAmount =
        "Target amount must be greater than $0.";
    }

    if (
      editFormState.targetDate
    ) {
      const date =
        new Date(
          `${editFormState.targetDate}T00:00:00`,
        );

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        nextErrors.targetDate =
          "Choose a valid target date.";
      }
    }

    setEditErrors(
      nextErrors,
    );

    if (
      Object.keys(
        nextErrors,
      ).length >
      0
    ) {
      return;
    }

    setMutationError(
      null,
    );
    setIsSubmitting(
      true,
    );

    try {
      const result =
        await updateGoal(
          resolvedGoal.id,
          {
            name:
              normalizedName,

            targetAmount,

            targetDate:
              editFormState.targetDate ||
              undefined,

            notes:
              editFormState.notes.trim() ||
              undefined,
          },
        );

      if (
        !result.success
      ) {
        setMutationError(
          result.error,
        );
        return;
      }

      setCurrentView(
        "overview",
      );
    } catch (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Update failed.",
        error,
      );
      setMutationError(
        "CASE Budget could not update this goal. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  async function handlePauseResume() {
    if (
      isSubmitting
    ) {
      return;
    }

    setMutationError(
      null,
    );
    setIsSubmitting(
      true,
    );

    try {
      const result =
        await updateGoal(
          resolvedGoal.id,
          {
            status:
              resolvedGoal.status ===
              "paused"
                ? "active"
                : "paused",
          },
        );

      if (
        !result.success
      ) {
        setMutationError(
          result.error,
        );
      }
    } catch (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Pause/resume failed.",
        error,
      );
      setMutationError(
        "CASE Budget could not update this goal. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  async function handleMarkCompleted() {
    if (
      isSubmitting
    ) {
      return;
    }

    setMutationError(
      null,
    );
    setIsSubmitting(
      true,
    );

    try {
      const result =
        await updateGoal(
          resolvedGoal.id,
          {
            currentAmount:
              Math.max(
                resolvedGoal.currentAmount,
                resolvedGoal.targetAmount,
              ),

            status:
              "completed",
          },
        );

      if (
        !result.success
      ) {
        setMutationError(
          result.error,
        );
      }
    } catch (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Complete goal failed.",
        error,
      );
      setMutationError(
        "CASE Budget could not mark this goal completed. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  async function handleDelete() {
    if (
      isSubmitting
    ) {
      return;
    }

    setMutationError(
      null,
    );
    setIsSubmitting(
      true,
    );

    try {
      const result =
        await deleteGoal(
          resolvedGoal.id,
        );

      if (
        !result.success
      ) {
        setMutationError(
          result.error,
        );
        return;
      }

      onClose();
    } catch (
      error
    ) {
      console.error(
        "[CASE Budget Goals] Archive goal failed.",
        error,
      );
      setMutationError(
        "CASE Budget could not archive this goal. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  function updateEditField(
    field:
      keyof EditGoalFormState,
    value:
      string,
  ) {
    setEditFormState(
      (
        currentState,
      ) => ({
        ...currentState,

        [field]:
          value,
      }),
    );

    setEditErrors(
      (
        currentErrors,
      ) => ({
        ...currentErrors,

        [field]:
          undefined,
      }),
    );

    setMutationError(
      null,
    );
  }

  return (
    <div className="fixed inset-0 z-[1500]">
      <button
        type="button"
        aria-label="Close goal details"
        onClick={
          () => {
            if (
              !isSubmitting
            ) {
              onClose();
            }
          }
        }
        disabled={
          isSubmitting
        }
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-details-title"
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[30px] border-t border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
      >
        <div className="flex max-h-[92vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  resolvedGoal.status ===
                  "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : resolvedGoal.status ===
                      "paused"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600",
                ].join(
                  " ",
                )}
              >
                {resolvedGoal.status ===
                "completed" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : resolvedGoal.status ===
                  "paused" ? (
                  <PauseCircle className="h-5 w-5" />
                ) : (
                  <Target className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <h2
                  id="goal-details-title"
                  className="truncate text-xl font-bold tracking-tight text-slate-950"
                >
                  {
                    resolvedGoal.name
                  }
                </h2>

                <p className="mt-1 text-sm capitalize text-slate-500">
                  {resolvedGoal.status}{" "}
                  savings goal
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isSubmitting
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close goal details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {mutationError ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
              >
                {mutationError}
              </div>
            ) : null}

            {currentView ===
            "overview" ? (
              <div className="space-y-6">
                <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Saved
                      </p>

                      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                        {formatCurrency(
                          resolvedGoal.currentAmount,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        of{" "}
                        {formatCurrency(
                          resolvedGoal.targetAmount,
                        )}
                      </p>
                    </div>

                    <p className="text-lg font-bold text-emerald-700">
                      {progress.toFixed(
                        0,
                      )}
                      %
                    </p>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-[width]"
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <GoalStat
                      label="Remaining"
                      value={
                        resolvedGoal.status ===
                        "completed"
                          ? "$0.00"
                          : formatCurrency(
                              remainingAmount,
                            )
                      }
                    />

                    <GoalStat
                      label="Target date"
                      value={
                        resolvedGoal.targetDate
                          ? formatDate(
                              resolvedGoal.targetDate,
                            )
                          : "No target date"
                      }
                    />
                  </div>
                </section>

                {resolvedGoal.notes ? (
                  <section>
                    <p className="text-sm font-bold text-slate-950">
                      Notes
                    </p>

                    <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                      {
                        resolvedGoal.notes
                      }
                    </p>
                  </section>
                ) : null}

                {resolvedGoal.status !==
                "completed" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentView(
                        "contribute",
                      )
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-5 w-5" />

                    {isSubmitting
                      ? "Adding..."
                      : "Add contribution"}
                  </button>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormState({
                        name:
                          resolvedGoal.name,

                        targetAmount:
                          String(
                            resolvedGoal.targetAmount,
                          ),

                        targetDate:
                          resolvedGoal.targetDate ??
                          "",

                        notes:
                          resolvedGoal.notes ??
                          "",
                      });

                      setEditErrors(
                        {},
                      );

                      setCurrentView(
                        "edit",
                      );
                    }}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Edit3 className="h-4.5 w-4.5" />

                    Edit goal
                  </button>

                  {resolvedGoal.status !==
                  "completed" ? (
                    <button
                      type="button"
                      onClick={
                        handlePauseResume
                      }
                      disabled={
                        isSubmitting
                      }
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      {resolvedGoal.status ===
                      "paused" ? (
                        <>
                          <PlayCircle className="h-4.5 w-4.5" />

                          Resume goal
                        </>
                      ) : (
                        <>
                          <PauseCircle className="h-4.5 w-4.5" />

                          Pause goal
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                {resolvedGoal.status !==
                "completed" ? (
                  <button
                    type="button"
                    onClick={
                      handleMarkCompleted
                    }
                    disabled={
                      isSubmitting
                    }
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />

                    Mark goal completed
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentView(
                      "delete",
                    )
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                >
                  <Trash2 className="h-4.5 w-4.5" />

                  Delete goal
                </button>
              </div>
            ) : null}

            {currentView ===
            "contribute" ? (
              <form
                onSubmit={
                  handleContributionSubmit
                }
                className="space-y-5"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Add contribution
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Record money added
                    toward this savings
                    goal.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-950">
                    Contribution amount
                  </span>

                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={
                        contributionAmount
                      }
                      onChange={(
                        event,
                      ) => {
                        setContributionAmount(
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        );

                        setContributionError(
                          null,
                        );
                      }}
                      placeholder="100.00"
                      className={[
                        "min-h-12 w-full rounded-2xl border bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20",
                        contributionError
                          ? "border-rose-400 focus:border-rose-500"
                          : "border-slate-200 focus:border-emerald-500",
                      ].join(
                        " ",
                      )}
                    />
                  </div>

                  {contributionError ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      {
                        contributionError
                      }
                    </p>
                  ) : null}
                </label>

                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-sm font-bold text-slate-950">
                    After contribution
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {formatCurrency(
                      resolvedGoal.currentAmount +
                        parseCurrencyValue(
                          contributionAmount,
                        ),
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    toward{" "}
                    {formatCurrency(
                      resolvedGoal.targetAmount,
                    )}
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentView(
                        "overview",
                      )
                    }
                    className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-4.5 w-4.5" />

                    Add contribution
                  </button>
                </div>
              </form>
            ) : null}

            {currentView ===
            "edit" ? (
              <form
                onSubmit={
                  handleEditSubmit
                }
                className="space-y-5"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Edit goal
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Update the goal
                    target, date, or
                    details.
                  </p>
                </div>

                <EditField
                  label="Goal name"
                  error={
                    editErrors.name
                  }
                >
                  <input
                    type="text"
                    value={
                      editFormState.name
                    }
                    onChange={(
                      event,
                    ) =>
                      updateEditField(
                        "name",
                        event.target.value,
                      )
                    }
                    className={getInputClassName(
                      Boolean(
                        editErrors.name,
                      ),
                    )}
                  />
                </EditField>

                <EditField
                  label="Target amount"
                  error={
                    editErrors.targetAmount
                  }
                >
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        editFormState.targetAmount
                      }
                      onChange={(
                        event,
                      ) =>
                        updateEditField(
                          "targetAmount",
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        )
                      }
                      className={`${getInputClassName(
                        Boolean(
                          editErrors.targetAmount,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </EditField>

                <EditField
                  label="Target date"
                  hint="Optional"
                  error={
                    editErrors.targetDate
                  }
                >
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="date"
                      value={
                        editFormState.targetDate
                      }
                      onChange={(
                        event,
                      ) =>
                        updateEditField(
                          "targetDate",
                          event.target.value,
                        )
                      }
                      className={`${getInputClassName(
                        Boolean(
                          editErrors.targetDate,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </EditField>

                <EditField
                  label="Notes"
                  hint="Optional"
                >
                  <textarea
                    rows={
                      4
                    }
                    value={
                      editFormState.notes
                    }
                    onChange={(
                      event,
                    ) =>
                      updateEditField(
                        "notes",
                        event.target.value,
                      )
                    }
                    className={`${getInputClassName(
                      false,
                    )} min-h-28 resize-none py-3`}
                  />
                </EditField>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentView(
                        "overview",
                      )
                    }
                    className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting
                    }
                    className="min-h-11 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : "Save changes"}
                  </button>
                </div>
              </form>
            ) : null}

            {currentView ===
            "delete" ? (
              <div className="space-y-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <Trash2 className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Delete this goal?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    This will permanently
                    remove{" "}
                    <span className="font-semibold text-slate-700">
                      {
                        resolvedGoal.name
                      }
                    </span>
                    . This action cannot
                    be undone.
                  </p>
                </div>

                <div className="rounded-[22px] border border-rose-100 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-800">
                    {formatCurrency(
                      resolvedGoal.currentAmount,
                    )}{" "}
                    currently tracked
                  </p>

                  <p className="mt-1 text-xs leading-5 text-rose-600">
                    Deleting the goal
                    removes its tracked
                    progress from CASE
                    Budget.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentView(
                        "overview",
                      )
                    }
                    className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Keep goal
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDelete
                    }
                    disabled={
                      isSubmitting
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700"
                  >
                    <Trash2 className="h-4.5 w-4.5" />

                    {isSubmitting
                      ? "Archiving..."
                      : "Delete goal"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

type GoalStatProps = {
  label: string;
  value: string;
};

function GoalStat({
  label,
  value,
}: GoalStatProps) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

type EditFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children:
    React.ReactNode;
};

function EditField({
  label,
  hint,
  error,
  children,
}: EditFieldProps) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-950">
          {label}
        </span>

        {hint ? (
          <span className="text-xs text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>

      {children}

      {error ? (
        <p className="mt-2 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : null}
    </label>
  );
}

function getInputClassName(
  hasError:
    boolean,
) {
  return [
    "min-h-12 w-full rounded-2xl border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400",
    "focus:ring-2 focus:ring-emerald-500/20",
    hasError
      ? "border-rose-400 focus:border-rose-500"
      : "border-slate-200 focus:border-emerald-500",
  ].join(
    " ",
  );
}

function sanitizeCurrencyInput(
  value:
    string,
) {
  const normalized =
    value
      .replace(
        /,/g,
        "",
      )
      .replace(
        /[^\d.]/g,
        "",
      );

  const [
    wholePart,
    ...decimalParts
  ] =
    normalized.split(
      ".",
    );

  if (
    decimalParts.length ===
    0
  ) {
    return wholePart;
  }

  return `${wholePart}.${decimalParts
    .join(
      "",
    )
    .slice(
      0,
      2,
    )}`;
}

function parseCurrencyValue(
  value:
    string,
) {
  if (
    !value.trim()
  ) {
    return 0;
  }

  const parsedValue =
    Number(
      value.replace(
        /,/g,
        "",
      ),
    );

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : 0;
}

function formatCurrency(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}

function formatDate(
  value:
    string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    },
  ).format(
    date,
  );
}