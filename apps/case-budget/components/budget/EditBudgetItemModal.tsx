"use client";

import {
  type FormEvent,
  useEffect,
  useId,
  useState,
} from "react";

import type {
  BudgetAmountType,
  BudgetCategoryData,
  BudgetCategoryGroupData,
} from "@/types/budget";

export type EditBudgetItemModalProps = {
  isOpen: boolean;
  item: BudgetCategoryData | null;
  group: BudgetCategoryGroupData | null;
  onClose: () => void;
  onSubmit: (
    item: BudgetCategoryData,
  ) => void;
  onDelete: (
    itemId: string,
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

export default function EditBudgetItemModal({
  isOpen,
  item,
  group,
  onClose,
  onSubmit,
  onDelete,
}: EditBudgetItemModalProps) {
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
    assignedError,
    setAssignedError,
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
        !item
      ) {
        return;
      }

      setItemName(
        item.name,
      );

      setAssignedAmount(
        item.assignedAmount.toFixed(
          2,
        ),
      );

      setAmountType(
        item.amountType,
      );

      setNameError(null);
      setAssignedError(null);
      setIsDeleteConfirmationOpen(
        false,
      );
    },
    [
      isOpen,
      item,
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

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!item) {
      return;
    }

    const trimmedName =
      itemName.trim();

    const parsedAssignedAmount =
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
      parsedAssignedAmount <
      0
    ) {
      setAssignedError(
        "Assigned amount cannot be negative.",
      );

      hasError = true;
    } else {
      setAssignedError(null);
    }


    if (hasError) {
      return;
    }

    onSubmit({
      ...item,
      name: trimmedName,
      assignedAmount:
        parsedAssignedAmount,
      amountType,
    });
  }

  function handleDelete() {
    if (!item) {
      return;
    }

    onDelete(
      item.id,
    );
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

  if (
    !isOpen ||
    !item
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
              Edit item
            </p>

            <h2
              id={titleId}
              className="mt-2 text-xl font-bold text-[var(--text-primary)]"
            >
              {item.name}
            </h2>

            <p
              id={
                descriptionId
              }
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              {group
                ? `Update this item in ${group.name}.`
                : "Update this budget item."}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close edit item modal"
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
                    Delete this item?
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    This will remove{" "}
                    <strong>
                      {item.name}
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
                  Keep Item
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

                  Delete Item
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
                  htmlFor="edit-budget-item-name"
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Item name
                </label>

                <input
                  id="edit-budget-item-name"
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
                  aria-invalid={
                    nameError
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    nameError
                      ? "edit-budget-item-name-error"
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
                    "focus:ring-2",
                    "focus:ring-[var(--primary)]",
                    nameError
                      ? "border-[var(--danger)]"
                      : "border-[var(--border-default)]",
                  )}
                />

                {nameError ? (
                  <p
                    id="edit-budget-item-name-error"
                    className="mt-2 text-sm text-[var(--danger)]"
                  >
                    {nameError}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="edit-budget-item-amount-type"
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Item type
                </label>

                <select
                  id="edit-budget-item-amount-type"
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
                  Changing the type updates the canonical budget item. Automatic
                  linked bills are synchronized by the server where supported.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <CurrencyField
                  id="edit-budget-item-assigned"
                  label="Assigned amount"
                  value={
                    assignedAmount
                  }
                  error={
                    assignedError
                  }
                  onChange={(
                    value,
                  ) => {
                    setAssignedAmount(
                      value,
                    );

                    if (
                      assignedError
                    ) {
                      setAssignedError(
                        null,
                      );
                    }
                  }}
                />

                <div>
                  <p className="block text-sm font-semibold text-[var(--text-primary)]">
                    Spent amount
                  </p>

                  <div className="mt-2 flex h-12 items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-primary)]">
                    ${item.spentAmount.toFixed(
                      2,
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    Spending is calculated from canonical transactions and
                    cannot be edited here.
                  </p>
                </div>
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