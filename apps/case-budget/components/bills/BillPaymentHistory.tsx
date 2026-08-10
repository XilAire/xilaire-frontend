import {
  formatBillCurrency,
  formatBillDate,
} from "@/lib/bills/bill-utils";

import type {
  BillData,
} from "@/types/bill";

type PaidBillData = BillData & {
  paidDate: string;
};

type BillPaymentHistoryProps = {
  bills: BillData[];
  onViewDetails?: (
    bill: BillData,
  ) => void;
  onEdit?: (
    bill: BillData,
  ) => void;
};

export default function BillPaymentHistory({
  bills,
  onViewDetails,
  onEdit,
}: BillPaymentHistoryProps) {
  const paidBills = bills
    .filter(
      (
        bill,
      ): bill is PaidBillData =>
        bill.status === "paid" &&
        Boolean(bill.paidDate),
    )
    .sort(
      (firstBill, secondBill) =>
        new Date(
          secondBill.paidDate,
        ).getTime() -
        new Date(
          firstBill.paidDate,
        ).getTime(),
    );

  const hasActions =
    Boolean(onViewDetails) ||
    Boolean(onEdit);

  if (paidBills.length === 0) {
    return (
      <section
        aria-labelledby="bill-payment-history-title"
        className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
      >
        <HistoryHeader
          paymentCount={0}
        />

        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
            <HistoryIcon />
          </div>

          <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
            No payment history yet
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-muted)]">
            Bills marked as paid will
            appear here with their
            payment date and account
            details.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="bill-payment-history-title"
      className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm"
    >
      <HistoryHeader
        paymentCount={
          paidBills.length
        }
      />

      <div className="md:hidden">
        <div className="divide-y divide-[var(--border-subtle)]">
          {paidBills.map(
            (bill) => (
              <PaymentHistoryMobileCard
                key={bill.id}
                bill={bill}
                onViewDetails={
                  onViewDetails
                }
                onEdit={onEdit}
              />
            ),
          )}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[780px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
              <th
                scope="col"
                className="px-5 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Bill
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Paid Date
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Due Date
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Account
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Budget Item
              </th>

              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
              >
                Amount
              </th>

              {hasActions ? (
                <th
                  scope="col"
                  className="w-28 px-5 py-3"
                >
                  <span className="sr-only">
                    Actions
                  </span>
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-subtle)]">
            {paidBills.map(
              (bill) => (
                <PaymentHistoryRow
                  key={bill.id}
                  bill={bill}
                  onViewDetails={
                    onViewDetails
                  }
                  onEdit={onEdit}
                />
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type HistoryHeaderProps = {
  paymentCount: number;
};

function HistoryHeader({
  paymentCount,
}: HistoryHeaderProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2
            id="bill-payment-history-title"
            className="text-lg font-bold text-[var(--text-primary)]"
          >
            Payment History
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {formatPaymentCount(
              paymentCount,
            )}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <HistoryIcon />
        </div>
      </div>
    </div>
  );
}

type PaymentHistoryRowProps = {
  bill: PaidBillData;
  onViewDetails?: (
    bill: BillData,
  ) => void;
  onEdit?: (
    bill: BillData,
  ) => void;
};

function PaymentHistoryRow({
  bill,
  onViewDetails,
  onEdit,
}: PaymentHistoryRowProps) {
  const hasActions =
    Boolean(onViewDetails) ||
    Boolean(onEdit);

  return (
    <tr className="transition-colors hover:bg-[var(--surface-muted)]">
      <td className="px-5 py-4 align-middle">
        {onViewDetails ? (
          <button
            type="button"
            onClick={() =>
              onViewDetails(bill)
            }
            className="flex flex-col rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            aria-label={`View details for ${bill.name}`}
          >
            <span className="font-semibold text-[var(--text-primary)] transition hover:text-[var(--primary)]">
              {bill.name}
            </span>

            <span className="mt-1 text-sm text-[var(--text-muted)]">
              {bill.payee ??
                "No payee"}
            </span>
          </button>
        ) : (
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--text-primary)]">
              {bill.name}
            </span>

            <span className="mt-1 text-sm text-[var(--text-muted)]">
              {bill.payee ??
                "No payee"}
            </span>
          </div>
        )}
      </td>

      <td className="px-4 py-4 align-middle">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckIcon />
          </div>

          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {formatBillDate(
              bill.paidDate,
            )}
          </span>
        </div>
      </td>

      <td className="px-4 py-4 align-middle">
        <span className="text-sm text-[var(--text-primary)]">
          {formatBillDate(
            bill.dueDate,
          )}
        </span>
      </td>

      <td className="px-4 py-4 align-middle">
        <span className="text-sm text-[var(--text-primary)]">
          {bill.account?.name ??
            "—"}
        </span>
      </td>

      <td className="px-4 py-4 align-middle">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {bill.budgetItem?.name ??
              "—"}
          </span>

          {bill.budgetItem
            ?.categoryName ? (
            <span className="mt-1 text-xs text-[var(--text-muted)]">
              {
                bill.budgetItem
                  .categoryName
              }
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-4 py-4 text-right align-middle">
        <span className="font-bold text-[var(--text-primary)]">
          {formatBillCurrency(
            bill.amount,
          )}
        </span>
      </td>

      {hasActions ? (
        <td className="px-5 py-4 text-right align-middle">
          <div className="flex items-center justify-end gap-1">
            {onViewDetails ? (
              <button
                type="button"
                onClick={() =>
                  onViewDetails(bill)
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                aria-label={`View details for ${bill.name}`}
                title="View details"
              >
                <EyeIcon />
              </button>
            ) : null}

            {onEdit ? (
              <button
                type="button"
                onClick={() =>
                  onEdit(bill)
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                aria-label={`Edit ${bill.name}`}
                title="Edit bill"
              >
                <EditIcon />
              </button>
            ) : null}
          </div>
        </td>
      ) : null}
    </tr>
  );
}

type PaymentHistoryMobileCardProps = {
  bill: PaidBillData;
  onViewDetails?: (
    bill: BillData,
  ) => void;
  onEdit?: (
    bill: BillData,
  ) => void;
};

function PaymentHistoryMobileCard({
  bill,
  onViewDetails,
  onEdit,
}: PaymentHistoryMobileCardProps) {
  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        {onViewDetails ? (
          <button
            type="button"
            onClick={() =>
              onViewDetails(bill)
            }
            className="min-w-0 flex-1 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            aria-label={`View details for ${bill.name}`}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckIcon />
              </div>

              <h3 className="truncate text-base font-bold text-[var(--text-primary)] transition hover:text-[var(--primary)]">
                {bill.name}
              </h3>
            </div>

            <p className="mt-1 pl-10 text-sm text-[var(--text-muted)]">
              {bill.payee ??
                "No payee"}
            </p>
          </button>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckIcon />
              </div>

              <h3 className="truncate text-base font-bold text-[var(--text-primary)]">
                {bill.name}
              </h3>
            </div>

            <p className="mt-1 pl-10 text-sm text-[var(--text-muted)]">
              {bill.payee ??
                "No payee"}
            </p>
          </div>
        )}

        {onViewDetails ? (
          <button
            type="button"
            onClick={() =>
              onViewDetails(bill)
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label={`View details for ${bill.name}`}
            title="View details"
          >
            <EyeIcon />
          </button>
        ) : null}
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Amount Paid
          </p>

          <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {formatBillCurrency(
              bill.amount,
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Paid
          </p>

          <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatBillDate(
              bill.paidDate,
            )}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl bg-[var(--surface-muted)] p-4">
        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Due Date
          </dt>

          <dd className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {formatBillDate(
              bill.dueDate,
            )}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Account
          </dt>

          <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
            {bill.account?.name ??
              "Not selected"}
          </dd>
        </div>

        <div className="col-span-2">
          <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Budget Item
          </dt>

          <dd className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
            {bill.budgetItem
              ? `${bill.budgetItem.categoryName} — ${bill.budgetItem.name}`
              : "Not selected"}
          </dd>
        </div>
      </dl>

      {onViewDetails ||
      onEdit ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {onViewDetails ? (
            <button
              type="button"
              onClick={() =>
                onViewDetails(bill)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <EyeIcon />

              View Details
            </button>
          ) : null}

          {onEdit ? (
            <button
              type="button"
              onClick={() =>
                onEdit(bill)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <EditIcon />

              Edit Bill
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function formatPaymentCount(
  count: number,
) {
  if (count === 0) {
    return "No completed payments";
  }

  return `${count} completed ${
    count === 1
      ? "payment"
      : "payments"
  }`;
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function HistoryIcon() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />

      <circle
        cx="12"
        cy="12"
        r="3"
      />
    </svg>
  );
}

function EditIcon() {
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
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5Z" />
    </svg>
  );
}