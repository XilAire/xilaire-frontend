"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  getIncomeSourceReference,
  getTransactionAccountReference,
  incomeSourceReferences,
  transactionAccountReferences,
} from "@/lib/budget/budget-reference-data";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import type {
  TransactionData,
  TransactionStatus,
  TransactionType,
} from "@/types/transaction";

type EditTransactionModalProps = {
  isOpen: boolean;
  transaction: TransactionData | null;
  onClose: () => void;
  onUpdateTransaction: (
    updatedTransaction: TransactionData,
  ) => void;
  onDeleteTransaction: (
    transactionId: string,
  ) => void;
};

type TransactionFormState = {
  type: TransactionType;
  merchant: string;
  amount: string;
  date: string;
  accountId: string;
  referenceId: string;
  status: TransactionStatus;
  note: string;
};

function getEmptyFormState(): TransactionFormState {
  return {
    type: "expense",
    merchant: "",
    amount: "",
    date: "",
    accountId:
      transactionAccountReferences[0]?.id ?? "",
    referenceId: "",
    status: "cleared",
    note: "",
  };
}

function getFormStateFromTransaction(
  transaction: TransactionData,
  expenseBudgetItems: Array<{
    id: string;
  }>,
): TransactionFormState {
  let referenceId = "";

  if (transaction.type === "expense") {
    const currentBudgetItemId =
      transaction.category?.id ?? "";

    const currentBudgetItemExists =
      expenseBudgetItems.some(
        (item) =>
          item.id ===
          currentBudgetItemId,
      );

    referenceId =
      currentBudgetItemExists
        ? currentBudgetItemId
        : expenseBudgetItems[0]?.id ??
          "";
  }

  if (transaction.type === "income") {
    const currentIncomeSourceId =
      transaction.category?.id ?? "";

    const currentIncomeSourceExists =
      incomeSourceReferences.some(
        (source) =>
          source.id ===
          currentIncomeSourceId,
      );

    referenceId =
      currentIncomeSourceExists
        ? currentIncomeSourceId
        : incomeSourceReferences[0]?.id ??
          "";
  }

  if (transaction.type === "transfer") {
    const currentTransferAccountId =
      transaction.transferAccountId ?? "";

    const currentTransferAccountExists =
      transactionAccountReferences.some(
        (account) =>
          account.id ===
            currentTransferAccountId &&
          account.id !==
            transaction.account.id,
      );

    referenceId =
      currentTransferAccountExists
        ? currentTransferAccountId
        : transactionAccountReferences.find(
            (account) =>
              account.id !==
              transaction.account.id,
          )?.id ?? "";
  }

  return {
    type: transaction.type,
    merchant: transaction.merchant,
    amount: String(transaction.amount),
    date: transaction.date,
    accountId: transaction.account.id,
    referenceId,
    status: transaction.status,
    note: transaction.note ?? "",
  };
}

export default function EditTransactionModal({
  isOpen,
  transaction,
  onClose,
  onUpdateTransaction,
  onDeleteTransaction,
}: EditTransactionModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  const [formState, setFormState] =
    useState<TransactionFormState>(
      getEmptyFormState,
    );

  const [errors, setErrors] = useState<
    Partial<
      Record<
        keyof TransactionFormState,
        string
      >
    >
  >({});

  const [
    showDeleteConfirmation,
    setShowDeleteConfirmation,
  ] = useState(false);

  const {
    budgetGroups,
  } = useBudget();

  const expenseBudgetItems =
    useMemo(
      () =>
        budgetGroups.flatMap(
          (group) =>
            group.categories.map(
              (item) => ({
                id: item.id,
                name: item.name,
                categoryId: group.id,
                categoryName: group.name,
              }),
            ),
        ),
      [budgetGroups],
    );

  useEffect(() => {
    if (!isOpen || !transaction) {
      return;
    }

    setFormState(
      getFormStateFromTransaction(
        transaction,
        expenseBudgetItems,
      ),
    );

    setErrors({});
    setShowDeleteConfirmation(false);
  }, [
    expenseBudgetItems,
    isOpen,
    transaction,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      formState.type !== "expense"
    ) {
      return;
    }

    const selectedItemStillExists =
      expenseBudgetItems.some(
        (item) =>
          item.id ===
          formState.referenceId,
      );

    if (
      selectedItemStillExists
    ) {
      return;
    }

    setFormState((current) => ({
      ...current,
      referenceId:
        expenseBudgetItems[0]?.id ??
        "",
    }));

    setErrors((current) => ({
      ...current,
      referenceId: undefined,
    }));
  }, [
    expenseBudgetItems,
    formState.referenceId,
    formState.type,
    isOpen,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key !== "Escape") {
        return;
      }

      if (showDeleteConfirmation) {
        setShowDeleteConfirmation(false);
        return;
      }

      onClose();
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
  }, [
    isOpen,
    onClose,
    showDeleteConfirmation,
  ]);

  if (!isOpen || !transaction) {
    return null;
  }

  const activeTransaction: TransactionData =
    transaction;

  function updateField<
    TKey extends keyof TransactionFormState,
  >(
    key: TKey,
    value: TransactionFormState[TKey],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  }

  function handleTypeChange(
    type: TransactionType,
  ) {
    let referenceId = "";

    if (type === "expense") {
      referenceId =
        expenseBudgetItems[0]?.id ??
        "";
    }

    if (type === "income") {
      referenceId =
        incomeSourceReferences[0]?.id ??
        "";
    }

    if (type === "transfer") {
      referenceId =
        transactionAccountReferences.find(
          (account) =>
            account.id !== formState.accountId,
        )?.id ?? "";
    }

    setFormState((current) => ({
      ...current,
      type,
      referenceId,
    }));

    setErrors({});
  }

  function handleAccountChange(
    accountId: string,
  ) {
    setFormState((current) => {
      const nextReferenceId =
        current.type === "transfer" &&
        current.referenceId === accountId
          ? transactionAccountReferences.find(
              (account) =>
                account.id !== accountId,
            )?.id ?? ""
          : current.referenceId;

      return {
        ...current,
        accountId,
        referenceId: nextReferenceId,
      };
    });

    setErrors((current) => ({
      ...current,
      accountId: undefined,
      referenceId: undefined,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const nextErrors =
      validateTransaction(formState);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const account =
      getTransactionAccountReference(
        formState.accountId,
      );

    if (!account) {
      setErrors((current) => ({
        ...current,
        accountId:
          "The selected account could not be found.",
      }));

      return;
    }

    let category:
      | TransactionData["category"]
      | undefined;

    if (formState.type === "expense") {
      const budgetItem =
        expenseBudgetItems.find(
          (item) =>
            item.id ===
            formState.referenceId,
        );

      if (!budgetItem) {
        setErrors((current) => ({
          ...current,
          referenceId:
            "The selected budget item could not be found.",
        }));

        return;
      }

      category = {
        id: budgetItem.id,
        name: budgetItem.name,
        groupName: budgetItem.categoryName,
      };
    }

    if (formState.type === "income") {
      const incomeSource =
        getIncomeSourceReference(
          formState.referenceId,
        );

      if (!incomeSource) {
        setErrors((current) => ({
          ...current,
          referenceId:
            "The selected income source could not be found.",
        }));

        return;
      }

      category = {
        id: incomeSource.id,
        name: incomeSource.name,
        groupName: "Income",
      };
    }

    let transferAccountId:
      | string
      | undefined;

    if (formState.type === "transfer") {
      const transferAccount =
        getTransactionAccountReference(
          formState.referenceId,
        );

      if (!transferAccount) {
        setErrors((current) => ({
          ...current,
          referenceId:
            "The selected destination account could not be found.",
        }));

        return;
      }

      if (
        transferAccount.id ===
        account.id
      ) {
        setErrors((current) => ({
          ...current,
          referenceId:
            "Choose a different destination account.",
        }));

        return;
      }

      transferAccountId =
        transferAccount.id;
    }

    const updatedTransaction: TransactionData = {
      id: activeTransaction.id,
      type: formState.type,
      merchant: formState.merchant.trim(),
      amount: Number(formState.amount),
      date: formState.date,
      status: formState.status,
      account,
      category,
      transferAccountId,
      note: formState.note.trim() || undefined,
    };

    onUpdateTransaction(updatedTransaction);
  }

  function handleDeleteTransaction() {
    onDeleteTransaction(activeTransaction.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close edit transaction modal"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">
              Transaction Details
            </p>

            <h2
              id={titleId}
              className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
            >
              Edit Transaction
            </h2>

            <p
              id={descriptionId}
              className="mt-2 text-sm leading-5 text-[var(--text-muted)]"
            >
              Update the merchant, amount,
              budget item, account, or status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
            <div className="space-y-6">
              <fieldset>
                <legend className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
                  Transaction type
                </legend>

                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--surface-muted)] p-1.5">
                  <TypeButton
                    label="Expense"
                    value="expense"
                    activeValue={formState.type}
                    onClick={handleTypeChange}
                  />

                  <TypeButton
                    label="Income"
                    value="income"
                    activeValue={formState.type}
                    onClick={handleTypeChange}
                  />

                  <TypeButton
                    label="Transfer"
                    value="transfer"
                    activeValue={formState.type}
                    onClick={handleTypeChange}
                  />
                </div>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label={
                    formState.type === "income"
                      ? "Source"
                      : formState.type ===
                          "transfer"
                        ? "Transfer name"
                        : "Merchant"
                  }
                  error={errors.merchant}
                  className="sm:col-span-2"
                >
                  <input
                    type="text"
                    value={formState.merchant}
                    onChange={(event) =>
                      updateField(
                        "merchant",
                        event.target.value,
                      )
                    }
                    placeholder={
                      formState.type === "income"
                        ? "Example: Payroll"
                        : formState.type ===
                            "transfer"
                          ? "Example: Checking to Savings"
                          : "Example: Publix"
                    }
                    autoFocus
                    className={getInputClassName(
                      Boolean(errors.merchant),
                    )}
                  />
                </FormField>

                <FormField
                  label="Amount"
                  error={errors.amount}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[var(--text-muted)]">
                      $
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={formState.amount}
                      onChange={(event) =>
                        updateField(
                          "amount",
                          event.target.value,
                        )
                      }
                      placeholder="0.00"
                      className={`${getInputClassName(
                        Boolean(errors.amount),
                      )} pl-8`}
                    />
                  </div>
                </FormField>

                <FormField
                  label="Date"
                  error={errors.date}
                >
                  <input
                    type="date"
                    value={formState.date}
                    onChange={(event) =>
                      updateField(
                        "date",
                        event.target.value,
                      )
                    }
                    className={getInputClassName(
                      Boolean(errors.date),
                    )}
                  />
                </FormField>

                <FormField
                  label={
                    formState.type === "transfer"
                      ? "From account"
                      : "Account"
                  }
                  error={errors.accountId}
                >
                  <SelectField
                    value={formState.accountId}
                    onChange={handleAccountChange}
                  >
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
                  </SelectField>
                </FormField>

                {formState.type === "transfer" ? (
                  <FormField
                    label="To account"
                    error={errors.referenceId}
                  >
                    <SelectField
                      value={formState.referenceId}
                      onChange={(value) =>
                        updateField(
                          "referenceId",
                          value,
                        )
                      }
                    >
                      <option value="">
                        Select account
                      </option>

                      {transactionAccountReferences
                        .filter(
                          (account) =>
                            account.id !==
                            formState.accountId,
                        )
                        .map((account) => (
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.name}
                          </option>
                        ))}
                    </SelectField>
                  </FormField>
                ) : formState.type === "income" ? (
                  <FormField
                    label="Income source"
                    error={errors.referenceId}
                  >
                    <SelectField
                      value={formState.referenceId}
                      onChange={(value) =>
                        updateField(
                          "referenceId",
                          value,
                        )
                      }
                    >
                      {incomeSourceReferences.map(
                        (source) => (
                          <option
                            key={source.id}
                            value={source.id}
                          >
                            {source.name}
                          </option>
                        ),
                      )}
                    </SelectField>
                  </FormField>
                ) : (
                  <FormField
                    label="Budget item"
                    error={errors.referenceId}
                  >
                    <SelectField
                      value={formState.referenceId}
                      onChange={(value) =>
                        updateField(
                          "referenceId",
                          value,
                        )
                      }
                      disabled={
                        expenseBudgetItems.length ===
                        0
                      }
                    >
                      {expenseBudgetItems.length ===
                      0 ? (
                        <option value="">
                          No budget items available
                        </option>
                      ) : (
                        expenseBudgetItems.map(
                          (item) => (
                            <option
                              key={item.id}
                              value={item.id}
                            >
                              {item.categoryName} —{" "}
                              {item.name}
                            </option>
                          ),
                        )
                      )}
                    </SelectField>
                  </FormField>
                )}

                <FormField label="Status">
                  <SelectField
                    value={formState.status}
                    onChange={(value) =>
                      updateField(
                        "status",
                        value as TransactionStatus,
                      )
                    }
                  >
                    <option value="cleared">
                      Cleared
                    </option>

                    <option value="pending">
                      Pending
                    </option>
                  </SelectField>

                  <StatusImpactMessage
                    type={formState.type}
                    status={formState.status}
                  />
                </FormField>

                <FormField
                  label="Note"
                  className="sm:col-span-2"
                >
                  <textarea
                    value={formState.note}
                    onChange={(event) =>
                      updateField(
                        "note",
                        event.target.value,
                      )
                    }
                    rows={4}
                    placeholder="Add an optional note"
                    className={`${getInputClassName(
                      false,
                    )} resize-none`}
                  />
                </FormField>
              </div>

              <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_6%,transparent)] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Delete transaction
                    </h3>

                    <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                      Permanently remove this
                      transaction from your activity
                      history.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowDeleteConfirmation(true)
                    }
                    className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--danger)] px-4 text-sm font-bold text-[var(--danger)] outline-none transition-colors hover:bg-[var(--danger)] hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                  >
                    <TrashIcon />

                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
              >
                <SaveIcon />

                Save Changes
              </button>
            </div>
          </div>
        </form>

        {showDeleteConfirmation ? (
          <DeleteConfirmation
            merchant={activeTransaction.merchant}
            onCancel={() =>
              setShowDeleteConfirmation(false)
            }
            onConfirm={handleDeleteTransaction}
          />
        ) : null}
      </section>
    </div>
  );
}

type TypeButtonProps = {
  label: string;
  value: TransactionType;
  activeValue: TransactionType;
  onClick: (
    value: TransactionType,
  ) => void;
};

function TypeButton({
  label,
  value,
  activeValue,
  onClick,
}: TypeButtonProps) {
  const isActive = value === activeValue;

  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={isActive}
      className={[
        "min-h-10 rounded-xl px-3 text-sm font-bold outline-none transition-[background-color,color,box-shadow]",
        "focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        isActive
          ? "bg-[var(--surface-default)] text-[var(--primary)] shadow-sm"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

type FormFieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

function FormField({
  label,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <label
      className={[
        "block",
        className ?? "",
      ].join(" ")}
    >
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
        {label}
      </span>

      {children}

      {error ? (
        <span className="mt-1.5 block text-xs font-semibold text-[var(--danger)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

type SelectFieldProps = {
  value: string;
  onChange: (
    value: string,
  ) => void;
  children: ReactNode;
  disabled?: boolean;
};

function SelectField({
  value,
  onChange,
  children,
  disabled = false,
}: SelectFieldProps) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`${getInputClassName(
          false,
        )} appearance-none pr-10 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {children}
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--text-muted)]">
        <ChevronDownIcon />
      </span>
    </div>
  );
}

type StatusImpactMessageProps = {
  type: TransactionType;
  status: TransactionStatus;
};

function StatusImpactMessage({
  type,
  status,
}: StatusImpactMessageProps) {
  if (
    type !== "expense"
  ) {
    return (
      <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
        This transaction will not change
        budget-item spending.
      </p>
    );
  }

  if (
    status === "cleared"
  ) {
    return (
      <p className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--success)_20%,transparent)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)] px-3 py-2 text-xs font-medium leading-5 text-[var(--success)]">
        This cleared expense is applied
        to the selected budget item.
      </p>
    );
  }

  return (
    <p className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--warning)_22%,transparent)] bg-[color-mix(in_srgb,var(--warning)_9%,transparent)] px-3 py-2 text-xs font-medium leading-5 text-[var(--warning)]">
      This pending expense will not
      affect budget spending until it is
      marked cleared.
    </p>
  );
}

type DeleteConfirmationProps = {
  merchant: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteConfirmation({
  merchant,
  onCancel,
  onConfirm,
}: DeleteConfirmationProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-transaction-title"
        aria-describedby="delete-transaction-description"
        className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]">
          <TrashIcon />
        </div>

        <h3
          id="delete-transaction-title"
          className="mt-5 text-xl font-bold tracking-tight text-[var(--text-primary)]"
        >
          Delete transaction?
        </h3>

        <p
          id="delete-transaction-description"
          className="mt-2 text-sm leading-6 text-[var(--text-muted)]"
        >
          The transaction for{" "}
          <span className="font-bold text-[var(--text-primary)]">
            {merchant}
          </span>{" "}
          will be permanently removed. This
          action cannot be undone.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Keep Transaction
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger)] px-5 text-sm font-bold text-white outline-none transition-[filter,box-shadow] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-default)]"
          >
            <TrashIcon />

            Delete Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

function validateTransaction(
  formState: TransactionFormState,
) {
  const nextErrors: Partial<
    Record<
      keyof TransactionFormState,
      string
    >
  > = {};

  if (!formState.merchant.trim()) {
    nextErrors.merchant =
      "Enter a merchant or transaction name.";
  }

  const amount = Number(formState.amount);

  if (
    !formState.amount ||
    Number.isNaN(amount) ||
    amount <= 0
  ) {
    nextErrors.amount =
      "Enter an amount greater than $0.00.";
  }

  if (!formState.date) {
    nextErrors.date =
      "Select a transaction date.";
  }

  if (!formState.accountId) {
    nextErrors.accountId =
      "Select an account.";
  }

  if (!formState.referenceId) {
    nextErrors.referenceId =
      formState.type === "transfer"
        ? "Select the destination account."
        : formState.type === "income"
          ? "Select an income source."
          : "Select a budget item.";
  }

  if (
    formState.type === "transfer" &&
    formState.accountId ===
      formState.referenceId
  ) {
    nextErrors.referenceId =
      "Choose a different destination account.";
  }

  return nextErrors;
}

function getInputClassName(
  hasError: boolean,
) {
  return [
    "min-h-11 w-full rounded-xl border bg-[var(--surface-default)] px-3.5 py-2.5",
    "text-sm font-medium text-[var(--text-primary)] outline-none",
    "placeholder:text-[var(--text-muted)]",
    "transition-[border-color,box-shadow]",
    "focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
    hasError
      ? "border-[var(--danger)] focus:border-[var(--danger)]"
      : "border-[var(--border-default)] hover:border-[var(--border-strong)] focus:border-[var(--primary)]",
  ].join(" ");
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

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
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