"use client";

import {
  type FormEvent,
  type MouseEvent,
  useEffect,
  useId,
  useState,
} from "react";

import type {
  BudgetIncomeSource,
} from "@/components/budget/BudgetIncomeCard";

export type BudgetIncomeStatus =
  BudgetIncomeSource["status"];

export type EditIncomeFormData = {
  id: string;
  name: string;
  amount: number;
  receivedAmount: number;
  status: BudgetIncomeStatus;
};

export type EditIncomeModalProps = {
  isOpen: boolean;
  incomeSource: BudgetIncomeSource | null;
  onClose: () => void;
  onSubmit: (
    incomeSource: EditIncomeFormData,
  ) => void;
  onDelete: (
    incomeSourceId: string,
  ) => void;
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

function parseCurrencyInput(
  value: string,
) {
  const normalizedValue =
    value.replace(
      /[^0-9.-]/g,
      "",
    );

  const parsedValue =
    Number.parseFloat(
      normalizedValue,
    );

  if (
    Number.isNaN(
      parsedValue,
    )
  ) {
    return 0;
  }

  return Math.max(
    parsedValue,
    0,
  );
}

function getIncomeStatus(
  plannedAmount: number,
  receivedAmount: number,
): BudgetIncomeStatus {
  if (
    plannedAmount > 0 &&
    receivedAmount >= plannedAmount
  ) {
    return "received";
  }

  if (receivedAmount > 0) {
    return "partial";
  }

  return "planned";
}

function getIncomeStatusLabel(
  status: BudgetIncomeStatus,
) {
  switch (status) {
    case "received":
      return "Received";

    case "partial":
      return "Partially received";

    default:
      return "Planned";
  }
}

export default function EditIncomeModal({
  isOpen,
  incomeSource,
  onClose,
  onSubmit,
  onDelete,
}: EditIncomeModalProps) {
  const titleId = useId();
  const descriptionId =
    useId();

  const [
    incomeName,
    setIncomeName,
  ] = useState("");

  const [
    plannedAmount,
    setPlannedAmount,
  ] = useState("");

  const [
    receivedAmount,
    setReceivedAmount,
  ] = useState("");

  const [
    nameError,
    setNameError,
  ] = useState<
    string | null
  >(null);

  const [
    plannedAmountError,
    setPlannedAmountError,
  ] = useState<
    string | null
  >(null);

  const [
    receivedAmountError,
    setReceivedAmountError,
  ] = useState<
    string | null
  >(null);

  const [
    isDeleteConfirmationOpen,
    setIsDeleteConfirmationOpen,
  ] = useState(false);

  useEffect(
    () => {
      if (
        !isOpen ||
        !incomeSource
      ) {
        return;
      }

      setIncomeName(
        incomeSource.name,
      );

      setPlannedAmount(
        incomeSource.amount.toFixed(
          2,
        ),
      );

      setReceivedAmount(
        incomeSource.receivedAmount.toFixed(
          2,
        ),
      );

      setNameError(null);
      setPlannedAmountError(
        null,
      );
      setReceivedAmountError(
        null,
      );
      setIsDeleteConfirmationOpen(
        false,
      );
    },
    [
      incomeSource,
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent,
      ) {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (
          isDeleteConfirmationOpen
        ) {
          setIsDeleteConfirmationOpen(
            false,
          );

          return;
        }

        onClose();
      }

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      const originalOverflow =
        document.body.style
          .overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );

        document.body.style.overflow =
          originalOverflow;
      };
    },
    [
      isDeleteConfirmationOpen,
      isOpen,
      onClose,
    ],
  );

  const parsedPlannedAmount =
    parseCurrencyInput(
      plannedAmount,
    );

  const parsedReceivedAmount =
    parseCurrencyInput(
      receivedAmount,
    );

  const currentStatus =
    getIncomeStatus(
      parsedPlannedAmount,
      parsedReceivedAmount,
    );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!incomeSource) {
      return;
    }

    const trimmedName =
      incomeName.trim();

    const submittedPlannedAmount =
      parseCurrencyInput(
        plannedAmount,
      );

    const submittedReceivedAmount =
      parseCurrencyInput(
        receivedAmount,
      );

    let hasError = false;

    if (!trimmedName) {
      setNameError(
        "Enter an income source name.",
      );

      hasError = true;
    } else {
      setNameError(null);
    }

    if (
      submittedPlannedAmount <=
      0
    ) {
      setPlannedAmountError(
        "Enter a planned amount greater than $0.",
      );

      hasError = true;
    } else {
      setPlannedAmountError(
        null,
      );
    }

    if (
      submittedReceivedAmount <
      0
    ) {
      setReceivedAmountError(
        "Received amount cannot be negative.",
      );

      hasError = true;
    } else {
      setReceivedAmountError(
        null,
      );
    }

    if (hasError) {
      return;
    }

    onSubmit({
      id: incomeSource.id,
      name: trimmedName,
      amount:
        submittedPlannedAmount,
      receivedAmount:
        submittedReceivedAmount,
      status: getIncomeStatus(
        submittedPlannedAmount,
        submittedReceivedAmount,
      ),
    });
  }

  function handleDelete() {
    if (!incomeSource) {
      return;
    }

    onDelete(
      incomeSource.id,
    );
  }

  function handleBackdropClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  }

  if (
    !isOpen ||
    !incomeSource
  ) {
    return null;
  }

  return (
    <div
      role="presentation"
      onMouseDown={
        handleBackdropClick
      }
      className={joinClassNames(
        "fixed",
        "inset-0",
        "z-50",
        "flex",
        "items-end",
        "justify-center",
        "overflow-y-auto",
        "bg-black/50",
        "p-0",
        "backdrop-blur-sm",
        "sm:items-center",
        "sm:p-6",
      )}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        aria-describedby={
          descriptionId
        }
        className={joinClassNames(
          "relative",
          "w-full",
          "max-w-lg",
          "overflow-hidden",
          "rounded-t-3xl",
          "border",
          "border-[var(--border-default)]",
          "bg-[var(--surface-default)]",
          "shadow-2xl",
          "sm:rounded-3xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Edit income
            </p>

            <h2
              id={titleId}
              className="mt-2 truncate text-xl font-bold text-[var(--text-primary)]"
            >
              {incomeSource.name}
            </h2>

            <p
              id={
                descriptionId
              }
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              Update this income
              source and the amount
              received for the current
              budget.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close edit income modal"
            onClick={onClose}
            className={joinClassNames(
              "inline-flex",
              "h-10",
              "w-10",
              "shrink-0",
              "items-center",
              "justify-center",
              "rounded-xl",
              "text-[var(--text-muted)]",
              "outline-none",
              "transition-colors",
              "hover:bg-[var(--surface-muted)]",
              "hover:text-[var(--text-primary)]",
              "focus-visible:ring-2",
              "focus-visible:ring-[var(--primary)]",
            )}
          >
            <CloseIcon />
          </button>
        </div>

        {isDeleteConfirmationOpen ? (
          <div className="px-5 py-6 sm:px-6">
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] text-[var(--danger)]">
                  <TrashIcon />
                </div>

                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">
                    Delete this income
                    source?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    This will remove{" "}
                    <strong>
                      {
                        incomeSource.name
                      }
                    </strong>{" "}
                    from the current
                    budget. This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setIsDeleteConfirmationOpen(
                      false,
                    )
                  }
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "rounded-xl",
                    "border",
                    "border-[var(--border-default)]",
                    "bg-[var(--surface-default)]",
                    "px-5",
                    "text-sm",
                    "font-semibold",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-colors",
                    "hover:bg-[var(--surface-muted)]",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                  )}
                >
                  Keep Income
                </button>

                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "bg-[var(--danger)]",
                    "px-5",
                    "text-sm",
                    "font-bold",
                    "text-white",
                    "outline-none",
                    "transition-[filter,box-shadow]",
                    "hover:brightness-95",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--danger)]",
                    "focus-visible:ring-offset-2",
                  )}
                >
                  <TrashIcon />

                  Delete Income
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={
              handleSubmit
            }
          >
            <div className="space-y-5 px-5 py-6 sm:px-6">
              <div>
                <label
                  htmlFor="edit-income-name"
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Income source
                </label>

                <input
                  id="edit-income-name"
                  type="text"
                  autoFocus
                  value={
                    incomeName
                  }
                  onChange={(
                    event,
                  ) => {
                    setIncomeName(
                      event.target
                        .value,
                    );

                    if (
                      nameError
                    ) {
                      setNameError(
                        null,
                      );
                    }
                  }}
                  placeholder="Primary Paycheck"
                  aria-invalid={
                    nameError
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    nameError
                      ? "edit-income-name-error"
                      : undefined
                  }
                  className={joinClassNames(
                    "mt-2",
                    "h-12",
                    "w-full",
                    "rounded-xl",
                    "border",
                    "bg-[var(--surface-default)]",
                    "px-4",
                    "text-sm",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-[border-color,box-shadow]",
                    "placeholder:text-[var(--text-muted)]",
                    "focus:ring-2",
                    "focus:ring-[var(--primary)]",
                    nameError
                      ? "border-[var(--danger)]"
                      : "border-[var(--border-default)]",
                  )}
                />

                {nameError ? (
                  <p
                    id="edit-income-name-error"
                    className="mt-2 text-sm text-[var(--danger)]"
                  >
                    {nameError}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <CurrencyField
                  id="edit-income-planned-amount"
                  label="Planned amount"
                  value={
                    plannedAmount
                  }
                  error={
                    plannedAmountError
                  }
                  onChange={(
                    value,
                  ) => {
                    setPlannedAmount(
                      value,
                    );

                    if (
                      plannedAmountError
                    ) {
                      setPlannedAmountError(
                        null,
                      );
                    }
                  }}
                />

                <CurrencyField
                  id="edit-income-received-amount"
                  label="Amount received"
                  value={
                    receivedAmount
                  }
                  error={
                    receivedAmountError
                  }
                  onChange={(
                    value,
                  ) => {
                    setReceivedAmount(
                      value,
                    );

                    if (
                      receivedAmountError
                    ) {
                      setReceivedAmountError(
                        null,
                      );
                    }
                  }}
                />
              </div>

              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      Current status
                    </p>

                    <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                      {getIncomeStatusLabel(
                        currentStatus,
                      )}
                    </p>
                  </div>

                  <IncomeStatusBadge
                    status={
                      currentStatus
                    }
                  />
                </div>

                <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                  The status updates
                  automatically based on
                  the planned and
                  received amounts.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setIsDeleteConfirmationOpen(
                    true,
                  )
                }
                className={joinClassNames(
                  "inline-flex",
                  "min-h-11",
                  "items-center",
                  "justify-center",
                  "gap-2",
                  "rounded-xl",
                  "border",
                  "border-[color-mix(in_srgb,var(--danger)_30%,transparent)]",
                  "bg-[var(--surface-default)]",
                  "px-4",
                  "text-sm",
                  "font-semibold",
                  "text-[var(--danger)]",
                  "outline-none",
                  "transition-colors",
                  "hover:bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface-default))]",
                  "focus-visible:ring-2",
                  "focus-visible:ring-[var(--danger)]",
                )}
              >
                <TrashIcon />

                Delete
              </button>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    onClose
                  }
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "rounded-xl",
                    "border",
                    "border-[var(--border-default)]",
                    "bg-[var(--surface-default)]",
                    "px-5",
                    "text-sm",
                    "font-semibold",
                    "text-[var(--text-primary)]",
                    "outline-none",
                    "transition-colors",
                    "hover:bg-[var(--surface-muted)]",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                  )}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={joinClassNames(
                    "inline-flex",
                    "min-h-11",
                    "items-center",
                    "justify-center",
                    "gap-2",
                    "rounded-xl",
                    "bg-[var(--primary)]",
                    "px-5",
                    "text-sm",
                    "font-bold",
                    "text-white",
                    "outline-none",
                    "transition-[filter,box-shadow]",
                    "hover:brightness-95",
                    "focus-visible:ring-2",
                    "focus-visible:ring-[var(--primary)]",
                    "focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-[var(--surface-default)]",
                  )}
                >
                  <SaveIcon />

                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

type CurrencyFieldProps = {
  id: string;
  label: string;
  value: string;
  error: string | null;
  onChange: (
    value: string,
  ) => void;
};

function CurrencyField({
  id,
  label,
  value,
  error,
  onChange,
}: CurrencyFieldProps) {
  const errorId =
    `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[var(--text-primary)]"
      >
        {label}
      </label>

      <div className="relative mt-2">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-[var(--text-muted)]">
          $
        </span>

        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          aria-invalid={
            error
              ? true
              : undefined
          }
          aria-describedby={
            error
              ? errorId
              : undefined
          }
          className={joinClassNames(
            "h-12",
            "w-full",
            "rounded-xl",
            "border",
            "bg-[var(--surface-default)]",
            "pl-8",
            "pr-4",
            "text-sm",
            "text-[var(--text-primary)]",
            "outline-none",
            "transition-[border-color,box-shadow]",
            "focus:ring-2",
            "focus:ring-[var(--primary)]",
            error
              ? "border-[var(--danger)]"
              : "border-[var(--border-default)]",
          )}
        />
      </div>

      {error ? (
        <p
          id={errorId}
          className="mt-2 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

type IncomeStatusBadgeProps = {
  status: BudgetIncomeStatus;
};

function IncomeStatusBadge({
  status,
}: IncomeStatusBadgeProps) {
  return (
    <span
      className={joinClassNames(
        "inline-flex",
        "shrink-0",
        "items-center",
        "rounded-full",
        "px-3",
        "py-1.5",
        "text-xs",
        "font-bold",
        status ===
          "received" &&
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]",
        status ===
          "partial" &&
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]",
        status ===
          "planned" &&
          "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]",
      )}
    >
      {getIncomeStatusLabel(
        status,
      )}
    </span>
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}