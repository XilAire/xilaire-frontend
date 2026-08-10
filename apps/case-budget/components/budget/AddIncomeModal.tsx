"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useState,
} from "react";

export type AddIncomeFormData = {
  name: string;
  amount: number;
  receivedAmount: number;
};

export type AddIncomeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    income: AddIncomeFormData,
  ) => void;
};

type FormErrors = {
  name?: string;
  amount?: string;
  receivedAmount?: string;
};

const initialFormState = {
  name: "",
  amount: "",
  receivedAmount: "",
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

function parseMoneyInput(
  value: string,
) {
  const normalizedValue =
    value
      .replace(/[$,\s]/g, "")
      .trim();

  if (
    normalizedValue === ""
  ) {
    return 0;
  }

  const parsedValue =
    Number(normalizedValue);

  return Number.isFinite(
    parsedValue,
  )
    ? parsedValue
    : Number.NaN;
}

function formatMoneyInput(
  value: string,
) {
  const normalizedValue =
    value.replace(
      /[^0-9.]/g,
      "",
    );

  const [
    wholeNumber = "",
    ...decimalParts
  ] =
    normalizedValue.split(
      ".",
    );

  if (
    decimalParts.length ===
    0
  ) {
    return wholeNumber;
  }

  const decimalValue =
    decimalParts
      .join("")
      .slice(0, 2);

  return `${wholeNumber}.${decimalValue}`;
}

export default function AddIncomeModal({
  isOpen,
  onClose,
  onSubmit,
}: AddIncomeModalProps) {
  const titleId = useId();
  const descriptionId =
    useId();
  const nameInputId =
    useId();
  const amountInputId =
    useId();
  const receivedAmountInputId =
    useId();

  const [
    name,
    setName,
  ] = useState(
    initialFormState.name,
  );

  const [
    amount,
    setAmount,
  ] = useState(
    initialFormState.amount,
  );

  const [
    receivedAmount,
    setReceivedAmount,
  ] = useState(
    initialFormState.receivedAmount,
  );

  const [
    errors,
    setErrors,
  ] = useState<FormErrors>(
    {},
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      setName(
        initialFormState.name,
      );
      setAmount(
        initialFormState.amount,
      );
      setReceivedAmount(
        initialFormState.receivedAmount,
      );
      setErrors({});
      setIsSubmitting(false);

      const previousOverflow =
        document.body.style
          .overflow;

      document.body.style.overflow =
        "hidden";

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
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      isOpen,
      onClose,
    ],
  );

  function validateForm() {
    const nextErrors: FormErrors =
      {};

    const trimmedName =
      name.trim();

    const parsedAmount =
      parseMoneyInput(
        amount,
      );

    const parsedReceivedAmount =
      parseMoneyInput(
        receivedAmount,
      );

    if (
      trimmedName.length ===
      0
    ) {
      nextErrors.name =
        "Enter a name for this income source.";
    } else if (
      trimmedName.length >
      80
    ) {
      nextErrors.name =
        "Income source names must be 80 characters or fewer.";
    }

    if (
      !Number.isFinite(
        parsedAmount,
      )
    ) {
      nextErrors.amount =
        "Enter a valid planned amount.";
    } else if (
      parsedAmount <= 0
    ) {
      nextErrors.amount =
        "Planned income must be greater than $0.";
    }

    if (
      !Number.isFinite(
        parsedReceivedAmount,
      )
    ) {
      nextErrors.receivedAmount =
        "Enter a valid received amount.";
    } else if (
      parsedReceivedAmount <
      0
    ) {
      nextErrors.receivedAmount =
        "Received income cannot be negative.";
    }

    setErrors(
      nextErrors,
    );

    return {
      isValid:
        Object.keys(
          nextErrors,
        ).length === 0,
      trimmedName,
      parsedAmount,
      parsedReceivedAmount,
    };
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      isSubmitting
    ) {
      return;
    }

    const validation =
      validateForm();

    if (
      !validation.isValid
    ) {
      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      onSubmit({
        name:
          validation.trimmedName,
        amount:
          validation.parsedAmount,
        receivedAmount:
          validation.parsedReceivedAmount,
      });
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  function handleClose() {
    if (
      isSubmitting
    ) {
      return;
    }

    onClose();
  }

  if (
    !isOpen
  ) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close add income dialog"
        onClick={
          handleClose
        }
        className="absolute inset-0 cursor-default bg-[var(--surface-overlay)] backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          titleId
        }
        aria-describedby={
          descriptionId
        }
        className="relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-primary)] shadow-[var(--shadow-xl)] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-[var(--border-strong)] sm:hidden" />

        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
              Monthly budget
            </p>

            <h2
              id={titleId}
              className="mt-2 text-xl font-bold tracking-tight text-[var(--text-primary)]"
            >
              Add income
            </h2>

            <p
              id={
                descriptionId
              }
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              Add a paycheck,
              business payment, or
              other expected income
              for this budget month.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            disabled={
              isSubmitting
            }
            aria-label="Close add income dialog"
            className={joinClassNames(
              "flex",
              "h-10",
              "w-10",
              "shrink-0",
              "items-center",
              "justify-center",
              "rounded-xl",
              "text-[var(--text-muted)]",
              "outline-none",
              "transition",
              "hover:bg-[var(--surface-hover)]",
              "hover:text-[var(--text-primary)]",
              "focus-visible:ring-2",
              "focus-visible:ring-[var(--focus-ring)]",
              "disabled:cursor-not-allowed",
              "disabled:opacity-50",
            )}
          >
            <CloseIcon />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div>
              <label
                htmlFor={
                  nameInputId
                }
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Income source
              </label>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                Use a clear name such
                as Primary Paycheck or
                Side Business.
              </p>

              <input
                id={
                  nameInputId
                }
                type="text"
                value={name}
                autoFocus
                autoComplete="off"
                maxLength={80}
                placeholder="Primary Paycheck"
                aria-invalid={
                  Boolean(
                    errors.name,
                  )
                }
                aria-describedby={
                  errors.name
                    ? `${nameInputId}-error`
                    : undefined
                }
                onChange={(
                  event,
                ) => {
                  setName(
                    event.target
                      .value,
                  );

                  if (
                    errors.name
                  ) {
                    setErrors(
                      (
                        currentErrors,
                      ) => ({
                        ...currentErrors,
                        name: undefined,
                      }),
                    );
                  }
                }}
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
                  "focus:ring-[var(--focus-ring)]",
                  errors.name
                    ? "border-[var(--danger)]"
                    : "border-[var(--border-default)] focus:border-[var(--primary)]",
                )}
              />

              {errors.name ? (
                <p
                  id={`${nameInputId}-error`}
                  className="mt-2 text-xs font-medium text-[var(--danger)]"
                >
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={
                    amountInputId
                  }
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Planned amount
                </label>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  The total amount you
                  expect this month.
                </p>

                <div className="relative mt-2">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-[var(--text-muted)]"
                  >
                    $
                  </span>

                  <input
                    id={
                      amountInputId
                    }
                    type="text"
                    inputMode="decimal"
                    value={
                      amount
                    }
                    placeholder="0.00"
                    aria-invalid={
                      Boolean(
                        errors.amount,
                      )
                    }
                    aria-describedby={
                      errors.amount
                        ? `${amountInputId}-error`
                        : undefined
                    }
                    onChange={(
                      event,
                    ) => {
                      setAmount(
                        formatMoneyInput(
                          event
                            .target
                            .value,
                        ),
                      );

                      if (
                        errors.amount
                      ) {
                        setErrors(
                          (
                            currentErrors,
                          ) => ({
                            ...currentErrors,
                            amount:
                              undefined,
                          }),
                        );
                      }
                    }}
                    className={joinClassNames(
                      "h-12",
                      "w-full",
                      "rounded-xl",
                      "border",
                      "bg-[var(--surface-default)]",
                      "pl-8",
                      "pr-4",
                      "text-sm",
                      "font-semibold",
                      "text-[var(--text-primary)]",
                      "outline-none",
                      "transition-[border-color,box-shadow]",
                      "placeholder:text-[var(--text-muted)]",
                      "focus:ring-2",
                      "focus:ring-[var(--focus-ring)]",
                      errors.amount
                        ? "border-[var(--danger)]"
                        : "border-[var(--border-default)] focus:border-[var(--primary)]",
                    )}
                  />
                </div>

                {errors.amount ? (
                  <p
                    id={`${amountInputId}-error`}
                    className="mt-2 text-xs font-medium text-[var(--danger)]"
                  >
                    {
                      errors.amount
                    }
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={
                    receivedAmountInputId
                  }
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Amount received
                </label>

                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  Enter $0 if this
                  income has not arrived
                  yet.
                </p>

                <div className="relative mt-2">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-[var(--text-muted)]"
                  >
                    $
                  </span>

                  <input
                    id={
                      receivedAmountInputId
                    }
                    type="text"
                    inputMode="decimal"
                    value={
                      receivedAmount
                    }
                    placeholder="0.00"
                    aria-invalid={
                      Boolean(
                        errors.receivedAmount,
                      )
                    }
                    aria-describedby={
                      errors.receivedAmount
                        ? `${receivedAmountInputId}-error`
                        : undefined
                    }
                    onChange={(
                      event,
                    ) => {
                      setReceivedAmount(
                        formatMoneyInput(
                          event
                            .target
                            .value,
                        ),
                      );

                      if (
                        errors.receivedAmount
                      ) {
                        setErrors(
                          (
                            currentErrors,
                          ) => ({
                            ...currentErrors,
                            receivedAmount:
                              undefined,
                          }),
                        );
                      }
                    }}
                    className={joinClassNames(
                      "h-12",
                      "w-full",
                      "rounded-xl",
                      "border",
                      "bg-[var(--surface-default)]",
                      "pl-8",
                      "pr-4",
                      "text-sm",
                      "font-semibold",
                      "text-[var(--text-primary)]",
                      "outline-none",
                      "transition-[border-color,box-shadow]",
                      "placeholder:text-[var(--text-muted)]",
                      "focus:ring-2",
                      "focus:ring-[var(--focus-ring)]",
                      errors.receivedAmount
                        ? "border-[var(--danger)]"
                        : "border-[var(--border-default)] focus:border-[var(--primary)]",
                    )}
                  />
                </div>

                {errors.receivedAmount ? (
                  <p
                    id={`${receivedAmountInputId}-error`}
                    className="mt-2 text-xs font-medium text-[var(--danger)]"
                  >
                    {
                      errors.receivedAmount
                    }
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                  <InfoIcon />
                </span>

                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Income status is
                    automatic
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                    CASE Budget will
                    mark this income as
                    Planned, Partial,
                    or Received based on
                    the amounts entered.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-default)] bg-[var(--surface-default)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                isSubmitting
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
                "transition",
                "hover:bg-[var(--surface-hover)]",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--focus-ring)]",
                "disabled:cursor-not-allowed",
                "disabled:opacity-50",
              )}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting
              }
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
                "font-semibold",
                "text-[var(--primary-foreground)]",
                "outline-none",
                "transition",
                "hover:opacity-90",
                "focus-visible:ring-2",
                "focus-visible:ring-[var(--focus-ring)]",
                "focus-visible:ring-offset-2",
                "focus-visible:ring-offset-[var(--background)]",
                "disabled:cursor-not-allowed",
                "disabled:opacity-60",
              )}
            >
              <PlusIcon />

              {isSubmitting
                ? "Adding..."
                : "Add income"}
            </button>
          </div>
        </form>
      </section>
    </div>
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
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}