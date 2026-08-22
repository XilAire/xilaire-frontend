"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useState,
} from "react";

import type {
  BudgetAmountType,
  BudgetCategoryGroupData,
} from "@/types/budget";

export type AddBudgetItemFormData = {
  name: string;
  assignedAmount: number;
  amountType: BudgetAmountType;
};

export type AddBudgetItemModalProps = {
  isOpen: boolean;
  group: BudgetCategoryGroupData | null;
  onClose: () => void;
  onSubmit: (
    item: AddBudgetItemFormData,
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

export default function AddBudgetItemModal({
  isOpen,
  group,
  onClose,
  onSubmit,
}: AddBudgetItemModalProps) {
  const titleId = useId();
  const descriptionId =
    useId();

  const [
    itemName,
    setItemName,
  ] = useState("");

  const [
    assignedAmount,
    setAssignedAmount,
  ] = useState("");

  const [
    amountType,
    setAmountType,
  ] = useState<BudgetAmountType>(
    "fixed",
  );

  const [
    nameError,
    setNameError,
  ] = useState<
    string | null
  >(null);

  const [
    amountError,
    setAmountError,
  ] = useState<
    string | null
  >(null);

  useEffect(
    () => {
      if (!isOpen) {
        return;
      }

      setItemName("");
      setAssignedAmount("");
      setAmountType(
        "fixed",
      );
      setNameError(null);
      setAmountError(null);
    },
    [
      isOpen,
      group?.id,
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
          event.key ===
          "Escape"
        ) {
          onClose();
        }
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
      isOpen,
      onClose,
    ],
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName =
      itemName.trim();

    const parsedAmount =
      parseCurrencyInput(
        assignedAmount,
      );

    let hasError = false;

    if (!trimmedName) {
      setNameError(
        "Enter an item name.",
      );

      hasError = true;
    } else {
      setNameError(null);
    }

    if (
      assignedAmount.trim() &&
      parsedAmount < 0
    ) {
      setAmountError(
        "Assigned amount cannot be negative.",
      );

      hasError = true;
    } else {
      setAmountError(null);
    }

    if (hasError) {
      return;
    }

    onSubmit({
      name: trimmedName,
      assignedAmount:
        parsedAmount,
      amountType,
    });
  }

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  }

  if (!isOpen) {
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
              New item
            </p>

            <h2
              id={titleId}
              className="mt-2 text-xl font-bold text-[var(--text-primary)]"
            >
              Add Budget Item
            </h2>

            <p
              id={
                descriptionId
              }
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              {group
                ? `Add a new item to ${group.name}.`
                : "Add a new item to your monthly budget."}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close add item modal"
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

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="space-y-5 px-5 py-6 sm:px-6">
            <div>
              <label
                htmlFor="budget-item-name"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Item name
              </label>

              <input
                id="budget-item-name"
                type="text"
                autoFocus
                value={
                  itemName
                }
                onChange={(
                  event,
                ) => {
                  setItemName(
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
                placeholder="Example: Groceries"
                aria-invalid={
                  nameError
                    ? true
                    : undefined
                }
                aria-describedby={
                  nameError
                    ? "budget-item-name-error"
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
                  id="budget-item-name-error"
                  className="mt-2 text-sm text-[var(--danger)]"
                >
                  {nameError}
                </p>
              ) : null}
            </div>


            <div>
              <label
                htmlFor="budget-item-amount-type"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Item type
              </label>

              <select
                id="budget-item-amount-type"
                value={amountType}
                onChange={(
                  event,
                ) =>
                  setAmountType(
                    event.target
                      .value as BudgetAmountType,
                  )
                }
                className={joinClassNames(
                  "mt-2",
                  "h-12",
                  "w-full",
                  "rounded-xl",
                  "border",
                  "border-[var(--border-default)]",
                  "bg-[var(--surface-default)]",
                  "px-4",
                  "text-sm",
                  "font-semibold",
                  "text-[var(--text-primary)]",
                  "outline-none",
                  "focus:ring-2",
                  "focus:ring-[var(--primary)]",
                )}
              >
                <option value="fixed">
                  Fixed
                </option>

                <option value="variable">
                  Variable
                </option>

                <option value="spending">
                  Spending
                </option>
              </select>

              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Fixed is a predictable amount, variable changes by bill cycle,
                and spending tracks purchases throughout the month.
              </p>
            </div>

            <div>
              <label
                htmlFor="budget-item-assigned"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Assigned amount
              </label>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-[var(--text-muted)]">
                  $
                </span>

                <input
                  id="budget-item-assigned"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={
                    assignedAmount
                  }
                  onChange={(
                    event,
                  ) => {
                    setAssignedAmount(
                      event.target
                        .value,
                    );

                    if (
                      amountError
                    ) {
                      setAmountError(
                        null,
                      );
                    }
                  }}
                  placeholder="0.00"
                  aria-invalid={
                    amountError
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    amountError
                      ? "budget-item-assigned-error"
                      : "budget-item-assigned-help"
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
                    "placeholder:text-[var(--text-muted)]",
                    "focus:ring-2",
                    "focus:ring-[var(--primary)]",
                    amountError
                      ? "border-[var(--danger)]"
                      : "border-[var(--border-default)]",
                  )}
                />
              </div>

              {amountError ? (
                <p
                  id="budget-item-assigned-error"
                  className="mt-2 text-sm text-[var(--danger)]"
                >
                  {amountError}
                </p>
              ) : (
                <p
                  id="budget-item-assigned-help"
                  className="mt-2 text-xs leading-5 text-[var(--text-muted)]"
                >
                  You can leave this at
                  $0.00 and assign money
                  later.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
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
              <PlusIcon />

              Add Item
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

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
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