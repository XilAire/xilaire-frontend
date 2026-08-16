"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  PayCycleExtraCashStrategy,
  PayCyclePlanningPreferences,
} from "@/types/pay-cycle";

export type PayCyclePreferencesPanelProps = {
  preferences:
    PayCyclePlanningPreferences;
  defaultPreferences?:
    PayCyclePlanningPreferences;
  title?: string;
  description?: string;
  isSaving?: boolean;
  isResetting?: boolean;
  disabled?: boolean;
  showHeader?: boolean;
  onSave: (
    preferences:
      PayCyclePlanningPreferences,
  ) =>
    | void
    | Promise<void>;
  onReset?: () =>
    | void
    | Promise<void>;
  onCancel?: () => void;
};

type ValidationErrors = Partial<
  Record<
    keyof PayCyclePlanningPreferences,
    string
  >
>;

export default function PayCyclePreferencesPanel({
  preferences,
  defaultPreferences,
  title =
    "Planning Preferences",
  description =
    "Control how CASE Budget assigns bills and protects cash across upcoming paychecks.",
  isSaving = false,
  isResetting = false,
  disabled = false,
  showHeader = true,
  onSave,
  onReset,
  onCancel,
}: PayCyclePreferencesPanelProps) {
  const [
    draft,
    setDraft,
  ] =
    useState<PayCyclePlanningPreferences>(
      () =>
        normalizePreferences(
          preferences,
        ),
    );

  const [
    validationErrors,
    setValidationErrors,
  ] =
    useState<ValidationErrors>(
      {},
    );

  const [
    submitError,
    setSubmitError,
  ] = useState<
    string | null
  >(
    null,
  );

  const [
    isSubmittingLocally,
    setIsSubmittingLocally,
  ] = useState(
    false,
  );

  const [
    isResettingLocally,
    setIsResettingLocally,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      setDraft(
        normalizePreferences(
          preferences,
        ),
      );

      setValidationErrors(
        {},
      );

      setSubmitError(
        null,
      );
    },
    [
      preferences,
    ],
  );

  const normalizedSavedPreferences =
    useMemo(
      () =>
        normalizePreferences(
          preferences,
        ),
      [
        preferences,
      ],
    );

  const hasChanges =
    useMemo(
      () =>
        !arePreferencesEqual(
          draft,
          normalizedSavedPreferences,
        ),
      [
        draft,
        normalizedSavedPreferences,
      ],
    );

  const splitAllocationTotal =
    draft.extraCashDebtPercentage +
    draft.extraCashSavingsPercentage;

  const resolvedIsSaving =
    isSaving ||
    isSubmittingLocally;

  const resolvedIsResetting =
    isResetting ||
    isResettingLocally;

  const controlsDisabled =
    disabled ||
    resolvedIsSaving ||
    resolvedIsResetting;

  function updatePreference<
    Key extends keyof PayCyclePlanningPreferences,
  >(
    key: Key,
    value:
      PayCyclePlanningPreferences[Key],
  ) {
    setDraft(
      (
        currentDraft,
      ) => ({
        ...currentDraft,
        [key]:
          value,
      }),
    );

    setValidationErrors(
      (
        currentErrors,
      ) => {
        if (
          !currentErrors[
            key
          ]
        ) {
          return currentErrors;
        }

        const nextErrors = {
          ...currentErrors,
        };

        delete nextErrors[
          key
        ];

        return nextErrors;
      },
    );

    setSubmitError(
      null,
    );
  }

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedDraft =
      normalizePreferences(
        draft,
      );

    const errors =
      validatePreferences(
        normalizedDraft,
      );

    if (
      Object.keys(
        errors,
      ).length >
      0
    ) {
      setValidationErrors(
        errors,
      );

      return;
    }

    setValidationErrors(
      {},
    );

    setSubmitError(
      null,
    );

    setIsSubmittingLocally(
      true,
    );

    try {
      await onSave(
        normalizedDraft,
      );
    } catch (
      error
    ) {
      setSubmitError(
        getErrorMessage(
          error,
          "Unable to save planning preferences.",
        ),
      );
    } finally {
      setIsSubmittingLocally(
        false,
      );
    }
  }

  function handleDiscard() {
    setDraft(
      normalizedSavedPreferences,
    );

    setValidationErrors(
      {},
    );

    setSubmitError(
      null,
    );

    onCancel?.();
  }

  async function handleReset() {
    setSubmitError(
      null,
    );

    if (
      onReset
    ) {
      setIsResettingLocally(
        true,
      );

      try {
        await onReset();
      } catch (
        error
      ) {
        setSubmitError(
          getErrorMessage(
            error,
            "Unable to reset planning preferences.",
          ),
        );
      } finally {
        setIsResettingLocally(
          false,
        );
      }

      return;
    }

    setDraft(
      normalizePreferences(
        defaultPreferences ??
        normalizedSavedPreferences,
      ),
    );

    setValidationErrors(
      {},
    );

    setSubmitError(
      null,
    );
  }

  return (
    <section
      aria-labelledby="pay-cycle-preferences-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      {showHeader ? (
        <PreferencesHeader
          title={
            title
          }
          description={
            description
          }
          hasChanges={
            hasChanges
          }
        />
      ) : null}

      <form
        onSubmit={
          handleSubmit
        }
      >
        <div className="space-y-5 p-4 sm:p-5">
          <PreferenceSection
            title="Cash protection"
            description="Protect money from bill recommendations so the account keeps a usable cushion."
            icon={
              <ReserveIcon />
            }
          >
            <CurrencyField
              id="minimum-cash-reserve"
              label="Minimum cash reserve"
              description="CASE Budget will keep at least this amount unallocated whenever possible."
              value={
                draft.minimumCashReserve
              }
              error={
                validationErrors.minimumCashReserve
              }
              disabled={
                controlsDisabled
              }
              onChange={(
                value,
              ) =>
                updatePreference(
                  "minimumCashReserve",
                  value,
                )
              }
            />
          </PreferenceSection>

          <PreferenceSection
            title="Bill assignment rules"
            description="Choose how urgent, critical, partial, and automatic payments should be handled."
            icon={
              <RulesIcon />
            }
          >
            <div className="grid gap-3">
              <PreferenceSwitch
                id="allow-partial-bill-funding"
                label="Allow partial bill funding"
                description="Reserve part of a bill when the current paycheck cannot cover the full amount."
                checked={
                  draft.allowPartialBillFunding
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "allowPartialBillFunding",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="prioritize-past-due-bills"
                label="Fund past-due bills first"
                description="Place overdue obligations ahead of bills that have not reached their due date."
                checked={
                  draft.prioritizePastDueBills
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "prioritizePastDueBills",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="critical-bills-override-priority"
                label="Let critical bills override normal priority"
                description="Housing, utilities, insurance, and other critical obligations can move ahead of normal bills."
                checked={
                  draft.criticalBillsOverridePriority
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "criticalBillsOverridePriority",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="prioritize-autopay-bills"
                label="Prioritize upcoming autopay bills"
                description="Give additional urgency to automatic payments scheduled before the following paycheck."
                checked={
                  draft.prioritizeAutopayBills
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "prioritizeAutopayBills",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="prioritize-minimum-debt-payments"
                label="Prioritize minimum debt payments"
                description="Fund required minimum payments before optional extra debt payments."
                checked={
                  draft.prioritizeMinimumDebtPayments
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "prioritizeMinimumDebtPayments",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="prioritize-critical-services"
                label="Prioritize critical services"
                description="Give housing, utilities, insurance, transportation, and other essential obligations higher priority."
                checked={
                  draft.prioritizeCriticalServices
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "prioritizeCriticalServices",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="use-current-account-balance"
                label="Use current account balance"
                description="Include available money already in the deposit account when calculating bill coverage."
                checked={
                  draft.useCurrentAccountBalance
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "useCurrentAccountBalance",
                    checked,
                  )
                }
              />

              <PreferenceSwitch
                id="include-pending-income"
                label="Include pending income"
                description="Allow eligible pending deposits to influence projected paycheck plans."
                checked={
                  draft.includePendingIncome
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePreference(
                    "includePendingIncome",
                    checked,
                  )
                }
              />
            </div>
          </PreferenceSection>

          <PreferenceSection
            title="Planning horizon"
            description="Control how many future paychecks and how many days of upcoming bills the planner should consider."
            icon={
              <CalendarIcon />
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                id="look-ahead-pay-periods"
                label="Pay periods to project"
                description="Number of upcoming paychecks included when distributing bills."
                value={
                  draft.lookAheadPayPeriods
                }
                minimum={
                  1
                }
                maximum={
                  24
                }
                step={
                  1
                }
                suffix="periods"
                error={
                  validationErrors.lookAheadPayPeriods
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  value,
                ) =>
                  updatePreference(
                    "lookAheadPayPeriods",
                    value,
                  )
                }
              />

              <NumberField
                id="planning-window-days"
                label="Days to include after payday"
                description="Bills due inside this window can be assigned to the current paycheck."
                value={
                  draft.planningWindowDays
                }
                minimum={
                  0
                }
                maximum={
                  365
                }
                step={
                  1
                }
                suffix="days"
                error={
                  validationErrors.planningWindowDays ??
                  validationErrors.billPlanningWindowDays
                }
                disabled={
                  controlsDisabled
                }
                onChange={(
                  value,
                ) => {
                  updatePreference(
                    "planningWindowDays",
                    value,
                  );

                  updatePreference(
                    "billPlanningWindowDays",
                    value,
                  );
                }}
              />
            </div>
          </PreferenceSection>

          <PreferenceSection
            title="Extra cash strategy"
            description="Decide what the planner recommends after bills and the protected reserve are covered."
            icon={
              <AllocationIcon />
            }
          >
            <ExtraCashStrategySelector
              value={
                draft.extraCashStrategy
              }
              disabled={
                controlsDisabled
              }
              onChange={(
                value,
              ) =>
                updatePreference(
                  "extraCashStrategy",
                  value,
                )
              }
            />

            {draft.extraCashStrategy ===
            "split" ? (
              <div className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    id="extra-cash-debt-percentage"
                    label="Debt allocation"
                    description="Percentage of extra cash recommended for debt."
                    value={
                      draft.extraCashDebtPercentage
                    }
                    minimum={
                      0
                    }
                    maximum={
                      100
                    }
                    step={
                      1
                    }
                    suffix="%"
                    error={
                      validationErrors.extraCashDebtPercentage
                    }
                    disabled={
                      controlsDisabled
                    }
                    onChange={(
                      value,
                    ) =>
                      updatePreference(
                        "extraCashDebtPercentage",
                        value,
                      )
                    }
                  />

                  <NumberField
                    id="extra-cash-savings-percentage"
                    label="Savings allocation"
                    description="Percentage of extra cash recommended for savings."
                    value={
                      draft.extraCashSavingsPercentage
                    }
                    minimum={
                      0
                    }
                    maximum={
                      100
                    }
                    step={
                      1
                    }
                    suffix="%"
                    error={
                      validationErrors.extraCashSavingsPercentage
                    }
                    disabled={
                      controlsDisabled
                    }
                    onChange={(
                      value,
                    ) =>
                      updatePreference(
                        "extraCashSavingsPercentage",
                        value,
                      )
                    }
                  />
                </div>

                <div
                  className={[
                    "mt-4 flex items-center justify-between gap-4 rounded-xl border px-3 py-3 text-xs font-bold",
                    splitAllocationTotal ===
                    100
                      ? "border-[color-mix(in_srgb,var(--success)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface-default))] text-[var(--success)]"
                      : "border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_7%,var(--surface-default))] text-[var(--warning)]",
                  ].join(
                    " ",
                  )}
                >
                  <span>
                    Total allocation
                  </span>

                  <span>
                    {
                      splitAllocationTotal
                    }
                    %
                  </span>
                </div>
              </div>
            ) : null}
          </PreferenceSection>

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface-muted))] p-4"
            >
              <span className="mt-0.5 shrink-0 text-[var(--danger)]">
                <AlertIcon />
              </span>

              <p className="text-sm font-semibold leading-6 text-[var(--danger)]">
                {
                  submitError
                }
              </p>
            </div>
          ) : null}
        </div>

        <PreferencesFooter
          hasChanges={
            hasChanges
          }
          isSaving={
            resolvedIsSaving
          }
          isResetting={
            resolvedIsResetting
          }
          disabled={
            disabled
          }
          onDiscard={
            handleDiscard
          }
          onReset={
            handleReset
          }
        />
      </form>
    </section>
  );
}

type PreferencesHeaderProps = {
  title: string;
  description: string;
  hasChanges: boolean;
};

function PreferencesHeader({
  title,
  description,
  hasChanges,
}: PreferencesHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <SettingsIcon />
        </div>

        <div className="min-w-0">
          <h2
            id="pay-cycle-preferences-title"
            className="text-base font-bold text-[var(--text-primary)]"
          >
            {title}
          </h2>

          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      {hasChanges ? (
        <span className="inline-flex min-h-8 items-center self-start rounded-full bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] px-3 text-xs font-bold text-[var(--warning)] sm:self-auto">
          Unsaved changes
        </span>
      ) : (
        <span className="inline-flex min-h-8 items-center self-start rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-3 text-xs font-bold text-[var(--success)] sm:self-auto">
          Saved
        </span>
      )}
    </header>
  );
}

function PreferenceSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-default)] text-[var(--primary)]">
          {icon}
        </div>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (
    checked: boolean,
  ) => void;
}) {
  return (
    <label
      htmlFor={
        id
      }
      className={[
        "flex cursor-pointer items-start gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 transition",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)]",
      ].join(
        " ",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>

      <span className="relative mt-0.5 shrink-0">
        <input
          id={
            id
          }
          type="checkbox"
          checked={
            checked
          }
          disabled={
            disabled
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .checked,
            )
          }
          className="peer sr-only"
        />

        <span className="block h-6 w-11 rounded-full bg-[var(--border-strong)] transition peer-checked:bg-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed" />

        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function CurrencyField({
  id,
  label,
  description,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  error?: string;
  disabled: boolean;
  onChange: (
    value: number,
  ) => void;
}) {
  return (
    <div>
      <label
        htmlFor={
          id
        }
        className="block text-sm font-bold text-[var(--text-primary)]"
      >
        {label}
      </label>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>

      <div className="relative mt-3">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-[var(--text-muted)]">
          $
        </span>

        <input
          id={
            id
          }
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={
            Number.isFinite(
              value,
            )
              ? value
              : 0
          }
          disabled={
            disabled
          }
          aria-invalid={
            Boolean(
              error,
            )
          }
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          onChange={(
            event,
          ) =>
            onChange(
              parseNumberInput(
                event.target
                  .value,
              ),
            )
          }
          className={[
            "h-12 w-full rounded-xl border bg-[var(--surface-default)] pl-8 pr-4 text-sm font-bold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-[var(--danger)] focus:ring-[var(--danger)]"
              : "border-[var(--border-default)] focus:border-[var(--primary)] focus:ring-[var(--primary)]",
          ].join(
            " ",
          )}
        />
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs font-semibold text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NumberField({
  id,
  label,
  description,
  value,
  minimum,
  maximum,
  step,
  suffix,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  suffix: string;
  error?: string;
  disabled: boolean;
  onChange: (
    value: number,
  ) => void;
}) {
  return (
    <div>
      <label
        htmlFor={
          id
        }
        className="block text-sm font-bold text-[var(--text-primary)]"
      >
        {label}
      </label>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>

      <div className="relative mt-3">
        <input
          id={
            id
          }
          type="number"
          inputMode="numeric"
          min={
            minimum
          }
          max={
            maximum
          }
          step={
            step
          }
          value={
            Number.isFinite(
              value,
            )
              ? value
              : 0
          }
          disabled={
            disabled
          }
          aria-invalid={
            Boolean(
              error,
            )
          }
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          onChange={(
            event,
          ) =>
            onChange(
              parseNumberInput(
                event.target
                  .value,
              ),
            )
          }
          className={[
            "h-12 w-full rounded-xl border bg-[var(--surface-default)] px-4 pr-16 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
            error
              ? "border-[var(--danger)] focus:ring-[var(--danger)]"
              : "border-[var(--border-default)] focus:border-[var(--primary)] focus:ring-[var(--primary)]",
          ].join(
            " ",
          )}
        />

        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-bold text-[var(--text-muted)]">
          {suffix}
        </span>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs font-semibold text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ExtraCashStrategySelector({
  value,
  disabled,
  onChange,
}: {
  value:
    PayCycleExtraCashStrategy;
  disabled: boolean;
  onChange: (
    value:
      PayCycleExtraCashStrategy,
  ) => void;
}) {
  const options:
    {
      value:
        PayCycleExtraCashStrategy;
      label:
        string;
      description:
        string;
      icon:
        ReactNode;
    }[] = [
      {
        value:
          "keep-available",
        label:
          "Keep available",
        description:
          "Leave extra cash unassigned for flexible spending and future needs.",
        icon:
          <WalletIcon />,
      },
      {
        value:
          "debt",
        label:
          "Recommend debt",
        description:
          "Recommend extra payments toward the active debt-payoff strategy.",
        icon:
          <DebtIcon />,
      },
      {
        value:
          "savings",
        label:
          "Recommend savings",
        description:
          "Recommend contributions toward active savings goals.",
        icon:
          <SavingsIcon />,
      },
      {
        value:
          "split",
        label:
          "Split debt and savings",
        description:
          "Divide extra cash between debt payoff and savings goals.",
        icon:
          <SplitIcon />,
      },
    ];

  return (
    <div
      role="radiogroup"
      aria-label="Extra cash strategy"
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map(
        (
          option,
        ) => {
          const isSelected =
            value ===
            option.value;

          return (
            <label
              key={
                option.value
              }
              className={[
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-[var(--border-default)] hover:bg-[var(--surface-hover)]",
                isSelected
                  ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-default))]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-default)]",
              ].join(
                " ",
              )}
            >
              <input
                type="radio"
                name="extra-cash-strategy"
                value={
                  option.value
                }
                checked={
                  isSelected
                }
                disabled={
                  disabled
                }
                onChange={() =>
                  onChange(
                    option.value,
                  )
                }
                className="sr-only"
              />

              <span
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  isSelected
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                ].join(
                  " ",
                )}
              >
                {
                  option.icon
                }
              </span>

              <span className="min-w-0">
                <span
                  className={[
                    "block text-sm font-bold",
                    isSelected
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-primary)]",
                  ].join(
                    " ",
                  )}
                >
                  {
                    option.label
                  }
                </span>

                <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
                  {
                    option.description
                  }
                </span>
              </span>
            </label>
          );
        },
      )}
    </div>
  );
}

function PreferencesFooter({
  hasChanges,
  isSaving,
  isResetting,
  disabled,
  onDiscard,
  onReset,
}: {
  hasChanges: boolean;
  isSaving: boolean;
  isResetting: boolean;
  disabled: boolean;
  onDiscard: () => void;
  onReset: () => void;
}) {
  return (
    <footer className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <button
        type="button"
        onClick={
          onReset
        }
        disabled={
          disabled ||
          isSaving ||
          isResetting
        }
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isResetting ? (
          <SpinnerIcon />
        ) : (
          <ResetIcon />
        )}

        {isResetting
          ? "Resetting..."
          : "Reset defaults"}
      </button>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={
            onDiscard
          }
          disabled={
            disabled ||
            isSaving ||
            isResetting ||
            !hasChanges
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard changes
        </button>

        <button
          type="submit"
          disabled={
            disabled ||
            isSaving ||
            isResetting ||
            !hasChanges
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <SpinnerIcon />
          ) : (
            <SaveIcon />
          )}

          {isSaving
            ? "Saving..."
            : "Save preferences"}
        </button>
      </div>
    </footer>
  );
}

function normalizePreferences(
  preferences:
    PayCyclePlanningPreferences,
): PayCyclePlanningPreferences {
  const planningWindowDays =
    normalizeNonNegativeWholeNumber(
      preferences.planningWindowDays ??
      preferences.billPlanningWindowDays,
    );

  return {
    minimumCashReserve:
      normalizeMoney(
        preferences.minimumCashReserve,
      ),

    prioritizePastDueBills:
      Boolean(
        preferences.prioritizePastDueBills,
      ),
    prioritizeAutopayBills:
      Boolean(
        preferences.prioritizeAutopayBills,
      ),
    prioritizeMinimumDebtPayments:
      Boolean(
        preferences.prioritizeMinimumDebtPayments,
      ),
    prioritizeCriticalServices:
      Boolean(
        preferences.prioritizeCriticalServices,
      ),
    criticalBillsOverridePriority:
      Boolean(
        preferences.criticalBillsOverridePriority,
      ),

    allowPartialBillFunding:
      Boolean(
        preferences.allowPartialBillFunding,
      ),
    useCurrentAccountBalance:
      Boolean(
        preferences.useCurrentAccountBalance,
      ),
    includePendingIncome:
      Boolean(
        preferences.includePendingIncome,
      ),

    lookAheadPayPeriods:
      Math.max(
        1,
        normalizeWholeNumber(
          preferences.lookAheadPayPeriods,
        ),
      ),
    planningWindowDays,
    billPlanningWindowDays:
      planningWindowDays,

    extraCashStrategy:
      isExtraCashStrategy(
        preferences.extraCashStrategy,
      )
        ? preferences.extraCashStrategy
        : "keep-available",
    extraCashDebtPercentage:
      normalizeWholeNumber(
        preferences.extraCashDebtPercentage,
      ),
    extraCashSavingsPercentage:
      normalizeWholeNumber(
        preferences.extraCashSavingsPercentage,
      ),

    criticalBillIds:
      normalizeStringList(
        preferences.criticalBillIds,
      ),
    lowPriorityBillIds:
      normalizeStringList(
        preferences.lowPriorityBillIds,
      ),
  };
}

function validatePreferences(
  preferences:
    PayCyclePlanningPreferences,
): ValidationErrors {
  const errors:
    ValidationErrors = {};

  if (
    preferences.minimumCashReserve <
    0
  ) {
    errors.minimumCashReserve =
      "The minimum cash reserve cannot be negative.";
  }

  if (
    preferences.minimumCashReserve >
    1_000_000
  ) {
    errors.minimumCashReserve =
      "Enter a cash reserve below $1,000,000.";
  }

  if (
    preferences.lookAheadPayPeriods <
      1 ||
    preferences.lookAheadPayPeriods >
      24
  ) {
    errors.lookAheadPayPeriods =
      "The planner must include between 1 and 24 pay periods.";
  }

  if (
    preferences.planningWindowDays <
      0 ||
    preferences.planningWindowDays >
      365
  ) {
    errors.planningWindowDays =
      "The planning window must be between 0 and 365 days.";
  }

  if (
    preferences.billPlanningWindowDays !==
    preferences.planningWindowDays
  ) {
    errors.billPlanningWindowDays =
      "The legacy and current planning windows must remain synchronized.";
  }

  if (
    preferences.extraCashStrategy ===
    "split"
  ) {
    if (
      preferences.extraCashDebtPercentage <
        0 ||
      preferences.extraCashDebtPercentage >
        100
    ) {
      errors.extraCashDebtPercentage =
        "Debt allocation must be between 0% and 100%.";
    }

    if (
      preferences.extraCashSavingsPercentage <
        0 ||
      preferences.extraCashSavingsPercentage >
        100
    ) {
      errors.extraCashSavingsPercentage =
        "Savings allocation must be between 0% and 100%.";
    }

    const total =
      preferences.extraCashDebtPercentage +
      preferences.extraCashSavingsPercentage;

    if (
      total !==
      100
    ) {
      errors.extraCashDebtPercentage =
        "Debt and savings allocations must total 100%.";

      errors.extraCashSavingsPercentage =
        "Debt and savings allocations must total 100%.";
    }
  }

  return errors;
}

function arePreferencesEqual(
  first:
    PayCyclePlanningPreferences,
  second:
    PayCyclePlanningPreferences,
) {
  return (
    first.minimumCashReserve ===
      second.minimumCashReserve &&
    first.prioritizePastDueBills ===
      second.prioritizePastDueBills &&
    first.prioritizeAutopayBills ===
      second.prioritizeAutopayBills &&
    first.prioritizeMinimumDebtPayments ===
      second.prioritizeMinimumDebtPayments &&
    first.prioritizeCriticalServices ===
      second.prioritizeCriticalServices &&
    first.criticalBillsOverridePriority ===
      second.criticalBillsOverridePriority &&
    first.allowPartialBillFunding ===
      second.allowPartialBillFunding &&
    first.useCurrentAccountBalance ===
      second.useCurrentAccountBalance &&
    first.includePendingIncome ===
      second.includePendingIncome &&
    first.lookAheadPayPeriods ===
      second.lookAheadPayPeriods &&
    first.planningWindowDays ===
      second.planningWindowDays &&
    first.billPlanningWindowDays ===
      second.billPlanningWindowDays &&
    first.extraCashStrategy ===
      second.extraCashStrategy &&
    first.extraCashDebtPercentage ===
      second.extraCashDebtPercentage &&
    first.extraCashSavingsPercentage ===
      second.extraCashSavingsPercentage &&
    areStringListsEqual(
      first.criticalBillIds,
      second.criticalBillIds,
    ) &&
    areStringListsEqual(
      first.lowPriorityBillIds,
      second.lowPriorityBillIds,
    )
  );
}

function isExtraCashStrategy(
  value: string,
): value is PayCycleExtraCashStrategy {
  return (
    value ===
      "keep-available" ||
    value ===
      "debt" ||
    value ===
      "savings" ||
    value ===
      "split"
  );
}

function parseNumberInput(
  value: string,
) {
  if (
    value.trim() ===
    ""
  ) {
    return 0;
  }

  const parsedValue =
    Number(
      value,
    );

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : 0;
}

function normalizeMoney(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value *
        100,
    ) /
    100
  );
}

function normalizeWholeNumber(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.round(
    value,
  );
}

function normalizeNonNegativeWholeNumber(
  value: number,
) {
  return Math.max(
    0,
    normalizeWholeNumber(
      value,
    ),
  );
}

function normalizeStringList(
  values: string[],
) {
  return Array.from(
    new Set(
      values
        .map(
          (
            value,
          ) =>
            value.trim(),
        )
        .filter(
          Boolean,
        ),
    ),
  );
}

function areStringListsEqual(
  first: string[],
  second: string[],
) {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  return first.every(
    (
      value,
      index,
    ) =>
      value ===
      second[
        index
      ],
  );
}

function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof
      Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

function ReserveIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
    </svg>
  );
}

function RulesIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="m3 6 1 1 2-2" />
      <path d="m3 12 1 1 2-2" />
      <path d="m3 18 1 1 2-2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="18"
      height="18"
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
        height="16"
        rx="2"
      />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function AllocationIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v18" />
      <path d="m7 8 5-5 5 5" />
      <path d="m7 16 5 5 5-5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h.01" />
    </svg>
  );
}

function DebtIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M6 3h12l2 4H4l2-4Z" />
      <path d="M6 7v11" />
      <path d="M10 7v11" />
      <path d="M14 7v11" />
      <path d="M18 7v11" />
      <path d="M4 18h16" />
      <path d="M3 21h18" />
    </svg>
  );
}

function SavingsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v5a4 4 0 0 1-4 4H3" />
      <path d="M12 3v5a4 4 0 0 0 4 4h5" />
      <path d="m6 9-3 3 3 3" />
      <path d="m18 9 3 3-3 3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3h12l2 2v16H5Z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 15h8" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  );
}
