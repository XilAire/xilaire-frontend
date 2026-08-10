"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useInvestments,
  type CreateInvestmentActivityData,
  type InvestmentActivityData,
  type InvestmentActivityType,
  type UpdateInvestmentActivityData,
} from "@/components/providers/InvestmentsProvider";

export type InvestmentActivityModalProps = {
  isOpen: boolean;

  activity?:
    InvestmentActivityData | null;

  defaultInvestmentAccountId?:
    string;

  defaultHoldingId?:
    string;

  onClose: () => void;

  onSaved?: (
    activity:
      InvestmentActivityData,
  ) => void;
};

type InvestmentActivityFormState = {
  investmentAccountId:
    string;

  holdingId:
    string;

  type:
    InvestmentActivityType;

  date:
    string;

  amount:
    string;

  quantity:
    string;

  pricePerUnit:
    string;

  fees:
    string;

  description:
    string;
};

type InvestmentActivityFormErrors =
  Partial<
    Record<
      keyof InvestmentActivityFormState,
      string
    >
  >;

const DEFAULT_FORM_STATE:
  InvestmentActivityFormState = {
    investmentAccountId:
      "",

    holdingId:
      "",

    type:
      "contribution",

    date:
      getTodayDateString(),

    amount:
      "",

    quantity:
      "",

    pricePerUnit:
      "",

    fees:
      "",

    description:
      "",
  };

export default function InvestmentActivityModal({
  isOpen,
  activity = null,
  defaultInvestmentAccountId,
  defaultHoldingId,
  onClose,
  onSaved,
}: InvestmentActivityModalProps) {
  const {
    investmentAccounts,
    holdings,
    addActivity,
    updateActivity,
  } = useInvestments();

  const [
    formState,
    setFormState,
  ] =
    useState<InvestmentActivityFormState>(
      DEFAULT_FORM_STATE,
    );

  const [
    errors,
    setErrors,
  ] =
    useState<InvestmentActivityFormErrors>(
      {},
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(
    false,
  );

  const isEditMode =
    Boolean(
      activity,
    );

  const availableHoldings =
    useMemo(
      () =>
        holdings
          .filter(
            (
              holding,
            ) =>
              holding.investmentAccountId ===
              formState.investmentAccountId,
          )
          .sort(
            (
              firstHolding,
              secondHolding,
            ) =>
              getHoldingLabel(
                firstHolding,
              ).localeCompare(
                getHoldingLabel(
                  secondHolding,
                ),
              ),
          ),
      [
        formState.investmentAccountId,
        holdings,
      ],
    );

  const selectedAccount =
    useMemo(
      () =>
        investmentAccounts.find(
          (
            account,
          ) =>
            account.id ===
            formState.investmentAccountId,
        ) ??
        null,
      [
        formState.investmentAccountId,
        investmentAccounts,
      ],
    );

  const selectedHolding =
    useMemo(
      () =>
        availableHoldings.find(
          (
            holding,
          ) =>
            holding.id ===
            formState.holdingId,
        ) ??
        null,
      [
        availableHoldings,
        formState.holdingId,
      ],
    );

  const activityPreview =
    useMemo(
      () =>
        createActivityPreview(
          formState,
        ),
      [
        formState,
      ],
    );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      if (
        activity
      ) {
        setFormState(
          createFormStateFromActivity(
            activity,
          ),
        );
      } else {
        const resolvedAccountId =
          resolveDefaultAccountId({
            investmentAccounts,
            holdings,
            defaultInvestmentAccountId,
            defaultHoldingId,
          });

        const resolvedHoldingId =
          resolveDefaultHoldingId({
            holdings,
            investmentAccountId:
              resolvedAccountId,
            defaultHoldingId,
          });

        setFormState({
          ...DEFAULT_FORM_STATE,

          investmentAccountId:
            resolvedAccountId,

          holdingId:
            resolvedHoldingId,

          date:
            getTodayDateString(),
        });
      }

      setErrors(
        {},
      );

      setIsSubmitting(
        false,
      );
    },
    [
      activity,
      defaultHoldingId,
      defaultInvestmentAccountId,
      holdings,
      investmentAccounts,
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleEscape(
        event:
          globalThis.KeyboardEvent,
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
        handleEscape,
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleEscape,
        );
      };
    },
    [
      isOpen,
      isSubmitting,
      onClose,
    ],
  );

  if (
    !isOpen
  ) {
    return null;
  }

  function updateField<
    FieldName extends keyof InvestmentActivityFormState,
  >(
    fieldName:
      FieldName,
    value:
      InvestmentActivityFormState[FieldName],
  ) {
    setFormState(
      (
        currentState,
      ) => {
        if (
          fieldName ===
          "investmentAccountId"
        ) {
          return {
            ...currentState,

            investmentAccountId:
              value as string,

            holdingId:
              "",
          };
        }

        return {
          ...currentState,

          [fieldName]:
            value,
        };
      },
    );

    setErrors(
      (
        currentErrors,
      ) => {
        if (
          !currentErrors[
            fieldName
          ]
        ) {
          return currentErrors;
        }

        const nextErrors = {
          ...currentErrors,
        };

        delete nextErrors[
          fieldName
        ];

        if (
          fieldName ===
          "investmentAccountId"
        ) {
          delete nextErrors.holdingId;
        }

        return nextErrors;
      },
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors =
      validateFormState({
        formState,
        investmentAccountIds:
          investmentAccounts.map(
            (
              account,
            ) =>
              account.id,
          ),
        holdings,
      });

    if (
      Object.keys(
        nextErrors,
      ).length >
      0
    ) {
      setErrors(
        nextErrors,
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      if (
        activity
      ) {
        const updates:
          UpdateInvestmentActivityData = {
            type:
              formState.type,

            date:
              formState.date,

            amount:
              parseCurrencyInput(
                formState.amount,
              ),

            quantity:
              parseOptionalNumberInput(
                formState.quantity,
              ),

            pricePerUnit:
              parseOptionalCurrencyInput(
                formState.pricePerUnit,
              ),

            fees:
              parseOptionalCurrencyInput(
                formState.fees,
              ),

            description:
              normalizeOptionalText(
                formState.description,
              ),
          };

        updateActivity(
          activity.id,
          updates,
        );

        onSaved?.({
          ...activity,
          ...updates,
          updatedAt:
            new Date().toISOString(),
        });
      } else {
        const input:
          CreateInvestmentActivityData = {
            investmentAccountId:
              formState.investmentAccountId,

            holdingId:
              formState.holdingId ||
              undefined,

            type:
              formState.type,

            date:
              formState.date,

            amount:
              parseCurrencyInput(
                formState.amount,
              ),

            quantity:
              parseOptionalNumberInput(
                formState.quantity,
              ),

            pricePerUnit:
              parseOptionalCurrencyInput(
                formState.pricePerUnit,
              ),

            fees:
              parseOptionalCurrencyInput(
                formState.fees,
              ),

            description:
              normalizeOptionalText(
                formState.description,
              ),
          };

        const newActivity =
          addActivity(
            input,
          );

        onSaved?.(
          newActivity,
        );
      }

      onClose();
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  function handleDialogKeyDown(
    event:
      KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      event.key !==
      "Tab"
    ) {
      return;
    }

    const dialog =
      event.currentTarget;

    const focusableElements =
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          [
            "button:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "textarea:not([disabled])",
            "[tabindex]:not([tabindex='-1'])",
          ].join(
            ",",
          ),
        ),
      );

    if (
      focusableElements.length ===
      0
    ) {
      return;
    }

    const firstElement =
      focusableElements[
        0
      ];

    const lastElement =
      focusableElements[
        focusableElements.length -
          1
      ];

    if (
      event.shiftKey &&
      document.activeElement ===
        firstElement
    ) {
      event.preventDefault();

      lastElement.focus();

      return;
    }

    if (
      !event.shiftKey &&
      document.activeElement ===
        lastElement
    ) {
      event.preventDefault();

      firstElement.focus();
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="investment-activity-modal-title"
        aria-describedby="investment-activity-modal-description"
        onKeyDown={
          handleDialogKeyDown
        }
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-h-[92vh] sm:max-w-4xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">
              Investments
            </p>

            <h2
              id="investment-activity-modal-title"
              className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
            >
              {isEditMode
                ? "Edit Investment Activity"
                : "Record Investment Activity"}
            </h2>

            <p
              id="investment-activity-modal-description"
              className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]"
            >
              Record contributions,
              withdrawals, trades,
              dividends, interest, fees,
              transfers, and adjustments.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isSubmitting
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close investment activity modal"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-6">
              <FormSection
                title="Activity Details"
                description="Choose the account, optional holding, activity type, and date."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Investment account"
                    required
                    error={
                      errors.investmentAccountId
                    }
                  >
                    <select
                      autoFocus
                      value={
                        formState.investmentAccountId
                      }
                      disabled={
                        isEditMode
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "investmentAccountId",
                          event.target.value,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.investmentAccountId,
                        ),
                      )}
                    >
                      <option value="">
                        Select an account
                      </option>

                      {investmentAccounts.map(
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
                            {account.institution
                              ? ` · ${account.institution}`
                              : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  <FormField
                    label="Holding"
                    error={
                      errors.holdingId
                    }
                  >
                    <select
                      value={
                        formState.holdingId
                      }
                      disabled={
                        isEditMode ||
                        !formState.investmentAccountId
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "holdingId",
                          event.target.value,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.holdingId,
                        ),
                      )}
                    >
                      <option value="">
                        No specific holding
                      </option>

                      {availableHoldings.map(
                        (
                          holding,
                        ) => (
                          <option
                            key={
                              holding.id
                            }
                            value={
                              holding.id
                            }
                          >
                            {getHoldingLabel(
                              holding,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  <FormField
                    label="Activity type"
                    required
                    error={
                      errors.type
                    }
                  >
                    <select
                      value={
                        formState.type
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "type",
                          event.target.value as InvestmentActivityType,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.type,
                        ),
                      )}
                    >
                      {getActivityTypeOptions().map(
                        (
                          option,
                        ) => (
                          <option
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </FormField>

                  <FormField
                    label="Activity date"
                    required
                    error={
                      errors.date
                    }
                  >
                    <input
                      type="date"
                      value={
                        formState.date
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "date",
                          event.target.value,
                        )
                      }
                      className={getInputClassName(
                        Boolean(
                          errors.date,
                        ),
                      )}
                    />
                  </FormField>
                </div>

                {selectedAccount ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
                    <SelectionSummary
                      label="Selected account"
                      value={
                        selectedAccount.name
                      }
                      detail={
                        selectedAccount.institution ??
                        formatAccountType(
                          selectedAccount.type,
                        )
                      }
                    />

                    <SelectionSummary
                      label="Selected holding"
                      value={
                        selectedHolding
                          ? getHoldingLabel(
                              selectedHolding,
                            )
                          : "No specific holding"
                      }
                      detail={
                        selectedHolding
                          ? formatHoldingType(
                              selectedHolding.type,
                            )
                          : "Activity applies to the account"
                      }
                    />
                  </div>
                ) : null}
              </FormSection>

              <FormSection
                title="Amount and Position"
                description="Enter the activity amount and optional position details."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField
                    label="Amount"
                    required
                    error={
                      errors.amount
                    }
                  >
                    <CurrencyInput
                      value={
                        formState.amount
                      }
                      hasError={
                        Boolean(
                          errors.amount,
                        )
                      }
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "amount",
                          value,
                        )
                      }
                    />
                  </FormField>

                  <FormField
                    label="Quantity"
                    error={
                      errors.quantity
                    }
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.quantity
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "quantity",
                          sanitizeNumberInput(
                            event.target.value,
                            6,
                          ),
                        )
                      }
                      placeholder="Optional"
                      className={getInputClassName(
                        Boolean(
                          errors.quantity,
                        ),
                      )}
                    />
                  </FormField>

                  <FormField
                    label="Price per unit"
                    error={
                      errors.pricePerUnit
                    }
                  >
                    <CurrencyInput
                      value={
                        formState.pricePerUnit
                      }
                      hasError={
                        Boolean(
                          errors.pricePerUnit,
                        )
                      }
                      allowEmpty
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "pricePerUnit",
                          value,
                        )
                      }
                    />
                  </FormField>

                  <FormField
                    label="Fees"
                    error={
                      errors.fees
                    }
                  >
                    <CurrencyInput
                      value={
                        formState.fees
                      }
                      hasError={
                        Boolean(
                          errors.fees,
                        )
                      }
                      allowEmpty
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "fees",
                          value,
                        )
                      }
                    />
                  </FormField>
                </div>

                <ActivityPreview
                  preview={
                    activityPreview
                  }
                  activityType={
                    formState.type
                  }
                />
              </FormSection>

              <FormSection
                title="Description"
                description="Add an optional memo for this investment activity."
              >
                <FormField
                  label="Description"
                  error={
                    errors.description
                  }
                >
                  <textarea
                    rows={
                      4
                    }
                    value={
                      formState.description
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "description",
                        event.target.value,
                      )
                    }
                    placeholder="Optional activity description"
                    className={[
                      getInputClassName(
                        Boolean(
                          errors.description,
                        ),
                      ),
                      "min-h-28 resize-y py-3",
                    ].join(
                      " ",
                    )}
                  />
                </FormField>
              </FormSection>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isSubmitting
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                investmentAccounts.length ===
                  0
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />

                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon />

                  {isEditMode
                    ? "Save Changes"
                    : "Record Activity"}
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

type ActivityPreviewData = {
  grossAmount:
    number;

  fees:
    number;

  netAmount:
    number;

  quantity:
    number;

  pricePerUnit:
    number;
};

function ActivityPreview({
  preview,
  activityType,
}: {
  preview:
    ActivityPreviewData;

  activityType:
    InvestmentActivityType;
}) {
  const netAmountTone =
    isPositiveCashFlowActivity(
      activityType,
    )
      ? "positive"
      : isNegativeCashFlowActivity(
          activityType,
        )
        ? "negative"
        : "neutral";

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:grid-cols-4">
      <PreviewMetric
        label="Gross amount"
        value={
          formatCurrency(
            preview.grossAmount,
          )
        }
      />

      <PreviewMetric
        label="Fees"
        value={
          formatCurrency(
            preview.fees,
          )
        }
      />

      <PreviewMetric
        label="Net impact"
        value={
          formatSignedCurrency(
            getSignedNetAmount(
              preview.netAmount,
              activityType,
            ),
          )
        }
        tone={
          netAmountTone
        }
      />

      <PreviewMetric
        label="Calculated value"
        value={
          preview.quantity >
            0 &&
          preview.pricePerUnit >
            0
            ? formatCurrency(
                preview.quantity *
                preview.pricePerUnit,
              )
            : "—"
        }
      />
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  tone = "neutral",
}: {
  label:
    string;

  value:
    string;

  tone?:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const valueClassName =
    tone ===
    "positive"
      ? "text-[var(--success)]"
      : tone ===
          "negative"
        ? "text-[var(--danger)]"
        : "text-[var(--text-primary)]";

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-bold",
          valueClassName,
        ].join(
          " ",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SelectionSummary({
  label,
  value,
  detail,
}: {
  label:
    string;

  value:
    string;

  detail:
    string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {detail}
      </p>
    </div>
  );
}

function CurrencyInput({
  value,
  hasError,
  allowEmpty = false,
  onChange,
}: {
  value:
    string;

  hasError:
    boolean;

  allowEmpty?:
    boolean;

  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-semibold text-[var(--text-muted)]">
        $
      </span>

      <input
        type="text"
        inputMode="decimal"
        value={
          value
        }
        onChange={(
          event,
        ) => {
          const nextValue =
            sanitizeNumberInput(
              event.target.value,
              2,
            );

          if (
            !allowEmpty &&
            nextValue ===
              ""
          ) {
            onChange(
              "",
            );

            return;
          }

          onChange(
            nextValue,
          );
        }}
        placeholder="0.00"
        className={[
          getInputClassName(
            hasError,
          ),
          "pl-7",
        ].join(
          " ",
        )}
      />
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-sm font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
        {description}
      </p>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function FormField({
  label,
  required = false,
  error,
  children,
}: {
  label:
    string;

  required?:
    boolean;

  error?:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-sm font-bold text-[var(--text-primary)]">
        {label}

        {required ? (
          <span className="text-[var(--danger)]">
            *
          </span>
        ) : null}
      </span>

      <span className="mt-2 block">
        {children}
      </span>

      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-[var(--danger)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function validateFormState({
  formState,
  investmentAccountIds,
  holdings,
}: {
  formState:
    InvestmentActivityFormState;

  investmentAccountIds:
    string[];

  holdings:
    ReturnType<
      typeof useInvestments
    >["holdings"];
}) {
  const nextErrors:
    InvestmentActivityFormErrors = {};

  if (
    !formState.investmentAccountId
  ) {
    nextErrors.investmentAccountId =
      "Select an investment account.";
  } else if (
    !investmentAccountIds.includes(
      formState.investmentAccountId,
    )
  ) {
    nextErrors.investmentAccountId =
      "The selected investment account is no longer available.";
  }

  if (
    formState.holdingId
  ) {
    const selectedHolding =
      holdings.find(
        (
          holding,
        ) =>
          holding.id ===
          formState.holdingId,
      );

    if (
      !selectedHolding ||
      selectedHolding.investmentAccountId !==
        formState.investmentAccountId
    ) {
      nextErrors.holdingId =
        "The selected holding does not belong to this account.";
    }
  }

  if (
    !formState.date
  ) {
    nextErrors.date =
      "Select an activity date.";
  } else if (
    Number.isNaN(
      new Date(
        `${formState.date}T00:00:00`,
      ).getTime(),
    )
  ) {
    nextErrors.date =
      "Enter a valid activity date.";
  }

  const amount =
    parseCurrencyInput(
      formState.amount,
    );

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <
      0
  ) {
    nextErrors.amount =
      "Enter a valid non-negative amount.";
  }

  if (
    formState.quantity.trim()
  ) {
    const quantity =
      parseNumberInput(
        formState.quantity,
      );

    if (
      !Number.isFinite(
        quantity,
      ) ||
      quantity <
        0
    ) {
      nextErrors.quantity =
        "Enter a valid non-negative quantity.";
    }
  }

  if (
    formState.pricePerUnit.trim()
  ) {
    const pricePerUnit =
      parseCurrencyInput(
        formState.pricePerUnit,
      );

    if (
      !Number.isFinite(
        pricePerUnit,
      ) ||
      pricePerUnit <
        0
    ) {
      nextErrors.pricePerUnit =
        "Enter a valid non-negative price.";
    }
  }

  if (
    formState.fees.trim()
  ) {
    const fees =
      parseCurrencyInput(
        formState.fees,
      );

    if (
      !Number.isFinite(
        fees,
      ) ||
      fees <
        0
    ) {
      nextErrors.fees =
        "Enter a valid non-negative fee amount.";
    }
  }

  if (
    formState.description.length >
    1000
  ) {
    nextErrors.description =
      "Description must be 1,000 characters or fewer.";
  }

  return nextErrors;
}

function createActivityPreview(
  formState:
    InvestmentActivityFormState,
): ActivityPreviewData {
  const grossAmount =
    safeNonNegativeNumber(
      parseCurrencyInput(
        formState.amount,
      ),
    );

  const fees =
    safeNonNegativeNumber(
      parseCurrencyInput(
        formState.fees,
      ),
    );

  const quantity =
    safeNonNegativeNumber(
      parseNumberInput(
        formState.quantity,
      ),
    );

  const pricePerUnit =
    safeNonNegativeNumber(
      parseCurrencyInput(
        formState.pricePerUnit,
      ),
    );

  return {
    grossAmount,

    fees,

    netAmount:
      roundCurrency(
        grossAmount -
        fees,
      ),

    quantity,

    pricePerUnit,
  };
}

function createFormStateFromActivity(
  activity:
    InvestmentActivityData,
): InvestmentActivityFormState {
  return {
    investmentAccountId:
      activity.investmentAccountId,

    holdingId:
      activity.holdingId ??
      "",

    type:
      activity.type,

    date:
      activity.date,

    amount:
      formatEditableNumber(
        activity.amount,
        2,
      ),

    quantity:
      activity.quantity ===
      undefined
        ? ""
        : formatEditableNumber(
            activity.quantity,
            6,
          ),

    pricePerUnit:
      activity.pricePerUnit ===
      undefined
        ? ""
        : formatEditableNumber(
            activity.pricePerUnit,
            2,
          ),

    fees:
      activity.fees ===
      undefined
        ? ""
        : formatEditableNumber(
            activity.fees,
            2,
          ),

    description:
      activity.description ??
      "",
  };
}

function resolveDefaultAccountId({
  investmentAccounts,
  holdings,
  defaultInvestmentAccountId,
  defaultHoldingId,
}: {
  investmentAccounts:
    ReturnType<
      typeof useInvestments
    >["investmentAccounts"];

  holdings:
    ReturnType<
      typeof useInvestments
    >["holdings"];

  defaultInvestmentAccountId:
    string | undefined;

  defaultHoldingId:
    string | undefined;
}) {
  if (
    defaultHoldingId
  ) {
    const holding =
      holdings.find(
        (
          currentHolding,
        ) =>
          currentHolding.id ===
          defaultHoldingId,
      );

    if (
      holding &&
      investmentAccounts.some(
        (
          account,
        ) =>
          account.id ===
          holding.investmentAccountId,
      )
    ) {
      return holding.investmentAccountId;
    }
  }

  if (
    defaultInvestmentAccountId &&
    investmentAccounts.some(
      (
        account,
      ) =>
        account.id ===
        defaultInvestmentAccountId,
    )
  ) {
    return defaultInvestmentAccountId;
  }

  return investmentAccounts[
    0
  ]?.id ??
    "";
}

function resolveDefaultHoldingId({
  holdings,
  investmentAccountId,
  defaultHoldingId,
}: {
  holdings:
    ReturnType<
      typeof useInvestments
    >["holdings"];

  investmentAccountId:
    string;

  defaultHoldingId:
    string | undefined;
}) {
  if (
    !defaultHoldingId
  ) {
    return "";
  }

  const holding =
    holdings.find(
      (
        currentHolding,
      ) =>
        currentHolding.id ===
          defaultHoldingId &&
        currentHolding.investmentAccountId ===
          investmentAccountId,
    );

  return holding?.id ??
    "";
}

function getInputClassName(
  hasError:
    boolean,
) {
  return [
    "h-11 w-full rounded-xl border bg-[var(--surface-default)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60",
    hasError
      ? "border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]"
      : "border-[var(--border-default)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]",
  ].join(
    " ",
  );
}

function sanitizeNumberInput(
  value:
    string,
  decimalPlaces:
    number,
) {
  const sanitizedValue =
    value.replace(
      /[^0-9.]/g,
      "",
    );

  const [
    wholePart,
    ...decimalParts
  ] =
    sanitizedValue.split(
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
      decimalPlaces,
    )}`;
}

function parseNumberInput(
  value:
    string,
) {
  const normalizedValue =
    value
      .replace(
        /,/g,
        "",
      )
      .trim();

  if (
    !normalizedValue
  ) {
    return 0;
  }

  return Number(
    normalizedValue,
  );
}

function parseCurrencyInput(
  value:
    string,
) {
  return parseNumberInput(
    value,
  );
}

function parseOptionalNumberInput(
  value:
    string,
) {
  if (
    !value.trim()
  ) {
    return undefined;
  }

  return parseNumberInput(
    value,
  );
}

function parseOptionalCurrencyInput(
  value:
    string,
) {
  if (
    !value.trim()
  ) {
    return undefined;
  }

  return parseCurrencyInput(
    value,
  );
}

function normalizeOptionalText(
  value:
    string,
) {
  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function formatEditableNumber(
  value:
    number,
  decimalPlaces:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return "0";
  }

  return value
    .toFixed(
      decimalPlaces,
    )
    .replace(
      /\.?0+$/,
      "",
    );
}

function safeNonNegativeNumber(
  value:
    number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    value,
  );
}

function roundCurrency(
  value:
    number,
) {
  return Math.round(
    value *
    100,
  ) /
  100;
}

function isPositiveCashFlowActivity(
  type:
    InvestmentActivityType,
) {
  return (
    type ===
      "contribution" ||
    type ===
      "sell" ||
    type ===
      "dividend" ||
    type ===
      "interest"
  );
}

function isNegativeCashFlowActivity(
  type:
    InvestmentActivityType,
) {
  return (
    type ===
      "withdrawal" ||
    type ===
      "buy" ||
    type ===
      "fee"
  );
}

function getSignedNetAmount(
  amount:
    number,
  type:
    InvestmentActivityType,
) {
  if (
    isNegativeCashFlowActivity(
      type,
    )
  ) {
    return -Math.abs(
      amount,
    );
  }

  if (
    isPositiveCashFlowActivity(
      type,
    )
  ) {
    return Math.abs(
      amount,
    );
  }

  return amount;
}

function getTodayDateString() {
  const today =
    new Date();

  const year =
    today
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      today.getMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    today
      .getDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}-${day}`;
}

function getHoldingLabel(
  holding:
    ReturnType<
      typeof useInvestments
    >["holdings"][number],
) {
  return holding.symbol
    ? `${holding.symbol} · ${holding.name}`
    : holding.name;
}

function getActivityTypeOptions() {
  return [
    {
      value:
        "contribution",
      label:
        "Contribution",
    },
    {
      value:
        "withdrawal",
      label:
        "Withdrawal",
    },
    {
      value:
        "buy",
      label:
        "Buy",
    },
    {
      value:
        "sell",
      label:
        "Sell",
    },
    {
      value:
        "dividend",
      label:
        "Dividend",
    },
    {
      value:
        "interest",
      label:
        "Interest",
    },
    {
      value:
        "fee",
      label:
        "Fee",
    },
    {
      value:
        "transfer",
      label:
        "Transfer",
    },
    {
      value:
        "adjustment",
      label:
        "Adjustment",
    },
  ] satisfies {
    value:
      InvestmentActivityType;

    label:
      string;
  }[];
}

function formatAccountType(
  type:
    ReturnType<
      typeof useInvestments
    >["investmentAccounts"][number]["type"],
) {
  switch (
    type
  ) {
    case "brokerage":
      return "Brokerage";

    case "retirement":
      return "Retirement";

    case "ira":
      return "IRA";

    case "roth-ira":
      return "Roth IRA";

    case "401k":
      return "401(k)";

    case "403b":
      return "403(b)";

    case "529":
      return "529 Plan";

    case "hsa":
      return "HSA";

    case "crypto":
      return "Crypto Account";

    case "other":
    default:
      return "Investment Account";
  }
}

function formatHoldingType(
  type:
    ReturnType<
      typeof useInvestments
    >["holdings"][number]["type"],
) {
  switch (
    type
  ) {
    case "stock":
      return "Stock";

    case "etf":
      return "ETF";

    case "mutual-fund":
      return "Mutual Fund";

    case "bond":
      return "Bond";

    case "option":
      return "Option";

    case "crypto":
      return "Crypto";

    case "cash":
      return "Cash";

    case "real-estate":
      return "Real Estate";

    case "commodity":
      return "Commodity";

    case "other":
    default:
      return "Other";
  }
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
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatSignedCurrency(
  value:
    number,
) {
  const normalizedValue =
    Number.isFinite(
      value,
    )
      ? value
      : 0;

  if (
    normalizedValue >
    0
  ) {
    return `+${formatCurrency(
      normalizedValue,
    )}`;
  }

  return formatCurrency(
    normalizedValue,
  );
}

function CloseIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
