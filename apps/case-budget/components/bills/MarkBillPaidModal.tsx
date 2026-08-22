"use client";

import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  formatBillCurrency,
  formatBillDate,
  getLocalDateString,
} from "@/lib/bills/bill-utils";

import type {
  BillData,
} from "@/types/bill";

type MarkBillPaidModalProps = {
  isOpen: boolean;
  bill: BillData | null;
  onClose: () => void;
  onConfirm: (
    bill: BillData,
    paidDate: string,
    paidAmount: number,
  ) => void | Promise<void>;
};

export default function MarkBillPaidModal({
  isOpen,
  bill,
  onClose,
  onConfirm,
}: MarkBillPaidModalProps) {
  const [paidDate, setPaidDate] =
    useState(
      getLocalDateString(),
    );

  const [paidAmount, setPaidAmount] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPaidDate(
      getLocalDateString(),
    );

    setPaidAmount(
      bill
        ? String(
            bill.paidAmount ??
              bill.amount,
          )
        : "",
    );

    setError(null);
  }, [bill?.id, isOpen]);

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

  if (!isOpen || !bill) {
    return null;
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!bill) {
      return;
    }

    if (!paidDate) {
      setError(
        "Select the date this bill was paid.",
      );

      return;
    }

    const parsedPaidAmount =
      Number(paidAmount);

    if (
      !paidAmount.trim() ||
      !Number.isFinite(
        parsedPaidAmount,
      ) ||
      parsedPaidAmount <= 0
    ) {
      setError(
        "Enter a valid amount paid.",
      );

      return;
    }

    void onConfirm(
      {
        ...bill,
        paidAmount:
          parsedPaidAmount,
      },
      paidDate,
      parsedPaidAmount,
    );
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
        aria-labelledby="mark-bill-paid-title"
        aria-describedby="mark-bill-paid-description"
        className="w-full overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckIcon />
            </div>

            <h2
              id="mark-bill-paid-title"
              className="mt-4 text-xl font-bold text-[var(--text-primary)] sm:text-2xl"
            >
              Mark Bill as Paid
            </h2>

            <p
              id="mark-bill-paid-description"
              className="mt-1 text-sm leading-6 text-[var(--text-muted)]"
            >
              Confirm the payment date
              and amount for this bill.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Close mark bill as paid modal"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
        >
          <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[var(--text-primary)]">
                    {bill.name}
                  </p>

                  {bill.payee ? (
                    <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                      {bill.payee}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  {bill.amountType ===
                  "variable" ? (
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      Expected
                    </p>
                  ) : null}

                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {formatBillCurrency(
                      bill.amount,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 border-t border-[var(--border-subtle)] pt-4 sm:grid-cols-2">
                <BillDetail
                  label="Due Date"
                  value={formatBillDate(
                    bill.dueDate,
                  )}
                />

                <BillDetail
                  label="Payment Method"
                  value={
                    bill.paymentMethod ===
                    "autopay"
                      ? "Autopay"
                      : "Manual Payment"
                  }
                />

                {bill.account ? (
                  <BillDetail
                    label="Account"
                    value={
                      bill.account.name
                    }
                  />
                ) : null}

                {bill.budgetItem ? (
                  <BillDetail
                    label="Budget Item"
                    value={`${bill.budgetItem.categoryName} — ${bill.budgetItem.name}`}
                  />
                ) : null}
              </div>
            </div>

            <div>
              <label
                htmlFor="bill-paid-amount"
                className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
              >
                {bill.amountType ===
                "variable"
                  ? "Actual Amount Paid"
                  : "Amount Paid"}
                <span className="ml-1 text-[var(--danger)]">
                  *
                </span>
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-[var(--text-muted)]">
                  $
                </span>

                <input
                  id="bill-paid-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={paidAmount}
                  onChange={(event) => {
                    setPaidAmount(
                      event.target.value,
                    );

                    if (error) {
                      setError(null);
                    }
                  }}
                  className={[
                    "min-h-11 w-full rounded-xl border bg-[var(--surface-default)] py-2 pl-8 pr-3.5 text-sm text-[var(--text-primary)] outline-none transition focus:ring-2",
                    error
                      ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_16%,transparent)]"
                      : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
                  ].join(" ")}
                />
              </div>

              <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
                {bill.amountType ===
                "variable"
                  ? `Expected amount: ${formatBillCurrency(
                      bill.amount,
                    )}. Enter what was actually paid.`
                  : "The configured bill amount is filled in automatically. Change it only if the actual payment was different."}
              </p>
            </div>

            <div>
              <label
                htmlFor="bill-paid-date"
                className="mb-2 block text-sm font-bold text-[var(--text-primary)]"
              >
                Payment Date
                <span className="ml-1 text-[var(--danger)]">
                  *
                </span>
              </label>

              <input
                id="bill-paid-date"
                type="date"
                value={paidDate}
                max={getLocalDateString()}
                onChange={(event) => {
                  setPaidDate(
                    event.target.value,
                  );

                  if (error) {
                    setError(null);
                  }
                }}
                className={[
                  "min-h-11 w-full rounded-xl border bg-[var(--surface-default)] px-3.5 text-sm text-[var(--text-primary)] outline-none transition focus:ring-2",
                  error
                    ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_16%,transparent)]"
                    : "border-[var(--border-subtle)] focus:border-[var(--primary)] focus:ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
                ].join(" ")}
              />

              {error ? (
                <p className="mt-1.5 text-xs font-medium text-[var(--danger)]">
                  {error}
                </p>
              ) : null}
            </div>

            {bill.frequency !==
            "one-time" ? (
              <div className="flex gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                <div className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400">
                  <RecurringIcon />
                </div>

                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    Recurring bill
                  </p>

                  <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
                    Marking this bill as
                    paid will create its
                    next scheduled
                    occurrence.
                  </p>
                </div>
              </div>
            ) : null}
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white outline-none transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              <CheckIcon />

              Confirm Payment
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

type BillDetailProps = {
  label: string;
  value: string;
};

function BillDetail({
  label,
  value,
}: BillDetailProps) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
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

function RecurringIcon() {
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
      <path d="M20 7h-9a4 4 0 0 0-4 4v1" />
      <path d="m17 4 3 3-3 3" />
      <path d="M4 17h9a4 4 0 0 0 4-4v-1" />
      <path d="m7 20-3-3 3-3" />
    </svg>
  );
}