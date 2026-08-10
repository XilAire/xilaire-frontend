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
  billFrequencyDefinitions,
  billReminderTimingDefinitions,
  billStatusDefinitions,
  type BillData,
  type BillFormValues,
  type BillFrequency,
  type BillPaymentMethod,
  type BillReminderTiming,
  type BillStatus,
} from "@/types/bill";

type EditBillModalProps = {
  isOpen: boolean;
  bill: BillData | null;
  onClose: () => void;
  onUpdateBill?: (
    bill: BillData,
  ) => void;
  onDeleteBill?: (
    billId: string,
  ) => void;
};

const emptyFormValues: BillFormValues = {
  name: "",
  payee: "",
  amount: "",
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

export default function EditBillModal({
  isOpen,
  bill,
  onClose,
  onUpdateBill,
  onDeleteBill,
}: EditBillModalProps) {
  const [
    formValues,
    setFormValues,
  ] = useState<BillFormValues>(
    emptyFormValues,
  );

  const [status, setStatus] =
    useState<BillStatus>("upcoming");

  const [errors, setErrors] =
    useState<
      Partial<
        Record<
          keyof BillFormValues,
          string
        >
      >
    >({});

  const [
    deleteConfirmationOpen,
    setDeleteConfirmationOpen,
  ] = useState(false);

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
    if (!isOpen || !bill) {
      return;
    }

    const linkedBudgetItemId =
      bill.budgetItem?.id ?? "";

    const linkedBudgetItemExists =
      budgetItemReferences.some(
        (item) =>
          item.id ===
          linkedBudgetItemId,
      );

    const nextBudgetItemId =
      linkedBudgetItemExists
        ? linkedBudgetItemId
        : budgetItemReferences[0]?.id ??
          "";

    setFormValues({
      name: bill.name,
      payee: bill.payee ?? "",
      amount: String(bill.amount),
      dueDate: bill.dueDate,
      frequency: bill.frequency,
      paymentMethod:
        bill.paymentMethod,
      accountId:
        bill.account?.id ??
        transactionAccountReferences[0]
          ?.id ??
        "",
      budgetItemId:
        nextBudgetItemId,
      budgetSyncEnabled:
        nextBudgetItemId !== "" &&
        (linkedBudgetItemExists
          ? bill.budgetSync
              ?.enabled ?? true
          : false),
      budgetSyncMode:
        bill.budgetSync?.mode ??
        "suggest",
      reminderEnabled:
        bill.reminder.enabled,
      reminderTiming:
        bill.reminder.timing,
      note: bill.note ?? "",
    });

    setStatus(bill.status);
    setErrors({});
    setDeleteConfirmationOpen(
      false,
    );
  }, [
    bill,
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
      if (event.key !== "Escape") {
        return;
      }

      if (
        deleteConfirmationOpen
      ) {
        setDeleteConfirmationOpen(
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
  }, [
    deleteConfirmationOpen,
    isOpen,
    onClose,
  ]);

  if (!isOpen || !bill) {
    return null;
  }

  const activeBill = bill;

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
      formValues.amount.trim() ===
        "" ||
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
      formValues.budgetItemId !==
        "" &&
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

    const amount = Number(
      formValues.amount,
    );

    const linkedBudgetItem =
      selectedBudgetItem
        ? {
            id: selectedBudgetItem.id,
            name: selectedBudgetItem.name,
            categoryId:
              selectedBudgetItem.categoryId,
            categoryName:
              selectedBudgetItem.categoryName,
          }
        : undefined;

    const existingPrimaryAllocation =
      activeBill.budgetAllocations?.[0];

    const budgetAllocations =
      linkedBudgetItem
        ? [
            {
              id:
                existingPrimaryAllocation
                  ?.id ??
                createBillAllocationId(),
              budgetItem:
                linkedBudgetItem,
              allocationType:
                existingPrimaryAllocation
                  ?.allocationType ??
                "fixed",
              value: amount,
              createdAt:
                existingPrimaryAllocation
                  ?.createdAt ??
                timestamp,
              updatedAt: timestamp,
            },
          ]
        : undefined;

    const updatedBill: BillData = {
      ...activeBill,
      id: activeBill.id,
      name:
        formValues.name.trim(),
      payee:
        formValues.payee.trim() ||
        undefined,
      amount,
      dueDate:
        formValues.dueDate,
      status,
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
      budgetItem:
        linkedBudgetItem,
      budgetSync:
        linkedBudgetItem
          ? {
              enabled:
                formValues.budgetSyncEnabled,
              mode:
                formValues.budgetSyncMode,
              lastSyncedAt:
                formValues
                  .budgetSyncEnabled
                  ? timestamp
                  : activeBill
                      .budgetSync
                      ?.lastSyncedAt,
            }
          : undefined,
      budgetAllocations,
      reminder: {
        enabled:
          formValues.reminderEnabled,
        timing:
          formValues.reminderTiming,
      },
      note:
        formValues.note.trim() ||
        undefined,
      paidDate:
        status === "paid"
          ? activeBill.paidDate ??
            timestamp
          : undefined,
      createdAt:
        activeBill.createdAt,
      updatedAt: timestamp,
    };

    onUpdateBill?.(
      updatedBill,
    );

    onClose();
  }

  function handleDeleteBill() {
    onDeleteBill?.(
      activeBill.id,
    );

    setDeleteConfirmationOpen(
      false,
    );

    onClose();
  }

  return (
    <>
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
          aria-labelledby="edit-bill-title"
          className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">
                Bills & Payments
              </p>

              <h2
                id="edit-bill-title"
                className="mt-1 text-xl font-bold text-[var(--text-primary)] sm:text-2xl"
              >
                Edit Bill
              </h2>

              <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                Update the payment,
                status, account,
                budget link, and
                reminder settings.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              aria-label="Close edit bill modal"
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
                  htmlFor="edit-bill-name"
                  error={errors.name}
                  required
                >
                  <input
                    id="edit-bill-name"
                    type="text"
                    value={
                      formValues.name
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
                  htmlFor="edit-bill-payee"
                >
                  <input
                    id="edit-bill-payee"
                    type="text"
                    value={
                      formValues.payee
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "payee",
                        event.target
                          .value,
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
                  htmlFor="edit-bill-amount"
                  error={
                    errors.amount
                  }
                  required
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                      $
                    </span>

                    <input
                      id="edit-bill-amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={
                        formValues.amount
                      }
                      onChange={(
                        event,
                      ) =>
                        updateField(
                          "amount",
                          event.target
                            .value,
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
                  label="Due Date"
                  htmlFor="edit-bill-due-date"
                  error={
                    errors.dueDate
                  }
                  required
                >
                  <input
                    id="edit-bill-due-date"
                    type="date"
                    value={
                      formValues.dueDate
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "dueDate",
                        event.target
                          .value,
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
                  label="Status"
                  htmlFor="edit-bill-status"
                >
                  <select
                    id="edit-bill-status"
                    value={status}
                    onChange={(
                      event,
                    ) =>
                      setStatus(
                        event.target
                          .value as BillStatus,
                      )
                    }
                    className={getInputClassName(
                      false,
                    )}
                  >
                    {billStatusDefinitions.map(
                      (
                        definition,
                      ) => (
                        <option
                          key={
                            definition.value
                          }
                          value={
                            definition.value
                          }
                        >
                          {
                            definition.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                <FormField
                  label="Frequency"
                  htmlFor="edit-bill-frequency"
                >
                  <select
                    id="edit-bill-frequency"
                    value={
                      formValues.frequency
                    }
                    onChange={(
                      event,
                    ) =>
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
                      (
                        frequency,
                      ) => (
                        <option
                          key={
                            frequency.value
                          }
                          value={
                            frequency.value
                          }
                        >
                          {
                            frequency.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                <FormField
                  label="Payment Method"
                  htmlFor="edit-bill-payment-method"
                >
                  <select
                    id="edit-bill-payment-method"
                    value={
                      formValues.paymentMethod
                    }
                    onChange={(
                      event,
                    ) =>
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
                  htmlFor="edit-bill-account"
                >
                  <select
                    id="edit-bill-account"
                    value={
                      formValues.accountId
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
                    className={getInputClassName(
                      false,
                    )}
                  >
                    <option value="">
                      Select an account
                    </option>

                    {transactionAccountReferences.map(
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
                          {
                            account.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </FormField>
              </div>

              <div className="mt-6">
                <BillBudgetLinkCard
                  idPrefix="edit-bill-budget-link"
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
                      htmlFor="edit-bill-reminder"
                      className="text-sm font-bold text-[var(--text-primary)]"
                    >
                      Bill Reminder
                    </label>

                    <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                      Receive a
                      reminder before
                      this bill is due.
                    </p>
                  </div>

                  <button
                    id="edit-bill-reminder"
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
                      htmlFor="edit-bill-reminder-timing"
                      className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
                    >
                      Remind Me
                    </label>

                    <select
                      id="edit-bill-reminder-timing"
                      value={
                        formValues.reminderTiming
                      }
                      onChange={(
                        event,
                      ) =>
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
                        (
                          timing,
                        ) => (
                          <option
                            key={
                              timing.value
                            }
                            value={
                              timing.value
                            }
                          >
                            {
                              timing.label
                            }
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
                  htmlFor="edit-bill-note"
                >
                  <textarea
                    id="edit-bill-note"
                    rows={4}
                    value={
                      formValues.note
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "note",
                        event.target
                          .value,
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

            <footer className="flex flex-col gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirmationOpen(
                    true,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--danger)] px-5 text-sm font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
              >
                <TrashIcon />

                Delete Bill
              </button>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                  <SaveIcon />

                  Save Changes
                </button>
              </div>
            </footer>
          </form>
        </section>
      </div>

      {deleteConfirmationOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setDeleteConfirmationOpen(
                false,
              );
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-bill-title"
            aria-describedby="delete-bill-description"
            className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
              <TrashIcon />
            </div>

            <h2
              id="delete-bill-title"
              className="mt-5 text-xl font-bold text-[var(--text-primary)]"
            >
              Delete Bill?
            </h2>

            <p
              id="delete-bill-description"
              className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
            >
              This will permanently
              remove{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {activeBill.name}
              </span>
              . This action cannot be
              undone.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirmationOpen(
                    false,
                  )
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Keep Bill
              </button>

              <button
                type="button"
                onClick={
                  handleDeleteBill
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2"
              >
                Delete Bill
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
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
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}