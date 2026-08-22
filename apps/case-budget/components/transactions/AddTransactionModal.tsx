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
  incomeSourceReferences,
} from "@/lib/budget/budget-reference-data";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useBudget,
} from "@/components/providers/BudgetProvider";

import type {
  TransactionData,
  TransactionStatus,
  TransactionType,
} from "@/types/transaction";

export type AddTransactionPreset = {
  type?: TransactionType;
  merchant?: string;
  accountId?: string;
  referenceId?: string;
};

type AddTransactionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (
    transaction: TransactionData,
  ) => void | Promise<unknown>;
  preset?: AddTransactionPreset | null;
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

function getDefaultFormState(): TransactionFormState {
  return {
    type: "expense",
    merchant: "",
    amount: "",
    date: getTodayDate(),
    accountId: "",
    referenceId: "",
    status: "cleared",
    note: "",
  };
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onAddTransaction,
  preset = null,
}: AddTransactionModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  const [formState, setFormState] =
    useState<TransactionFormState>(
      getDefaultFormState,
    );

  const [errors, setErrors] = useState<
    Partial<
      Record<
        keyof TransactionFormState,
        string
      >
    >
  >({});

  const {
    budgetGroups,
  } = useBudget();

  const {
    accounts,
  } = useAccounts();

  const transactionAccounts =
    useMemo(
      () =>
        accounts
          .filter(
            (account) =>
              account.isActive &&
              !account.isArchived,
          )
          .slice()
          .sort(
            (first, second) =>
              first.name.localeCompare(
                second.name,
              ),
          ),
      [accounts],
    );

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
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
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
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultState =
      getDefaultFormState();

    const defaultAccountId =
      transactionAccounts[0]?.id ??
      "";

    const presetType =
      preset?.type ??
      defaultState.type;

    const accountId =
      transactionAccounts.some(
        (account) =>
          account.id ===
          preset?.accountId,
      )
        ? preset?.accountId ??
          defaultAccountId
        : defaultAccountId;

    let referenceId = "";

    if (presetType === "expense") {
      const presetBudgetItemExists =
        expenseBudgetItems.some(
          (item) =>
            item.id ===
            preset?.referenceId,
        );

      referenceId =
        presetBudgetItemExists
          ? preset?.referenceId ??
            ""
          : expenseBudgetItems[0]?.id ??
            "";
    }

    if (presetType === "income") {
      referenceId =
        preset?.referenceId ??
        incomeSourceReferences[0]?.id ??
        "";
    }

    if (presetType === "transfer") {
      const presetTransferAccountExists =
        transactionAccounts.some(
          (account) =>
            account.id ===
              preset?.referenceId &&
            account.id !==
              accountId,
        );

      referenceId =
        presetTransferAccountExists
          ? preset?.referenceId ??
            ""
          : transactionAccounts.find(
              (account) =>
                account.id !==
                accountId,
            )?.id ??
            "";
    }

    setFormState({
      ...defaultState,
      type: presetType,
      merchant:
        preset?.merchant ??
        "",
      accountId,
      referenceId,
    });

    setErrors({});
  }, [
    expenseBudgetItems,
    isOpen,
    preset,
    transactionAccounts,
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

  if (!isOpen) {
    return null;
  }

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
        transactionAccounts.find(
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
          ? transactionAccounts.find(
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

    const selectedAccount =
      transactionAccounts.find(
        (account) =>
          account.id ===
          formState.accountId,
      );

    if (!selectedAccount) {
      setErrors((current) => ({
        ...current,
        accountId:
          "The selected account could not be found.",
      }));

      return;
    }

    const account:
      TransactionData["account"] = {
        id:
          selectedAccount.id,
        name:
          selectedAccount.name,
        type:
          selectedAccount.databaseType,
      };

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

    let transferAccountId: string | undefined;

    if (formState.type === "transfer") {
      const transferAccount =
        transactionAccounts.find(
          (account) =>
            account.id ===
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

      if (transferAccount.id === account.id) {
        setErrors((current) => ({
          ...current,
          referenceId:
            "Choose a different destination account.",
        }));

        return;
      }

      transferAccountId = transferAccount.id;
    }

    const transaction: TransactionData = {
      id: createTransactionId(),
      type: formState.type,
      merchant: formState.merchant.trim(),
      amount: Number(formState.amount),
      date: formState.date,
      status: formState.status,
      account,
      transferAccountId,
      category,
      note: formState.note.trim() || undefined,
    };

    onAddTransaction(transaction);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close add transaction modal"
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
              New Activity
            </p>

            <h2
              id={titleId}
              className="mt-1 text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl"
            >
              Add Transaction
            </h2>

            <p
              id={descriptionId}
              className="mt-2 text-sm leading-5 text-[var(--text-muted)]"
            >
              Record an expense, income deposit,
              or account transfer.
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
                    {transactionAccounts.length ===
                    0 ? (
                      <option value="">
                        No accounts available
                      </option>
                    ) : (
                      transactionAccounts.map(
                        (account) => (
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.institution
                              ? `${account.name} • ${account.institution}`
                              : account.name}
                          </option>
                        ),
                      )
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

                      {transactionAccounts
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
                <PlusIcon />

                Add Transaction
              </button>
            </div>
          </div>
        </form>
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
        This cleared expense will be
        applied to the selected budget
        item.
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

function getTodayDate() {
  const currentDate = new Date();

  const timezoneOffset =
    currentDate.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    currentDate.getTime() - timezoneOffset,
  )
    .toISOString()
    .slice(0, 10);
}

function createTransactionId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `transaction-${Date.now()}-${Math.random()
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