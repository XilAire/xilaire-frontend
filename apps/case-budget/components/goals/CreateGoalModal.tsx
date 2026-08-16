"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CircleDollarSign,
  Goal,
  Plus,
  X,
} from "lucide-react";

import {
  useGoals,
} from "@/components/providers/GoalsProvider";

type CreateGoalModalProps = {
  open: boolean;
  onClose: () => void;
};

type GoalFormState = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  notes: string;
};

type GoalFormErrors = {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  targetDate?: string;
};

const initialFormState: GoalFormState = {
  name: "",
  targetAmount: "",
  currentAmount: "",
  targetDate: "",
  notes: "",
};

export default function CreateGoalModal({
  open,
  onClose,
}: CreateGoalModalProps) {
  const {
    addGoal,
  } =
    useGoals();

  const [
    formState,
    setFormState,
  ] =
    useState<GoalFormState>(
      initialFormState,
    );

  const [
    errors,
    setErrors,
  ] =
    useState<GoalFormErrors>(
      {},
    );

  const [
    submitError,
    setSubmitError,
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

  const targetAmount =
    useMemo(
      () =>
        parseCurrencyValue(
          formState.targetAmount,
        ),
      [
        formState.targetAmount,
      ],
    );

  const currentAmount =
    useMemo(
      () =>
        parseCurrencyValue(
          formState.currentAmount,
        ),
      [
        formState.currentAmount,
      ],
    );

  const previewProgress =
    targetAmount > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              currentAmount /
              targetAmount
            ) * 100,
          ),
        )
      : 0;

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      setFormState(
        initialFormState,
      );

      setErrors(
        {},
      );

      setSubmitError(
        null,
      );

      setIsSubmitting(
        false,
      );
    },
    [
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
        event: KeyboardEvent,
      ) {
        if (
          event.key ===
            "Escape" &&
          !isSubmitting
        ) {
          onClose();
        }
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
      isSubmitting,
      onClose,
      open,
    ],
  );

  if (
    !open
  ) {
    return null;
  }

  function updateField(
    field:
      keyof GoalFormState,
    value:
      string,
  ) {
    setFormState(
      (
        currentState,
      ) => ({
        ...currentState,

        [field]:
          value,
      }),
    );

    setErrors(
      (
        currentErrors,
      ) => ({
        ...currentErrors,

        [field]:
          undefined,
      }),
    );

    setSubmitError(
      null,
    );
  }

  function validateForm() {
    const nextErrors:
      GoalFormErrors =
      {};

    const normalizedName =
      formState.name.trim();

    if (
      !normalizedName
    ) {
      nextErrors.name =
        "Enter a name for this savings goal.";
    }

    if (
      !formState.targetAmount.trim()
    ) {
      nextErrors.targetAmount =
        "Enter a target amount.";
    } else if (
      !Number.isFinite(
        targetAmount,
      ) ||
      targetAmount <= 0
    ) {
      nextErrors.targetAmount =
        "Target amount must be greater than $0.";
    }

    if (
      formState.currentAmount.trim()
    ) {
      if (
        !Number.isFinite(
          currentAmount,
        ) ||
        currentAmount < 0
      ) {
        nextErrors.currentAmount =
          "Starting amount cannot be negative.";
      }
    }

    if (
      formState.targetDate
    ) {
      const targetDate =
        new Date(
          `${formState.targetDate}T00:00:00`,
        );

      if (
        Number.isNaN(
          targetDate.getTime(),
        )
      ) {
        nextErrors.targetDate =
          "Choose a valid target date.";
      }
    }

    setErrors(
      nextErrors,
    );

    return (
      Object.keys(
        nextErrors,
      ).length ===
      0
    );
  }

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting ||
      !validateForm()
    ) {
      return;
    }

    setSubmitError(
      null,
    );

    setIsSubmitting(
      true,
    );

    try {
      const result =
        await addGoal({
          name:
            formState.name.trim(),

          targetAmount,

          currentAmount,

          targetDate:
            formState.targetDate ||
            undefined,

          notes:
            formState.notes.trim() ||
            undefined,

          status:
            "active",
        });

      if (
        !result.success
      ) {
        const nextErrors:
          GoalFormErrors =
          {};

        if (
          result.fieldErrors?.name
        ) {
          nextErrors.name =
            result.fieldErrors.name;
        }

        if (
          result.fieldErrors?.targetAmount
        ) {
          nextErrors.targetAmount =
            result.fieldErrors.targetAmount;
        }

        if (
          result.fieldErrors?.currentAmount
        ) {
          nextErrors.currentAmount =
            result.fieldErrors.currentAmount;
        }

        if (
          result.fieldErrors?.targetDate
        ) {
          nextErrors.targetDate =
            result.fieldErrors.targetDate;
        }

        setErrors(
          nextErrors,
        );

        setSubmitError(
          result.error,
        );

        return;
      }

      onClose();
    } catch (
      submitFailure
    ) {
      console.error(
        "[CASE Budget Goals] Create goal modal submission failed.",
        submitFailure,
      );

      setSubmitError(
        "CASE Budget could not create the goal. Please try again.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[1500]">
      <button
        type="button"
        aria-label="Close create goal dialog"
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
        aria-labelledby="create-goal-title"
        className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[30px] border-t border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
      >
        <form
          onSubmit={
            handleSubmit
          }
          className="flex max-h-[92vh] flex-col"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Goal className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="create-goal-title"
                  className="text-xl font-bold tracking-tight text-slate-950"
                >
                  Create savings goal
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Set a target and start tracking your progress.
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
              aria-label="Close create goal dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <FieldGroup
                label="Goal name"
                error={
                  errors.name
                }
              >
                <input
                  type="text"
                  value={
                    formState.name
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Emergency fund"
                  autoFocus
                  className={getInputClassName(
                    Boolean(
                      errors.name,
                    ),
                  )}
                />
              </FieldGroup>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup
                  label="Target amount"
                  error={
                    errors.targetAmount
                  }
                >
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.targetAmount
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "targetAmount",
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder="5,000"
                      className={`${getInputClassName(
                        Boolean(
                          errors.targetAmount,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup
                  label="Already saved"
                  hint="Optional"
                  error={
                    errors.currentAmount
                  }
                >
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.currentAmount
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "currentAmount",
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder="0"
                      className={`${getInputClassName(
                        Boolean(
                          errors.currentAmount,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>
              </div>

              <FieldGroup
                label="Target date"
                hint="Optional"
                error={
                  errors.targetDate
                }
              >
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="date"
                    value={
                      formState.targetDate
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "targetDate",
                        event.target.value,
                      )
                    }
                    className={`${getInputClassName(
                      Boolean(
                        errors.targetDate,
                      ),
                    )} pl-10`}
                  />
                </div>
              </FieldGroup>

              <FieldGroup
                label="Notes"
                hint="Optional"
              >
                <textarea
                  value={
                    formState.notes
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "notes",
                      event.target.value,
                    )
                  }
                  placeholder="What is this goal for?"
                  rows={
                    4
                  }
                  className={`${getInputClassName(
                    false,
                  )} min-h-28 resize-none py-3`}
                />
              </FieldGroup>

              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Starting progress
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Based on the amount already saved.
                    </p>
                  </div>

                  <span className="text-sm font-bold text-emerald-700">
                    {previewProgress.toFixed(
                      0,
                    )}
                    %
                  </span>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width]"
                    style={{
                      width: `${previewProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-4 text-xs text-slate-500">
                  <span>
                    {formatCurrency(
                      currentAmount,
                    )}{" "}
                    saved
                  </span>

                  <span>
                    {formatCurrency(
                      targetAmount,
                    )}{" "}
                    target
                  </span>
                </div>
              </div>
            </div>
          </div>

          {submitError ? (
            <div
              role="alert"
              className="mx-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:mx-6"
            >
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isSubmitting
              }
              className="min-h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4.5 w-4.5" />

              {isSubmitting
                ? "Creating..."
                : "Create goal"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

type FieldGroupProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

function FieldGroup({
  label,
  hint,
  error,
  children,
}: FieldGroupProps) {
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
  hasError: boolean,
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
  value: string,
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
  value: string,
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