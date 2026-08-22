"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import BillBudgetLinkCard, {
  type BillBudgetLinkValue,
} from "@/components/bills/BillBudgetLinkCard";

import {
  transactionAccountReferences,
} from "@/lib/budget/budget-reference-data";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import {
  determineBillStatus,
} from "@/lib/bills/bill-utils";

import {
  billFrequencyDefinitions,
  billReminderTimingDefinitions,
  type BillData,
  type BillFormValues,
  type BillFrequency,
  type BillPaymentMethod,
  type BillReminderTiming,
} from "@/types/bill";

type AddBillModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddBill: (
    bill: BillData,
  ) => void;
};

const initialFormValues: BillFormValues = {
  name: "",
  payee: "",
  amount: "",
  amountType: "fixed",
  dueDate: "",
  frequency: "monthly",
  paymentMethod: "manual",
  accountId: "",
  budgetItemId: "",
  budgetSyncEnabled: true,
  budgetSyncMode: "suggest",
  reminderEnabled: true,
  reminderTiming: "3-days",
  note: "",
};

export default function AddBillModal({
  isOpen,
  onClose,
  onAddBill,
}: AddBillModalProps) {
  const [
    formValues,
    setFormValues,
  ] = useState<BillFormValues>(
    initialFormValues,
  );

  const [errors, setErrors] =
    useState<
      Partial<
        Record<
          keyof BillFormValues,
          string
        >
      >
    >({});

  const {
    budgetGroups,
  } = useBudget();

  const budgetItemReferences =
    useMemo(
      () =>
        budgetGroups.flatMap(
          (group) =>
            group.categories.map(
              (item) => ({
                id: item.id,
                name: item.name,
                categoryId:
                  group.id,
                categoryName:
                  group.name,
              }),
            ),
        ),
      [budgetGroups],
    );

  const budgetLinkValue =
    useMemo<BillBudgetLinkValue>(
      () => ({
        budgetItemId:
          formValues.budgetItemId,
        budgetSyncEnabled:
          formValues.budgetSyncEnabled,
        budgetSyncMode:
          formValues.budgetSyncMode,
      }),
      [
        formValues.budgetItemId,
        formValues.budgetSyncEnabled,
        formValues.budgetSyncMode,
      ],
    );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormValues({
      ...initialFormValues,
      accountId:
        transactionAccountReferences[0]
          ?.id ?? "",
      budgetItemId:
        budgetItemReferences[0]?.id ??
        "",
      budgetSyncEnabled:
        budgetItemReferences.length > 0,
    });

    setErrors({});
  }, [
    budgetItemReferences,
    isOpen,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormValues((current) => {
      if (
        current.budgetItemId === ""
      ) {
        if (
          budgetItemReferences.length ===
          0
        ) {
          if (
            !current.budgetSyncEnabled
          ) {
            return current;
          }

          return {
            ...current,
            budgetSyncEnabled: false,
          };
        }

        return {
          ...current,
          budgetItemId:
            budgetItemReferences[0]?.id ??
            "",
        };
      }

      const selectedItemStillExists =
        budgetItemReferences.some(
          (item) =>
            item.id ===
            current.budgetItemId,
        );

      if (
        selectedItemStillExists
      ) {
        return current;
      }

      return {
        ...current,
        budgetItemId:
          budgetItemReferences[0]?.id ??
          "",
        budgetSyncEnabled:
          budgetItemReferences.length >
          0
            ? current.budgetSyncEnabled
            : false,
      };
    });

    setErrors((current) => ({
      ...current,
      budgetItemId: undefined,
    }));
  }, [
    budgetItemReferences,
    isOpen,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function updateField<
    Key extends keyof BillFormValues,
  >(
    key: Key,
    value: BillFormValues[Key],
  ) {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((current) => ({
        ...current,
        [key]: undefined,
      }));
    }
  }

  function handleBudgetLinkChange(
    value: BillBudgetLinkValue,
  ) {
    const selectedItemExists =
      value.budgetItemId === "" ||
      budgetItemReferences.some(
        (item) =>
          item.id ===
          value.budgetItemId,
      );

    const nextBudgetItemId =
      selectedItemExists
        ? value.budgetItemId
        : budgetItemReferences[0]?.id ??
          "";

    setFormValues((current) => ({
      ...current,
      budgetItemId:
        nextBudgetItemId,
      budgetSyncEnabled:
        nextBudgetItemId !== "" &&
        value.budgetSyncEnabled,
      budgetSyncMode:
        value.budgetSyncMode,
    }));

    setErrors((current) => ({
      ...current,
      budgetItemId: undefined,
      budgetSyncEnabled:
        undefined,
      budgetSyncMode: undefined,
    }));
  }

  function validateForm() {
    const nextErrors: Partial<
      Record<
        keyof BillFormValues,
        string
      >
    > = {};

    if (
      formValues.name.trim() === ""
    ) {
      nextErrors.name =
        "Enter a bill name.";
    }

    const parsedAmount = Number(
      formValues.amount,
    );

    if (
      formValues.amount.trim() === "" ||
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      nextErrors.amount =
        "Enter an amount greater than $0.";
    }

    if (
      formValues.dueDate === ""
    ) {
      nextErrors.dueDate =
        "Select a due date.";
    }

    if (
      formValues.budgetItemId !== "" &&
      !budgetItemReferences.some(
        (item) =>
          item.id ===
          formValues.budgetItemId,
      )
    ) {
      nextErrors.budgetItemId =
        "Select a valid budget item.";
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors)
        .length === 0
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const selectedAccount =
      transactionAccountReferences.find(
        (account) =>
          account.id ===
          formValues.accountId,
      );

    const selectedBudgetItem =
      budgetItemReferences.find(
        (item) =>
          item.id ===
          formValues.budgetItemId,
      );

    const timestamp =
      new Date().toISOString();

    const newBill: BillData = {
      id: createBillId(),
      name: formValues.name.trim(),
      payee:
        formValues.payee.trim() ||
        undefined,
      amount: Number(
        formValues.amount,
      ),
      amountType:
        formValues.amountType,
      dueDate: formValues.dueDate,
      status: determineBillStatus(
        formValues.dueDate,
      ),
      frequency:
        formValues.frequency,
      paymentMethod:
        formValues.paymentMethod,
      account: selectedAccount
        ? {
            id: selectedAccount.id,
            name: selectedAccount.name,
            type:
              selectedAccount.type,
          }
        : undefined,
      budgetItem: selectedBudgetItem
        ? {
            id: selectedBudgetItem.id,
            name: selectedBudgetItem.name,
            categoryId:
              selectedBudgetItem.categoryId,
            categoryName:
              selectedBudgetItem.categoryName,
          }
        : undefined,
      budgetSync: selectedBudgetItem
        ? {
            enabled:
              formValues.budgetSyncEnabled,
            mode:
              formValues.budgetSyncMode,
            lastSyncedAt:
              formValues.budgetSyncEnabled
                ? timestamp
                : undefined,
          }
        : undefined,
      budgetAllocations:
        selectedBudgetItem
          ? [
              {
                id: createBillAllocationId(),
                budgetItem: {
                  id: selectedBudgetItem.id,
                  name: selectedBudgetItem.name,
                  categoryId:
                    selectedBudgetItem.categoryId,
                  categoryName:
                    selectedBudgetItem.categoryName,
                },
                allocationType:
                  "fixed",
                value: Number(
                  formValues.amount,
                ),
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            ]
          : undefined,
      reminder: {
        enabled:
          formValues.reminderEnabled,
        timing:
          formValues.reminderTiming,
      },
      note:
        formValues.note.trim() ||
        undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    onAddBill(newBill);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-bill-title"
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
              Bills & Payments
            </p>

            <h2
              id="add-bill-title"
              className="mt-1 text-xl font-bold text-[var(--text-primary)] sm:text-2xl"
            >
              Add Bill
            </h2>

            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              Add an upcoming payment,
              connect it to your budget,
              and choose when you want
              to be reminded.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Close add bill modal"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label="Bill Name"
                htmlFor="add-bill-name"
                error={errors.name}
                required
              >
                <input
                  id="add-bill-name"
                  type="text"
                  value={formValues.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Mortgage"
                  autoFocus
                  className={getInputClassName(
                    Boolean(
                      errors.name,
                    ),
                  )}
                />
              </FormField>

              <FormField
                label="Payee"
                htmlFor="add-bill-payee"
              >
                <input
                  id="add-bill-payee"
                  type="text"
                  value={
                    formValues.payee
                  }
                  onChange={(event) =>
                    updateField(
                      "payee",
                      event.target.value,
                    )
                  }
                  placeholder="Company or person"
                  className={getInputClassName(
                    false,
                  )}
                />
              </FormField>

              <FormField
                label="Amount"
                htmlFor="add-bill-amount"
                error={errors.amount}
                required
              >
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                    $
                  </span>

                  <input
                    id="add-bill-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={
                      formValues.amount
                    }
                    onChange={(event) =>
                      updateField(
                        "amount",
                        event.target.value,
                      )
                    }
                    placeholder="0.00"
                    className={`${getInputClassName(
                      Boolean(
                        errors.amount,
                      ),
                    )} pl-8`}
                  />
                </div>
              </FormField>

              <FormField
                label="Amount Type"
                htmlFor="add-bill-amount-type"
              >
                <select
                  id="add-bill-amount-type"
                  value={
                    formValues.amountType
                  }
                  onChange={(event) =>
                    updateField(
                      "amountType",
                      event.target
                        .value as BillFormValues["amountType"],
                    )
                  }
                  className={getInputClassName(
                    false,
                  )}
                >
                  <option value="fixed">
                    Fixed Amount
                  </option>

                  <option value="variable">
                    Variable / Spending
                  </option>
                </select>

                <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
                  {formValues.amountType ===
                  "variable"
                    ? "Use for bills such as groceries, gas, utilities, or other spending that can change during the month."
                    : "Use when the expected bill amount is normally the same each cycle."}
                </p>
              </FormField>

              <FormField
                label="Due Date"
                htmlFor="add-bill-due-date"
                error={errors.dueDate}
                required
              >
                <input
                  id="add-bill-due-date"
                  type="date"
                  value={
                    formValues.dueDate
                  }
                  onChange={(event) =>
                    updateField(
                      "dueDate",
                      event.target.value,
                    )
                  }
                  className={getInputClassName(
                    Boolean(
                      errors.dueDate,
                    ),
                  )}
                />
              </FormField>

              <FormField
                label="Frequency"
                htmlFor="add-bill-frequency"
              >
                <select
                  id="add-bill-frequency"
                  value={
                    formValues.frequency
                  }
                  onChange={(event) =>
                    updateField(
                      "frequency",
                      event.target
                        .value as BillFrequency,
                    )
                  }
                  className={getInputClassName(
                    false,
                  )}
                >
                  {billFrequencyDefinitions.map(
                    (frequency) => (
                      <option
                        key={
                          frequency.value
                        }
                        value={
                          frequency.value
                        }
                      >
                        {frequency.label}
                      </option>
                    ),
                  )}
                </select>
              </FormField>

              <FormField
                label="Payment Method"
                htmlFor="add-bill-payment-method"
              >
                <select
                  id="add-bill-payment-method"
                  value={
                    formValues.paymentMethod
                  }
                  onChange={(event) =>
                    updateField(
                      "paymentMethod",
                      event.target
                        .value as BillPaymentMethod,
                    )
                  }
                  className={getInputClassName(
                    false,
                  )}
                >
                  <option value="manual">
                    Manual Payment
                  </option>

                  <option value="autopay">
                    Autopay
                  </option>
                </select>
              </FormField>

              <FormField
                label="Account"
                htmlFor="add-bill-account"
              >
                <select
                  id="add-bill-account"
                  value={
                    formValues.accountId
                  }
                  onChange={(event) =>
                    updateField(
                      "accountId",
                      event.target.value,
                    )
                  }
                  className={getInputClassName(
                    false,
                  )}
                >
                  <option value="">
                    Select an account
                  </option>

                  {transactionAccountReferences.map(
                    (account) => (
                      <option
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </option>
                    ),
                  )}
                </select>
              </FormField>
            </div>

            <div className="mt-6">
              <BillBudgetLinkCard
                idPrefix="add-bill-budget-link"
                value={
                  budgetLinkValue
                }
                onChange={
                  handleBudgetLinkChange
                }
              />

              {budgetItemReferences.length ===
              0 ? (
                <p className="mt-2 rounded-xl border border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] px-3 py-2 text-xs font-medium leading-5 text-[var(--warning)]">
                  No budget items are
                  available for the selected
                  month. Create a budget item
                  before linking this bill.
                </p>
              ) : null}

              {errors.budgetItemId ? (
                <p className="mt-2 text-xs font-medium text-[var(--danger)]">
                  {
                    errors.budgetItemId
                  }
                </p>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <label
                    htmlFor="add-bill-reminder"
                    className="text-sm font-bold text-[var(--text-primary)]"
                  >
                    Bill Reminder
                  </label>

                  <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                    Receive a reminder
                    before this bill is
                    due.
                  </p>
                </div>

                <button
                  id="add-bill-reminder"
                  type="button"
                  role="switch"
                  aria-checked={
                    formValues.reminderEnabled
                  }
                  onClick={() =>
                    updateField(
                      "reminderEnabled",
                      !formValues.reminderEnabled,
                    )
                  }
                  className={[
                    "relative inline-flex h-7 w-12 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                    formValues.reminderEnabled
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border-strong)]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                      formValues.reminderEnabled
                        ? "translate-x-6"
                        : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {formValues.reminderEnabled ? (
                <div className="mt-4">
                  <label
                    htmlFor="add-bill-reminder-timing"
                    className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                  >
                    Remind Me
                  </label>

                  <select
                    id="add-bill-reminder-timing"
                    value={
                      formValues.reminderTiming
                    }
                    onChange={(event) =>
                      updateField(
                        "reminderTiming",
                        event.target
                          .value as BillReminderTiming,
                      )
                    }
                    className={getInputClassName(
                      false,
                    )}
                  >
                    {billReminderTimingDefinitions.map(
                      (timing) => (
                        <option
                          key={
                            timing.value
                          }
                          value={
                            timing.value
                          }
                        >
                          {timing.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="mt-6">
              <FormField
                label="Note"
                htmlFor="add-bill-note"
              >
                <textarea
                  id="add-bill-note"
                  rows={4}
                  value={formValues.note}
                  onChange={(event) =>
                    updateField(
                      "note",
                      event.target.value,
                    )
                  }
                  placeholder="Add any additional details about this bill."
                  className={`${getInputClassName(
                    false,
                  )} resize-none py-3`}
                />
              </FormField>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            >
              <PlusIcon />

              Add Bill
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
};

function FormField({
  label,
  htmlFor,
  error,
  required = false,
  children,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
      >
        {label}

        {required ? (
          <span className="ml-1 text-[var(--danger)]">
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getInputClassName(
  hasError: boolean,
) {
  return [
    "min-h-11 w-full rounded-xl border bg-[var(--surface-default)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:ring-2",
    hasError
      ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_16%,transparent)]"
      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
  ].join(" ");
}

function createBillId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `bill-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createBillAllocationId() {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `bill-allocation-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
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