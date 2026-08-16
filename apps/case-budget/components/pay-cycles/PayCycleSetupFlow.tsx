"use client";

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  usePayCycles,
} from "@/components/providers/PayCyclesProvider";

import type {
  CreatePayCycleData,
  PayCycleAmountType,
  PayCycleCustomRule,
  PayCycleDayAdjustment,
  PayCycleFrequency,
  PayCycleIncomeType,
  PayCycleSemimonthlyRule,
} from "@/types/pay-cycle";

export type PayCycleSetupFlowProps = {
  title?: string;
  description?: string;
  initialValues?: Partial<
    CreatePayCycleData
  >;
  onCancel?: () => void;
  onComplete?: (
    payCycleId: string,
  ) => void;
};

type SetupStepId =
  | "source"
  | "frequency"
  | "amount"
  | "schedule"
  | "account"
  | "preferences"
  | "review";

type SetupStep = {
  id: SetupStepId;
  label: string;
  description: string;
};

type SetupFormState = {
  name: string;
  employerName: string;
  incomeType: PayCycleIncomeType;

  frequency: PayCycleFrequency;
  amountType: PayCycleAmountType;

  expectedNetAmount: string;
  minimumExpectedAmount: string;
  maximumExpectedAmount: string;

  startDate: string;
  nextPayDate: string;
  endDate: string;

  accountId: string;

  firstDayOfMonth: string;
  secondDayOfMonth: string;

  customIntervalCount: string;
  customIntervalUnit:
    | "day"
    | "week"
    | "month";

  dayAdjustment: PayCycleDayAdjustment;

  includeInBillPlanning: boolean;
  includeInBudgetIncome: boolean;

  minimumCashReserve: string;
  allowPartialBillFunding: boolean;
  useCurrentAccountBalance: boolean;
  prioritizePastDueBills: boolean;
  prioritizeAutopayBills: boolean;
  prioritizeMinimumDebtPayments: boolean;
  prioritizeCriticalServices: boolean;

  notes: string;
};

const setupSteps: SetupStep[] = [
  {
    id: "source",
    label: "Income Source",
    description:
      "Name the paycheck or recurring income source.",
  },
  {
    id: "frequency",
    label: "Pay Frequency",
    description:
      "Tell CASE Budget how often this income arrives.",
  },
  {
    id: "amount",
    label: "Take-Home Pay",
    description:
      "Enter the expected net amount available after deductions.",
  },
  {
    id: "schedule",
    label: "Pay Schedule",
    description:
      "Set the first and next expected payday.",
  },
  {
    id: "account",
    label: "Deposit Account",
    description:
      "Choose where the paycheck is expected to arrive.",
  },
  {
    id: "preferences",
    label: "Planning Rules",
    description:
      "Choose how paycheck-to-bill recommendations should work.",
  },
  {
    id: "review",
    label: "Review",
    description:
      "Confirm the pay cycle before saving.",
  },
];

export default function PayCycleSetupFlow({
  title = "Set Up a Pay Cycle",
  description =
    "Add a paycheck schedule so CASE Budget can recommend which bills should be funded from each pay period.",
  initialValues,
  onCancel,
  onComplete,
}: PayCycleSetupFlowProps) {
  const {
    accounts,
  } = useAccounts();

  const {
    addPayCycle,
    preferences,
    setPreferences,
  } = usePayCycles();

  const eligibleAccounts =
    useMemo(
      () =>
        accounts.filter(
          (
            account,
          ) =>
            account.classification ===
              "asset" &&
            [
              "checking",
              "savings",
              "cash",
            ].includes(
              account.type,
            ),
        ),
      [
        accounts,
      ],
    );

  const [
    currentStepIndex,
    setCurrentStepIndex,
  ] = useState(
    0,
  );

  const [
    formState,
    setFormState,
  ] = useState<SetupFormState>(
    () =>
      createInitialFormState(
        initialValues,
        preferences,
      ),
  );

  const [
    errors,
    setErrors,
  ] = useState<string[]>([]);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );

  const currentStep =
    setupSteps[
      currentStepIndex
    ];

  const progressPercentage =
    (
      (
        currentStepIndex +
        1
      ) /
      setupSteps.length
    ) *
    100;

  function updateField<
    Key extends keyof SetupFormState,
  >(
    key: Key,
    value: SetupFormState[Key],
  ) {
    setFormState(
      (
        currentState,
      ) => ({
        ...currentState,
        [key]:
          value,
      }),
    );

    setErrors(
      [],
    );
  }

  function handleNext() {
    const stepErrors =
      validateStep(
        currentStep.id,
        formState,
      );

    if (
      stepErrors.length >
      0
    ) {
      setErrors(
        stepErrors,
      );

      return;
    }

    setErrors(
      [],
    );

    setCurrentStepIndex(
      (
        currentIndex,
      ) =>
        Math.min(
          setupSteps.length -
            1,
          currentIndex +
            1,
        ),
    );
  }

  function handleBack() {
    setErrors(
      [],
    );

    setCurrentStepIndex(
      (
        currentIndex,
      ) =>
        Math.max(
          0,
          currentIndex -
            1,
        ),
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const validationErrors =
      validateAllSteps(
        formState,
      );

    if (
      validationErrors.length >
      0
    ) {
      setErrors(
        validationErrors,
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      const createdPayCycle =
        await addPayCycle(
          createPayCycleInput(
            formState,
          ),
        );

      await setPreferences({
        minimumCashReserve:
          parseCurrencyInput(
            formState.minimumCashReserve,
          ),
        allowPartialBillFunding:
          formState.allowPartialBillFunding,
        useCurrentAccountBalance:
          formState.useCurrentAccountBalance,
        prioritizePastDueBills:
          formState.prioritizePastDueBills,
        prioritizeAutopayBills:
          formState.prioritizeAutopayBills,
        prioritizeMinimumDebtPayments:
          formState.prioritizeMinimumDebtPayments,
        prioritizeCriticalServices:
          formState.prioritizeCriticalServices,
      });

      onComplete?.(
        createdPayCycle.id,
      );
    } catch (
      error
    ) {
      setErrors([
        error instanceof
        Error
          ? error.message
          : "Unable to save the pay cycle.",
      ]);
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <header className="border-b border-[var(--border-subtle)] px-4 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <PaycheckIcon />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {title}
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-4 text-xs font-bold text-[var(--text-muted)]">
            <span>
              Step{" "}
              {currentStepIndex +
                1}{" "}
              of{" "}
              {
                setupSteps.length
              }
            </span>

            <span>
              {
                currentStep.label
              }
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
              style={{
                width:
                  `${progressPercentage}%`,
              }}
            />
          </div>
        </div>
      </header>

      <form
        onSubmit={
          handleSubmit
        }
      >
        <div className="grid min-h-[520px] lg:grid-cols-[240px_minmax(0,1fr)]">
          <SetupStepNavigation
            currentStepIndex={
              currentStepIndex
            }
          />

          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-3xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
                  {
                    currentStep.label
                  }
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {
                    currentStep.description
                  }
                </h2>
              </div>

              {errors.length >
              0 ? (
                <ValidationMessage
                  errors={
                    errors
                  }
                />
              ) : null}

              <div className="mt-6">
                {currentStep.id ===
                "source" ? (
                  <IncomeSourceStep
                    formState={
                      formState
                    }
                    updateField={
                      updateField
                    }
                  />
                ) : null}

                {currentStep.id ===
                "frequency" ? (
                  <FrequencyStep
                    formState={
                      formState
                    }
                    updateField={
                      updateField
                    }
                  />
                ) : null}

                {currentStep.id ===
                "amount" ? (
                  <AmountStep
                    formState={
                      formState
                    }
                    updateField={
                      updateField
                    }
                  />
                ) : null}

                {currentStep.id ===
                "schedule" ? (
                  <ScheduleStep
                    formState={
                      formState
                    }
                    updateField={
                      updateField
                    }
                  />
                ) : null}

                {currentStep.id ===
                "account" ? (
                  <AccountStep
                    formState={
                      formState
                    }
                    updateField={
                      updateField
                    }
                    accounts={
                      eligibleAccounts
                    }
                  />
                ) : null}

                {currentStep.id ===
                "preferences" ? (
                  <PreferencesStep
                    formState={
                      formState
                    }
                    updateField={
                      updateField
                    }
                  />
                ) : null}

                {currentStep.id ===
                "review" ? (
                  <ReviewStep
                    formState={
                      formState
                    }
                    accountName={
                      eligibleAccounts.find(
                        (
                          account,
                        ) =>
                          account.id ===
                          formState.accountId,
                      )?.name
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex gap-3">
            {onCancel ? (
              <button
                type="button"
                onClick={
                  onCancel
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Cancel
              </button>
            ) : null}

            {currentStepIndex >
            0 ? (
              <button
                type="button"
                onClick={
                  handleBack
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <ArrowLeftIcon />

                Back
              </button>
            ) : null}
          </div>

          {currentStep.id ===
          "review" ? (
            <button
              type="submit"
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              {isSubmitting
                ? "Saving..."
                : "Save Pay Cycle"}

              <CheckIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={
                handleNext
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              Continue

              <ArrowRightIcon />
            </button>
          )}
        </footer>
      </form>
    </section>
  );
}

function SetupStepNavigation({
  currentStepIndex,
}: {
  currentStepIndex: number;
}) {
  return (
    <aside className="hidden border-r border-[var(--border-subtle)] bg-[var(--surface-muted)] p-5 lg:block">
      <ol className="space-y-3">
        {setupSteps.map(
          (
            step,
            index,
          ) => {
            const isCurrent =
              index ===
              currentStepIndex;

            const isComplete =
              index <
              currentStepIndex;

            return (
              <li
                key={
                  step.id
                }
                className={[
                  "flex items-start gap-3 rounded-xl p-3",
                  isCurrent
                    ? "bg-[var(--surface-default)] shadow-sm"
                    : "",
                ].join(
                  " ",
                )}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                    isComplete
                      ? "bg-[var(--success)] text-white"
                      : isCurrent
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                  ].join(
                    " ",
                  )}
                >
                  {isComplete ? (
                    <CheckIcon />
                  ) : (
                    index +
                    1
                  )}
                </span>

                <div>
                  <p
                    className={[
                      "text-xs font-bold",
                      isCurrent
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      step.label
                    }
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-[var(--text-muted)]">
                    {
                      step.description
                    }
                  </p>
                </div>
              </li>
            );
          },
        )}
      </ol>
    </aside>
  );
}

function IncomeSourceStep({
  formState,
  updateField,
}: StepProps) {
  return (
    <div className="space-y-5">
      <FormField
        label="Pay cycle name"
        description="Use a recognizable name such as Primary Paycheck or VA Benefits."
        required
      >
        <input
          value={
            formState.name
          }
          onChange={(
            event,
          ) =>
            updateField(
              "name",
              event.target
                .value,
            )
          }
          placeholder="Primary Paycheck"
          className={
            inputClassName
          }
        />
      </FormField>

      <FormField
        label="Employer or payer"
        description="Optional. This can be an employer, agency, client, or benefit provider."
      >
        <input
          value={
            formState.employerName
          }
          onChange={(
            event,
          ) =>
            updateField(
              "employerName",
              event.target
                .value,
            )
          }
          placeholder="Employer name"
          className={
            inputClassName
          }
        />
      </FormField>

      <FormField
        label="Income type"
        required
      >
        <select
          value={
            formState.incomeType
          }
          onChange={(
            event,
          ) =>
            updateField(
              "incomeType",
              event.target
                .value as PayCycleIncomeType,
            )
          }
          className={
            inputClassName
          }
        >
          <option value="salary">
            Salary
          </option>

          <option value="hourly">
            Hourly
          </option>

          <option value="commission">
            Commission
          </option>

          <option value="benefit">
            Benefit
          </option>

          <option value="pension">
            Pension
          </option>

          <option value="retirement">
            Retirement
          </option>

          <option value="business">
            Business income
          </option>

          <option value="other">
            Other
          </option>
        </select>
      </FormField>
    </div>
  );
}

function FrequencyStep({
  formState,
  updateField,
}: StepProps) {
  const frequencies:
    {
      value:
        PayCycleFrequency;
      label: string;
      description: string;
    }[] = [
      {
        value:
          "weekly",
        label:
          "Weekly",
        description:
          "Every seven days.",
      },
      {
        value:
          "biweekly",
        label:
          "Biweekly",
        description:
          "Every two weeks.",
      },
      {
        value:
          "semimonthly",
        label:
          "Semimonthly",
        description:
          "Twice each month.",
      },
      {
        value:
          "monthly",
        label:
          "Monthly",
        description:
          "Once each month.",
      },
      {
        value:
          "quarterly",
        label:
          "Quarterly",
        description:
          "Every three months.",
      },
      {
        value:
          "custom",
        label:
          "Custom",
        description:
          "A custom interval.",
      },
      {
        value:
          "irregular",
        label:
          "Irregular",
        description:
          "No fixed schedule.",
      },
    ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {frequencies.map(
          (
            frequency,
          ) => {
            const isSelected =
              formState.frequency ===
              frequency.value;

            return (
              <button
                key={
                  frequency.value
                }
                type="button"
                onClick={() =>
                  updateField(
                    "frequency",
                    frequency.value,
                  )
                }
                className={[
                  "rounded-2xl border p-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isSelected
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))]"
                    : "border-[var(--border-subtle)] bg-[var(--surface-muted)] hover:bg-[var(--surface-default)]",
                ].join(
                  " ",
                )}
              >
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {
                    frequency.label
                  }
                </p>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  {
                    frequency.description
                  }
                </p>
              </button>
            );
          },
        )}
      </div>

      {formState.frequency ===
      "semimonthly" ? (
        <div className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
          <FormField
            label="First pay day"
            description="Day of the month."
            required
          >
            <input
              type="number"
              min="1"
              max="31"
              value={
                formState.firstDayOfMonth
              }
              onChange={(
                event,
              ) =>
                updateField(
                  "firstDayOfMonth",
                  event.target
                    .value,
                )
              }
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Second pay day"
            description="Day of the month."
            required
          >
            <input
              type="number"
              min="1"
              max="31"
              value={
                formState.secondDayOfMonth
              }
              onChange={(
                event,
              ) =>
                updateField(
                  "secondDayOfMonth",
                  event.target
                    .value,
                )
              }
              className={
                inputClassName
              }
            />
          </FormField>
        </div>
      ) : null}

      {formState.frequency ===
      "custom" ? (
        <div className="grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
          <FormField
            label="Interval"
            required
          >
            <input
              type="number"
              min="1"
              value={
                formState.customIntervalCount
              }
              onChange={(
                event,
              ) =>
                updateField(
                  "customIntervalCount",
                  event.target
                    .value,
                )
              }
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Interval unit"
            required
          >
            <select
              value={
                formState.customIntervalUnit
              }
              onChange={(
                event,
              ) =>
                updateField(
                  "customIntervalUnit",
                  event.target
                    .value as SetupFormState["customIntervalUnit"],
                )
              }
              className={
                inputClassName
              }
            >
              <option value="day">
                Days
              </option>

              <option value="week">
                Weeks
              </option>

              <option value="month">
                Months
              </option>
            </select>
          </FormField>
        </div>
      ) : null}
    </div>
  );
}

function AmountStep({
  formState,
  updateField,
}: StepProps) {
  return (
    <div className="space-y-5">
      <FormField
        label="Amount pattern"
        required
      >
        <select
          value={
            formState.amountType
          }
          onChange={(
            event,
          ) =>
            updateField(
              "amountType",
              event.target
                .value as PayCycleAmountType,
            )
          }
          className={
            inputClassName
          }
        >
          <option value="fixed">
            Fixed
          </option>

          <option value="estimated">
            Estimated
          </option>

          <option value="variable">
            Variable
          </option>
        </select>
      </FormField>

      <FormField
        label="Expected take-home pay"
        description="Enter the net amount expected to reach the deposit account."
        required
      >
        <CurrencyInput
          value={
            formState.expectedNetAmount
          }
          onChange={(
            value,
          ) =>
            updateField(
              "expectedNetAmount",
              value,
            )
          }
        />
      </FormField>

      {formState.amountType !==
      "fixed" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Minimum expected"
          >
            <CurrencyInput
              value={
                formState.minimumExpectedAmount
              }
              onChange={(
                value,
              ) =>
                updateField(
                  "minimumExpectedAmount",
                  value,
                )
              }
            />
          </FormField>

          <FormField
            label="Maximum expected"
          >
            <CurrencyInput
              value={
                formState.maximumExpectedAmount
              }
              onChange={(
                value,
              ) =>
                updateField(
                  "maximumExpectedAmount",
                  value,
                )
              }
            />
          </FormField>
        </div>
      ) : null}
    </div>
  );
}

function ScheduleStep({
  formState,
  updateField,
}: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Pay cycle start date"
          required
        >
          <input
            type="date"
            value={
              formState.startDate
            }
            onChange={(
              event,
            ) =>
              updateField(
                "startDate",
                event.target
                  .value,
              )
            }
            className={
              inputClassName
            }
          />
        </FormField>

        <FormField
          label="Next expected payday"
          required
        >
          <input
            type="date"
            value={
              formState.nextPayDate
            }
            onChange={(
              event,
            ) =>
              updateField(
                "nextPayDate",
                event.target
                  .value,
              )
            }
            className={
              inputClassName
            }
          />
        </FormField>
      </div>

      <FormField
        label="Optional end date"
        description="Leave blank for an ongoing pay cycle."
      >
        <input
          type="date"
          value={
            formState.endDate
          }
          onChange={(
            event,
          ) =>
            updateField(
              "endDate",
              event.target
                .value,
            )
          }
          className={
            inputClassName
          }
        />
      </FormField>

      <FormField
        label="Weekend payday handling"
        description="Choose how a scheduled Saturday or Sunday payday should move."
        required
      >
        <select
          value={
            formState.dayAdjustment
          }
          onChange={(
            event,
          ) =>
            updateField(
              "dayAdjustment",
              event.target
                .value as PayCycleDayAdjustment,
            )
          }
          className={
            inputClassName
          }
        >
          <option value="previous-business-day">
            Previous business day
          </option>

          <option value="next-business-day">
            Next business day
          </option>

          <option value="none">
            Do not adjust
          </option>
        </select>
      </FormField>
    </div>
  );
}

function AccountStep({
  formState,
  updateField,
  accounts,
}: StepProps & {
  accounts:
    ReturnType<
      typeof useAccounts
    >["accounts"];
}) {
  return (
    <div className="space-y-5">
      <FormField
        label="Deposit account"
        description="The planner can use this account's available balance when recommending bill payments."
      >
        <select
          value={
            formState.accountId
          }
          onChange={(
            event,
          ) =>
            updateField(
              "accountId",
              event.target
                .value,
            )
          }
          className={
            inputClassName
          }
        >
          <option value="">
            No account selected
          </option>

          {accounts.map(
            (
              account,
            ) => (
              <option
                key={
                  account.id
                }
                value={
                  account.id
                }
              >
                {account.name}
                {" — "}
                {formatCurrency(
                  account.availableBalance ??
                    account.balance,
                )}
              </option>
            ),
          )}
        </select>
      </FormField>

      {accounts.length ===
      0 ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-muted))] p-4">
          <p className="text-sm font-bold text-[var(--text-primary)]">
            No eligible deposit accounts
          </p>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Add a checking, savings, or
            cash account later. The pay
            cycle can still be created
            without one.
          </p>
        </div>
      ) : null}

      <ToggleCard
        label="Include this income in budget planning"
        description="Use this paycheck as available income in monthly budget calculations."
        checked={
          formState.includeInBudgetIncome
        }
        onChange={(
          checked,
        ) =>
          updateField(
            "includeInBudgetIncome",
            checked,
          )
        }
      />

      <ToggleCard
        label="Use this income for bill planning"
        description="Generate paycheck-to-bill recommendations for this schedule."
        checked={
          formState.includeInBillPlanning
        }
        onChange={(
          checked,
        ) =>
          updateField(
            "includeInBillPlanning",
            checked,
          )
        }
      />
    </div>
  );
}

function PreferencesStep({
  formState,
  updateField,
}: StepProps) {
  return (
    <div className="space-y-5">
      <FormField
        label="Minimum cash reserve"
        description="CASE Budget will try to leave at least this amount unallocated."
        required
      >
        <CurrencyInput
          value={
            formState.minimumCashReserve
          }
          onChange={(
            value,
          ) =>
            updateField(
              "minimumCashReserve",
              value,
            )
          }
        />
      </FormField>

      <div className="grid gap-3">
        <ToggleCard
          label="Use current account balance"
          description="Include available cash already in the deposit account."
          checked={
            formState.useCurrentAccountBalance
          }
          onChange={(
            checked,
          ) =>
            updateField(
              "useCurrentAccountBalance",
              checked,
            )
          }
        />

        <ToggleCard
          label="Allow partial bill funding"
          description="Use remaining paycheck funds even when the full bill cannot be covered."
          checked={
            formState.allowPartialBillFunding
          }
          onChange={(
            checked,
          ) =>
            updateField(
              "allowPartialBillFunding",
              checked,
            )
          }
        />

        <ToggleCard
          label="Prioritize past-due bills"
          description="Move overdue obligations to the top of the recommendation list."
          checked={
            formState.prioritizePastDueBills
          }
          onChange={(
            checked,
          ) =>
            updateField(
              "prioritizePastDueBills",
              checked,
            )
          }
        />

        <ToggleCard
          label="Prioritize autopay bills"
          description="Reserve money before an automatic draft occurs."
          checked={
            formState.prioritizeAutopayBills
          }
          onChange={(
            checked,
          ) =>
            updateField(
              "prioritizeAutopayBills",
              checked,
            )
          }
        />

        <ToggleCard
          label="Prioritize minimum debt payments"
          description="Protect minimum required payments before lower-priority bills."
          checked={
            formState.prioritizeMinimumDebtPayments
          }
          onChange={(
            checked,
          ) =>
            updateField(
              "prioritizeMinimumDebtPayments",
              checked,
            )
          }
        />

        <ToggleCard
          label="Prioritize critical services"
          description="Protect housing, utilities, insurance, and other essential obligations."
          checked={
            formState.prioritizeCriticalServices
          }
          onChange={(
            checked,
          ) =>
            updateField(
              "prioritizeCriticalServices",
              checked,
            )
          }
        />
      </div>

      <FormField
        label="Notes"
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
              event.target
                .value,
            )
          }
          rows={
            4
          }
          placeholder="Optional notes about this income source."
          className={
            inputClassName
          }
        />
      </FormField>
    </div>
  );
}

function ReviewStep({
  formState,
  accountName,
}: {
  formState: SetupFormState;
  accountName?: string;
}) {
  return (
    <div className="space-y-5">
      <ReviewSection
        title="Income source"
      >
        <ReviewRow
          label="Name"
          value={
            formState.name
          }
        />

        <ReviewRow
          label="Employer or payer"
          value={
            formState.employerName ||
            "Not provided"
          }
        />

        <ReviewRow
          label="Income type"
          value={
            formatEnumLabel(
              formState.incomeType,
            )
          }
        />
      </ReviewSection>

      <ReviewSection
        title="Schedule"
      >
        <ReviewRow
          label="Frequency"
          value={
            formatEnumLabel(
              formState.frequency,
            )
          }
        />

        <ReviewRow
          label="Expected take-home"
          value={
            formatCurrency(
              parseCurrencyInput(
                formState.expectedNetAmount,
              ),
            )
          }
        />

        <ReviewRow
          label="Next payday"
          value={
            formatDate(
              formState.nextPayDate,
            )
          }
        />

        <ReviewRow
          label="Deposit account"
          value={
            accountName ??
            "No account selected"
          }
        />
      </ReviewSection>

      <ReviewSection
        title="Planning"
      >
        <ReviewRow
          label="Cash reserve"
          value={
            formatCurrency(
              parseCurrencyInput(
                formState.minimumCashReserve,
              ),
            )
          }
        />

        <ReviewRow
          label="Bill planning"
          value={
            formState.includeInBillPlanning
              ? "Enabled"
              : "Disabled"
          }
        />

        <ReviewRow
          label="Budget income"
          value={
            formState.includeInBudgetIncome
              ? "Included"
              : "Excluded"
          }
        />

        <ReviewRow
          label="Partial funding"
          value={
            formState.allowPartialBillFunding
              ? "Allowed"
              : "Not allowed"
          }
        />
      </ReviewSection>
    </div>
  );
}

type StepProps = {
  formState: SetupFormState;
  updateField: <
    Key extends keyof SetupFormState,
  >(
    key: Key,
    value: SetupFormState[Key],
  ) => void;
};

function FormField({
  label,
  description,
  required = false,
  children,
}: {
  label: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[var(--text-primary)]">
        {label}

        {required ? (
          <span className="ml-1 text-[var(--danger)]">
            *
          </span>
        ) : null}
      </span>

      {description ? (
        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      ) : null}

      <span className="mt-2 block">
        {children}
      </span>
    </label>
  );
}

function CurrencyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold text-[var(--text-muted)]">
        $
      </span>

      <input
        type="number"
        min="0"
        step="0.01"
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        className={`${inputClassName} pl-8`}
      />
    </div>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 transition hover:bg-[var(--surface-default)]">
      <span>
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
      />
    </label>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
      <header className="bg-[var(--surface-muted)] px-4 py-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </h3>
      </header>

      <dl className="divide-y divide-[var(--border-subtle)]">
        {children}
      </dl>
    </section>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium text-[var(--text-muted)]">
        {label}
      </dt>

      <dd className="text-sm font-bold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

function ValidationMessage({
  errors,
}: {
  errors: string[];
}) {
  return (
    <div
      role="alert"
      className="mt-5 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface-muted))] p-4"
    >
      <p className="text-sm font-bold text-[var(--danger)]">
        Please review the following:
      </p>

      <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--text-muted)]">
        {errors.map(
          (
            error,
          ) => (
            <li
              key={
                error
              }
            >
              •{" "}
              {error}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function createInitialFormState(
  initialValues:
    | Partial<
        CreatePayCycleData
      >
    | undefined,
  preferences:
    ReturnType<
      typeof usePayCycles
    >["preferences"],
): SetupFormState {
  const today =
    getTodayDateString();

  return {
    name:
      initialValues?.name ??
      "",
    employerName:
      initialValues?.employerName ??
      "",
    incomeType:
      initialValues?.incomeType ??
      "salary",

    frequency:
      initialValues?.frequency ??
      "biweekly",
    amountType:
      initialValues?.amountType ??
      "fixed",

    expectedNetAmount:
      initialValues?.expectedNetAmount !==
      undefined
        ? String(
            initialValues.expectedNetAmount,
          )
        : "",
    minimumExpectedAmount:
      initialValues?.minimumExpectedAmount !==
      undefined
        ? String(
            initialValues.minimumExpectedAmount,
          )
        : "",
    maximumExpectedAmount:
      initialValues?.maximumExpectedAmount !==
      undefined
        ? String(
            initialValues.maximumExpectedAmount,
          )
        : "",

    startDate:
      initialValues?.startDate ??
      today,
    nextPayDate:
      initialValues?.nextPayDate ??
      today,
    endDate:
      initialValues?.endDate ??
      "",

    accountId:
      initialValues?.accountId ??
      "",

    firstDayOfMonth:
      String(
        initialValues?.semimonthlyRule
          ?.firstDayOfMonth ??
          1,
      ),
    secondDayOfMonth:
      String(
        initialValues?.semimonthlyRule
          ?.secondDayOfMonth ??
          15,
      ),

    customIntervalCount:
      String(
        initialValues?.customRule
          ?.intervalCount ??
          1,
      ),
    customIntervalUnit:
      initialValues?.customRule
        ?.intervalUnit ??
      "week",

    dayAdjustment:
      initialValues?.dayAdjustment ??
      "previous-business-day",

    includeInBillPlanning:
      initialValues?.includeInBillPlanning ??
      true,
    includeInBudgetIncome:
      initialValues?.includeInBudgetIncome ??
      true,

    minimumCashReserve:
      String(
        preferences.minimumCashReserve,
      ),
    allowPartialBillFunding:
      preferences.allowPartialBillFunding,
    useCurrentAccountBalance:
      preferences.useCurrentAccountBalance,
    prioritizePastDueBills:
      preferences.prioritizePastDueBills,
    prioritizeAutopayBills:
      preferences.prioritizeAutopayBills,
    prioritizeMinimumDebtPayments:
      preferences.prioritizeMinimumDebtPayments,
    prioritizeCriticalServices:
      preferences.prioritizeCriticalServices,

    notes:
      initialValues?.notes ??
      "",
  };
}

function createPayCycleInput(
  formState: SetupFormState,
): CreatePayCycleData {
  const semimonthlyRule:
    PayCycleSemimonthlyRule | undefined =
      formState.frequency ===
      "semimonthly"
        ? {
            firstDayOfMonth:
              Number(
                formState.firstDayOfMonth,
              ),
            secondDayOfMonth:
              Number(
                formState.secondDayOfMonth,
              ),
          }
        : undefined;

  const customRule:
    PayCycleCustomRule | undefined =
      formState.frequency ===
      "custom"
        ? {
            intervalCount:
              Number(
                formState.customIntervalCount,
              ),
            intervalUnit:
              formState.customIntervalUnit,
          }
        : undefined;

  return {
    name:
      formState.name.trim(),
    employerName:
      normalizeOptionalText(
        formState.employerName,
      ),
    incomeType:
      formState.incomeType,

    frequency:
      formState.frequency,
    amountType:
      formState.amountType,

    expectedNetAmount:
      parseCurrencyInput(
        formState.expectedNetAmount,
      ),
    minimumExpectedAmount:
      parseOptionalCurrencyInput(
        formState.minimumExpectedAmount,
      ),
    maximumExpectedAmount:
      parseOptionalCurrencyInput(
        formState.maximumExpectedAmount,
      ),

    startDate:
      formState.startDate,
    nextPayDate:
      formState.nextPayDate,
    endDate:
      formState.endDate ||
      undefined,

    accountId:
      formState.accountId ||
      undefined,

    semimonthlyRule,
    customRule,

    dayAdjustment:
      formState.dayAdjustment,

    includeInBillPlanning:
      formState.includeInBillPlanning,
    includeInBudgetIncome:
      formState.includeInBudgetIncome,

    notes:
      normalizeOptionalText(
        formState.notes,
      ),
  };
}

function validateStep(
  step:
    SetupStepId,
  formState:
    SetupFormState,
) {
  const errors:
    string[] = [];

  if (
    step ===
    "source"
  ) {
    if (
      formState.name.trim() ===
      ""
    ) {
      errors.push(
        "Enter a pay cycle name.",
      );
    }
  }

  if (
    step ===
    "frequency"
  ) {
    if (
      formState.frequency ===
      "semimonthly"
    ) {
      const firstDay =
        Number(
          formState.firstDayOfMonth,
        );

      const secondDay =
        Number(
          formState.secondDayOfMonth,
        );

      if (
        !Number.isInteger(
          firstDay,
        ) ||
        firstDay <
          1 ||
        firstDay >
          31
      ) {
        errors.push(
          "Enter a valid first semimonthly pay day.",
        );
      }

      if (
        !Number.isInteger(
          secondDay,
        ) ||
        secondDay <
          1 ||
        secondDay >
          31
      ) {
        errors.push(
          "Enter a valid second semimonthly pay day.",
        );
      }

      if (
        firstDay >=
        secondDay
      ) {
        errors.push(
          "The first semimonthly pay day must occur before the second.",
        );
      }
    }

    if (
      formState.frequency ===
      "custom"
    ) {
      const intervalCount =
        Number(
          formState.customIntervalCount,
        );

      if (
        !Number.isInteger(
          intervalCount,
        ) ||
        intervalCount <=
          0
      ) {
        errors.push(
          "Enter a valid custom interval.",
        );
      }
    }
  }

  if (
    step ===
    "amount"
  ) {
    const expectedAmount =
      parseCurrencyInput(
        formState.expectedNetAmount,
      );

    if (
      expectedAmount <=
      0
    ) {
      errors.push(
        "Enter an expected take-home amount greater than zero.",
      );
    }

    const minimumAmount =
      parseOptionalCurrencyInput(
        formState.minimumExpectedAmount,
      );

    const maximumAmount =
      parseOptionalCurrencyInput(
        formState.maximumExpectedAmount,
      );

    if (
      minimumAmount !==
        undefined &&
      maximumAmount !==
        undefined &&
      minimumAmount >
        maximumAmount
    ) {
      errors.push(
        "The minimum expected amount cannot exceed the maximum.",
      );
    }
  }

  if (
    step ===
    "schedule"
  ) {
    if (
      !isDateString(
        formState.startDate,
      )
    ) {
      errors.push(
        "Select a valid pay cycle start date.",
      );
    }

    if (
      !isDateString(
        formState.nextPayDate,
      )
    ) {
      errors.push(
        "Select a valid next payday.",
      );
    }

    if (
      isDateString(
        formState.startDate,
      ) &&
      isDateString(
        formState.nextPayDate,
      ) &&
      formState.nextPayDate <
        formState.startDate
    ) {
      errors.push(
        "The next payday cannot occur before the pay cycle start date.",
      );
    }
  }

  if (
    step ===
    "preferences"
  ) {
    if (
      parseCurrencyInput(
        formState.minimumCashReserve,
      ) <
      0
    ) {
      errors.push(
        "The minimum cash reserve cannot be negative.",
      );
    }
  }

  return errors;
}

function validateAllSteps(
  formState:
    SetupFormState,
) {
  return setupSteps.flatMap(
    (
      step,
    ) =>
      validateStep(
        step.id,
        formState,
      ),
  );
}

function parseCurrencyInput(
  value: string,
) {
  const parsedValue =
    Number(
      value,
    );

  if (
    !Number.isFinite(
      parsedValue,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      parsedValue *
        100,
    ) /
    100
  );
}

function parseOptionalCurrencyInput(
  value: string,
) {
  if (
    value.trim() ===
    ""
  ) {
    return undefined;
  }

  return parseCurrencyInput(
    value,
  );
}

function normalizeOptionalText(
  value: string,
) {
  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function isDateString(
  value: string,
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value,
  );
}

function getTodayDateString() {
  const today =
    new Date();

  const year =
    String(
      today.getFullYear(),
    ).padStart(
      4,
      "0",
    );

  const month =
    String(
      today.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      today.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function formatCurrency(
  value: number,
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
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatDate(
  value: string,
) {
  if (
    !isDateString(
      value,
    )
  ) {
    return "Not set";
  }

  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    "en-US",
    {
      month:
        "long",
      day:
        "numeric",
      year:
        "numeric",
    },
  );
}

function formatEnumLabel(
  value: string,
) {
  return value
    .split(
      "-",
    )
    .map(
      (
        word,
      ) =>
        `${word
          .charAt(
            0,
          )
          .toUpperCase()}${word.slice(
          1,
        )}`,
    )
    .join(
      " ",
    );
}

const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]";

function PaycheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="M3 10h18" />
      <path d="M8 15h3" />
      <path d="M16 13v4" />
      <path d="M14 15h4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
