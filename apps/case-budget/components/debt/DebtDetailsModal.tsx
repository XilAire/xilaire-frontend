"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Percent,
  Plus,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";

import {
  type DebtData,
  type DebtType,
  useDebts,
} from "@/components/providers/DebtsProvider";

type DebtDetailsModalProps = {
  open: boolean;
  debt: DebtData | null;
  onClose: () => void;
};

type DebtDetailsView =
  | "overview"
  | "payment"
  | "edit"
  | "delete";

type EditDebtFormState = {
  name: string;
  lender: string;
  type: DebtType;
  originalBalance: string;
  currentBalance: string;
  interestRate: string;
  minimumPayment: string;
  dueDay: string;
};

type EditDebtFormErrors = {
  name?: string;
  originalBalance?: string;
  currentBalance?: string;
  interestRate?: string;
  minimumPayment?: string;
  dueDay?: string;
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

export default function DebtDetailsModal({
  open,
  debt,
  onClose,
}: DebtDetailsModalProps) {
  const {
    recordDebtPayment,
    updateDebt,
    deleteDebt,
  } =
    useDebts();

  const [
    currentView,
    setCurrentView,
  ] =
    useState<DebtDetailsView>(
      "overview",
    );

  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState(
      "",
    );

  const [
    paymentError,
    setPaymentError,
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
    useState<EditDebtFormState>({
      name: "",
      lender: "",
      type: "credit-card",
      originalBalance: "",
      currentBalance: "",
      interestRate: "",
      minimumPayment: "",
      dueDay: "",
    });

  const [
    editErrors,
    setEditErrors,
  ] =
    useState<EditDebtFormErrors>(
      {},
    );

  useEffect(
    () => {
      if (
        !open ||
        !debt
      ) {
        return;
      }

      setCurrentView(
        "overview",
      );

      setPaymentAmount(
        "",
      );

      setPaymentError(
        null,
      );

      setEditErrors(
        {},
      );

      setEditFormState({
        name:
          debt.name,

        lender:
          debt.lender ??
          "",

        type:
          debt.type,

        originalBalance:
          String(
            debt.originalBalance,
          ),

        currentBalance:
          String(
            debt.currentBalance,
          ),

        interestRate:
          String(
            debt.interestRate,
          ),

        minimumPayment:
          String(
            debt.minimumPayment,
          ),

        dueDay:
          debt.dueDay
            ? String(
                debt.dueDay,
              )
            : "",
      });
    },
    [
      debt,
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
          "Escape"
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
      onClose,
      open,
    ],
  );

  if (
    !open ||
    !debt
  ) {
    return null;
  }

  const resolvedDebt =
    debt;

  const progress =
    getDebtProgress(
      resolvedDebt,
    );

  const paidAmount =
    getPaidAmount(
      resolvedDebt,
    );

  function handlePaymentSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const amount =
      parseCurrencyValue(
        paymentAmount,
      );

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      setPaymentError(
        "Enter a payment greater than $0.",
      );

      return;
    }

    recordDebtPayment(
      resolvedDebt.id,
      amount,
    );

    setPaymentAmount(
      "",
    );

    setPaymentError(
      null,
    );

    setCurrentView(
      "overview",
    );
  }

  function handleEditSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors:
      EditDebtFormErrors =
      {};

    const originalBalance =
      parseCurrencyValue(
        editFormState.originalBalance,
      );

    const currentBalance =
      parseCurrencyValue(
        editFormState.currentBalance,
      );

    const interestRate =
      parseNumberValue(
        editFormState.interestRate,
      );

    const minimumPayment =
      parseCurrencyValue(
        editFormState.minimumPayment,
      );

    if (
      !editFormState.name.trim()
    ) {
      nextErrors.name =
        "Enter a name for this debt.";
    }

    if (
      !Number.isFinite(
        originalBalance,
      ) ||
      originalBalance <= 0
    ) {
      nextErrors.originalBalance =
        "Original balance must be greater than $0.";
    }

    if (
      !Number.isFinite(
        currentBalance,
      ) ||
      currentBalance < 0
    ) {
      nextErrors.currentBalance =
        "Current balance cannot be negative.";
    }

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

    if (
      !Number.isFinite(
        minimumPayment,
      ) ||
      minimumPayment < 0
    ) {
      nextErrors.minimumPayment =
        "Minimum payment cannot be negative.";
    }

    if (
      editFormState.dueDay.trim()
    ) {
      const dueDay =
        Number(
          editFormState.dueDay,
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

    updateDebt(
      resolvedDebt.id,
      {
        name:
          editFormState.name.trim(),

        lender:
          editFormState.lender.trim() ||
          undefined,

        type:
          editFormState.type,

        originalBalance,

        currentBalance,

        interestRate,

        minimumPayment,

        dueDay:
          editFormState.dueDay
            ? Number(
                editFormState.dueDay,
              )
            : undefined,

        status:
          currentBalance <= 0
            ? "paid-off"
            : "active",
      },
    );

    setCurrentView(
      "overview",
    );
  }

  function handleMarkPaidOff() {
    updateDebt(
      resolvedDebt.id,
      {
        currentBalance:
          0,

        status:
          "paid-off",
      },
    );
  }

  function handleDelete() {
    deleteDebt(
      resolvedDebt.id,
    );

    onClose();
  }

  function updateEditField(
    field:
      keyof EditDebtFormState,
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
  }

  return (
    <div className="fixed inset-0 z-[1500]">
      <button
        type="button"
        aria-label="Close debt details"
        onClick={
          onClose
        }
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-details-title"
        className="absolute inset-x-0 bottom-0 max-h-[94vh] overflow-hidden rounded-t-[30px] border-t border-slate-200 bg-white shadow-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[30px] sm:border"
      >
        <div className="flex max-h-[94vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={[
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  resolvedDebt.status ===
                  "paid-off"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-50 text-emerald-600",
                ].join(
                  " ",
                )}
              >
                {resolvedDebt.status ===
                "paid-off" ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0">
                <h2
                  id="debt-details-title"
                  className="truncate text-xl font-bold tracking-tight text-slate-950"
                >
                  {
                    resolvedDebt.name
                  }
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {resolvedDebt.lender
                    ? `${resolvedDebt.lender} · `
                    : ""}
                  {getDebtTypeLabel(
                    resolvedDebt.type,
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Close debt details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            {currentView ===
            "overview" ? (
              <div className="space-y-6">
                <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Current balance
                      </p>

                      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        {formatCurrency(
                          resolvedDebt.currentBalance,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Original balance{" "}
                        {formatCurrency(
                          resolvedDebt.originalBalance,
                        )}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-sm font-bold text-emerald-700">
                        {progress.toFixed(
                          0,
                        )}
                        % paid
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatCurrency(
                          paidAmount,
                        )}{" "}
                        paid down
                      </p>
                    </div>
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

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DebtStat
                      label="APR"
                      value={formatInterestRate(
                        resolvedDebt.interestRate,
                      )}
                    />

                    <DebtStat
                      label="Minimum"
                      value={formatCurrency(
                        resolvedDebt.minimumPayment,
                      )}
                    />

                    <DebtStat
                      label="Due day"
                      value={
                        resolvedDebt.dueDay
                          ? formatDueDay(
                              resolvedDebt.dueDay,
                            )
                          : "Not set"
                      }
                    />

                    <DebtStat
                      label="Status"
                      value={
                        resolvedDebt.status ===
                        "paid-off"
                          ? "Paid off"
                          : "Active"
                      }
                    />
                  </div>
                </section>

                {resolvedDebt.status !==
                "paid-off" ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentView(
                        "payment",
                      )
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-5 w-5" />

                    Record payment
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setEditFormState({
                      name:
                        resolvedDebt.name,

                      lender:
                        resolvedDebt.lender ??
                        "",

                      type:
                        resolvedDebt.type,

                      originalBalance:
                        String(
                          resolvedDebt.originalBalance,
                        ),

                      currentBalance:
                        String(
                          resolvedDebt.currentBalance,
                        ),

                      interestRate:
                        String(
                          resolvedDebt.interestRate,
                        ),

                      minimumPayment:
                        String(
                          resolvedDebt.minimumPayment,
                        ),

                      dueDay:
                        resolvedDebt.dueDay
                          ? String(
                              resolvedDebt.dueDay,
                            )
                          : "",
                    });

                    setEditErrors(
                      {},
                    );

                    setCurrentView(
                      "edit",
                    );
                  }}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Edit3 className="h-4.5 w-4.5" />

                  Edit debt
                </button>

                {resolvedDebt.status !==
                "paid-off" ? (
                  <button
                    type="button"
                    onClick={
                      handleMarkPaidOff
                    }
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />

                    Mark as paid off
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

                  Delete debt
                </button>
              </div>
            ) : null}

            {currentView ===
            "payment" ? (
              <form
                onSubmit={
                  handlePaymentSubmit
                }
                className="space-y-5"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-950">
                    Record payment
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Enter the amount paid
                    toward this debt.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-950">
                    Payment amount
                  </span>

                  <div className="relative">
                    <BadgeDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={
                        paymentAmount
                      }
                      onChange={(
                        event,
                      ) => {
                        setPaymentAmount(
                          sanitizeCurrencyInput(
                            event.target.value,
                          ),
                        );

                        setPaymentError(
                          null,
                        );
                      }}
                      placeholder="250.00"
                      className={[
                        "min-h-12 w-full rounded-2xl border bg-white pl-10 pr-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20",
                        paymentError
                          ? "border-rose-400 focus:border-rose-500"
                          : "border-slate-200 focus:border-emerald-500",
                      ].join(
                        " ",
                      )}
                    />
                  </div>

                  {paymentError ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      {
                        paymentError
                      }
                    </p>
                  ) : null}
                </label>

                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-sm font-bold text-slate-950">
                    New balance
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-700">
                    {formatCurrency(
                      Math.max(
                        0,
                        resolvedDebt.currentBalance -
                          parseCurrencyValue(
                            paymentAmount,
                          ),
                      ),
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Current balance is{" "}
                    {formatCurrency(
                      resolvedDebt.currentBalance,
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
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    <Plus className="h-4.5 w-4.5" />

                    Record payment
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
                    Edit debt
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Update the balance,
                    payment details, or
                    loan information.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <EditField
                    label="Debt name"
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
                    label="Lender"
                    hint="Optional"
                  >
                    <input
                      type="text"
                      value={
                        editFormState.lender
                      }
                      onChange={(
                        event,
                      ) =>
                        updateEditField(
                          "lender",
                          event.target.value,
                        )
                      }
                      className={getInputClassName(
                        false,
                      )}
                    />
                  </EditField>
                </div>

                <EditField
                  label="Debt type"
                >
                  <select
                    value={
                      editFormState.type
                    }
                    onChange={(
                      event,
                    ) =>
                      updateEditField(
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
                </EditField>

                <div className="grid gap-5 sm:grid-cols-2">
                  <EditField
                    label="Original balance"
                    error={
                      editErrors.originalBalance
                    }
                  >
                    <div className="relative">
                      <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          editFormState.originalBalance
                        }
                        onChange={(
                          event,
                        ) =>
                          updateEditField(
                            "originalBalance",
                            sanitizeCurrencyInput(
                              event.target.value,
                            ),
                          )
                        }
                        className={`${getInputClassName(
                          Boolean(
                            editErrors.originalBalance,
                          ),
                        )} pl-10`}
                      />
                    </div>
                  </EditField>

                  <EditField
                    label="Current balance"
                    error={
                      editErrors.currentBalance
                    }
                  >
                    <div className="relative">
                      <CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          editFormState.currentBalance
                        }
                        onChange={(
                          event,
                        ) =>
                          updateEditField(
                            "currentBalance",
                            sanitizeCurrencyInput(
                              event.target.value,
                            ),
                          )
                        }
                        className={`${getInputClassName(
                          Boolean(
                            editErrors.currentBalance,
                          ),
                        )} pl-10`}
                      />
                    </div>
                  </EditField>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <EditField
                    label="Interest rate"
                    hint="APR"
                    error={
                      editErrors.interestRate
                    }
                  >
                    <div className="relative">
                      <Percent className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          editFormState.interestRate
                        }
                        onChange={(
                          event,
                        ) =>
                          updateEditField(
                            "interestRate",
                            sanitizePercentageInput(
                              event.target.value,
                            ),
                          )
                        }
                        className={`${getInputClassName(
                          Boolean(
                            editErrors.interestRate,
                          ),
                        )} pl-10`}
                      />
                    </div>
                  </EditField>

                  <EditField
                    label="Minimum payment"
                    error={
                      editErrors.minimumPayment
                    }
                  >
                    <div className="relative">
                      <BadgeDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />

                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          editFormState.minimumPayment
                        }
                        onChange={(
                          event,
                        ) =>
                          updateEditField(
                            "minimumPayment",
                            sanitizeCurrencyInput(
                              event.target.value,
                            ),
                          )
                        }
                        className={`${getInputClassName(
                          Boolean(
                            editErrors.minimumPayment,
                          ),
                        )} pl-10`}
                      />
                    </div>
                  </EditField>
                </div>

                <EditField
                  label="Payment due day"
                  hint="Optional"
                  error={
                    editErrors.dueDay
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
                      value={
                        editFormState.dueDay
                      }
                      onChange={(
                        event,
                      ) =>
                        updateEditField(
                          "dueDay",
                          event.target.value,
                        )
                      }
                      className={`${getInputClassName(
                        Boolean(
                          editErrors.dueDay,
                        ),
                      )} pl-10`}
                    />
                  </div>
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
                    className="min-h-11 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700"
                  >
                    Save changes
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
                    Delete this debt?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    This permanently
                    removes{" "}
                    <span className="font-semibold text-slate-700">
                      {
                        resolvedDebt.name
                      }
                    </span>
                    {" "}from your Debt
                    Payoff plan.
                  </p>
                </div>

                <div className="rounded-[22px] border border-rose-100 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-800">
                    {formatCurrency(
                      resolvedDebt.currentBalance,
                    )}{" "}
                    current balance
                  </p>

                  <p className="mt-1 text-xs leading-5 text-rose-600">
                    Deleting this debt
                    removes its tracked
                    balance and payoff
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
                    Keep debt
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleDelete
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-bold text-white transition hover:bg-rose-700"
                  >
                    <Trash2 className="h-4.5 w-4.5" />

                    Delete debt
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

type DebtStatProps = {
  label: string;
  value: string;
};

function DebtStat({
  label,
  value,
}: DebtStatProps) {
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

function getDebtProgress(
  debt: DebtData,
) {
  if (
    debt.originalBalance <= 0
  ) {
    return debt.currentBalance <=
      0
      ? 100
      : 0;
  }

  const paidAmount =
    getPaidAmount(
      debt,
    );

  return Math.min(
    100,
    Math.max(
      0,
      (
        paidAmount /
        debt.originalBalance
      ) * 100,
    ),
  );
}

function getPaidAmount(
  debt: DebtData,
) {
  return Math.max(
    0,
    debt.originalBalance -
      debt.currentBalance,
  );
}

function getDebtTypeLabel(
  type: DebtType,
) {
  switch (
    type
  ) {
    case "credit-card":
      return "Credit card";

    case "personal-loan":
      return "Personal loan";

    case "student-loan":
      return "Student loan";

    case "auto-loan":
      return "Auto loan";

    case "mortgage":
      return "Mortgage";

    case "medical":
      return "Medical";

    case "other":
    default:
      return "Other";
  }
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

function formatInterestRate(
  value: number,
) {
  return `${value.toFixed(
    2,
  )}%`;
}

function formatDueDay(
  day: number,
) {
  const normalizedDay =
    Math.max(
      1,
      Math.min(
        31,
        Math.round(
          day,
        ),
      ),
    );

  const remainder100 =
    normalizedDay %
    100;

  if (
    remainder100 >= 11 &&
    remainder100 <= 13
  ) {
    return `${normalizedDay}th`;
  }

  switch (
    normalizedDay %
    10
  ) {
    case 1:
      return `${normalizedDay}st`;

    case 2:
      return `${normalizedDay}nd`;

    case 3:
      return `${normalizedDay}rd`;

    default:
      return `${normalizedDay}th`;
  }
}