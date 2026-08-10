"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Percent,
  Plus,
  WalletCards,
  X,
} from "lucide-react";

import {
  type DebtType,
  useDebts,
} from "@/components/providers/DebtsProvider";

type AddDebtModalProps = {
  open: boolean;
  onClose: () => void;
};

type DebtFormState = {
  name: string;
  lender: string;
  type: DebtType;
  originalBalance: string;
  currentBalance: string;
  interestRate: string;
  minimumPayment: string;
  dueDay: string;
};

type DebtFormErrors = {
  name?: string;
  originalBalance?: string;
  currentBalance?: string;
  interestRate?: string;
  minimumPayment?: string;
  dueDay?: string;
};

const initialFormState: DebtFormState = {
  name: "",
  lender: "",
  type: "credit-card",
  originalBalance: "",
  currentBalance: "",
  interestRate: "",
  minimumPayment: "",
  dueDay: "",
};

const debtTypeOptions: {
  value: DebtType;
  label: string;
}[] = [
  {
    value: "credit-card",
    label: "Credit card",
  },
  {
    value: "personal-loan",
    label: "Personal loan",
  },
  {
    value: "student-loan",
    label: "Student loan",
  },
  {
    value: "auto-loan",
    label: "Auto loan",
  },
  {
    value: "mortgage",
    label: "Mortgage",
  },
  {
    value: "medical",
    label: "Medical",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function AddDebtModal({
  open,
  onClose,
}: AddDebtModalProps) {
  const {
    addDebt,
  } =
    useDebts();

  const [
    formState,
    setFormState,
  ] =
    useState<DebtFormState>(
      initialFormState,
    );

  const [
    errors,
    setErrors,
  ] =
    useState<DebtFormErrors>(
      {},
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    );

  const originalBalance =
    useMemo(
      () =>
        parseCurrencyValue(
          formState.originalBalance,
        ),
      [
        formState.originalBalance,
      ],
    );

  const currentBalance =
    useMemo(
      () => {
        if (
          !formState.currentBalance.trim()
        ) {
          return originalBalance;
        }

        return parseCurrencyValue(
          formState.currentBalance,
        );
      },
      [
        formState.currentBalance,
        originalBalance,
      ],
    );

  const interestRate =
    useMemo(
      () =>
        parseNumberValue(
          formState.interestRate,
        ),
      [
        formState.interestRate,
      ],
    );

  const minimumPayment =
    useMemo(
      () =>
        parseCurrencyValue(
          formState.minimumPayment,
        ),
      [
        formState.minimumPayment,
      ],
    );

  const payoffProgress =
    originalBalance > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (
              (
                originalBalance -
                currentBalance
              ) /
              originalBalance
            ) *
              100,
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
          "Escape"
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
      keyof DebtFormState,
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
  }

  function validateForm() {
    const nextErrors:
      DebtFormErrors =
      {};

    if (
      !formState.name.trim()
    ) {
      nextErrors.name =
        "Enter a name for this debt.";
    }

    if (
      !formState.originalBalance.trim()
    ) {
      nextErrors.originalBalance =
        "Enter the original balance.";
    } else if (
      !Number.isFinite(
        originalBalance,
      ) ||
      originalBalance <= 0
    ) {
      nextErrors.originalBalance =
        "Original balance must be greater than $0.";
    }

    if (
      formState.currentBalance.trim()
    ) {
      if (
        !Number.isFinite(
          currentBalance,
        ) ||
        currentBalance < 0
      ) {
        nextErrors.currentBalance =
          "Current balance cannot be negative.";
      }
    }

    if (
      formState.interestRate.trim()
    ) {
      if (
        !Number.isFinite(
          interestRate,
        ) ||
        interestRate < 0 ||
        interestRate > 100
      ) {
        nextErrors.interestRate =
          "Enter an interest rate between 0% and 100%.";
      }
    }

    if (
      formState.minimumPayment.trim()
    ) {
      if (
        !Number.isFinite(
          minimumPayment,
        ) ||
        minimumPayment < 0
      ) {
        nextErrors.minimumPayment =
          "Minimum payment cannot be negative.";
      }
    }

    if (
      formState.dueDay.trim()
    ) {
      const dueDay =
        Number(
          formState.dueDay,
        );

      if (
        !Number.isInteger(
          dueDay,
        ) ||
        dueDay < 1 ||
        dueDay > 31
      ) {
        nextErrors.dueDay =
          "Due day must be between 1 and 31.";
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

  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !validateForm()
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    addDebt({
      name:
        formState.name.trim(),

      lender:
        formState.lender.trim() ||
        undefined,

      type:
        formState.type,

      originalBalance,

      currentBalance,

      interestRate,

      minimumPayment,

      dueDay:
        formState.dueDay
          ? Number(
              formState.dueDay,
            )
          : undefined,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1500]">
      <button
        type="button"
        aria-label="Close add debt dialog"
        onClick={
          onClose
        }
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-debt-title"
        className="absolute inset-x-0 bottom-0 max-h-[94vh] overflow-hidden rounded-t-[30px] border-t border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
      >
        <form
          onSubmit={
            handleSubmit
          }
          className="flex max-h-[94vh] flex-col"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <WalletCards className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2
                  id="add-debt-title"
                  className="text-xl font-bold tracking-tight text-slate-950"
                >
                  Add debt
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Add a balance so CASE Budget can track payoff progress.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Close add debt dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup
                  label="Debt name"
                  error={
                    errors.name
                  }
                >
                  <input
                    type="text"
                    autoFocus
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
                    placeholder="Visa card"
                    className={getInputClassName(
                      Boolean(
                        errors.name,
                      ),
                    )}
                  />
                </FieldGroup>

                <FieldGroup
                  label="Lender"
                  hint="Optional"
                >
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      value={
                        formState.lender
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "lender",
                          event.target.value,
                        )
                      }
                      placeholder="Capital One"
                      className={`${getInputClassName(
                        false,
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>
              </div>

              <FieldGroup
                label="Debt type"
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
                      event.target.value as DebtType,
                    )
                  }
                  className={getInputClassName(
                    false,
                  )}
                >
                  {debtTypeOptions.map(
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
                        {
                          option.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </FieldGroup>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup
                  label="Original balance"
                  error={
                    errors.originalBalance
                  }
                >
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.originalBalance
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "originalBalance",
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder="5,000.00"
                      className={`${getInputClassName(
                        Boolean(
                          errors.originalBalance,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup
                  label="Current balance"
                  hint="Defaults to original balance"
                  error={
                    errors.currentBalance
                  }
                >
                  <div className="relative">
                    <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.currentBalance
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "currentBalance",
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder={
                        formState.originalBalance ||
                        "5,000.00"
                      }
                      className={`${getInputClassName(
                        Boolean(
                          errors.currentBalance,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldGroup
                  label="Interest rate"
                  hint="APR"
                  error={
                    errors.interestRate
                  }
                >
                  <div className="relative">
                    <Percent className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.interestRate
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "interestRate",
                          sanitizePercentageInput(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder="24.99"
                      className={`${getInputClassName(
                        Boolean(
                          errors.interestRate,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup
                  label="Minimum payment"
                  hint="Monthly"
                  error={
                    errors.minimumPayment
                  }
                >
                  <div className="relative">
                    <BadgeDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        formState.minimumPayment
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "minimumPayment",
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        )
                      }
                      placeholder="125.00"
                      className={`${getInputClassName(
                        Boolean(
                          errors.minimumPayment,
                        ),
                      )} pl-10`}
                    />
                  </div>
                </FieldGroup>
              </div>

              <FieldGroup
                label="Payment due day"
                hint="Optional"
                error={
                  errors.dueDay
                }
              >
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="number"
                    min={
                      1
                    }
                    max={
                      31
                    }
                    inputMode="numeric"
                    value={
                      formState.dueDay
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "dueDay",
                        event.target.value,
                      )
                    }
                    placeholder="15"
                    className={`${getInputClassName(
                      Boolean(
                        errors.dueDay,
                      ),
                    )} pl-10`}
                  />
                </div>
              </FieldGroup>

              <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Current payoff progress
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Based on the original and current balances.
                    </p>
                  </div>

                  <span className="text-sm font-bold text-emerald-700">
                    {payoffProgress.toFixed(
                      0,
                    )}
                    %
                  </span>
                </div>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width]"
                    style={{
                      width:
                        `${payoffProgress}%`,
                    }}
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <PreviewStat
                    label="Original"
                    value={formatCurrency(
                      originalBalance,
                    )}
                  />

                  <PreviewStat
                    label="Current"
                    value={formatCurrency(
                      currentBalance,
                    )}
                  />

                  <PreviewStat
                    label="Monthly minimum"
                    value={formatCurrency(
                      minimumPayment,
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={
                onClose
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4.5 w-4.5" />

              {isSubmitting
                ? "Adding..."
                : "Add debt"}
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
  children:
    React.ReactNode;
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

type PreviewStatProps = {
  label: string;
  value: string;
};

function PreviewStat({
  label,
  value,
}: PreviewStatProps) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
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

function sanitizePercentageInput(
  value: string,
) {
  const normalized =
    value.replace(
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
      3,
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

function parseNumberValue(
  value: string,
) {
  if (
    !value.trim()
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
    value,
  );
}